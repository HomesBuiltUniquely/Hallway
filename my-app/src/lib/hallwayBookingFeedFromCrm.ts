import { getPool } from './db';
import { formatPersonName, istYmd } from './hallwayDisplay';

/**
 * One CRM BOOKING row for Hallway — same recognition rules as
 * BookingTokenRecognitionDates.bookingDoneDate / CRM BOOKING tab.
 */
export type HallwayMonthBookingDeal = {
  id: string;
  customerName: string;
  assign: string;
  dealValue: number;
  listingType: 'booking';
  bookingStatus: string;
  /** Recognition day (IST yyyy-MM-dd) */
  listingDate: string;
  bookingDoneDate: string | null;
  tenPercentPaidDate: string | null;
  tokenTakenDate: string | null;
  bookingDate: string | null;
  createdAt: string | null;
};

export type BookingLeaderboardPeriod = 'mtd' | 'qtd' | 'all_time';

function ymdFromDb(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return istYmd(v);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return istYmd(t);
}

/** Full IST calendar month (matches CRM “This month”). */
export function istCalendarMonthBounds(now = new Date()): {
  dateFrom: string;
  dateTo: string;
  fromMs: number;
  toMs: number;
  monthKey: string;
} {
  const today = istYmd(now);
  const [y, m] = today.split('-');
  const dateFrom = `${y}-${m}-01`;
  const nextMonth =
    Number(m) === 12
      ? `${Number(y) + 1}-01-01`
      : `${y}-${String(Number(m) + 1).padStart(2, '0')}-01`;
  const toMs = new Date(`${nextMonth}T00:00:00+05:30`).getTime() - 1;
  const dateTo = istYmd(new Date(toMs));
  return {
    dateFrom,
    dateTo,
    fromMs: new Date(`${dateFrom}T00:00:00+05:30`).getTime(),
    toMs,
    monthKey: `${y}-${m}`,
  };
}

/** IST calendar quarter-to-date (QTD). */
export function istQuarterToDateBounds(now = new Date()): {
  dateFrom: string;
  dateTo: string;
  fromMs: number;
  toMs: number;
  quarterKey: string;
} {
  const today = istYmd(now);
  const [y, m] = today.split('-').map(Number);
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
  const dateFrom = `${y}-${String(qStartMonth).padStart(2, '0')}-01`;
  const dateTo = today;
  const q = Math.floor((m - 1) / 3) + 1;
  return {
    dateFrom,
    dateTo,
    fromMs: new Date(`${dateFrom}T00:00:00+05:30`).getTime(),
    toMs: new Date(`${dateTo}T23:59:59.999+05:30`).getTime(),
    quarterKey: `${y}-Q${q}`,
  };
}

/** MTD = IST month start → today (month-to-date). */
export function istMonthToDateBounds(now = new Date()): {
  dateFrom: string;
  dateTo: string;
  fromMs: number;
  toMs: number;
  monthKey: string;
} {
  const today = istYmd(now);
  const [y, m] = today.split('-');
  const dateFrom = `${y}-${m}-01`;
  return {
    dateFrom,
    dateTo: today,
    fromMs: new Date(`${dateFrom}T00:00:00+05:30`).getTime(),
    toMs: new Date(`${today}T23:59:59.999+05:30`).getTime(),
    monthKey: `${y}-${m}`,
  };
}

export function periodBounds(
  period: BookingLeaderboardPeriod,
  now = new Date()
): { dateFrom: string | null; dateTo: string | null; fromMs: number; toMs: number; label: string } {
  if (period === 'all_time') {
    return {
      dateFrom: null,
      dateTo: null,
      fromMs: Number.NEGATIVE_INFINITY,
      toMs: Number.POSITIVE_INFINITY,
      label: 'all_time',
    };
  }
  if (period === 'qtd') {
    const b = istQuarterToDateBounds(now);
    return { dateFrom: b.dateFrom, dateTo: b.dateTo, fromMs: b.fromMs, toMs: b.toMs, label: b.quarterKey };
  }
  const b = istMonthToDateBounds(now);
  return { dateFrom: b.dateFrom, dateTo: b.dateTo, fromMs: b.fromMs, toMs: b.toMs, label: b.monthKey };
}

