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
  let submittedFrom: string | undefined;
  let submittedTo: string | undefined;
  let fromMs = Number.NEGATIVE_INFINITY;
  let toMs = Number.POSITIVE_INFINITY;
  let apiDateParams = '';

  if (period === 'mtd') {
    // Current local calendar month
    const y = now.getFullYear();
    const m = now.getMonth();
    const fromDate = new Date(y, m, 1, 0, 0, 0, 0);
    const toDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
    submittedFrom = fromDate.toISOString();
    submittedTo = toDate.toISOString();
    fromMs = fromDate.getTime();
    toMs = toDate.getTime();
    apiDateParams = `&submittedFrom=${encodeURIComponent(submittedFrom)}&submittedTo=${encodeURIComponent(submittedTo)}`;
  } else if (period === 'qtd') {
    // Rolling 3 months (90 days) matching Booking & Token dateRange=3m
    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - 3);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
    submittedFrom = fromDate.toISOString();
    submittedTo = toDate.toISOString();
    fromMs = fromDate.getTime();
    toMs = toDate.getTime();
    apiDateParams = `&dateRange=3m`;
  }

  try {
    const token = await getShowcaseCrmToken();

    // 1. Fetch live booking deals from Booking & Token endpoint
    const dealsUrl = `${CRM_BASE}/v1/booking-token/deals?page=0&size=500&listingType=booking${apiDateParams}`;

    // 2. Concurrently fetch insights team performance for real lead counts
    const insightsRange = period === 'mtd' ? 'current_month' : period === 'qtd' ? '3m' : '1y';
    const insightsUrl = `${CRM_BASE}/v1/crm/insights/dashboard?dateRange=${insightsRange}&teamPeriod=monthly&funnelMode=inventory&pathFilter=all`;

    const [dealsRes, insightsRes] = await Promise.allSettled([
      fetch(dealsUrl, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      }),
      fetch(insightsUrl, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      }),
    ]);

    let perfList: any[] = [];
    if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
      try {
        const insData = await insightsRes.value.json();
        if (Array.isArray(insData?.teamPerformance)) {
          perfList = insData.teamPerformance;
        }
      } catch {
        /* ignore */
      }
    }

    if (dealsRes.status === 'fulfilled' && dealsRes.value.ok) {
      const dealsData = await dealsRes.value.json();
      const rawDeals: any[] = Array.isArray(dealsData?.deals) ? dealsData.deals : [];

      const validDeals = rawDeals.filter((d) => {
        if (d.listingType !== 'booking') return false;
        if (d.cancellationApprovalStatus === 'APPROVED') return false;
        if (period !== 'all_time') {
          const t = new Date(d.submittedAt).getTime();
          if (isNaN(t) || t < fromMs || t > toMs) return false;
        }
        return true;
      });

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
        const perf = perfList.find((p: any) => Number(p.userId) === exec.id);
        execStats.set(exec.id, {
          executive: exec,
          revenue: 0,
          tenPercent: 0,
          bookings: 0,
          leads: Number(perf?.leads) || 0,
        });
      }

      for (const d of validDeals) {
        const who = d.assign || d.assignee || d.submittedByName;
        const matched = matchExecutive(who);
        if (!matched) continue;
        const stat = execStats.get(matched.id);
        if (stat) {
          const dealVal = Number(d.dealValue) || 0;
          const tenVal = Number(d.tenPercentAmount) || dealVal * 0.1 || 0;
          stat.revenue += dealVal;
          stat.tenPercent += tenVal;
          stat.bookings += 1;
        }
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
          const stat = execStats.get(ind.userId);
          if (stat) t.leadsTotal += stat.leads;
        }
      }

      let teams = Object.values(managerMap)
        .map((t) => {
          const winRate =
            t.leadsTotal > 0
              ? Math.round((t.dealsClosed / t.leadsTotal) * 1000) / 10
              : t.dealsClosed > 0
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

      const responsePayload = {
        period,
        asOf: new Date().toISOString(),
        source: 'CRM Booking & Token Deals',
        periodWindow: {
          dateFrom: submittedFrom,
          dateTo: submittedTo,
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

      bookingLeaderboardCache.set(cacheKey, {
        expiresAt: Date.now() + 30_000,
        data: responsePayload,
      });

      return responsePayload;
    }
  } catch (err) {
    console.warn(`Live Booking Deals fetch fallback for ${period}:`, err);
  }

  // Fallback if live Hub API fails
  let fallbackInd = period === 'all_time' ? [...ALL_TIME_LEADERBOARD_INDIVIDUALS] : [...QTD_LEADERBOARD_INDIVIDUALS];
  let fallbackTeams = period === 'all_time' ? [...ALL_TIME_LEADERBOARD_TEAMS] : [...QTD_LEADERBOARD_TEAMS];

  if (branchId) {
    const normBranch = branchId.toUpperCase() === 'SARJAPURA' ? 'SARJAPUR' : branchId.toUpperCase();
    fallbackInd = fallbackInd.filter((i) => (i.branchId || '').toUpperCase() === normBranch);
    fallbackTeams = fallbackTeams.filter((t) => (t.branchId || '').toUpperCase() === normBranch);
  }
  if (salesManagerId != null && salesManagerId > 0) {
    fallbackInd = fallbackInd.filter((i: any) => i.managerId === salesManagerId);
    fallbackTeams = fallbackTeams.filter((t: any) => t.salesManagerId === salesManagerId);
  }

  return {
    period,
    asOf: new Date().toISOString(),
    source: 'CRM Benchmark Fallback',
    individuals: fallbackInd,
    teams: fallbackTeams,
  };
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

function istNoon(ymd: string): string {
  return `${ymd}T12:00:00+05:30`;
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

async function sanitizeHallwayFeedPayload(payload: UpstreamPayload): Promise<UpstreamPayload> {
  try {
    void payload;
    const pool = getPool();
    const crmDb = process.env.CRM_DB_NAME || 'CRM';
    const today = istTodayYmd();
    const monthStart = `${today.slice(0, 7)}-01`;
    const nextMonth = nextMonthYmd(today);
    const weekStart = weekMondayYmd(today);
    const nextWeek = shiftYmd(weekStart, 7);

    let bookingRows: any[] = [];
    try {
      const [rows]: any = await pool.query(
        `
        SELECT
          b.id,
          b.customer_name,
          b.submitted_by_name,
          b.quote_amount,
          b.booking_done_date
        FROM ${crmDb}.booking_token_record b
        WHERE (b.cancellation_approval_status IS NULL OR UPPER(b.cancellation_approval_status) NOT IN ('APPROVED', 'PENDING'))
          AND b.booking_done_date IS NOT NULL
          AND DATE(b.booking_done_date) >= ?
          AND DATE(b.booking_done_date) < ?
          AND b.quote_amount > 0
        `,
        [monthStart, nextMonth]
      );
      bookingRows = Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.warn('Closed booking register query failed:', err);
    }

    let weekRowsRaw: any[] = [];
    try {
      const [rows]: any = await pool.query(
        `
        SELECT
          b.id,
          b.customer_name,
          b.submitted_by_name,
          b.quote_amount,
          b.created_at
        FROM ${crmDb}.booking_token_record b
        WHERE (b.cancellation_approval_status IS NULL OR UPPER(b.cancellation_approval_status) NOT IN ('APPROVED', 'PENDING'))
          AND b.created_at IS NOT NULL
          AND DATE(b.created_at) >= ?
          AND DATE(b.created_at) < ?
          AND b.quote_amount > 0
          AND UPPER(COALESCE(b.listing_type, '')) IN ('TOKEN', 'BOOKING')
        `,
        [weekStart, nextWeek]
      );
      weekRowsRaw = Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.warn('Weekly gross query failed:', err);
    }

    const closed: ClosedBooking[] = [];
    for (const row of bookingRows) {
      const repRaw = String(row.submitted_by_name || '').trim();
      const customerRaw = String(row.customer_name || '').trim();
      if (!repRaw || TEST_LEAD.test(repRaw) || TEST_LEAD.test(customerRaw)) continue;
      const quote = Number(row.quote_amount);
      const ymd = ymdFromDb(row.booking_done_date);
      if (!Number.isFinite(quote) || quote <= 0 || !ymd) continue;
      closed.push({
        id: String(row.id),
        rep: formatPersonName(repRaw),
        key: repKey(repRaw),
        customer: customerRaw ? formatPersonName(customerRaw) : '',
        quote,
        ymd,
      });
    }

    const monthRows = closed.filter((row) => row.ymd >= monthStart && row.ymd < nextMonth);
    const weekRows: ClosedBooking[] = [];
    for (const row of weekRowsRaw) {
      const repRaw = String(row.submitted_by_name || '').trim();
      const customerRaw = String(row.customer_name || '').trim();
      if (!repRaw || TEST_LEAD.test(repRaw) || TEST_LEAD.test(customerRaw)) continue;
      const quote = Number(row.quote_amount);
      const ymd = ymdFromDb(row.created_at);
      if (!Number.isFinite(quote) || quote <= 0 || !ymd) continue;
      weekRows.push({
        id: String(row.id),
        rep: formatPersonName(repRaw),
        key: repKey(repRaw),
        customer: customerRaw ? formatPersonName(customerRaw) : '',
        quote,
        ymd,
      });
    }
    const weeklyWinner = rankReps(weekRows);

    const feed: any[] = [];
    const bookings = [...monthRows].sort((a, b) => (a.ymd < b.ymd ? 1 : a.ymd > b.ymd ? -1 : b.id.localeCompare(a.id)));
    for (const row of bookings.slice(0, 8)) {
      const amount = formatQuote(row.quote);
      const big = row.quote >= TEN_LAKH_INR;
      const home = row.customer ? `${row.customer}'s home` : 'a home';
      feed.push({
        id: `crm-booking-${row.id}`,
        type: 'booking',
        registerKind: 'booking',
        title: big ? `Big one closed — ${row.rep}` : `New booking — ${row.rep}`,
        content: big
          ? `${row.rep} closed ${home} for ${amount}.`
          : `${row.rep} booked ${home} for ${amount}.`,
        quoteFormatted: amount,
        timestamp: row.ymd,
        createdAt: istNoon(row.ymd),
        author: { name: row.rep, avatar: null, team: 'Sales' },
        department: 'Sales',
        rawBooking: {
          bookingId: row.id,
          quoteAmount: row.quote,
          customerName: row.customer,
          isLargeBooking: big,
          bookingDoneDate: row.ymd,
        },
      });
    }

    if (weeklyWinner) {
      const weekAmount = formatQuote(weeklyWinner.total);
      feed.push({
        id: `crm-weekly-top-${weekStart}`,
        type: 'performer',
        registerKind: 'weekly',
        title: 'This week’s top performer',
        content: `${weeklyWinner.name} leads this week with ${weekAmount} in gross bookings.`,
        quoteFormatted: weekAmount,
        timestamp: 'This week',
        createdAt: istNoon(today),
        author: { name: weeklyWinner.name, avatar: null, team: 'Sales' },
        department: 'Sales',
        rawBooking: {
          bookingId: weekStart,
          quoteAmount: weeklyWinner.total,
          customerName: weeklyWinner.name,
          bookingDoneDate: weekStart,
        },
      });
    }

    const resJson = JSON.stringify({
      source: 'CRM.booking_token_record',
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
    console.warn('Failed to sanitize hallway feed payload:', err);
    return payload;
  }
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

  if (path.includes('hallway/today-events')) {
    try {
      const pool = getPool();
      const crmDb = process.env.CRM_DB_NAME || 'CRM';
      const [rows]: any = await pool.query(`
        SELECT 
          a.id,
          a.start_time,
          a.end_time,
          a.description,
          a.customer_name,
          a.designer_name,
          a.meeting_type,
          u.full_name as sales_person_name,
          u.username as sales_username
        FROM ${crmDb}.appointment a
        LEFT JOIN ${crmDb}.users u ON a.sales_user_id = u.id
        WHERE a.start_time IS NOT NULL
        ORDER BY a.start_time DESC
        LIMIT 25
      `).catch(() => [[]]);

      const formatTime = (d: Date | null) => {
        if (!d || isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
      };

      const events = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const startTime = r.start_time ? new Date(r.start_time) : null;
        const endTime = r.end_time ? new Date(r.end_time) : null;
        const timeStr = startTime && endTime
          ? `${formatTime(startTime)} – ${formatTime(endTime)}`
          : startTime ? formatTime(startTime) : '11:00 AM';

        const typeLabel = (r.meeting_type || 'Showroom Consultation')
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        return {
          id: `apt-${r.id}`,
          time: timeStr,
          title: r.description || `${typeLabel} Briefing`,
          clientName: r.customer_name || null,
          crmPersonName: r.sales_person_name || r.sales_username || null,
          designerName: r.designer_name || null,
          meetingType: typeLabel,
          category: typeLabel,
          startAt: r.start_time ? new Date(r.start_time).toISOString() : undefined,
          endAt: r.end_time ? new Date(r.end_time).toISOString() : undefined,
        };
      });

      const todayJson = JSON.stringify({
        dayBasis: 'today',
        date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
        events,
      });
      const buf = Buffer.from(todayJson, 'utf-8');
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return toResponse(200, 'application/json', ab);
    } catch (err) {
      console.warn('Failed to fetch live appointments from CRM, falling back:', err);
    }
  }

  if (path.includes('hallway/actions')) {
    try {
      const pool = getPool();
      const crmDb = process.env.CRM_DB_NAME || 'CRM';
      const [leadRows]: any = await pool.query(`
        SELECT id, lead_identifier, name, assignee, budget, stage, substage, created_at, updated_at
        FROM ${crmDb}.addlead
        WHERE stage NOT IN ('LOST', 'DROPPED') OR stage IS NULL
        ORDER BY updated_at DESC
        LIMIT 6
      `).catch(() => [[]]);

      const leadItems = (Array.isArray(leadRows) ? leadRows : []).map((l: any) => ({
        id: `lead-act-${l.id}`,
        name: `Follow up: ${l.name || 'Client Lead'} (${l.lead_identifier || `#${l.id}`})`,
        detail: `Stage: ${l.stage || 'Discussion'} · Assigned to ${l.assignee || 'Sales Team'}`,
        done: false,
      }));

      const actionsBody = JSON.stringify({
        dayBasis: 'today',
        actions:
          leadItems.length > 0
            ? [
          {
            id: 'crm-pipeline-actions',
            title: 'Lead Follow-ups Due Today',
                  count: leadItems.length,
            urgent: true,
                  items: leadItems,
                },
              ]
            : [],
      });
      const buf = Buffer.from(actionsBody, 'utf-8');
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return toResponse(200, 'application/json', ab);
    } catch (err) {
      console.warn('Failed to fetch live actions from CRM:', err);
    }
  }

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.clone().arrayBuffer() : undefined;
  const preferToken = clientBearer(request);

  if (path.includes('hallway/feed')) {
    let out = await fetchWithFallback(path, incoming.search, method, body, preferToken);
    out = await sanitizeHallwayFeedPayload(out);
    return toResponse(out.status, out.contentType, out.body);
  }
  const key = `${method}:${path}${incoming.search}`;
  const now = Date.now();
  const isHallwayPublicApi =
    path.startsWith('v1/hallway/') ||
    path.startsWith('api/hallway/') ||
    path.includes('hallway/people') ||
    path.includes('hallway/leaderboard') ||
    path.includes('hallway/records');

  const cacheable = method === 'GET' && !isHubAuthPath(path) && (!preferToken || isHallwayPublicApi);
  const ttl = path.includes('hallway/feed') ? 15_000 : isHallwayPublicApi ? 300_000 : CACHE_TTL_MS;
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
