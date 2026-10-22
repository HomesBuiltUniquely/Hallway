import { ensureAnnouncementExists, ensureHallwaySchema, getPool } from './db';

export type CelebrationType = 'new_booking' | 'big_one' | 'spot_closure';

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
  return 'New booking';
}

function titleFor(type: CelebrationType, salesperson: string): string {
  if (type === 'big_one') return `Big one closed — ${salesperson}`;
  if (type === 'spot_closure') return `Spot closure — ${salesperson}`;
  return `New booking — ${salesperson}`;
}

export function normalizeViewerKey(raw: string | null | undefined): string {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .slice(0, 191);
  return key;
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
  salespersonName?: string;
  branchName?: string;
  customerName?: string;
  quoteAmount?: number;
}): Promise<{ created: boolean; id?: string }> {
  const bookingId = String(input.bookingId || '').trim();
  const salesperson = String(input.salespersonName || '').trim();
  const customer = String(input.customerName || '').trim();
  const quote = Number(input.quoteAmount);
  if (!bookingId || !salesperson || !Number.isFinite(quote) || quote <= 0) {
    return { created: false };
  }
  if (TEST_NAME.test(salesperson) || TEST_NAME.test(customer)) {
    return { created: false };
  }

  let type: CelebrationType = 'new_booking';
  if (input.celebrationType === 'spot_closure') type = 'spot_closure';
  else if (input.celebrationType === 'big_one' || quote >= TEN_LAKH) type = 'big_one';

  const id = `cele-${bookingId}`.slice(0, 64);
  const announcementId = `crm-booking-${bookingId}`;
  const branch = String(input.branchName || '').trim() || 'Hub';
  const amountLabel = formatQuoteInr(quote);
  const who = customer ? `${customer}'s home` : 'a home';
  const verb = type === 'new_booking' ? 'booked' : 'closed';
  const content = `${salesperson} (${branch}) ${verb} ${who} for ${amountLabel}.`;

  await ensureHallwaySchema();
  const pool = getPool();
  const [result] = await pool.query<any>(
    `INSERT INTO celebration_events (
      id, booking_id, celebration_type, salesperson_name, branch_name,
      customer_name, quote_amount, announcement_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE id = id`,
    [id, bookingId.slice(0, 64), type, salesperson.slice(0, 255), branch.slice(0, 255), customer.slice(0, 255) || null, quote, announcementId]
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

/** Unseen celebrations for one person. Newest first, at most five. */
export async function listUnseenCelebrations(viewerKey: string, limit = 5): Promise<CelebrationEvent[]> {
  const viewer = normalizeViewerKey(viewerKey);
  if (!viewer) return [];
  await ensureHallwaySchema();
  const pool = getPool();
  const cap = Math.min(Math.max(limit, 1), 5);
  const [rows] = await pool.query<any[]>(
    `SELECT e.id, e.booking_id, e.celebration_type, e.salesperson_name, e.branch_name,
            e.customer_name, e.quote_amount, e.announcement_id, e.occurred_at
     FROM celebration_events e
     LEFT JOIN celebration_receipts r
       ON r.event_id = e.id AND r.viewer_key = ?
     WHERE e.occurred_at >= (NOW() - INTERVAL 1 DAY)
       AND r.seen_at IS NULL
     ORDER BY e.occurred_at DESC
     LIMIT ${cap}`,
    [viewer]
  );
  return (rows || []).map(mapRow);
}

export async function markCelebrationSeen(
  eventId: string,
  viewerKey: string,
  congratulated: boolean
): Promise<void> {
  const viewer = normalizeViewerKey(viewerKey);
  const id = String(eventId || '').trim();
  if (!viewer || !id) return;
  await ensureHallwaySchema();
  const pool = getPool();
  if (congratulated) {
    await pool.query(
      `INSERT INTO celebration_receipts (event_id, viewer_key, seen_at, congratulated_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE seen_at = COALESCE(seen_at, NOW()), congratulated_at = COALESCE(congratulated_at, NOW())`,
      [id, viewer]
    );
    return;
  }
  await pool.query(
    `INSERT INTO celebration_receipts (event_id, viewer_key, seen_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE seen_at = COALESCE(seen_at, NOW())`,
    [id, viewer]
  );
}