/**
 * Booking-tab recognition date (priority matches BookingTokenRecognitionDates.bookingDoneDate).
 */
export function bookingRecognitionYmd(row: {
  bookingDoneDate?: string | null;
  tenPercentPaidDate?: string | null;
  bookingDate?: string | null;
  createdAt?: string | Date | null;
}): string {
  return (
    ymdFromDb(row.bookingDoneDate) ||
    ymdFromDb(row.tenPercentPaidDate) ||
    ymdFromDb(row.bookingDate) ||
    ymdFromDb(row.createdAt) ||
    ''
  );
}

const CRM_LEAD_TABLES = [
  'mlead',
  'addlead',
  'glead',
  'formlead',
  'walkinlead',
  'websitelead',
  'whatsapplead',
  'ivrlead',
  'quikrlead',
] as const;

function normalizeCrmLeadTable(leadType: unknown): (typeof CRM_LEAD_TABLES)[number] | null {
  const raw = String(leadType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  const aliases: Record<string, (typeof CRM_LEAD_TABLES)[number]> = {
    mlead: 'mlead',
    m: 'mlead',
    addlead: 'addlead',
    add: 'addlead',
    glead: 'glead',
    g: 'glead',
    formlead: 'formlead',
    form: 'formlead',
    walkinlead: 'walkinlead',
    walkin: 'walkinlead',
    websitelead: 'websitelead',
    website: 'websitelead',
    whatsapplead: 'whatsapplead',
    whatsapp: 'whatsapplead',
    ivrlead: 'ivrlead',
    ivr: 'ivrlead',
    quikrlead: 'quikrlead',
    quikr: 'quikrlead',
  };
  const hit = aliases[raw];
  if (hit) return hit;
  return (CRM_LEAD_TABLES as readonly string[]).includes(raw)
    ? (raw as (typeof CRM_LEAD_TABLES)[number])
    : null;
}

/** Credit sales executive from lead.assignee; fall back to form submitter. */
export async function resolveBookingAssigneeMap(
  rows: Array<{ lead_id?: unknown; lead_type?: unknown }>,
  crmDb: string
): Promise<Map<string, string>> {
  const pool = getPool();
  const byTable = new Map<string, Set<number>>();
  for (const r of rows) {
    const table = normalizeCrmLeadTable(r.lead_type);
    const id = Number(r.lead_id);
    if (!table || !Number.isFinite(id) || id <= 0) continue;
    const set = byTable.get(table) || new Set<number>();
    set.add(id);
    byTable.set(table, set);
  }

  const out = new Map<string, string>();
  for (const table of CRM_LEAD_TABLES) {
    const ids = byTable.get(table);
    if (!ids || ids.size === 0) continue;
    const idList = [...ids];
    try {
      const [leadRows]: any = await pool.query(
        `SELECT id, NULLIF(TRIM(assignee), '') AS assignee
         FROM ${crmDb}.${table}
         WHERE id IN (${idList.map(() => '?').join(',')})`,
        idList
      );
      for (const row of Array.isArray(leadRows) ? leadRows : []) {
        const assignee = String(row.assignee || '').trim();
        if (assignee) out.set(`${table}:${Number(row.id)}`, assignee);
      }
    } catch {
      /* table missing or permission — skip */
    }
  }
  return out;
}

export function bookingAssignForRow(
  r: { lead_id?: unknown; lead_type?: unknown; submitted_by_name?: unknown },
  assigneeMap: Map<string, string>
): string {
  const table = normalizeCrmLeadTable(r.lead_type);
  const id = Number(r.lead_id);
  if (table && Number.isFinite(id) && id > 0) {
    const fromLead = assigneeMap.get(`${table}:${id}`);
    if (fromLead) return formatPersonName(fromLead) || fromLead;
  }
  return String(r.submitted_by_name || '').trim();
}

/** Celebration webhooks often send submitter name — resolve lead.assignee from booking id. */
export async function resolveBookingAssigneeForBookingId(bookingId: string): Promise<string | null> {
  const id = Number(String(bookingId || '').trim());
  if (!Number.isFinite(id) || id <= 0) return null;
  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';
  try {
    const [rows]: any = await pool.query(
      `SELECT lead_id, lead_type, submitted_by_name
       FROM ${crmDb}.booking_token_record
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    const r = Array.isArray(rows) ? rows[0] : null;
    if (!r) return null;
    const assigneeMap = await resolveBookingAssigneeMap([r], crmDb);
    const assign = bookingAssignForRow(r, assigneeMap);
    return assign || null;
  } catch {
    return null;
  }
}

function mapRow(
  r: any,
  dateFrom: string | null,
  dateTo: string | null,
  assignOverride?: string
): HallwayMonthBookingDeal | null {
  const bookingDoneDate = ymdFromDb(r.booking_done_date);
  const tenPercentPaidDate = ymdFromDb(r.ten_percent_paid_date);
  const bookingDate = ymdFromDb(r.booking_date);
  const createdAt = r.created_at ? new Date(r.created_at).toISOString() : null;
  const listingDate = bookingRecognitionYmd({
    bookingDoneDate,
    tenPercentPaidDate,
    bookingDate,
    createdAt,
  });
  if (!listingDate) return null;
  if (dateFrom && listingDate < dateFrom) return null;
  if (dateTo && listingDate > dateTo) return null;

  const dealValue = Number(r.quote_amount) || 0;
  if (dealValue <= 0) return null;

  const assign = (assignOverride || String(r.submitted_by_name || '')).trim();
  if (!assign) return null;

  return {
    id: String(r.id),
    customerName: String(r.customer_name || '').trim(),
    assign,
    dealValue,
    listingType: 'booking',
    bookingStatus: String(r.booking_status || 'confirmed'),
    listingDate,
    bookingDoneDate,
    tenPercentPaidDate,
    tokenTakenDate: ymdFromDb(r.token_taken_date),
    bookingDate,
    createdAt,
  };
}

/**
 * Confirmed BOOKING deals for a recognition window (or all-time).
 * O(k) rows in window via SQL predicates — not a Hub round-trip.
 */
export async function loadBookingDealsForPeriod(
  period: BookingLeaderboardPeriod,
  now = new Date()
): Promise<HallwayMonthBookingDeal[]> {
  const { dateFrom, dateTo } = periodBounds(period, now);
  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';

  let rows: any[];
  if (!dateFrom || !dateTo) {
    const [allRows]: any = await pool.query(
      `
      SELECT
        id, lead_id, lead_type, customer_name, submitted_by_name, quote_amount, amount_received,
        listing_type, booking_status, booking_done_date, ten_percent_paid_date,
        token_taken_date, token_paid_date, booking_date, created_at
      FROM ${crmDb}.booking_token_record
      WHERE LOWER(TRIM(listing_type)) = 'booking'
        AND LOWER(TRIM(COALESCE(booking_status, ''))) NOT IN ('cancelled', 'canceled')
      `
    );
    rows = Array.isArray(allRows) ? allRows : [];
  } else {
    const rangeStartUtc = new Date(`${dateFrom}T00:00:00+05:30`);
    const rangeEndUtc = new Date(`${dateTo}T23:59:59.999+05:30`);
    const [rangeRows]: any = await pool.query(
      `
      SELECT
        id, lead_id, lead_type, customer_name, submitted_by_name, quote_amount, amount_received,
        listing_type, booking_status, booking_done_date, ten_percent_paid_date,
        token_taken_date, token_paid_date, booking_date, created_at
      FROM ${crmDb}.booking_token_record
      WHERE LOWER(TRIM(listing_type)) = 'booking'
        AND LOWER(TRIM(COALESCE(booking_status, ''))) NOT IN ('cancelled', 'canceled')
        AND (
          (booking_done_date IS NOT NULL AND booking_done_date BETWEEN ? AND ?)
          OR (
            booking_done_date IS NULL
            AND ten_percent_paid_date IS NOT NULL
            AND ten_percent_paid_date BETWEEN ? AND ?
          )
          OR (
            booking_done_date IS NULL
            AND ten_percent_paid_date IS NULL
            AND booking_date IS NOT NULL
            AND booking_date BETWEEN ? AND ?
          )
          OR (
            booking_done_date IS NULL
            AND ten_percent_paid_date IS NULL
            AND booking_date IS NULL
            AND created_at >= ? AND created_at <= ?
          )
        )
      `,
      [
        dateFrom,
        dateTo,
        dateFrom,
        dateTo,
        dateFrom,
        dateTo,
        rangeStartUtc,
        rangeEndUtc,
      ]
    );
    rows = Array.isArray(rangeRows) ? rangeRows : [];
  }

  const assigneeMap = await resolveBookingAssigneeMap(rows, crmDb);
  const out: HallwayMonthBookingDeal[] = [];
  for (const r of rows) {
    const mapped = mapRow(r, dateFrom, dateTo, bookingAssignForRow(r, assigneeMap));
    if (mapped) out.push(mapped);
  }
  out.sort((a, b) => (a.listingDate < b.listingDate ? 1 : a.listingDate > b.listingDate ? -1 : 0));
  return out;
}

/**
 * Confirmed BOOKING deals recognized between dateFrom and dateTo (inclusive, IST ymd).
 * Used for weekly performer scoring and full-month feeds.
 */
export async function loadBookingDealsForDateRange(
  dateFrom: string,
  dateTo: string
): Promise<HallwayMonthBookingDeal[]> {
  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';
  const rangeStartUtc = new Date(`${dateFrom}T00:00:00+05:30`);
  const rangeEndUtc = new Date(`${dateTo}T23:59:59.999+05:30`);

  const [rows]: any = await pool.query(
    `
    SELECT
      id, lead_id, lead_type, customer_name, submitted_by_name, quote_amount, amount_received,
      listing_type, booking_status, booking_done_date, ten_percent_paid_date,
      token_taken_date, token_paid_date, booking_date, created_at
    FROM ${crmDb}.booking_token_record
    WHERE LOWER(TRIM(listing_type)) = 'booking'
      AND LOWER(TRIM(COALESCE(booking_status, ''))) NOT IN ('cancelled', 'canceled')
      AND (
        (booking_done_date IS NOT NULL AND booking_done_date BETWEEN ? AND ?)
        OR (
          booking_done_date IS NULL
          AND ten_percent_paid_date IS NOT NULL
          AND ten_percent_paid_date BETWEEN ? AND ?
        )
        OR (
          booking_done_date IS NULL
          AND ten_percent_paid_date IS NULL
          AND booking_date IS NOT NULL
          AND booking_date BETWEEN ? AND ?
        )
        OR (
          booking_done_date IS NULL
          AND ten_percent_paid_date IS NULL
          AND booking_date IS NULL
          AND created_at >= ? AND created_at <= ?
        )
      )
    ORDER BY COALESCE(booking_done_date, ten_percent_paid_date, booking_date, DATE(created_at)) DESC
    `,
    [
      dateFrom,
      dateTo,
      dateFrom,
      dateTo,
      dateFrom,
      dateTo,
      rangeStartUtc,
      rangeEndUtc,
    ]
  );

  const rowList = Array.isArray(rows) ? rows : [];
  const assigneeMap = await resolveBookingAssigneeMap(rowList, crmDb);
  const out: HallwayMonthBookingDeal[] = [];
  for (const r of rowList) {
    const mapped = mapRow(r, dateFrom, dateTo, bookingAssignForRow(r, assigneeMap));
    if (mapped) out.push(mapped);
  }
  out.sort((a, b) => (a.listingDate < b.listingDate ? 1 : a.listingDate > b.listingDate ? -1 : 0));
  return out;
}

/** Home feed: full IST calendar month (CRM “This month” parity). */
export async function loadThisMonthBookingDeals(
  now = new Date()
): Promise<HallwayMonthBookingDeal[]> {
  const { dateFrom, dateTo } = istCalendarMonthBounds(now);
  return loadBookingDealsForDateRange(dateFrom, dateTo);
}
