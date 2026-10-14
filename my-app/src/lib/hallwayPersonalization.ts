import type { HallwayTodayEvent, HallwayActionGroup, HallwayActionItem } from '../types/hallway';
import type { User } from '../types';
import { isSuperAdmin } from './permissions';

/**
 * Personalize Today's Schedule from live CRM events.
 * Never invents synthetic meetings — empty when CRM has nothing for this user.
 */
export function getPersonalizedSchedule(
  allEvents: HallwayTodayEvent[],
  user?: User | null,
  mode: 'my' | 'all' = 'my'
): HallwayTodayEvent[] {
  if (!user) return allEvents;

  const isAdmin = isSuperAdmin(user);
  if (isAdmin && mode === 'all') {
    return allEvents;
  }

  const nameLower = (user.name || '').toLowerCase().trim();
  const emailLower = (user.email || '').toLowerCase().trim();
  const firstName = nameLower.split(' ')[0] || '';

  // Prioritize real CRM appointments when present — always scope "my" to the logged-in person
  if (Array.isArray(allEvents) && allEvents.length > 0) {
    const matched = allEvents.filter((ev) => {
      const crm = (ev.crmPersonName || '').toLowerCase();
      const des = (ev.designerName || '').toLowerCase();
      const cli = (ev.clientName || '').toLowerCase();
      const tit = (ev.title || '').toLowerCase();
      return (
        crm.includes(nameLower) ||
        (firstName.length > 2 && crm.includes(firstName)) ||
        des.includes(nameLower) ||
        (firstName.length > 2 && des.includes(firstName)) ||
        tit.includes(nameLower) ||
        (firstName.length > 2 && tit.includes(firstName)) ||
        // Client name match only when it is the user (rare); avoid dumping all client visits
        (cli.includes(nameLower) && nameLower.length > 3)
      );
    });

    // My Schedule / default: only this person's meetings (admins use All Hubs for company-wide)
    if (mode === 'my' || !isAdmin) {
      return matched;
    }
    return allEvents;
  }

  // No live CRM events — empty schedule (never invent meetings)
  return [];
}

/**
 * Personalize live CRM action groups for the signed-in user.
 * Never invents synthetic tasks — empty when CRM has nothing assigned.
 */
export function getPersonalizedActions(
  allGroups: HallwayActionGroup[],
  user?: User | null,
  mode: 'my' | 'all' = 'my'
): HallwayActionGroup[] {
  const groups = Array.isArray(allGroups) ? allGroups : [];
  if (!user) return groups;

  const isAdmin = isSuperAdmin(user);
  if (isAdmin && mode === 'all') {
    return groups;
  }

  const nameLower = (user.name || '').toLowerCase().trim();
  const emailLower = (user.email || '').toLowerCase().trim();
  const firstName = nameLower.split(' ')[0] || '';
  const roleLower = (user.role || '').toLowerCase();
  const deptLower = (user.department || '').toLowerCase();
  const isDesignUser = deptLower === 'design' || roleLower.includes('design');

  // Admins: surface live CRM groups only (no invented approvals)
  if (isAdmin) {
    return groups
      .map((g) => ({
        ...g,
        items: Array.isArray(g.items) ? g.items : [],
        count: Array.isArray(g.items) ? g.items.length : g.count || 0,
      }))
      .filter((g) => g.items.length > 0);
  }

  const rawItems = groups.flatMap((g) => g.items || []);
  if (rawItems.length === 0) return [];

  const matched = rawItems.filter((it) => {
    const blob = `${it.name || ''} ${it.detail || ''}`.toLowerCase();
    if (nameLower && blob.includes(nameLower)) return true;
    if (firstName.length > 2 && blob.includes(firstName)) return true;
    if (emailLower) {
      const local = emailLower.split('@')[0];
      if (local && local.length > 2 && blob.includes(local)) return true;
    }
    // Assignee field often appears in detail: "Assigned to Meghana"
    return false;
  });

  if (matched.length > 0) {
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

  return [];
}
