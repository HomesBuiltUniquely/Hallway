/** IST Mon–Sun scoring + delayed display week for Hallway weekly top performer. */

export type IstWeekBounds = {
  mondayYmd: string;
  sundayYmd: string;
  weekFromMs: number;
  weekToMs: number;
};

export type WeeklyPerformerContext = {
  displayBounds: IstWeekBounds;
  scoringBounds: IstWeekBounds;
  cardId: string;
  label: string;
  cardCreatedAtIso: string;
};

export function istYmdFromDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function dayOfWeekIst(ymd: string): number {
  return new Date(`${ymd}T12:00:00+05:30`).getUTCDay();
}

/** Current calendar week Mon 00:00 → Sun 23:59:59.999 IST (display window). */
export function displayWeekBounds(now = new Date()): IstWeekBounds {
  const today = istYmdFromDate(now);
  const dow = dayOfWeekIst(today);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayYmd = addDaysYmd(today, diffToMonday);
  const sundayYmd = addDaysYmd(mondayYmd, 6);
  const weekFromMs = new Date(`${mondayYmd}T00:00:00+05:30`).getTime();
  const weekToMs = new Date(`${sundayYmd}T23:59:59.999+05:30`).getTime();
  return { mondayYmd, sundayYmd, weekFromMs, weekToMs };
}

/** Completed week immediately before this display week (scoring window). */
export function scoringWeekBounds(now = new Date()): IstWeekBounds {
  const display = displayWeekBounds(now);
  const mondayYmd = addDaysYmd(display.mondayYmd, -7);
  const sundayYmd = addDaysYmd(mondayYmd, 6);
  const weekFromMs = new Date(`${mondayYmd}T00:00:00+05:30`).getTime();
  const weekToMs = new Date(`${sundayYmd}T23:59:59.999+05:30`).getTime();
  return { mondayYmd, sundayYmd, weekFromMs, weekToMs };
}

export function weeklyPerformerCardId(scoringMondayYmd: string): string {
  return `crm-weekly-top-${scoringMondayYmd}`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Human label e.g. "16–22 Nov" or "30 Jan – 5 Feb" when crossing months. */
export function formatScoredWeekLabel(mondayYmd: string, sundayYmd: string): string {
  const [, sm, sd] = mondayYmd.split('-').map(Number);
  const [, em, ed] = sundayYmd.split('-').map(Number);
  if (sm === em) {
    return `${sd}–${ed} ${MONTH_NAMES[em - 1]}`;
  }
  return `${sd} ${MONTH_NAMES[sm - 1]} – ${ed} ${MONTH_NAMES[em - 1]}`;
}

export function resolveWeeklyPerformerContext(now = new Date()): WeeklyPerformerContext {
  const displayBounds = displayWeekBounds(now);
  const scoringBounds = scoringWeekBounds(now);
  const label = formatScoredWeekLabel(scoringBounds.mondayYmd, scoringBounds.sundayYmd);
  return {
    displayBounds,
    scoringBounds,
    cardId: weeklyPerformerCardId(scoringBounds.mondayYmd),
    label,
    cardCreatedAtIso: `${scoringBounds.sundayYmd}T23:59:00+05:30`,
  };
}

/** Hallway reset (IST): no weekly cards for scoring weeks before the week we reopened the program. */
const WEEKLY_PROGRAM_RESET_ANCHOR = new Date('2026-11-28T12:00:00+05:30');

export const WEEKLY_PERFORMER_PROGRAM_START_MONDAY_YMD =
  displayWeekBounds(WEEKLY_PROGRAM_RESET_ANCHOR).mondayYmd;

export function weeklyPerformerScoringMondayFromCardId(id: string): string | null {
  const m = String(id || '').match(/^crm-weekly-top-(\d{4}-\d{2}-\d{2})$/);
  return m ? m[1] : null;
}

export function isWeeklyPerformerProgramScoringWeek(scoringMondayYmd: string): boolean {
  return Boolean(scoringMondayYmd && scoringMondayYmd >= WEEKLY_PERFORMER_PROGRAM_START_MONDAY_YMD);
}

/** Publish the Top Performer card only for scoring weeks on/after program start (not retro weeks). */
export function shouldPublishWeeklyTopPerformerCard(now = new Date()): boolean {
  const { scoringBounds } = resolveWeeklyPerformerContext(now);
  return isWeeklyPerformerProgramScoringWeek(scoringBounds.mondayYmd);
}

export function isVisibleWeeklyTopPerformerCardId(id: string): boolean {
  if (!String(id || '').startsWith('crm-weekly-top-')) return true;
  const monday = weeklyPerformerScoringMondayFromCardId(id);
  if (!monday) return false;
  return isWeeklyPerformerProgramScoringWeek(monday);
}