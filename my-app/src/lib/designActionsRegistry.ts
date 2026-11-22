/**
 * Central Visibility & Permission Registry for Design-path My Actions
 *
 * Implements the 5-part principle:
 *  (1) Owned: assigned to the user, or in their role's queue.
 *  (2) Actionable: there is a clear next step the user can take now.
 *  (3) Time-sensitive: due, overdue, SLA-breached, or blocking someone else.
 *  (4) Permitted: authorized in Design Module permissions.
 *  (5) Countable: card number = items needing action; 0 = "All caught up".
 *
 * Items failing these (e.g. holds > 30d, holds resuming soon) are moved to
 * an UNCOUNTED "Watchlist" area and never block "All caught up".
 */

export function normalizeRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export interface ActionQueueDefinition {
  id: string;
  title: string;
  allowedRoles: readonly string[];
  isCounted: boolean;
  category: 'action' | 'watchlist';
  priority: number; // 1 = overdue/blocking, 2 = due today, 3 = upcoming, 4 = watchlist
  description: string;
}

export const ACTION_QUEUES: Record<string, ActionQueueDefinition> = {
  'tracker-tasks': {
    id: 'tracker-tasks',
    title: 'Milestone Tasks',
    allowedRoles: ['DESIGNER'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'Designer milestone tasks with SLA deadlines (Overdue, Due today, Upcoming).',
  },
  'meeting-outcomes': {
    id: 'meeting-outcomes',
    title: 'Meeting Outcome Needed',
    allowedRoles: ['DESIGNER'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description:
      'Own meetings that ended within the recency window with progress still open (completed / never happened closes the item).',
  },
  'team-overdue-exceptions': {
    id: 'team-overdue-exceptions',
    title: 'Team Overdue Exceptions (2+ days)',
    allowedRoles: ['DESIGN_MANAGER', 'TERRITORIAL_DESIGN_MANAGER'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'Overdue milestone tasks across reporting designers needing manager intervention.',
  },
  'admin-overdue-escalations': {
    id: 'admin-overdue-escalations',
    title: 'Org Overdue Escalations (5+ days)',
    allowedRoles: ['ADMIN', 'DEPUTY_GENERAL_MANAGER'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'Severely overdue tasks company-wide requiring executive escalation.',
  },
  'dqc-pending': {
    id: 'dqc-pending',
    title: 'DQC Reviews Awaiting Verdict',
    allowedRoles: ['DQC_MANAGER', 'DQE'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'DQC review submissions awaiting quality checker decision.',
  },
  'd1-requests': {
    id: 'd1-requests',
    title: 'D1 Pending Requests',
    allowedRoles: ['MMT_MANAGER'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'Site measurement requests awaiting MMT executive assignment.',
  },
  'd1-assignments': {
    id: 'd1-assignments',
    title: 'My D1 Assignments',
    allowedRoles: ['MMT_EXECUTIVE'],
    isCounted: true,
    category: 'action',
    priority: 2,
    description: 'Site measurement visits assigned to MMT executive.',
  },
  'finance-payments': {
    id: 'finance-payments',
    title: 'Payment Approvals',
    allowedRoles: ['FINANCE'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'Customer payment proofs (10% and 40%) awaiting finance verification.',
  },
  'pm-assigned': {
    id: 'pm-assigned',
    title: 'D2 Masking & PM Approvals',
    allowedRoles: ['PROJECT_MANAGER'],
    isCounted: true,
    category: 'action',
    priority: 2,
    description: 'Site masking visits and milestone approvals assigned to Project Manager.',
  },
  'spm-assigned': {
    id: 'spm-assigned',
    title: 'D2 Requests Awaiting PM Assignment',
    allowedRoles: ['SENIOR_PROJECT_MANAGER'],
    isCounted: true,
    category: 'action',
    priority: 1,
    description: 'D2 masking requests awaiting Project Manager assignment by SPM.',
  },
  'extended-holds-watchlist': {
    id: 'extended-holds-watchlist',
    title: 'Extended / Indefinite Holds (>30d)',
    allowedRoles: ['DESIGN_MANAGER', 'TERRITORIAL_DESIGN_MANAGER', 'ADMIN', 'DEPUTY_GENERAL_MANAGER'],
    isCounted: false,
    category: 'watchlist',
    priority: 4,
    description: 'Projects on hold >30 days or indefinite. Uncounted watchlist; does not block All caught up.',
  },
  'holds-resuming-soon': {
    id: 'holds-resuming-soon',
    title: 'Holds Ending Soon (Today/Tomorrow)',
    allowedRoles: ['DESIGN_MANAGER', 'TERRITORIAL_DESIGN_MANAGER', 'ADMIN', 'DEPUTY_GENERAL_MANAGER'],
    isCounted: false,
    category: 'watchlist',
    priority: 4,
    description: 'Heads-up on holds resuming within 48h. Uncounted watchlist.',
  },
} as const;

/**
 * Roles that have authority to decide on, review, or resume holds.
 * Designers, DQC, MMT, Finance, and Operation Managers do NOT decide holds.
 */
export const HOLD_AUTHORITY_ROLES = new Set([
  'DESIGN_MANAGER',
  'TERRITORIAL_DESIGN_MANAGER',
  'ADMIN',
  'DEPUTY_GENERAL_MANAGER',
]);

export function isHoldAuthorityRole(role?: string | null): boolean {
  return HOLD_AUTHORITY_ROLES.has(normalizeRole(role));
}

export function isRoleAllowedForQueue(role: string | null | undefined, queueId: string): boolean {
  const norm = normalizeRole(role);
  const def = ACTION_QUEUES[queueId];
  if (!def) return false;
  return def.allowedRoles.includes(norm);
}

export function getQueuesForRole(role: string | null | undefined): ActionQueueDefinition[] {
  const norm = normalizeRole(role);
  return Object.values(ACTION_QUEUES).filter((q) => q.allowedRoles.includes(norm));
}

/**
 * Hold threshold in IST (Asia/Kolkata).
 * A hold is extended if strictly greater than 30 full days (i.e. 31+ days elapsed).
 */
export const LONG_HOLD_DAYS_THRESHOLD = 30;

export function calculateDaysOnHold(
  heldSince: string | Date | null | undefined,
  now: Date = new Date()
): number {
  if (!heldSince) return 0;
  const s = typeof heldSince === 'string' ? new Date(heldSince) : heldSince;
  if (Number.isNaN(s.getTime())) return 0;

  // Convert to IST calendar date diff
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = now.getTime() - s.getTime();
  return Math.max(0, Math.floor(diffMs / msPerDay));
}

export function isLongHoldEligible(
  heldSince: string | Date | null | undefined,
  resumeAt: string | Date | null | undefined,
  now: Date = new Date()
): { isLong: boolean; daysOnHold: number; isIndefinite: boolean } {
  const daysOnHold = calculateDaysOnHold(heldSince, now);
  const isIndefinite = !resumeAt;

  // A project qualifies for extended/indefinite holds if it has been on hold for >30 full days (31+ days) or has no resume date
  const isLong = daysOnHold > LONG_HOLD_DAYS_THRESHOLD || isIndefinite;
  return { isLong, daysOnHold, isIndefinite };
}
