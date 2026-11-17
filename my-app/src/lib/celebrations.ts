import { ensureAnnouncementExists, ensureHallwaySchema, getPool } from './db';

export type CelebrationMilestone = 'token' | 'booking_confirmed';
export type CelebrationType = 'new_booking' | 'big_one' | 'spot_closure' | 'booking_confirmed';

export type CelebrationEvent = {
  id: string;
  bookingId: string;
  celebrationType: CelebrationType;
  typeLabel: string;
  salespersonName: string;
  branchName: string;
  customerName: string;
  quoteAmount: number;
  quoteFormatted: string;
  announcementId: string;
  occurredAt: string;
};

const TEST_NAME = /\btest\b/i;
const TEN_LAKH = 1_000_000;

export function celebrationSecret(): string {
  return process.env.HALLWAY_CELEBRATION_SECRET || 'hallway-celebration-dev';
}

export function formatQuoteInr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return cr % 1 === 0 ? `₹${cr} Cr` : `₹${cr.toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    return lakhs % 1 === 0 ? `₹${lakhs}L` : `₹${lakhs.toFixed(2)}L`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function typeLabel(type: string): string {
  if (type === 'big_one') return 'Big one';
  if (type === 'spot_closure') return 'Spot closure';
  if (type === 'booking_confirmed') return 'Booking confirmed';
  return 'New booking';
}

export function normalizeMilestone(raw: string | null | undefined): CelebrationMilestone {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (key === 'booking_confirmed' || key === 'booking' || key === 'full_booking' || key === 'convert') {
    return 'booking_confirmed';
  }
  return 'token';
}

function titleFor(type: CelebrationType, salesperson: string): string {
  if (type === 'big_one') return `Big one closed — ${salesperson}`;
  if (type === 'spot_closure') return `Spot closure — ${salesperson}`;
  if (type === 'booking_confirmed') return `Booking confirmed — ${salesperson}`;
  return `New booking — ${salesperson}`;
}

export function normalizeViewerKey(raw: string | null | undefined): string {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .slice(0, 191);
  return key;
}

/**
 * Expand one identity into all equivalent keys so Hallway (email),
 * CRM (login username / user id), and Design (email) share one receipt.
 */
export function expandViewerKeys(
  raw: string | string[] | null | undefined
): string[] {
  const seeds = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

  const out = new Set<string>();
  for (const seed of seeds) {
    const key = normalizeViewerKey(seed);
    if (!key) continue;
    out.add(key);
    if (key.includes('@')) {
      const local = key.split('@')[0]?.trim();
      if (local) out.add(local.slice(0, 191));
    }
    // Numeric CRM user ids — keep plain + prefixed forms
    if (/^\d+$/.test(key)) {
      out.add(`uid:${key}`.slice(0, 191));
    }
    if (key.startsWith('uid:') && /^\d+$/.test(key.slice(4))) {
      out.add(key.slice(4));
    }
  }
  return Array.from(out);
}

function mapRow(row: Record<string, unknown>): CelebrationEvent {
  const amount = Number(row.quote_amount) || 0;
  const type = String(row.celebration_type || 'new_booking') as CelebrationType;
  const occurred = row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at || '');
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    celebrationType: type,
    typeLabel: typeLabel(type),
    salespersonName: String(row.salesperson_name || ''),
    branchName: String(row.branch_name || ''),
    customerName: String(row.customer_name || ''),
    quoteAmount: amount,
    quoteFormatted: formatQuoteInr(amount),
    announcementId: String(row.announcement_id),
    occurredAt: occurred,
  };
}

export async function createCelebration(input: {
  bookingId: string;
  celebrationType?: string;
  milestone?: string;
  salespersonName?: string;
  branchName?: string;
  customerName?: string;
  quoteAmount?: number;
}): Promise<{ created: boolean; id?: string }> {
  const bookingId = String(input.bookingId || '').trim();
  const salesperson = String(input.salespersonName || '').trim();
  const customer = String(input.customerName || '').trim();
  const quote = Number(input.quoteAmount);
  const milestone = normalizeMilestone(input.milestone);
  if (!bookingId || !salesperson || !Number.isFinite(quote) || quote <= 0) {
    return { created: false };
  }
  if (TEST_NAME.test(salesperson) || TEST_NAME.test(customer)) {
    return { created: false };
  }

  let type: CelebrationType = 'new_booking';
  if (milestone === 'booking_confirmed') {
    type = 'booking_confirmed';
  } else if (input.celebrationType === 'spot_closure') {
    type = 'spot_closure';
  } else if (input.celebrationType === 'big_one' || quote >= TEN_LAKH) {
    type = 'big_one';
  }

  const id = `cele-${bookingId}-${milestone}`.slice(0, 64);
  const announcementId =
    milestone === 'booking_confirmed'
      ? `crm-booking-${bookingId}-confirmed`
      : `crm-booking-${bookingId}`;
  const branch = String(input.branchName || '').trim() || 'Hub';
  const amountLabel = formatQuoteInr(quote);
  const who = customer ? `${customer}'s home` : 'a home';
  const verb =
    type === 'booking_confirmed'
      ? 'confirmed full booking for'
      : type === 'new_booking'
        ? 'booked'
        : 'closed';
  const content = `${salesperson} (${branch}) ${verb} ${who} for ${amountLabel}.`;

  await ensureHallwaySchema();
  const pool = getPool();
  const [result] = await pool.query<any>(
    `INSERT INTO celebration_events (
      id, booking_id, milestone, celebration_type, salesperson_name, branch_name,
      customer_name, quote_amount, announcement_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE id = id`,
    [
      id,
      bookingId.slice(0, 64),
      milestone,
      type,
      salesperson.slice(0, 255),
      branch.slice(0, 255),
      customer.slice(0, 255) || null,
      quote,
      announcementId,
    ]
  );

  const created = Number(result?.affectedRows) === 1;
  if (created) {
    await ensureAnnouncementExists(pool, announcementId, {
      type: 'booking',
      title: titleFor(type, salesperson),
      content,
      authorName: salesperson,
      authorTeam: branch,
      categoryColor: '#10B981',
      department: 'Sales',
    });
  }
  return { created, id };
}

