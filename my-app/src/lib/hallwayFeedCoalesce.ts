import { resolveWeeklyPerformerContext, istYmdFromDate } from './hallwayWeeklyPerformer';

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

function dealRecognitionYmd(item: CoalesceableFeedItem): string {
  const fromBooking = String(item.rawBooking?.bookingDoneDate || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromBooking)) return fromBooking;
  const ts = String(item.timestamp || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts;
  return '';
}

function monthLabelFromKey(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  if (!m || m < 1 || m > 12) return monthKey;
  return MONTH_NAMES[m - 1];
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
  const list = items.map((i) => ({ ...i, honorBadges: i.honorBadges ? [...i.honorBadges] : undefined }));
  const weeklyCtx = resolveWeeklyPerformerContext(now);
  const scoring = weeklyCtx.scoringBounds;
  const monthKey = istYmdFromDate(now).slice(0, 7);

  const weekly = list.find(isWeeklyItem);
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
    const ymd = dealRecognitionYmd(item);
    if (!ymd) continue;

    const flags: MatchFlags = { weekly: false, monthly: false };

    if (
      weekly &&
      weeklyName &&
      name === weeklyName &&
      amountsClose(inr, weeklyInr) &&
      ymd >= scoring.mondayYmd &&
      ymd <= scoring.sundayYmd
    ) {
      flags.weekly = true;
    }

    if (
      monthly &&
      monthlyName &&
      name === monthlyName &&
      amountsClose(inr, monthlyInr) &&
      ymd.slice(0, 7) === monthKey
    ) {
      flags.monthly = true;
    }

    if (!flags.weekly && !flags.monthly) continue;

    if (!best) {
      best = { item, flags };
      continue;
    }
    const score = (f: MatchFlags) => (f.weekly ? 2 : 0) + (f.monthly ? 1 : 0);
    if (score(flags) > score(best.flags)) {
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
    badges.push(`Leading ${monthLabelFromKey(monthKey)}`);
  }

  const fullStack =
    best.flags.weekly &&
    best.flags.monthly &&
    weeklyName === monthlyName &&
    amountsClose(weeklyInr, monthlyInr);

  const suppressed = new Set<string>();
  if (fullStack) {
    if (weekly?.id) suppressed.add(weekly.id);
    if (monthly?.id) suppressed.add(monthly.id);
  }

  const out = list
    .filter((i) => !suppressed.has(i.id))
    .map((i) => {
      if (i.id !== best!.item.id) return i;
      const merged = new Set([...(i.honorBadges || []), ...badges]);
      return { ...i, honorBadges: Array.from(merged) };
    });

  return { items: out, suppressedPerformerIds: Array.from(suppressed) };
}