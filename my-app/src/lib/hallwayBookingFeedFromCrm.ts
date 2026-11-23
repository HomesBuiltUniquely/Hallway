import { getPool } from './db';
import { istYmd } from './hallwayDisplay';

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

const ALLOWED_LEAD_TABLES = new Set([
  'mlead',
  'glead',
  'addlead',
  'websitelead',
  'ivrlead',
  'whatsapplead',
  'walkinlead',
  'quikrlead',
]);

async function batchResolveLeadAssignees(
  pool: any,
  crmDb: string,
  records: Array<{ lead_id?: number | null; lead_type?: string | null }>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const byTable = new Map<string, Set<number>>();

  for (const r of records) {
    const rawTable = String(r.lead_type || '').toLowerCase().trim();
    const id = Number(r.lead_id);
    if (!id || !ALLOWED_LEAD_TABLES.has(rawTable)) continue;
    if (!byTable.has(rawTable)) byTable.set(rawTable, new Set());
    byTable.get(rawTable)!.add(id);
  }

  await Promise.all(
    Array.from(byTable.entries()).map(async ([table, idSet]) => {
      const ids = Array.from(idSet);
      if (ids.length === 0) return;
      try {
        const [rows]: any = await pool.query(
          `SELECT id, assignee FROM ${crmDb}.${table} WHERE id IN (?)`,
          [ids]
        );
        for (const row of Array.isArray(rows) ? rows : []) {
          const assignee = String(row.assignee || '').trim();
          if (assignee) {
            map.set(`${table}:${row.id}`, assignee);
          }
        }
      } catch (err) {
        console.warn(`[batchResolveLeadAssignees] failed for table ${table}:`, err);
      }
    })
  );

  return map;
}

function mapRow(
  r: any,
  dateFrom: string | null,
  dateTo: string | null,
  assigneeMap?: Map<string, string>
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

  const rawTable = String(r.lead_type || '').toLowerCase().trim();
  const leadKey = `${rawTable}:${Number(r.lead_id)}`;
  const leadAssignee = assigneeMap?.get(leadKey);
  const assign = String(leadAssignee || r.submitted_by_name || '').trim();
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
        id, customer_name, submitted_by_name, quote_amount, amount_received,
        listing_type, booking_status, booking_done_date, ten_percent_paid_date,
        token_taken_date, token_paid_date, booking_date, created_at,
        lead_id, lead_type
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
        id, customer_name, submitted_by_name, quote_amount, amount_received,
        listing_type, booking_status, booking_done_date, ten_percent_paid_date,
        token_taken_date, token_paid_date, booking_date, created_at,
        lead_id, lead_type
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

  const assigneeMap = await batchResolveLeadAssignees(pool, crmDb, rows);
  const out: HallwayMonthBookingDeal[] = [];
  for (const r of rows) {
    const mapped = mapRow(r, dateFrom, dateTo, assigneeMap);
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
  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';
  const monthStartUtc = new Date(`${dateFrom}T00:00:00+05:30`);
  const monthEndUtc = new Date(`${dateTo}T23:59:59.999+05:30`);

  const [rows]: any = await pool.query(
    `
    SELECT
      id, customer_name, submitted_by_name, quote_amount, amount_received,
      listing_type, booking_status, booking_done_date, ten_percent_paid_date,
      token_taken_date, token_paid_date, booking_date, created_at,
      lead_id, lead_type
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
      monthStartUtc,
      monthEndUtc,
    ]
  );

  const rawRows = Array.isArray(rows) ? rows : [];
  const assigneeMap = await batchResolveLeadAssignees(pool, crmDb, rawRows);
  const out: HallwayMonthBookingDeal[] = [];
  for (const r of rawRows) {
    const mapped = mapRow(r, dateFrom, dateTo, assigneeMap);
    if (mapped) out.push(mapped);
  }
  out.sort((a, b) => (a.listingDate < b.listingDate ? 1 : a.listingDate > b.listingDate ? -1 : 0));
  return out;
}
