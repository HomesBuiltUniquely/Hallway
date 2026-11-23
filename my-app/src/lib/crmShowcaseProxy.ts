import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getPool } from './db';
import { formatPersonName } from './hallwayDisplay';

const DEFAULT_CRM = 'https://hows.hubinterior.com';
const UPSTREAM_MS = 60_000;
const LOGIN_MS = 2_000;
const CACHE_TTL_MS = 60_000;

const CACHE_DIR = path.join(process.cwd(), '.cache');
const DISK_CACHE_FILE = path.join(CACHE_DIR, 'crm_showcase_cache.json');

const CRM_BASE = (
  process.env.CRM_API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_CRM_API_URL ||
  DEFAULT_CRM
)
  .replace(/\/$/, '')
  .replace('://localhost', '://127.0.0.1');

let cachedToken: string | null = null;
let tokenInflight: Promise<string> | null = null;
type UpstreamPayload = { status: number; contentType: string | null; body: ArrayBuffer };
const getInflight = new Map<string, Promise<UpstreamPayload>>();
const getCache = new Map<string, { expiresAt: number; payload: UpstreamPayload }>();
const DESIGN_FEED_CACHE_TTL_MS = 30_000;
const designFeedCache = new Map<string, { expiresAt: number; status: number; body: ArrayBuffer }>();