/** Unseen celebrations for one person (any of their identity aliases). Newest first, at most five. */
export async function listUnseenCelebrations(
  viewerKey: string | string[],
  limit = 5
): Promise<CelebrationEvent[]> {
  const viewers = expandViewerKeys(viewerKey);
  if (viewers.length === 0) return [];
  await ensureHallwaySchema();
  const pool = getPool();
  const cap = Math.min(Math.max(limit, 1), 5);
  const placeholders = viewers.map(() => '?').join(', ');
  const [rows] = await pool.query<any[]>(
    `SELECT e.id, e.booking_id, e.celebration_type, e.salesperson_name, e.branch_name,
            e.customer_name, e.quote_amount, e.announcement_id, e.occurred_at
     FROM celebration_events e
     WHERE e.occurred_at >= (NOW() - INTERVAL 30 DAY)
       AND NOT EXISTS (
         SELECT 1 FROM celebration_receipts r
         WHERE r.event_id = e.id
           AND r.viewer_key IN (${placeholders})
           AND r.seen_at IS NOT NULL
       )
     ORDER BY e.occurred_at DESC
     LIMIT ${cap}`,
    viewers
  );
  return (rows || []).map(mapRow);
}

export async function markCelebrationSeen(
  eventId: string,
  viewerKey: string | string[],
  congratulated: boolean
): Promise<void> {
  const viewers = expandViewerKeys(viewerKey);
  const id = String(eventId || '').trim();
  if (viewers.length === 0 || !id) return;
  await ensureHallwaySchema();
  const pool = getPool();
  for (const viewer of viewers) {
    if (congratulated) {
      await pool.query(
        `INSERT INTO celebration_receipts (event_id, viewer_key, seen_at, congratulated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE seen_at = COALESCE(seen_at, NOW()), congratulated_at = COALESCE(congratulated_at, NOW())`,
        [id, viewer]
      );
    } else {
      await pool.query(
        `INSERT INTO celebration_receipts (event_id, viewer_key, seen_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE seen_at = COALESCE(seen_at, NOW())`,
        [id, viewer]
      );
    }
  }
}
