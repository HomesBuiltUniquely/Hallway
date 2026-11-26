import { istYmdFromDate } from './hallwayWeeklyPerformer';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type IstMonthBounds = {
  monthKey: string;
  dateFrom: string;
  dateTo: string;
  fromMs: number;
  toMs: number;
};

export type MonthlyPerformerContext = {
  displayMonthKey: string;
  scoringBounds: IstMonthBounds;
  monthlyCardId: string;
  milestoneCardId: string;
  monthLabel: string;
  cardCreatedAtIso: string;
  milestoneCreatedAtIso: string;
};

/** Full IST calendar month for a given yyyy-mm key or date. */
export function monthBoundsForKey(monthKey: string): IstMonthBounds {
  const [y, m] = monthKey.split('-').map(Number);
  const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const toMs = new Date(`${nextMonth}T00:00:00+05:30`).getTime() - 1;
  const dateTo = istYmdFromDate(new Date(toMs));
  return {
    monthKey,
    dateFrom,
    dateTo,
    fromMs: new Date(`${dateFrom}T00:00:00+05:30`).getTime(),
    toMs,
  };
}

/** Previous calendar month key (yyyy-mm). */
export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function monthlyPerformerCardId(scoringMonthKey: string): string {
  return `crm-monthly-top-${scoringMonthKey}`;
}

export function monthMilestoneCardId(scoringMonthKey: string): string {
  return `crm-month-milestone-${scoringMonthKey}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!m || m < 1 || m > 12) return monthKey;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * Completed calendar month = previous month; card publishes at start of display month.
 * Example: during November, score October; card id crm-monthly-top-2026-10.
 */
export function resolveMonthlyPerformerContext(now = new Date()): MonthlyPerformerContext {
  const displayMonthKey = istYmdFromDate(now).slice(0, 7);
  const scoringMonthKey = previousMonthKey(displayMonthKey);
  const scoringBounds = monthBoundsForKey(scoringMonthKey);
  const displayFirst = `${displayMonthKey}-01`;
  return {
    displayMonthKey,
    scoringBounds,
    monthlyCardId: monthlyPerformerCardId(scoringMonthKey),
    milestoneCardId: monthMilestoneCardId(scoringMonthKey),
    monthLabel: formatMonthLabel(scoringMonthKey),
    cardCreatedAtIso: `${displayFirst}T00:05:00+05:30`,
    milestoneCreatedAtIso: `${displayFirst}T00:04:00+05:30`,
  };
}

/** Badge copy for coalesce on deal cards. */
export function leadingMonthBadge(scoringMonthKey: string): string {
  const [y, m] = scoringMonthKey.split('-').map(Number);
  const name = m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : scoringMonthKey;
  return `Leading ${name}`;
}