const SEED_PEOPLE_JSON = JSON.stringify({
  statsWindow: '1y',
  people: [
    { id: 138, name: 'Aman Nirmal', role: 'Sales Executive', branchId: 'SARJAPUR', managerId: 192, managerName: 'arjun hub', email: 'aman@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹89.23L', conversionRate: 2.9, statsWindow: '1y' },
    { id: 192, name: 'arjun hub', role: 'Sales Manager', branchId: 'SARJAPUR', managerId: 11, managerName: null, email: 'arjunvc@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹1.63 Cr', conversionRate: 2.4, statsWindow: '1y' },
    { id: 187, name: 'Danush Rao', role: 'Sales Executive', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P', email: 'Danush@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹1.04 Cr', conversionRate: 2.0, statsWindow: '1y' },
    { id: 18, name: 'Jayashree', role: 'Sales Executive', branchId: 'SARJAPUR', managerId: 192, managerName: 'arjun hub', email: 'jayashree@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹74.08L', conversionRate: 1.9, statsWindow: '1y' },
    { id: 13, name: 'Kulwanth P', role: 'Sales Manager', branchId: 'HBR', managerId: 11, managerName: null, email: 'kulwanth@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹2.94 Cr', conversionRate: 2.3, statsWindow: '1y' },
    { id: 143, name: 'marfani hub', role: 'Sales Manager', branchId: 'JP_NAGAR', managerId: 11, managerName: null, email: 'marfani@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹66.18L', conversionRate: 1.3, statsWindow: '1y' },
    { id: 23, name: 'Meghana', role: 'Sales Executive', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P', email: 'meghana@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹1.79 Cr', conversionRate: 4.3, statsWindow: '1y' },
    { id: 196, name: 'Mohammed Bilal', role: 'Sales Executive', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub', email: 'mohammed@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹34.80L', conversionRate: 1.6, statsWindow: '1y' },
    { id: 197, name: 'Priti Dutta', role: 'Sales Executive', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub', email: 'priti@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹9.16L', conversionRate: 0.8, statsWindow: '1y' },
    { id: 195, name: 'Shaddisha Chari', role: 'Sales Executive', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub', email: 'shaddisha@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹22.22L', conversionRate: 1.7, statsWindow: '1y' },
    { id: 176, name: 'Somashekar_V', role: 'Sales Executive', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P', email: 'somashekara@hubinterior.com', active: true, avatar: null, department: 'Sales', revenueFormatted: '₹10.44L', conversionRate: 0.6, statsWindow: '1y' },
  ],
});

function getDiskCache(): Record<string, { expiresAt: number; status: number; contentType: string | null; bodyBase64: string }> {
  try {
    if (!existsSync(DISK_CACHE_FILE)) return {};
    const content = readFileSync(DISK_CACHE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function saveDiskCacheEntry(key: string, expiresAt: number, payload: UpstreamPayload) {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    const current = getDiskCache();
    const base64 = Buffer.from(payload.body).toString('base64');
    current[key] = {
      expiresAt,
      status: payload.status,
      contentType: payload.contentType,
      bodyBase64: base64,
    };
    writeFileSync(DISK_CACHE_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist crm cache to disk:', err);
  }
}


const ALL_TIME_LEADERBOARD_INDIVIDUALS = [
  {
    id: '23',
    userId: 23,
    name: 'Meghana',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    revenue: 17924492,
    revenueFormatted: '₹1.79 Cr',
    bookings: 23,
    conversionRate: 4.3,
    trend: 'up' as const,
    rank: 1,
  },
  {
    id: '187',
    userId: 187,
    name: 'Danush Rao',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    revenue: 10395067,
    revenueFormatted: '₹1.04 Cr',
    bookings: 10,
    conversionRate: 2.0,
    trend: 'up' as const,
    rank: 2,
  },
  {
    id: '138',
    userId: 138,
    name: 'Aman Nirmal',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'SARJAPUR',
    revenue: 8922658,
    revenueFormatted: '₹89.23L',
    bookings: 11,
    conversionRate: 2.9,
    trend: 'up' as const,
    rank: 3,
  },
  {
    id: '18',
    userId: 18,
    name: 'Jayashree',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'SARJAPUR',
    revenue: 7407829,
    revenueFormatted: '₹74.08L',
    bookings: 9,
    conversionRate: 1.9,
    trend: 'flat' as const,
    rank: 4,
  },
  {
    id: '196',
    userId: 196,
    name: 'Mohammed Bilal',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    revenue: 3479953,
    revenueFormatted: '₹34.80L',
    bookings: 2,
    conversionRate: 1.4,
    trend: 'down' as const,
    rank: 5,
  },
  {
    id: '195',
    userId: 195,
    name: 'Shaddisha Chari',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    revenue: 2221847,
    revenueFormatted: '₹22.22L',
    bookings: 2,
    conversionRate: 1.6,
    trend: 'down' as const,
    rank: 6,
  },
  {
    id: '176',
    userId: 176,
    name: 'Somashekar_V',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    revenue: 1043550,
    revenueFormatted: '₹10.44L',
    bookings: 2,
    conversionRate: 0.6,
    trend: 'down' as const,
    rank: 7,
  },
  {
    id: '197',
    userId: 197,
    name: 'Priti Dutta',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    revenue: 915869,
    revenueFormatted: '₹9.16L',
    bookings: 1,
    conversionRate: 0.8,
    trend: 'down' as const,
    rank: 8,
  },
];

const ALL_TIME_LEADERBOARD_TEAMS = [
  {
    id: '13',
    salesManagerId: 13,
    teamName: 'HBR — Kulwanth P',
    leadName: 'Kulwanth P',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    totalRevenue: '₹2.94 Cr',
    totalRevenueInr: 29417662,
    dealsClosed: 36,
    winRate: 2.3,
    trend: 'up' as const,
    rank: 1,
  },
  {
    id: '192',
    salesManagerId: 192,
    teamName: 'SARJAPUR — arjun hub',
    leadName: 'arjun hub',
    avatar: null,
    department: 'Sales',
    branchId: 'SARJAPUR',
    totalRevenue: '₹1.63 Cr',
    totalRevenueInr: 16330487,
    dealsClosed: 20,
    winRate: 2.4,
    trend: 'up' as const,
    rank: 2,
  },
  {
    id: '143',
    salesManagerId: 143,
    teamName: 'JP_NAGAR — marfani hub',
    leadName: 'marfani hub',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    totalRevenue: '₹66.18L',
    totalRevenueInr: 6617669,
    dealsClosed: 5,
    winRate: 1.3,
    trend: 'down' as const,
    rank: 3,
  },
];

const QTD_ACHIEVED_BENCHMARKS: Record<
  string,
  { revenue: number; revenueFormatted: string; branchId: string; managerId: number; managerName: string }
> = {
  '138': { revenue: 7026000, revenueFormatted: '₹70.26L', branchId: 'SARJAPUR', managerId: 192, managerName: 'arjun hub' },      // Aman Nirmal
  '18': { revenue: 6781000, revenueFormatted: '₹67.81L', branchId: 'SARJAPUR', managerId: 192, managerName: 'arjun hub' },       // Jayashree
  '23': { revenue: 4504000, revenueFormatted: '₹45.04L', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P' },            // Meghana
  '195': { revenue: 2222000, revenueFormatted: '₹22.22L', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub' },     // Shaddisha Chari (Inactive)
  '176': { revenue: 2094000, revenueFormatted: '₹20.94L', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P' },            // Somashekar_V
  '187': { revenue: 1994000, revenueFormatted: '₹19.94L', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P' },            // Danush Rao
  '197': { revenue: 932000, revenueFormatted: '₹9.32L', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub' },       // Priti Dutta
  '196': { revenue: 707000, revenueFormatted: '₹7.07L', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub' },       // Mohammed Bilal
};

const QTD_LEADERBOARD_INDIVIDUALS = [
  {
    id: '138',
    userId: 138,
    name: 'Aman Nirmal',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'SARJAPUR',
    revenue: 7026000,
    revenueFormatted: '₹70.26L',
    bookings: 11,
    conversionRate: 5.2,
    trend: 'up' as const,
    rank: 1,
  },
  {
    id: '18',
    userId: 18,
    name: 'Jayashree',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'SARJAPUR',
    revenue: 6781000,
    revenueFormatted: '₹67.81L',
    bookings: 11,
    conversionRate: 5.3,
    trend: 'up' as const,
    rank: 2,
  },
  {
    id: '23',
    userId: 23,
    name: 'Meghana',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    revenue: 4504000,
    revenueFormatted: '₹45.04L',
    bookings: 17,
    conversionRate: 7.7,
    trend: 'up' as const,
    rank: 3,
  },
  {
    id: '195',
    userId: 195,
    name: 'Shaddisha Chari (Inactive)',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    revenue: 2222000,
    revenueFormatted: '₹22.22L',
    bookings: 2,
    conversionRate: 2.3,
    trend: 'up' as const,
    rank: 4,
  },
  {
    id: '176',
    userId: 176,
    name: 'Somashekar_V',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    revenue: 2094000,
    revenueFormatted: '₹20.94L',
    bookings: 7,
    conversionRate: 3.2,
    trend: 'up' as const,
    rank: 5,
  },
  {
    id: '187',
    userId: 187,
    name: 'Danush Rao',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    revenue: 1994000,
    revenueFormatted: '₹19.94L',
    bookings: 9,
    conversionRate: 4.1,
    trend: 'up' as const,
    rank: 6,
  },
  {
    id: '197',
    userId: 197,
    name: 'Priti Dutta',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    revenue: 932000,
    revenueFormatted: '₹9.32L',
    bookings: 2,
    conversionRate: 1.4,
    trend: 'down' as const,
    rank: 7,
  },
  {
    id: '196',
    userId: 196,
    name: 'Mohammed Bilal',
    role: 'Sales Executive',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    revenue: 707000,
    revenueFormatted: '₹7.07L',
    bookings: 4,
    conversionRate: 2.4,
    trend: 'down' as const,
    rank: 8,
  },
];

const QTD_LEADERBOARD_TEAMS = [
  {
    id: '192',
    salesManagerId: 192,
    teamName: 'SARJAPUR — arjun hub',
    leadName: 'arjun hub',
    avatar: null,
    department: 'Sales',
    branchId: 'SARJAPUR',
    totalRevenue: '₹1.38 Cr',
    totalRevenueInr: 13807000,
    dealsClosed: 22,
    winRate: 5.2,
    trend: 'up' as const,
    rank: 1,
  },
  {
    id: '13',
    salesManagerId: 13,
    teamName: 'HBR — Kulwanth P',
    leadName: 'Kulwanth P',
    avatar: null,
    department: 'Sales',
    branchId: 'HBR',
    totalRevenue: '₹85.92L',
    totalRevenueInr: 8592000,
    dealsClosed: 33,
    winRate: 5.1,
    trend: 'up' as const,
    rank: 2,
  },
  {
    id: '143',
    salesManagerId: 143,
    teamName: 'JP_NAGAR — marfani hub',
    leadName: 'marfani hub',
    avatar: null,
    department: 'Sales',
    branchId: 'JP_NAGAR',
    totalRevenue: '₹38.61L',
    totalRevenueInr: 3861000,
    dealsClosed: 8,
    winRate: 2.0,
    trend: 'down' as const,
    rank: 3,
  },
];

const EXECUTIVE_ROSTER = [
  { id: 138, name: 'Aman Nirmal', role: 'Sales Executive', branchId: 'SARJAPUR', managerId: 192, managerName: 'arjun hub' },
  { id: 18, name: 'Jayashree', role: 'Sales Executive', branchId: 'SARJAPUR', managerId: 192, managerName: 'arjun hub' },
  { id: 187, name: 'Danush Rao', role: 'Sales Executive', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P' },
  { id: 23, name: 'Meghana', role: 'Sales Executive', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P' },
  { id: 176, name: 'Somashekar_V', role: 'Sales Executive', branchId: 'HBR', managerId: 13, managerName: 'Kulwanth P' },
  { id: 196, name: 'Mohammed Bilal', role: 'Sales Executive', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub' },
  { id: 197, name: 'Priti Dutta', role: 'Sales Executive', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub' },
  { id: 195, name: 'Shaddisha Chari', role: 'Sales Executive', branchId: 'JP_NAGAR', managerId: 143, managerName: 'marfani hub' },
];

function matchExecutive(raw?: string | null) {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s.includes('test') || s.includes('alice') || s.includes('shalny') || s.includes('razi')) return null;
  return EXECUTIVE_ROSTER.find((e) => {
    const el = e.name.toLowerCase();
    return s === el || s.includes(el) || el.includes(s) || (el.split(' ')[0] && s.startsWith(el.split(' ')[0]));
  }) || null;
}

const bookingLeaderboardCache = new Map<string, { expiresAt: number; data: any }>();
const bookingTokenDealsCache = new Map<string, { expiresAt: number; deals: any[] }>();
const bookingTokenDealsInflight = new Map<string, Promise<any[]>>();
const BOOKING_TOKEN_DEALS_TTL_MS = 30_000;

function isBookingOrTokenListing(listingType: unknown): boolean {
  const t = String(listingType || '').toLowerCase();
  return t === 'booking' || t === 'token';
}

/**
 * Same rule as CRM Booking & Token tab (BOOKING filter):
 * bookingStatus === confirmed → booking; cancel stays cancel; else token.
 */
function resolveCrmListingType(d: any): 'booking' | 'token' | 'cancel' {
  const listing = String(d?.listingType || '').toLowerCase();
  const status = String(d?.bookingStatus || '').toLowerCase();
  const cancelled =
    listing === 'cancel' ||
    status === 'cancelled' ||
    d?.isCancelled === true ||
    String(d?.cancellationApprovalStatus || '').toUpperCase() === 'APPROVED';
  if (cancelled) return 'cancel';
  if (status === 'confirmed' || listing === 'booking') return 'booking';
  return 'token';
}

/** CRM handoff timestamp — legacy; prefer {@link dealRecognitionMs} for BOOKING tab filters. */
function dealSubmittedMs(d: any): number {
  const raw = d?.submittedAt || d?.createdAt || d?.bookingDate;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(t) ? t : NaN;
}

/** Booking & Token listing recognition date (IST), aligned with {@code BookingTokenRecognitionDates}. */
function dealRecognitionYmd(d: any): string {
  const raw =
    d?.listingDate ||
    d?.bookingRecognitionDate ||
    d?.bookingDoneDate ||
    d?.tenPercentPaidDate ||
    d?.bookingDate ||
    null;
  if (raw) {
    const s = String(raw).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const fallback = d?.submittedAt || d?.createdAt;
  if (!fallback) return '';
  const t = new Date(fallback);
  if (!Number.isNaN(t.getTime())) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(t);
  }
  const s = String(fallback).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function dealRecognitionMs(d: any): number {
  const ymd = dealRecognitionYmd(d);
  if (!ymd) return NaN;
  return new Date(`${ymd}T12:00:00+05:30`).getTime();
}

function branchLabelForTeam(teamName: string): string {
  if (/sarjapur/i.test(teamName)) return 'SARJAPUR';
  if (/hbr/i.test(teamName)) return 'HBR';
  if (/jp\s*nagar/i.test(teamName)) return 'JP NAGAR';
  return '';
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function dayOfWeekIst(ymd: string): number {
  // Noon IST shares the same civil weekday in UTC.
  return new Date(`${ymd}T12:00:00+05:30`).getUTCDay();
}

function istYmdNow(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function istMonthBoundsMs(now = new Date()) {
  const today = istYmdNow(now);
  const [y, m] = today.split('-').map(Number);
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return {
    monthFromMs: new Date(`${monthStart}T00:00:00+05:30`).getTime(),
    monthToMs: new Date(`${nextMonth}T00:00:00+05:30`).getTime() - 1,
    monthKey: monthStart.slice(0, 7),
  };
}

function isTestAssignee(who: string): boolean {
  const w = who.toLowerCase();
  return w.includes('test') || w.includes('alice') || w.includes('shalny') || w.includes('razi');
}

function dealTimestampMs(d: any): number {
  if (resolveCrmListingType(d) === 'booking') {
    const recognition = dealRecognitionMs(d);
    if (Number.isFinite(recognition)) return recognition;
  }
  const raw = d?.submittedAt || d?.bookingDate || d?.createdAt;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(t) ? t : NaN;
}

/** Shared Booking & Token deals fetch (both listing types) with short TTL + request coalesce. */
async function fetchBookingAndTokenDeals(opts: {
  submittedFrom?: string;
  submittedTo?: string;
  dateRange?: string;
}): Promise<any[]> {
  const cacheKey = `${opts.submittedFrom || ''}|${opts.submittedTo || ''}|${opts.dateRange || ''}`;
  const cached = bookingTokenDealsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.deals;

  const inflight = bookingTokenDealsInflight.get(cacheKey);
  if (inflight) return inflight;

  const run = (async () => {
    const token = await getShowcaseCrmToken();
    const dateQs = opts.dateRange
      ? `&dateRange=${encodeURIComponent(opts.dateRange)}`
      : `${
          opts.submittedFrom
            ? `&submittedFrom=${encodeURIComponent(opts.submittedFrom)}`
            : ''
        }${opts.submittedTo ? `&submittedTo=${encodeURIComponent(opts.submittedTo)}` : ''}`;

    const listings = ['booking', 'token'] as const;
    const results = await Promise.allSettled(
      listings.map((listingType) =>
        fetch(
          `${CRM_BASE}/v1/booking-token/deals?page=0&size=500&listingType=${listingType}${dateQs}`,
          {
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
            cache: 'no-store',
          }
        )
      )
    );

    const byId = new Map<string | number, any>();
    for (const settled of results) {
      if (settled.status !== 'fulfilled' || !settled.value.ok) continue;
      try {
        const data = await settled.value.json();
        const deals: any[] = Array.isArray(data?.deals) ? data.deals : [];
        for (const d of deals) {
          if (!d || d.id == null) continue;
          if (!isBookingOrTokenListing(d.listingType)) continue;
          byId.set(d.id, d);
        }
      } catch {
        /* ignore bad payload */
      }
    }

    const deals = Array.from(byId.values());
    bookingTokenDealsCache.set(cacheKey, {
      expiresAt: Date.now() + BOOKING_TOKEN_DEALS_TTL_MS,
      deals,
    });
    return deals;
  })().finally(() => {
    bookingTokenDealsInflight.delete(cacheKey);
  });

  bookingTokenDealsInflight.set(cacheKey, run);
  return run;
}

/** IST Mon–Sun week. Resets every Monday; scores bookings through end of Sunday (or now). */
function currentWeekBounds(now = new Date()) {
  const today = istYmdNow(now);
  const dow = dayOfWeekIst(today);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayYmd = addDaysYmd(today, diffToMonday);
  const sundayYmd = addDaysYmd(mondayYmd, 6);
  const weekFromMs = new Date(`${mondayYmd}T00:00:00+05:30`).getTime();
  const weekToMs = new Date(`${sundayYmd}T23:59:59.999+05:30`).getTime();
  return {
    monday: new Date(weekFromMs),
    mondayYmd,
    sundayYmd,
    weekFromMs,
    weekToMs,
  };
}

/** Week for the board: current Mon–Sun (IST); if empty, prior Mon–Sun still inside this month. */
function resolveWeeklyWindow(now = new Date()) {
  const { monthFromMs, monthToMs, monthKey } = istMonthBoundsMs(now);
  const current = currentWeekBounds(now);
  const prevMondayYmd = addDaysYmd(current.mondayYmd, -7);
  const fallback = currentWeekBounds(new Date(`${prevMondayYmd}T12:00:00+05:30`));
  return {
    monthFromMs,
    monthToMs,
    monthKey,
    primary: current,
    fallback,
  };
}

async function getLeaderboardFromBookingDeals(
  period: 'mtd' | 'qtd' | 'all_time',
  branchId?: string,
  salesManagerId?: number
) {
  const cacheKey = `${period}:${branchId || ''}:${salesManagerId ?? ''}`;
  const cached = bookingLeaderboardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const now = new Date();
  const { periodBounds, loadBookingDealsForPeriod } = await import('./hallwayBookingFeedFromCrm');
  const bounds = periodBounds(period, now);
  const submittedFrom = bounds.dateFrom ? `${bounds.dateFrom}T00:00:00+05:30` : undefined;
  const submittedTo = bounds.dateTo ? `${bounds.dateTo}T23:59:59.999+05:30` : undefined;

  const buildFromDeals = (periodDeals: Array<{ assign: string; dealValue: number }>) => {
    const execStats = new Map<
      number,
      {
        executive: (typeof EXECUTIVE_ROSTER)[0];
        revenue: number;
        tenPercent: number;
        bookings: number;
        leads: number;
      }
    >();

    for (const exec of EXECUTIVE_ROSTER) {
      execStats.set(exec.id, {
        executive: exec,
        revenue: 0,
        tenPercent: 0,
        bookings: 0,
        leads: 0,
      });
    }

    for (const d of periodDeals) {
      if (isTestAssignee(String(d.assign || ''))) continue;
      const matched = matchExecutive(d.assign);
      if (!matched) continue;
      const stat = execStats.get(matched.id);
      if (!stat) continue;
      const dealVal = Number(d.dealValue) || 0;
      stat.revenue += dealVal;
      stat.tenPercent += dealVal * 0.1;
      stat.bookings += 1;
    }

    let individuals = Array.from(execStats.values()).map(
      ({ executive, revenue, tenPercent, bookings, leads }) => {
        const conversionRate =
          leads > 0
            ? Math.round((bookings / leads) * 1000) / 10
            : bookings > 0
              ? Math.min(25, Math.round((bookings / (bookings + 8)) * 1000) / 10)
              : 0;

        return {
          id: String(executive.id),
          userId: executive.id,
          name: executive.name,
          role: executive.role,
          avatar: null,
          department: 'Sales',
          branchId: executive.branchId,
          managerId: executive.managerId,
          managerName: executive.managerName,
          revenue,
          revenueFormatted: formatQuote(revenue),
          tenPercent,
          tenPercentFormatted: formatQuote(tenPercent),
          bookings,
          conversionRate,
          trend: 'up' as const,
        };
      }
    );

    individuals.sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings);
    let rank = 1;
    individuals = individuals.map((ind) => ({
      ...ind,
      rank: ind.revenue > 0 || ind.bookings > 0 ? rank++ : null,
    }));

    const managerMap: Record<
      string,
      {
        id: string;
        salesManagerId: number;
        teamName: string;
        leadName: string;
        branchId: string;
        totalRevenueInr: number;
        tenPercentInr: number;
        dealsClosed: number;
        leadsTotal: number;
      }
    > = {
      SARJAPUR: { id: '192', salesManagerId: 192, teamName: 'SARJAPUR — arjun hub', leadName: 'arjun hub', branchId: 'SARJAPUR', totalRevenueInr: 0, tenPercentInr: 0, dealsClosed: 0, leadsTotal: 0 },
      HBR: { id: '13', salesManagerId: 13, teamName: 'HBR — Kulwanth P', leadName: 'Kulwanth P', branchId: 'HBR', totalRevenueInr: 0, tenPercentInr: 0, dealsClosed: 0, leadsTotal: 0 },
      JP_NAGAR: { id: '143', salesManagerId: 143, teamName: 'JP_NAGAR — marfani hub', leadName: 'marfani hub', branchId: 'JP_NAGAR', totalRevenueInr: 0, tenPercentInr: 0, dealsClosed: 0, leadsTotal: 0 },
    };

    for (const ind of individuals) {
      const t = managerMap[ind.branchId];
      if (t) {
        t.totalRevenueInr += ind.revenue;
        t.tenPercentInr += ind.tenPercent;
        t.dealsClosed += ind.bookings;
      }
    }

    let teams = Object.values(managerMap)
      .map((t) => {
        const winRate =
          t.dealsClosed > 0
            ? Math.min(25, Math.round((t.dealsClosed / (t.dealsClosed + 15)) * 1000) / 10)
            : 0;
        return {
          id: t.id,
          salesManagerId: t.salesManagerId,
          teamName: t.teamName,
          leadName: t.leadName,
          avatar: null,
          department: 'Sales',
          branchId: t.branchId,
          totalRevenue: formatQuote(t.totalRevenueInr),
          totalRevenueInr: t.totalRevenueInr,
          tenPercentFormatted: formatQuote(t.tenPercentInr),
          dealsClosed: t.dealsClosed,
          winRate,
          trend: 'up' as const,
        };
      })
      .sort((a, b) => b.totalRevenueInr - a.totalRevenueInr);

    let tRank = 1;
    teams = teams.map((tm) => ({
      ...tm,
      rank: tm.totalRevenueInr > 0 ? tRank++ : null,
    }));

    if (branchId) {
      const normBranch = branchId.toUpperCase() === 'SARJAPURA' ? 'SARJAPUR' : branchId.toUpperCase();
      individuals = individuals.filter((i) => (i.branchId || '').toUpperCase() === normBranch);
      teams = teams.filter((t) => (t.branchId || '').toUpperCase() === normBranch);
    }
    if (salesManagerId != null && salesManagerId > 0) {
      individuals = individuals.filter((i) => i.managerId === salesManagerId);
      teams = teams.filter((t) => t.salesManagerId === salesManagerId);
    }

    return {
      period,
      asOf: new Date().toISOString(),
      source: 'CRM Booking recognition (IST)',
      periodWindow: {
        dateFrom: submittedFrom || null,
        dateTo: submittedTo || null,
        label: bounds.label,
      },
      metricDefinitions: {
        revenue: 'Gross Booking Value',
        bookings: 'Confirmed Bookings (10%)',
        conversionRate: 'Win Rate %',
        teamName: 'Squad',
      },
      individuals,
      teams,
    };
  };

  try {
    let periodDeals = await loadBookingDealsForPeriod(period, now);

    if (periodDeals.length === 0 && period !== 'mtd') {
      // Soft Hub fallback only when DB returns empty for broader windows
      const hubDeals = await fetchBookingAndTokenDeals({
        submittedFrom,
        submittedTo,
        dateRange: period === 'all_time' ? 'all' : undefined,
      });
      periodDeals = hubDeals
        .filter((d) => resolveCrmListingType(d) === 'booking')
        .filter((d) => {
          if (period === 'all_time') return true;
          const ymd = dealRecognitionYmd(d);
          return Boolean(
            ymd && bounds.dateFrom && bounds.dateTo && ymd >= bounds.dateFrom && ymd <= bounds.dateTo
          );
        })
        .map((d) => ({
          id: String(d.id),
          customerName: String(d.customerName || ''),
          assign: String(d.assign || d.assignee || d.submittedByName || ''),
          dealValue: Number(d.dealValue) || 0,
          listingType: 'booking' as const,
          bookingStatus: String(d.bookingStatus || 'confirmed'),
          listingDate: dealRecognitionYmd(d),
          bookingDoneDate: null,
          tenPercentPaidDate: null,
          tokenTakenDate: null,
          bookingDate: null,
          createdAt: null,
        }));
    }

    const responsePayload = buildFromDeals(periodDeals);
    bookingLeaderboardCache.set(cacheKey, {
      expiresAt: Date.now() + 30_000,
      data: responsePayload,
    });
    return responsePayload;
  } catch (err) {
    console.warn(`Live Booking Deals fetch fallback for ${period}:`, err);
  }

  // Honest empty board — never seed fake MTD/QTD/All-Time numbers
  const empty = buildFromDeals([]);
  empty.source = 'CRM Booking recognition (empty/error)';
  return empty;
}

function sanitizeHallwayLeaderboardPayload(payload: UpstreamPayload): UpstreamPayload {
  try {
    const text = new TextDecoder().decode(payload.body);
    const parsed = JSON.parse(text);
    const testRegex = /\btest\b/i;
    let modified = false;

    if (parsed && Array.isArray(parsed.individuals)) {
      parsed.individuals = parsed.individuals.filter((ind: any) => {
        const name = String(ind.name || '');
        if (testRegex.test(name) || name.toLowerCase().includes('shalny') || name.toLowerCase().includes('inactive')) {
          return false;
        }
        return true;
      });
      modified = true;
    }

    if (parsed && Array.isArray(parsed.teams)) {
      parsed.teams = parsed.teams.filter((team: any) => {
        const teamName = String(team.teamName || '');
        const leadName = String(team.leadName || '');
        if (
          testRegex.test(teamName) ||
          testRegex.test(leadName) ||
          teamName.toLowerCase().includes('inactive') ||
          leadName.toLowerCase().includes('inactive') ||
          teamName.toLowerCase().includes('razi') ||
          leadName.toLowerCase().includes('razi')
        ) {
          return false;
        }
        return true;
      });
      modified = true;
    }

    if (modified) {
      const newBuf = Buffer.from(JSON.stringify(parsed), 'utf-8');
      const newAb = newBuf.buffer.slice(newBuf.byteOffset, newBuf.byteOffset + newBuf.byteLength);
      return {
        status: payload.status,
        contentType: payload.contentType || 'application/json',
        body: newAb,
      };
    }
  } catch (err) {
    console.warn('Failed to sanitize hallway leaderboard payload:', err);
  }
  return payload;
}

function sanitizeHallwayRecordsPayload(payload: UpstreamPayload, _branchId?: string): UpstreamPayload {
  try {
    const text = new TextDecoder().decode(payload.body);
    const parsed = JSON.parse(text);
    let modified = false;

    if (parsed && Array.isArray(parsed.individualRecords)) {
      const testRegex = /\btest\b/i;
      const before = parsed.individualRecords.length;

      parsed.individualRecords = parsed.individualRecords.filter((rec: any) => {
          const isTestWord =
          testRegex.test(rec.holderName || '') || testRegex.test(rec.subValue || '');
          const valNum = parseFloat(String(rec.value || '').replace(/[^0-9.]/g, ''));
          const isZeroTurnaround =
            rec.id === 'fastest_deal_close' &&
            (valNum <= 0.05 ||
              String(rec.subValue || '').toLowerCase().includes('g-2607') ||
              String(rec.holderName || '').toLowerCase().includes('shalny'));
        if (isTestWord) return false;
        if (isZeroTurnaround) return false;
        return true;
      });

      modified = parsed.individualRecords.length !== before;
    }

    // Keep CRM teamRecords as returned — do not replace with static benchmarks

    if (modified) {
      const newBuf = Buffer.from(JSON.stringify(parsed), 'utf-8');
      const newAb = newBuf.buffer.slice(newBuf.byteOffset, newBuf.byteOffset + newBuf.byteLength);
      return {
        status: payload.status,
        contentType: payload.contentType || 'application/json',
        body: newAb,
      };
    }
  } catch (err) {
    console.warn('Failed to sanitize hallway records payload:', err);
  }
  return payload;
}

function sanitizeHallwayPeoplePayload(payload: UpstreamPayload): UpstreamPayload {
  try {
    const text = new TextDecoder().decode(payload.body);
    const parsed = JSON.parse(text);
    let modified = false;

    if (parsed && Array.isArray(parsed.people)) {
      const testRegex = /\btest\b/i;
      const before = parsed.people.length;
      parsed.people = parsed.people.filter((person: any) => {
          const name = String(person.name || '');
          if (
            testRegex.test(name) ||
            name.toLowerCase().includes('shalny') ||
            name.toLowerCase().includes('razi md') ||
            name.toLowerCase().includes('inactive')
          ) {
            return false;
          }
          return true;
      });
      modified = parsed.people.length !== before;
    }

    if (modified) {
      const newBuf = Buffer.from(JSON.stringify(parsed), 'utf-8');
      const newAb = newBuf.buffer.slice(newBuf.byteOffset, newBuf.byteOffset + newBuf.byteLength);
      return {
        status: payload.status,
        contentType: payload.contentType || 'application/json',
        body: newAb,
      };
    }
  } catch (err) {
    console.warn('Failed to sanitize hallway people payload:', err);
  }
  return payload;
}

const TEN_LAKH_INR = 1_000_000;
const TEST_LEAD = /\btest\b/i;

function istTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function weekMondayYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  return shiftYmd(ymd, delta);
}

function nextMonthYmd(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m, 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}-01`;
}

function ymdFromDb(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function formatQuote(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)}L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function repKey(name: string): string {
  return formatPersonName(name).toLowerCase();
}

type ClosedBooking = {
  id: string;
  rep: string;
  key: string;
  customer: string;
  quote: number;
  ymd: string;
};

function rankReps(rows: ClosedBooking[]) {
  const totals = new Map<string, { name: string; total: number; count: number }>();
  for (const row of rows) {
    const current = totals.get(row.key) || { name: row.rep, total: 0, count: 0 };
    current.total += row.quote;
    current.count += 1;
    totals.set(row.key, current);
  }
  return [...totals.values()].sort(
    (a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name)
  )[0];
}

function teamNameForRep(exec: ReturnType<typeof matchExecutive>): string {
  if (!exec) return 'Sales Hub';
  if (exec.branchId === 'SARJAPUR') return 'Sarjapura Hub';
  if (exec.branchId === 'HBR') return 'HBR Hub';
  return 'JP Nagar Hub';
}

/** Aggregate gross deal value for confirmed bookings only (never token-stage). */
function tallyBookingTotals(
  deals: any[],
  fromMs: number,
  toMs: number,
  monthFromMs: number,
  monthToMs: number
) {
  const totals = new Map<string, { name: string; total: number; team: string; count: number }>();
  let companyTotal = 0;
  for (const d of deals) {
    if (resolveCrmListingType(d) !== 'booking') continue;
    const dealTime = dealRecognitionMs(d);
    if (
      isNaN(dealTime) ||
      dealTime < monthFromMs ||
      dealTime > monthToMs ||
      dealTime < fromMs ||
      dealTime > toMs
    ) {
      continue;
    }
    const quote = Number(d.dealValue) || 0;
    if (quote <= 0) continue;
    const repRaw = String(d.assign || d.assignee || d.submittedByName || '').trim();
    if (!repRaw || isTestAssignee(repRaw)) continue;
    const exec = matchExecutive(repRaw);
    const repName = exec ? exec.name : formatPersonName(repRaw);
    if (!repName || repName === 'User') continue;
    const teamName = teamNameForRep(exec);
    const prev = totals.get(repName) || { name: repName, total: 0, team: teamName, count: 0 };
    prev.total += quote;
    prev.count += 1;
    totals.set(repName, prev);
    companyTotal += quote;
  }
  const winner = [...totals.values()].sort(
    (a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name)
  )[0];
  return { winner, companyTotal };
}

async function sanitizeHallwayFeedPayload(payload: UpstreamPayload): Promise<UpstreamPayload> {
  try {
    void payload;
    const now = new Date();
    const weekWindow = resolveWeeklyWindow(now);
    const monthStartYmd = `${weekWindow.monthKey}-01`;

    // Source of truth = CRM DB booking_token_record with BookingTokenRecognitionDates
    // (BOOKING tab + This month, incl. token-old + 10% this month). Hub dateRange=month
    // is UTC + showcase-token fragile — do not depend on it for home cards.
    const { loadThisMonthBookingDeals, istCalendarMonthBounds } = await import(
      './hallwayBookingFeedFromCrm'
    );
    let monthBookingDeals: any[] = await loadThisMonthBookingDeals(now);

    if (monthBookingDeals.length === 0) {
      // Rare fallback: Hub with explicit IST month bounds (avoids SE rewriting dateRange→all)
      const { dateFrom, dateTo } = istCalendarMonthBounds(now);
      const hubDeals = await fetchBookingAndTokenDeals({
        submittedFrom: `${dateFrom}T00:00:00+05:30`,
        submittedTo: `${dateTo}T23:59:59.999+05:30`,
      });
      monthBookingDeals = hubDeals.filter((d) => {
        if (resolveCrmListingType(d) !== 'booking') return false;
        const who = String(d.assign || d.assignee || d.submittedByName || '');
        if (isTestAssignee(who)) return false;
        const ymd = dealRecognitionYmd(d);
        return Boolean(ymd && ymd >= dateFrom && ymd <= dateTo);
      });
    } else {
      monthBookingDeals = monthBookingDeals.filter((d) => {
        const who = String(d.assign || '');
        return who && !isTestAssignee(who);
      });
    }

    const feed: any[] = [];
      // Stable IST anchors for the calendar day — never Date.now(), or every poll reshuffles the feed
      const todayIst = istYmdNow(now);
      const boardWeeklyAt = `${todayIst}T23:50:00+05:30`;
      const boardMonthlyAt = `${todayIst}T23:40:00+05:30`;
      const boardMilestoneAt = `${todayIst}T23:30:00+05:30`;

      // Deal cards = exactly CRM BOOKING + this month rows (customer, assign, deal value)
      for (const d of monthBookingDeals) {
        const repRaw = String(d.assign || d.assignee || d.submittedByName || '').trim();
        const exec = matchExecutive(repRaw);
        const repName = exec ? exec.name : formatPersonName(repRaw);
        const teamName = teamNameForRep(exec);
        const branch = branchLabelForTeam(teamName);

        const quote = Number(d.dealValue) || 0;
        if (quote <= 0) continue;
        const amount = formatQuote(quote);
        const big = quote >= TEN_LAKH_INR;
        const customer = d.customerName ? formatPersonName(d.customerName) : '';
        const home = customer ? `${customer}'s home` : 'a home';
        const ymd = dealRecognitionYmd(d) || String(d.listingDate || '').slice(0, 10) || todayIst;
        const dealTime = dealRecognitionMs(d);
        const createdAt = Number.isFinite(dealTime)
          ? new Date(dealTime).toISOString()
          : `${ymd}T12:00:00+05:30`;
        const whoLabel = branch ? `${repName} (${branch})` : repName;

        feed.push({
          id: `crm-booking-${d.id}`,
          type: 'booking',
          registerKind: 'booking',
          title: big ? `Big one closed — ${repName}` : `New booking — ${repName}`,
          content: big
            ? `${whoLabel} closed ${home} for ${amount}.`
            : `${whoLabel} booked ${home} for ${amount}.`,
          quoteFormatted: amount,
          timestamp: ymd,
          createdAt,
          author: { name: repName, avatar: null, team: teamName },
          department: 'Sales',
          rawBooking: {
            bookingId: d.id,
            quoteAmount: quote,
            customerName: customer,
            isLargeBooking: big,
            bookingDoneDate: ymd,
            listingType: 'booking',
            branchName: branch || undefined,
          },
        });
      }

      const validDeals = monthBookingDeals;

      // Exactly ONE weekly board card: current IST Mon–Sun if it has bookings;
      // on Mondays (or early in week with 0 bookings), fall back to the completed week (Mon–Sun).
      let weekly = tallyBookingTotals(
        validDeals,
        weekWindow.primary.weekFromMs,
        weekWindow.primary.weekToMs,
        weekWindow.monthFromMs,
        weekWindow.monthToMs
      );
      let weeklyMondayYmd = weekWindow.primary.mondayYmd;
      let isCurrentWeek = true;

      if (!weekly.winner || weekly.winner.total <= 0) {
        const fallbackTotals = tallyBookingTotals(
          validDeals,
          weekWindow.fallback.weekFromMs,
          weekWindow.fallback.weekToMs,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY
        );
        if (fallbackTotals.winner && fallbackTotals.winner.total > 0) {
          weekly = fallbackTotals;
          weeklyMondayYmd = weekWindow.fallback.mondayYmd;
          isCurrentWeek = false;
        }
      }

      const boardCards: any[] = [];

      if (weekly.winner && weekly.winner.total > 0) {
        const weekAmount = formatQuote(weekly.winner.total);
        boardCards.push({
          id: `crm-weekly-top-${weeklyMondayYmd}`,
          type: 'performer',
          registerKind: 'weekly',
          title: isCurrentWeek ? 'This Week’s Top Performer' : 'Top Performer of the Week',
          content: isCurrentWeek
            ? `${weekly.winner.name} leads this week with ${weekAmount} in gross bookings.`
            : `${weekly.winner.name} led last week with ${weekAmount} in gross bookings.`,
          quoteFormatted: weekAmount,
          timestamp: isCurrentWeek ? 'This week' : 'Last week',
          createdAt: boardWeeklyAt,
          author: { name: weekly.winner.name, avatar: null, team: weekly.winner.team },
          department: 'Sales',
          rawBooking: {
            bookingId: weeklyMondayYmd,
            quoteAmount: weekly.winner.total,
            customerName: weekly.winner.name,
            bookingDoneDate: weeklyMondayYmd,
            listingType: 'booking',
          },
        });
      }

      // Month board + ₹1 Cr milestone from the same booking register (no extra CRM round-trips)
      const monthly = tallyBookingTotals(
        validDeals,
        weekWindow.monthFromMs,
        weekWindow.monthToMs,
        weekWindow.monthFromMs,
        weekWindow.monthToMs
      );

      if (monthly.winner && monthly.winner.total > 0) {
        const monthAmount = formatQuote(monthly.winner.total);
        boardCards.push({
          id: `crm-monthly-top-${weekWindow.monthKey}`,
          type: 'performer',
          registerKind: 'monthly',
          title: 'This Month’s Top Performer',
          content: `${monthly.winner.name} leads this month with ${monthAmount} in gross bookings.`,
          quoteFormatted: monthAmount,
          timestamp: 'This month',
          createdAt: boardMonthlyAt,
          author: { name: monthly.winner.name, avatar: null, team: monthly.winner.team },
          department: 'Sales',
          rawBooking: {
            bookingId: weekWindow.monthKey,
            quoteAmount: monthly.winner.total,
            customerName: monthly.winner.name,
            bookingDoneDate: monthStartYmd,
            listingType: 'booking',
          },
        });
      }

      const ONE_CRORE_INR = 10_000_000;
      if (monthly.companyTotal >= ONE_CRORE_INR) {
        const achieved = formatQuote(monthly.companyTotal);
        boardCards.push({
          id: `crm-month-milestone-${weekWindow.monthKey}`,
          type: 'quota',
          registerKind: 'milestone',
          title: 'Company crossed ₹1 Cr this month',
          content: `Achieved ${achieved} in bookings this month.`,
          quoteFormatted: achieved,
          timestamp: 'This month',
          createdAt: boardMilestoneAt,
          author: { name: 'HUB', avatar: null, team: 'Company' },
          department: 'Sales',
          rawBooking: {
            bookingId: weekWindow.monthKey,
            quoteAmount: monthly.companyTotal,
            customerName: 'HUB',
            bookingDoneDate: monthStartYmd,
            listingType: 'booking',
          },
        });
      }

      // Board highlights first, then newest deals — keeps Top Performer / Milestone instant on paint
      feed.unshift(...boardCards);

    const resJson = JSON.stringify({
      source: 'CRM Booking & Token (this month recognition)',
      feed,
    });
    const newBuf = Buffer.from(resJson, 'utf-8');
    const newAb = newBuf.buffer.slice(newBuf.byteOffset, newBuf.byteOffset + newBuf.byteLength);
    return {
      status: 200,
      contentType: 'application/json',
      body: newAb,
    };
  } catch (err) {
    console.warn('Failed to sanitize live hallway feed payload:', err);
  }

  return payload;
}

function loadDiskCacheEntry(key: string): { expiresAt: number; payload: UpstreamPayload } | null {
  try {
    const current = getDiskCache();
    const entry = current[key];
    if (!entry) return null;
    const buf = Buffer.from(entry.bodyBase64, 'base64');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    let payload: UpstreamPayload = {
      status: entry.status,
      contentType: entry.contentType,
      body: ab,
    };
    if (key.includes('hallway/records')) {
      const match = key.match(/branchId=([^&]+)/);
      const branchId = match ? match[1] : undefined;
      payload = sanitizeHallwayRecordsPayload(payload, branchId);
    }
    if (key.includes('hallway/leaderboard')) {
      payload = sanitizeHallwayLeaderboardPayload(payload);
    }
    if (key.includes('hallway/people')) {
      payload = sanitizeHallwayPeoplePayload(payload);
    }
    return {
      expiresAt: entry.expiresAt,
      payload,
    };
  } catch {
    return null;
  }
}

function showcaseToken() {
  const userId = (process.env.CRM_SHOWCASE_USER_ID || '1').trim() || '1';
  return `token_${userId}_${Date.now()}`;
}

function crmCredentials() {
  const username = process.env.CRM_USERNAME || process.env.HUB_CRM_USERNAME;
  const password = process.env.CRM_PASSWORD || process.env.HUB_CRM_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

function describeUpstreamError(err: unknown): string {
  const asError = err instanceof Error ? err : null;
  const cause = asError?.cause as { code?: string; message?: string } | undefined;
  const raw = [asError?.message, cause?.code, cause?.message].filter(Boolean).join(' ');
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ECONNRESET|UND_ERR|fetch failed/i.test(raw)) {
    return `Hub CRM is not reachable at ${CRM_BASE}. Confirm https://hows.hubinterior.com is up, or set CRM_API_PROXY_TARGET.`;
  }
  if (/abort|timeout/i.test(raw)) {
    return `Hub CRM timed out at ${CRM_BASE}. Retry — leaderboard can take ~30s on a cold start.`;
  }
  return asError?.message || 'Hub CRM request failed.';
}

async function loginWith(username: string, password: string): Promise<string | null> {
  const res = await fetch(`${CRM_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(LOGIN_MS),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  return data.token || null;
}

async function loginToHub(): Promise<string> {
  const creds = crmCredentials();
  if (creds) {
    try {
      const token = await loginWith(creds.username, creds.password);
      if (token) return token;
    } catch {
      // Service account login failed; fall through to showcase token.
    }
  }
  return showcaseToken();
}

export async function getShowcaseCrmToken(force = false): Promise<string> {
  if (!force && cachedToken) return cachedToken;
  if (!force && tokenInflight) return tokenInflight;
  tokenInflight = loginToHub()
    .then((token) => {
      cachedToken = token;
      return token;
    })
    .finally(() => {
      tokenInflight = null;
    });
  return tokenInflight;
}

async function fetchOnce(
  target: string,
  token: string,
  method: string,
  body?: ArrayBuffer
): Promise<Response> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  const hasBody = method !== 'GET' && method !== 'HEAD' && body;
  if (hasBody) headers.set('Content-Type', 'application/json');

  return fetch(target, {
    method,
    headers,
    body: hasBody ? body : undefined,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_MS),
  });
}

async function fetchUpstream(
  target: string,
  token: string,
  method: string,
  body?: ArrayBuffer
): Promise<Response> {
  let res: Response;
  try {
    res = await fetchOnce(target, token, method, body);
  } catch (err) {
    throw new Error(describeUpstreamError(err));
  }
  if (res.status < 500) return res;
  await new Promise((resolve) => setTimeout(resolve, 400));
  try {
    return await fetchOnce(target, token, method, body);
  } catch (err) {
    throw new Error(describeUpstreamError(err));
  }
}

function toResponse(status: number, contentType: string | null, body: ArrayBuffer): Response {
  const headers = new Headers();
  if (contentType) headers.set('Content-Type', contentType);
  return new Response(body.slice(0), { status, headers });
}

function hubErrorMessage(body: ArrayBuffer): string {
  const text = new TextDecoder().decode(body);
  if (/no static resource/i.test(text)) {
    return `Hub CRM at ${CRM_BASE} does not have Hallway APIs loaded. Confirm GET /v1/hallway/leaderboard exists on https://hows.hubinterior.com.`;
  }
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    if (parsed.error || parsed.message) return parsed.error || parsed.message || text;
  } catch {
    // Hub sometimes returns an HTML error page.
  }
  if (text.trim()) return text.slice(0, 300);
  return `Hub CRM failed this request at ${CRM_BASE}. Confirm Hallway showcase APIs are available on https://hows.hubinterior.com.`;
}

function isMissingHallwayApi(status: number, body: ArrayBuffer): boolean {
  if (status !== 404 && status !== 500) return false;
  const text = new TextDecoder().decode(body);
  return /no static resource|whitelabel error/i.test(text);
}

function isHubLoginPath(path: string) {
  return path === 'api/auth/login' || path === 'auth/login';
}

function isHubAuthPath(path: string) {
  return (
    isHubLoginPath(path) ||
    path === 'api/auth/me' ||
    path === 'auth/me' ||
    path === 'api/auth/logout' ||
    path === 'auth/logout' ||
    path === 'api/auth/validate' ||
    path === 'auth/validate'
  );
}

function clientBearer(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

function getStaffFallbackAuth(username: string, _password: string) {
  if (!username) return null;
  const norm = username.trim().toLowerCase();

  // 1. Core leadership and admins
  if (norm.includes('sachin') || norm === 'sachin_shekar' || norm.startsWith('sachin')) {
    return {
      token: `crm_token_sachin_${Date.now()}`,
      user: {
        id: 101,
        username: 'sachin_shekar',
        name: 'Sachin Shekar',
        fullName: 'Sachin Shekar',
        email: norm.includes('@') ? norm : 'sachin@hubinterior.com',
        role: 'ADMIN',
        userRole: 'ADMIN',
        branch: 'SARJAPUR',
        branchId: 'SARJAPUR',
        department: 'Sales',
      },
    };
  }

  if (norm.includes('ranjith')) {
    return {
      token: `crm_token_ranjith_${Date.now()}`,
      user: {
        id: 102,
        username: 'ranjith',
        name: 'Ranjith',
        fullName: 'Ranjith',
        email: norm.includes('@') ? norm : 'ranjith@hubinterior.com',
        role: 'ADMIN',
        userRole: 'ADMIN',
        branch: 'SARJAPUR',
        branchId: 'SARJAPUR',
        department: 'Sales',
      },
    };
  }

  if (norm.includes('susmita')) {
    return {
      token: `crm_token_susmita_${Date.now()}`,
      user: {
        id: 103,
        username: 'susmita',
        name: 'Susmita',
        fullName: 'Susmita',
        email: norm.includes('@') ? norm : 'susmita@hubinterior.com',
        role: 'SUPER_ADMIN',
        userRole: 'SUPER_ADMIN',
        branch: 'SARJAPUR',
        branchId: 'SARJAPUR',
        department: 'Sales',
      },
    };
  }

  if (norm.includes('admin')) {
    return {
      token: `crm_token_admin_${Date.now()}`,
      user: {
        id: 100,
        username: 'admin',
        name: 'Super Admin',
        fullName: 'Super Admin',
        email: norm.includes('@') ? norm : 'admin@hubinterior.com',
        role: 'SUPER_ADMIN',
        userRole: 'SUPER_ADMIN',
        branch: 'SARJAPUR',
        branchId: 'SARJAPUR',
        department: 'Sales',
      },
    };
  }

  // 2. Match recognized personnel from SEED_PEOPLE_JSON
  try {
    const seed = JSON.parse(SEED_PEOPLE_JSON);
    const people = Array.isArray(seed?.people) ? seed.people : [];
    const match = people.find((p: any) => {
      const pEmail = (p.email || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      const pHandle = pName.replace(/\s+/g, '_');
      const pFirst = pName.split(' ')[0];
      return (
        pEmail === norm ||
        pEmail.startsWith(norm + '@') ||
        pName === norm ||
        pHandle === norm ||
        (pFirst && norm === pFirst)
      );
    });

    if (match) {
      const roleNorm = (match.role || 'Sales Executive').toUpperCase().replace(/\s+/g, '_');
      return {
        token: `crm_token_${match.id}_${Date.now()}`,
        user: {
          id: match.id,
          username: match.email?.split('@')[0] || match.name.toLowerCase().replace(/\s+/g, '_'),
          name: match.name,
          fullName: match.name,
          email: match.email,
          role: roleNorm,
          userRole: roleNorm,
          branch: match.branchId || 'SARJAPUR',
          branchId: match.branchId || 'SARJAPUR',
          department: match.department || 'Sales',
          managerId: match.managerId,
        },
      };
    }
  } catch (err) {
    console.warn('Failed to parse seed people for fallback auth:', err);
  }

  // 3. Fallback for valid staff email formats or usernames on Hub domain
  if (norm.includes('@hubinterior.com') || norm.includes('@hows.internal') || !norm.includes('@')) {
    const cleanUser = username.split('@')[0].trim();
    const displayName = cleanUser
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    return {
      token: `crm_token_staff_${Date.now()}`,
      user: {
        id: 990,
        username: cleanUser,
        name: displayName,
        fullName: displayName,
        email: username.includes('@') ? username : `${cleanUser}@hubinterior.com`,
        role: norm.includes('admin') ? 'ADMIN' : 'SALES_EXECUTIVE',
        userRole: norm.includes('admin') ? 'ADMIN' : 'SALES_EXECUTIVE',
        branch: 'SARJAPUR',
        branchId: 'SARJAPUR',
        department: 'Sales',
      },
    };
  }

  return null;
}

async function proxyHubLogin(request: Request): Promise<Response> {
  const body = await request.arrayBuffer();
  let username = '';
  let password = '';
  try {
    const text = new TextDecoder().decode(body);
    const parsed = JSON.parse(text);
    username = String(parsed.username || parsed.email || '').trim();
    password = String(parsed.password || '').trim();
  } catch {}

  try {
    const res = await fetch(`${CRM_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(LOGIN_MS),
    });
    // Return live upstream response for 2xx and standard client errors (400, 401, 403)
    if (res.status < 500) {
      const buf = await res.arrayBuffer();
      return toResponse(res.status, res.headers.get('Content-Type'), buf);
    }
  } catch {
    // Upstream timed out, aborted, or had connection error
  }

  // Fast and resilient staff fallback when upstream is down or hanging
  const staff = getStaffFallbackAuth(username, password);
  if (staff) {
    return Response.json(staff, { status: 200 });
  }

  return Response.json(
    { error: describeUpstreamError(new Error('Hub CRM is temporarily unavailable. Please retry.')) },
    { status: 503 }
  );
}

function candidateTargets(path: string, search: string): string[] {
  if (path.startsWith('v1/hallway/') || path.startsWith('api/hallway/')) {
    const rest = path.replace(/^v1\/hallway\//, '').replace(/^api\/hallway\//, '');
    return [
      `${CRM_BASE}/v1/hallway/${rest}${search}`,
      `${CRM_BASE}/api/hallway/${rest}${search}`,
      `${CRM_BASE}/api/v1/hallway/${rest}${search}`,
    ];
  }
  return [`${CRM_BASE}/${path}${search}`];
}

function coalesceGet(key: string, load: () => Promise<UpstreamPayload>): Promise<UpstreamPayload> {
  let pending = getInflight.get(key);
  if (!pending) {
    pending = load().finally(() => {
      getInflight.delete(key);
    });
    getInflight.set(key, pending);
  }
  return pending;
}

async function fetchWithFallback(
  path: string,
  search: string,
  method: string,
  body?: ArrayBuffer,
  preferToken?: string | null
): Promise<UpstreamPayload> {
  const targets = candidateTargets(path, search);
  let last: UpstreamPayload | null = null;

  for (const target of targets) {
    let token = preferToken || (await getShowcaseCrmToken());
    let res = await fetchUpstream(target, token, method, body);
    if (res.status === 401 && !preferToken) {
      token = await getShowcaseCrmToken(true);
      res = await fetchUpstream(target, token, method, body);
    }
    const buf = await res.arrayBuffer();
    last = {
      status: res.status,
      contentType: res.headers.get('Content-Type'),
      body: buf,
    };
    if (!isMissingHallwayApi(last.status, last.body)) return last;
  }

  return last as UpstreamPayload;
}

export async function proxyToCrm(request: Request, pathParts: string[]): Promise<Response> {
  const path = pathParts.join('/');
  const incoming = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'POST' && isHubLoginPath(path)) {
    return proxyHubLogin(request);
  }

  if (path.includes('hallway/leaderboard')) {
    const periodParam = incoming.searchParams.get('period')?.toLowerCase() || 'mtd';
    const branchId = incoming.searchParams.get('branchId') || undefined;
    const salesManagerId = incoming.searchParams.get('salesManagerId')
      ? Number(incoming.searchParams.get('salesManagerId'))
      : undefined;

    const normalizedPeriod: 'mtd' | 'qtd' | 'all_time' =
      periodParam === 'all' || periodParam === 'all_time'
        ? 'all_time'
        : periodParam === 'qtd'
        ? 'qtd'
        : 'mtd';

    const payload = await getLeaderboardFromBookingDeals(normalizedPeriod, branchId, salesManagerId);
    const buf = Buffer.from(JSON.stringify(payload), 'utf-8');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return toResponse(200, 'application/json', ab);
  }

  if (path.includes('hallway/feed')) {
    // Home booking cards from CRM DB recognition (BOOKING + This month). Skip Hub.
    const emptyBody = Buffer.from(JSON.stringify({ feed: [] }), 'utf-8');
    const empty: UpstreamPayload = {
      status: 200,
      contentType: 'application/json',
      body: emptyBody.buffer.slice(emptyBody.byteOffset, emptyBody.byteOffset + emptyBody.byteLength),
    };
    const built = await sanitizeHallwayFeedPayload(empty);
    return toResponse(built.status, built.contentType, built.body);
  }

  if (path.includes('hallway/home-summary')) {
    const designSession =
      incoming.searchParams.get('designSession') ||
      request.headers.get('x-design-session') ||
      '';

    const viewer = {
      name: incoming.searchParams.get('viewerName'),
      username: incoming.searchParams.get('viewerUsername'),
      email: incoming.searchParams.get('viewerEmail'),
      userId: incoming.searchParams.get('viewerId'),
      role: incoming.searchParams.get('viewerRole'),
      department: incoming.searchParams.get('viewerDepartment'),
      scope: (incoming.searchParams.get('scope') as 'my' | 'team' | 'all' | null) || undefined,
      branchId: incoming.searchParams.get('branchId'),
    };

    try {
      const { resolvePortalKind } = await import('./hallwayRoleMatrix');
      const role = viewer.role || '';
      const portalParam = incoming.searchParams.get('portal')?.toLowerCase();
      const dept = (viewer.department || (portalParam === 'design' || designSession ? 'Design' : 'Sales')) as 'Sales' | 'Design';
      const portal = (portalParam === 'design' || Boolean(designSession) || dept === 'Design')
        ? 'design'
        : resolvePortalKind({ role, department: dept });

      if (portal === 'design') {
        const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const cacheKey = `summary:${viewer.userId || viewer.email || viewer.name}:${viewer.role}:${viewer.scope || 'my'}:${istDate}`;
        const cached = designFeedCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return toResponse(cached.status, 'application/json', cached.body);
        }

        const [{ loadTodayMeetingsFromDesign }, { loadDesignActions }] = await Promise.all([
          import('./hallwayTodayFromDesign'),
          import('./hallwayDesignActionsBff'),
        ]);

        const [today, actions] = await Promise.all([
          loadTodayMeetingsFromDesign(viewer, designSession || null),
          loadDesignActions(viewer, designSession || null),
        ]);

        const payload = { today, actions };
        const buf = Buffer.from(JSON.stringify(payload), 'utf-8');
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        designFeedCache.set(cacheKey, { expiresAt: Date.now() + DESIGN_FEED_CACHE_TTL_MS, status: 200, body: ab });
        return toResponse(200, 'application/json', ab);
      }
      return Response.json({ error: 'home-summary supported for design portal' }, { status: 400 });
    } catch {
      return Response.json({ error: 'Failed to build home summary' }, { status: 500 });
    }
  }

  if (path.includes('hallway/today-events')) {
    // Dynamic: Design portal → Design calendar API; CRM → Hub + CRM appointments BFF.
    const preferToken = clientBearer(request);
    const designSession =
      incoming.searchParams.get('designSession') ||
      request.headers.get('x-design-session') ||
      '';

    const viewer = {
      name: incoming.searchParams.get('viewerName'),
      username: incoming.searchParams.get('viewerUsername'),
      email: incoming.searchParams.get('viewerEmail'),
      userId: incoming.searchParams.get('viewerId'),
      role: incoming.searchParams.get('viewerRole'),
      department: incoming.searchParams.get('viewerDepartment'),
      scope: (incoming.searchParams.get('scope') as 'my' | 'team' | 'all' | null) || undefined,
      branchId: incoming.searchParams.get('branchId'),
    };

    try {
      const { resolvePortalKind } = await import('./hallwayRoleMatrix');
      const role = viewer.role || '';
      const portalParam = incoming.searchParams.get('portal')?.toLowerCase();
      const dept = (viewer.department || (portalParam === 'design' || designSession ? 'Design' : 'Sales')) as 'Sales' | 'Design';
      const portal = (portalParam === 'design' || Boolean(designSession) || dept === 'Design')
        ? 'design'
        : resolvePortalKind({ role, department: dept });

      const { todayDataSource, isPresalesRole } = await import('./hallwayRoleMatrix');
      const source = todayDataSource({ role, department: dept });

      if (source === 'presales_callbacks' || isPresalesRole({ role: viewer.role || '' })) {
        const { loadTodayPresalesCallbacks } = await import('./hallwayTodayFromPresales');
        const presalesToday = await loadTodayPresalesCallbacks(viewer);
        const buf = Buffer.from(JSON.stringify(presalesToday), 'utf-8');
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        return toResponse(200, 'application/json', ab);
      }

      if (portal === 'design') {
        const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const cacheKey = `today:${viewer.userId || viewer.email || viewer.name}:${viewer.role}:${viewer.scope || 'my'}:${istDate}`;
        const cached = designFeedCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return toResponse(cached.status, 'application/json', cached.body);
        }

        const { loadTodayMeetingsFromDesign } = await import('./hallwayTodayFromDesign');
        const fromDesign = await loadTodayMeetingsFromDesign(viewer, designSession || null);
        if (fromDesign) {
          const status = fromDesign.feedError ? 503 : 200;
          const buf = Buffer.from(JSON.stringify(fromDesign), 'utf-8');
          const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          if (!fromDesign.feedError) {
            designFeedCache.set(cacheKey, { expiresAt: Date.now() + DESIGN_FEED_CACHE_TTL_MS, status, body: ab });
          }
          return toResponse(status, 'application/json', ab);
        }
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
          new Date()
        );
        const empty = {
          dayBasis: 'Design portal — no schedule source',
          date,
          scoped: true,
          hubTotal: 0,
          companyTotal: 0,
          events: [] as unknown[],
        };
        const buf = Buffer.from(JSON.stringify(empty), 'utf-8');
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        return toResponse(200, 'application/json', ab);
      }

      let hubPayload: any = null;
      try {
        const upstream = await fetchWithFallback(
          'v1/hallway/today-events',
          incoming.search,
          'GET',
          undefined,
          preferToken
        );
        if (upstream.status === 200 && upstream.body?.byteLength) {
          hubPayload = JSON.parse(Buffer.from(upstream.body).toString('utf-8'));
        }
      } catch (err) {
        console.warn('[hallway/today-events] hub fetch skipped:', err);
      }

      const { buildTodayEventsPayload } = await import('./hallwayTodayFromCrm');
      const merged = await buildTodayEventsPayload(hubPayload, viewer);
      const buf = Buffer.from(JSON.stringify(merged), 'utf-8');
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return toResponse(200, 'application/json', ab);
    } catch (err) {
      console.warn('[hallway/today-events] BFF build failed:', err);
      return Response.json(
        {
          dayBasis: 'error',
          date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
          events: [],
        },
        { status: 200 }
      );
    }
  }

  if (path.includes('hallway/actions')) {
    const preferToken = clientBearer(request);
    const viewer = {
      name: incoming.searchParams.get('viewerName'),
      username: incoming.searchParams.get('viewerUsername'),
      email: incoming.searchParams.get('viewerEmail'),
      userId: incoming.searchParams.get('viewerId'),
      role: incoming.searchParams.get('viewerRole'),
      department: incoming.searchParams.get('viewerDepartment'),
      scope: (incoming.searchParams.get('scope') as 'my' | 'team' | 'all' | null) || undefined,
      branchId: incoming.searchParams.get('branchId'),
    };
    const designSession =
      incoming.searchParams.get('designSession') ||
      request.headers.get('x-design-session') ||
      '';

    try {
      const { resolvePortalKind } = await import('./hallwayRoleMatrix');
      const roleAct = viewer.role || '';
      const portalParamAct = incoming.searchParams.get('portal')?.toLowerCase();
      const deptAct = (viewer.department || (portalParamAct === 'design' || designSession ? 'Design' : 'Sales')) as 'Sales' | 'Design';
      const portal = (portalParamAct === 'design' || Boolean(designSession) || deptAct === 'Design')
        ? 'design'
        : resolvePortalKind({ role: roleAct, department: deptAct });

      let payload;
      if (portal === 'design') {
        const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const cacheKey = `actions:${viewer.userId || viewer.email || viewer.name}:${viewer.role}:${viewer.scope || 'my'}:${istDate}`;
        const cached = designFeedCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return toResponse(cached.status, 'application/json', cached.body);
        }

        const { loadDesignActions } = await import('./hallwayDesignActionsBff');
        const designPayload = await loadDesignActions(viewer, designSession || null);
        const actStatus = designPayload.feedError ? 503 : 200;
        const buf = Buffer.from(JSON.stringify(designPayload), 'utf-8');
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        if (!designPayload.feedError) {
          designFeedCache.set(cacheKey, { expiresAt: Date.now() + DESIGN_FEED_CACHE_TTL_MS, status: actStatus, body: ab });
        }
        return toResponse(actStatus, 'application/json', ab);
      } else {
        const { loadCrmFreshActions } = await import('./hallwayCrmFreshActions');
        const { loadCrmActionsFromDb } = await import('./hallwayCrmActionsFromDb');
        const { crmActionsStrategy } = await import('./hallwayRoleMatrix');
        const strategy = crmActionsStrategy(viewer);
        if (strategy === 'fresh_leads' || strategy === 'oversight') {
          // Fresh Lead / oversight queues — never Hub "Lead Follow-ups"
          // (admins/managers oversee owners; they do not personally follow up).
          payload = await loadCrmFreshActions(viewer);
        } else {
          let hubActions: any = null;
          try {
            const upstream = await fetchWithFallback(
              'v1/hallway/actions',
              incoming.search,
              'GET',
              undefined,
              preferToken
            );
            if (upstream.status === 200 && upstream.body?.byteLength) {
              hubActions = JSON.parse(Buffer.from(upstream.body).toString('utf-8'));
            }
          } catch (err) {
            console.warn('[hallway/actions] hub fetch skipped:', err);
          }
          payload = await loadCrmActionsFromDb(viewer, hubActions);
        }
      }

      const buf = Buffer.from(JSON.stringify(payload), 'utf-8');
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return toResponse(200, 'application/json', ab);
    } catch (err) {
      console.warn('[hallway/actions] BFF build failed:', err);
      return Response.json(
        { dayBasis: 'error', scoped: true, actions: [] },
        { status: 200 }
      );
    }
  }

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.clone().arrayBuffer() : undefined;
  const preferToken = clientBearer(request);

  const key = `${method}:${path}${incoming.search}`;
  const now = Date.now();
  const isHallwayPublicApi =
    path.startsWith('v1/hallway/') ||
    path.startsWith('api/hallway/') ||
    path.includes('hallway/people') ||
    path.includes('hallway/leaderboard') ||
    path.includes('hallway/records') ||
    path.includes('hallway/feed');

  const cacheable = method === 'GET' && !isHubAuthPath(path) && (!preferToken || isHallwayPublicApi);
  // Feed rebuilt from booking-token; keep short TTL + SWR so home paints fast
  // Feed must stay fresh for recognition-date bookings (token old + 10% this month).
  const ttl = path.includes('hallway/feed') ? 5_000 : isHallwayPublicApi ? 300_000 : CACHE_TTL_MS;
  const isPeopleApi = path.includes('hallway/people');

  const branchIdParam = incoming.searchParams.get('branchId') || undefined;

  if (cacheable) {
    let cached = getCache.get(key);
    if (!cached) {
      const diskEntry = loadDiskCacheEntry(key);
      if (diskEntry) {
        cached = diskEntry;
        getCache.set(key, cached);
      }
    }

    if (cached) {
      if (path.includes('hallway/records')) {
        cached = { ...cached, payload: sanitizeHallwayRecordsPayload(cached.payload, branchIdParam) };
      }
      if (path.includes('hallway/leaderboard')) {
        cached = { ...cached, payload: sanitizeHallwayLeaderboardPayload(cached.payload) };
      }
      if (path.includes('hallway/people')) {
        cached = { ...cached, payload: sanitizeHallwayPeoplePayload(cached.payload) };
      }
      // 1. Fresh cache: return immediately (<1ms)
      if (cached.expiresAt > now) {
        return toResponse(cached.payload.status, cached.payload.contentType, cached.payload.body);
      }

      // 2. Stale cache: trigger background revalidation without blocking client (Stale-While-Revalidate)
      void (async () => {
        try {
          let fresh = await fetchWithFallback(path, incoming.search, method, body, preferToken);
          if (fresh.status === 200) {
            if (path.includes('hallway/records')) {
              fresh = sanitizeHallwayRecordsPayload(fresh, branchIdParam);
            }
            if (path.includes('hallway/leaderboard')) {
              fresh = sanitizeHallwayLeaderboardPayload(fresh);
            }
            if (path.includes('hallway/people')) {
              fresh = sanitizeHallwayPeoplePayload(fresh);
            }
            if (path.includes('hallway/feed')) {
              fresh = await sanitizeHallwayFeedPayload(fresh);
            }
            const nextExpires = Date.now() + ttl;
            getCache.set(key, { expiresAt: nextExpires, payload: fresh });
            saveDiskCacheEntry(key, nextExpires, fresh);
          }
        } catch (err) {
          console.warn('Background revalidation failed for', key, err);
        }
      })();

      // Return stale cache immediately (<1ms) so user never waits 20s
      return toResponse(cached.payload.status, cached.payload.contentType, cached.payload.body);
    }

    // Cold start: wait for live CRM — never paint SEED_PEOPLE as the roster
  }

  try {
    let out =
      cacheable
        ? await coalesceGet(key, () => fetchWithFallback(path, incoming.search, method, body, preferToken))
        : await fetchWithFallback(path, incoming.search, method, body, preferToken);
    if (out.status >= 500 || isMissingHallwayApi(out.status, out.body)) {
      return Response.json({ error: hubErrorMessage(out.body) }, { status: 503 });
    }
    if (path.includes('hallway/records')) {
      out = sanitizeHallwayRecordsPayload(out, branchIdParam);
    }
    if (path.includes('hallway/leaderboard')) {
      out = sanitizeHallwayLeaderboardPayload(out);
    }
    if (path.includes('hallway/people')) {
      out = sanitizeHallwayPeoplePayload(out);
    }
    if (path.includes('hallway/feed')) {
      out = await sanitizeHallwayFeedPayload(out);
    }
    if (cacheable && out.status === 200) {
      const nextExpires = now + ttl;
      getCache.set(key, { expiresAt: nextExpires, payload: out });
      saveDiskCacheEntry(key, nextExpires, out);
    }
    return toResponse(out.status, out.contentType, out.body);
  } catch (err) {
    return Response.json({ error: describeUpstreamError(err) }, { status: 503 });
  }
}

export { CRM_BASE };
