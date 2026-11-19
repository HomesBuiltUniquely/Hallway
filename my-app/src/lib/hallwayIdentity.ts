/** Shared identity tokens for Today / Actions scope matching. */

export function identityTokens(...parts: Array<string | null | undefined>): Set<string> {
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
    if (compact.length > 2) out.add(compact);
    const first = spaced.split(' ')[0] || '';
    if (first.length > 2) out.add(first);
  }
  return out;
}

export function textMatchesIdentity(text: string, tokens: Set<string>): boolean {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[_.\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || tokens.size === 0) return false;
  const compact = normalized.replace(/\s+/g, '');
  for (const token of tokens) {
    if (!token || token.length < 2) continue;
    if (normalized === token || compact === token.replace(/\s+/g, '')) return true;
    if (token.length >= 3 && normalized.length >= 3) {
      if (normalized.includes(token) || compact.includes(token.replace(/\s+/g, ''))) return true;
    }
  }
  return false;
}

export function matchesViewer(
  tokens: Set<string>,
  ...fields: Array<string | null | undefined>
): boolean {
  if (tokens.size === 0) return true;
  for (const field of fields) {
    const text = String(field || '')
      .toLowerCase()
      .replace(/[_.\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    const compact = text.replace(/\s+/g, '');
    const numericField = /^\d+$/.test(compact);
    for (const token of tokens) {
      if (!token || token.length < 2) continue;
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
  }
  return false;
}

export function assigneeLabelsForUser(row: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
}): string[] {
  const labels: string[] = [];
  for (const part of [row.full_name, row.username, row.email]) {
    const s = String(part || '').trim();
    if (s) labels.push(s);
    if (s.includes('@')) {
      const local = s.split('@')[0];
      if (local) labels.push(local.replace(/[._-]+/g, ' '));
    }
  }
  return labels;
}

export function assigneeMatchesScope(
  assigneeRaw: string | null | undefined,
  scopeLabels: Set<string>
): boolean {
  if (scopeLabels.size === 0) return true;
  const assignee = String(assigneeRaw || '').trim();
  if (!assignee) return false;
  for (const label of scopeLabels) {
    if (textMatchesIdentity(assignee, new Set([label.toLowerCase()]))) return true;
    if (assignee.toLowerCase() === label.toLowerCase()) return true;
  }
  const tokens = identityTokens(assignee);
  for (const label of scopeLabels) {
    if (textMatchesIdentity(label, tokens)) return true;
  }
  return false;
}