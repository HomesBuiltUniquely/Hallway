import { leadingMonthBadge, resolveMonthlyPerformerContext } from './hallwayMonthlyPerformer';
import {
  istYmdFromDate,
  resolveWeeklyPerformerContext,
  shouldPublishWeeklyTopPerformerCard,
} from './hallwayWeeklyPerformer';

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

export type CoalesceableFeedItem = {
  id: string;
  registerKind?: string;
  quoteFormatted?: string;
  timestamp?: string;
  /** When this card first appeared on the Hallway feed (announcements.created_at). */
  createdAt?: string;
  author?: { name?: string | null };
  rawBooking?: {
    quoteAmount?: number;
    bookingDoneDate?: string;
    listingType?: string;
  };
  honorBadges?: string[];
};

function normalizePersonName(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function parseInrFromFormatted(raw?: string | null): number {
  const t = String(raw || '')
    .replace(/,/g, '')
    .trim();
  const cr = t.match(/([\d.]+)\s*Cr/i);
  if (cr) return parseFloat(cr[1]) * 10_000_000;
  const l = t.match(/([\d.]+)\s*L/i);
  if (l) return parseFloat(l[1]) * 100_000;
  const bare = t.match(/₹?\s*([\d.]+)/);
  if (bare) return parseFloat(bare[1]);
  return 0;
}

export function amountInrForItem(item: CoalesceableFeedItem): number {
  const fromRaw = Number(item.rawBooking?.quoteAmount);
  if (Number.isFinite(fromRaw) && fromRaw > 0) return fromRaw;
  return parseInrFromFormatted(item.quoteFormatted);
}

export function amountsClose(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return false;
  return Math.abs(a - b) <= 1;
}

export function bookingRecognitionYmdForCoalesce(item: CoalesceableFeedItem): string {
  const fromBooking = String(item.rawBooking?.bookingDoneDate || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromBooking)) return fromBooking;
  return '';
}

function inScoringWeek(ymd: string, mondayYmd: string, sundayYmd: string): boolean {
  return Boolean(ymd && ymd >= mondayYmd && ymd <= sundayYmd);
}

function hallwayFirstSeenYmd(item: CoalesceableFeedItem): string {
  if (!item.createdAt) return '';
  const when = new Date(item.createdAt);
  if (Number.isNaN(when.getTime())) return '';
  return istYmdFromDate(when);
}

/**
 * Weekly honor belongs on a deal card only when the booking closed in the scoring week
 * and the Hallway announcement is not older than that week (avoids "1 Nov" + "week 16–22").
 */
export function weeklyHonorEligibleForBooking(
  item: CoalesceableFeedItem,
  bookingYmd: string,
  mondayYmd: string,
  sundayYmd: string
): boolean {
  if (!inScoringWeek(bookingYmd, mondayYmd, sundayYmd)) return false;
  const hallwayYmd = hallwayFirstSeenYmd(item);
  if (!hallwayYmd) return true;
  return hallwayYmd >= mondayYmd;
}

function honorCandidateRank(
  item: CoalesceableFeedItem,
  flags: { weekly: boolean; monthly: boolean },
  weeklyInr: number,
  monthlyInr: number
): number {
  const inr = amountInrForItem(item);
  const ymd = bookingRecognitionYmdForCoalesce(item);
  let rank = 0;
  if (flags.weekly) rank += 10_000;
  if (flags.monthly) rank += 1_000;
  if (flags.weekly && amountsClose(inr, weeklyInr)) rank += 500;
  if (flags.monthly && amountsClose(inr, monthlyInr)) rank += 200;
  if (flags.weekly) rank += inr;
  if (ymd) rank += new Date(`${ymd}T12:00:00+05:30`).getTime() / 1e9;
  return rank;
}

function isBookingItem(item: CoalesceableFeedItem): boolean {
  if (item.registerKind === 'booking') return true;
  if (!String(item.id || '').startsWith('crm-booking-')) return false;
  const listing = String(item.rawBooking?.listingType || 'booking').toLowerCase();
  return listing === 'booking' || listing === '';
}

