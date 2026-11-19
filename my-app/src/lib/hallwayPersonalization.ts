import type { HallwayTodayEvent, HallwayActionGroup, HallwayActionItem } from '../types/hallway';
import type { User } from '../types';
import type { HallwayHomeViewMode } from './hallwayHomePermissions';
import { isDesignHomeUser } from './hallwayHomePermissions';

/** Collapse "Somashekar_V" / "Somashekar V" / emails into comparable identity tokens. */
function identityTokens(...parts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const part of parts) {
    const raw = String(part || '')
      .trim()
      .toLowerCase();
    if (!raw) continue;
    const local = raw.includes('@') ? raw.split('@')[0] : raw;
    const spaced = local.replace(/[_.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const compact = spaced.replace(/\s+/g, '');
    if (spaced) out.add(spaced);
    if (compact && compact.length > 2) out.add(compact);
    const first = spaced.split(' ')[0] || '';
    if (first.length > 2) out.add(first);
  }
  return out;
}

function textMatchesIdentity(haystack: string, tokens: Set<string>): boolean {
  const text = String(haystack || '')
    .toLowerCase()
    .replace(/[_.\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return false;
  const compact = text.replace(/\s+/g, '');
  const numericField = /^\d+$/.test(compact);
  for (const token of tokens) {
    if (!token || token.length < 2) continue;
    // User ids must match exactly — "176".includes("1") is a false positive.
    if (numericField || /^\d+$/.test(token)) {
      if (compact === token) return true;
      continue;
    }
    if (text === token || compact === token) return true;
    if (token.length >= 3 && text.length >= 3) {
      if (text.includes(token) || compact.includes(token.replace(/\s+/g, ''))) return true;
      if (token.includes(text) || token.replace(/\s+/g, '').includes(compact)) return true;
    }
  }
  return false;
}

function userIdentityTokens(user?: User | null): Set<string> {
  if (!user) return new Set();
  return identityTokens(
    user.name,
    user.email,
    (user as { username?: string }).username,
    user.id
  );
}

/**
 * Personalize Today's Schedule from live CRM events.
 * Never invents synthetic meetings — empty when CRM has nothing for this user.
 */
export function getPersonalizedSchedule(
  allEvents: HallwayTodayEvent[],
  user?: User | null,
  mode: HallwayHomeViewMode = 'my'
): HallwayTodayEvent[] {
  if (!user) return allEvents;

  if (mode === 'all' || mode === 'team') {
    // Hub scopes team/all when the caller's JWT is forwarded.
    return allEvents;
  }

  const tokens = userIdentityTokens(user);
  if (tokens.size === 0) return [];

  if (!Array.isArray(allEvents) || allEvents.length === 0) return [];

  const isDesignUser = isDesignHomeUser(user);
  return allEvents.filter((ev) => {
    const sales = ev.crmPersonName || '';
    const designer = ev.designerName || '';
    // Sales exec: only sales owner. Design: only designer. Never client/title substrings.
    if (isDesignUser) return textMatchesIdentity(designer, tokens);
    return textMatchesIdentity(sales, tokens);
  });
}

/**
 * Personalize live CRM action groups for the signed-in user.
 * Never invents synthetic tasks — empty when CRM has nothing assigned.
 */
export function getPersonalizedActions(
  allGroups: HallwayActionGroup[],
  user?: User | null,
  mode: HallwayHomeViewMode = 'my'
): HallwayActionGroup[] {
  const groups = Array.isArray(allGroups) ? allGroups : [];
  if (!user) return groups;

  if (mode === 'all' || mode === 'team' || isDesignHomeUser(user)) {
    return groups
      .map((g) => ({
        ...g,
        items: Array.isArray(g.items) ? g.items : [],
        count: Array.isArray(g.items) ? g.items.length : g.count || 0,
      }))
      .filter((g) => g.items.length > 0);
  }

  const hubScoped = groups.some(
    (g) =>
      String(g.id || '').startsWith('mm-') ||
      String(g.id || '').startsWith('followups') ||
      String(g.id || '').includes('quote-pending') ||
      String(g.id || '').includes('meetings-today')
  );
  if (hubScoped) {
    return groups
      .map((g) => ({
        ...g,
        items: Array.isArray(g.items) ? g.items : [],
        count: Array.isArray(g.items) ? g.items.length : g.count || 0,
      }))
      .filter((g) => g.items.length > 0);
  }

  const tokens = userIdentityTokens(user);
  const rawItems = groups.flatMap((g) => g.items || []);
  if (rawItems.length === 0) return [];

  const matched = rawItems.filter((it: HallwayActionItem) => {
    const blob = `${it.name || ''} ${it.detail || ''}`;
    return textMatchesIdentity(blob, tokens);
  });

  if (matched.length === 0) return [];

  const isDesignUser = isDesignHomeUser(user);
  return [
    {
      id: `assigned-${(user.name || 'user').toLowerCase().replace(/\s+/g, '-')}`,
      title: isDesignUser ? 'My Design Follow-ups' : 'My Lead Follow-ups',
      count: matched.length,
      urgent: true,
      items: matched,
    },
  ];
}