function isWeeklyItem(item: CoalesceableFeedItem): boolean {
  return item.registerKind === 'weekly' || String(item.id || '').startsWith('crm-weekly-top-');
}

function isMonthlyItem(item: CoalesceableFeedItem): boolean {
  return item.registerKind === 'monthly' || String(item.id || '').startsWith('crm-monthly-top-');
}

export type CoalesceResult<T extends CoalesceableFeedItem> = {
  items: T[];
  suppressedPerformerIds: string[];
};

/**
 * When one booking is both the deal story and the sole driver of week/month performer cards,
 * attach honor badges to the deal card and drop duplicate performer cards from the feed.
 */
export function coalesceAnnouncementFeed<T extends CoalesceableFeedItem>(
  items: T[],
  now = new Date()
): CoalesceResult<T> {
  let list = items.map((i) => {
    const copy = { ...i };
    delete copy.honorBadges;
    return copy;
  });
  const weeklyCtx = resolveWeeklyPerformerContext(now);
  const scoring = weeklyCtx.scoringBounds;
  const monthlyCtx = resolveMonthlyPerformerContext(now);
  const scoringMonthKey = monthlyCtx.scoringBounds.monthKey;
  const weeklyProgramOn = shouldPublishWeeklyTopPerformerCard(now);

  if (!weeklyProgramOn) {
    list = list.filter((i) => !isWeeklyItem(i));
  }

  const weekly = weeklyProgramOn ? list.find(isWeeklyItem) : undefined;
  const monthly = list.find(isMonthlyItem);
  if (!weekly && !monthly) {
    return { items: list, suppressedPerformerIds: [] };
  }

  const weeklyName = weekly ? normalizePersonName(weekly.author?.name) : '';
  const monthlyName = monthly ? normalizePersonName(monthly.author?.name) : '';
  const weeklyInr = weekly ? amountInrForItem(weekly) : 0;
  const monthlyInr = monthly ? amountInrForItem(monthly) : 0;

  type MatchFlags = { weekly: boolean; monthly: boolean };
  let best: { item: T; flags: MatchFlags } | null = null;

  for (const item of list) {
    if (!isBookingItem(item)) continue;
    const name = normalizePersonName(item.author?.name);
    const inr = amountInrForItem(item);
    const ymd = bookingRecognitionYmdForCoalesce(item);
    if (!ymd) continue;

    const flags: MatchFlags = { weekly: false, monthly: false };

    if (
      weekly &&
      weeklyName &&
      name === weeklyName &&
      weeklyHonorEligibleForBooking(item, ymd, scoring.mondayYmd, scoring.sundayYmd) &&
      amountsClose(inr, weeklyInr)
    ) {
      flags.weekly = true;
    }

    if (
      monthly &&
      monthlyName &&
      name === monthlyName &&
      amountsClose(inr, monthlyInr) &&
      ymd.slice(0, 7) === scoringMonthKey
    ) {
      flags.monthly = true;
    }

    if (!flags.weekly && !flags.monthly) continue;

    if (!best) {
      best = { item, flags };
      continue;
    }
    const nextRank = honorCandidateRank(item, flags, weeklyInr, monthlyInr);
    const bestRank = honorCandidateRank(best.item, best.flags, weeklyInr, monthlyInr);
    if (nextRank > bestRank) {
      best = { item, flags };
    }
  }

  if (!best) {
    return { items: list, suppressedPerformerIds: [] };
  }

  const badges: string[] = [];
  if (best.flags.weekly) {
    badges.push(`Top of the week · Week of ${weeklyCtx.label}`);
  }
  if (best.flags.monthly) {
    badges.push(leadingMonthBadge(scoringMonthKey));
  }

  const suppressed = new Set<string>();
  if (best.flags.weekly && weekly?.id) suppressed.add(weekly.id);
  if (best.flags.monthly && monthly?.id) suppressed.add(monthly.id);

  const out = list
    .filter((i) => !suppressed.has(i.id))
    .map((i) => {
      if (i.id !== best!.item.id) return i;
      const merged = new Set([...(i.honorBadges || []), ...badges]);
      return { ...i, honorBadges: Array.from(merged) };
    });

  return { items: out, suppressedPerformerIds: Array.from(suppressed) };
}