/**
 * One-off: list CRM bookings that roll into monthly winner total (Oct 2026, Somashekar).
 * node scripts/query-monthly-winner-deals.mjs
 */
import mysql from 'mysql2/promise';

const DB = {
  host: process.env.DB_HOST || 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Hubinterior2019',
  database: process.env.DB_NAME || 'hallway_db',
  connectTimeout: 20000,
};

const CRM_DB = process.env.CRM_DB_NAME || 'CRM';
const DATE_FROM = '2026-10-01';
const DATE_TO = '2026-10-31';
const REP_MATCH = /somashekar/i;

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
];

function ymdFromDb(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(t);
}

function recognitionYmd(r) {
  return (
    ymdFromDb(r.booking_done_date) ||
    ymdFromDb(r.ten_percent_paid_date) ||
    ymdFromDb(r.booking_date) ||
    ymdFromDb(r.created_at) ||
    ''
  );
}

function formatL(inr) {
  if (inr >= 100000) return `₹${(inr / 100000).toFixed(2)}L`;
  return `₹${Math.round(inr).toLocaleString('en-IN')}`;
}

function normalizeCrmLeadTable(leadType) {
  const raw = String(leadType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  const aliases = {
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
  return CRM_LEAD_TABLES.includes(raw) ? raw : null;
}

const pool = await mysql.createPool(DB);

const rangeStartUtc = new Date(`${DATE_FROM}T00:00:00+05:30`);
const rangeEndUtc = new Date(`${DATE_TO}T23:59:59.999+05:30`);

const [rows] = await pool.query(
  `
  SELECT
    id, lead_id, lead_type, customer_name, submitted_by_name, quote_amount,
    listing_type, booking_status, booking_done_date, ten_percent_paid_date,
    booking_date, created_at
  FROM ${CRM_DB}.booking_token_record
  WHERE LOWER(TRIM(listing_type)) = 'booking'
    AND LOWER(TRIM(COALESCE(booking_status, ''))) NOT IN ('cancelled', 'canceled')
    AND (
      (booking_done_date IS NOT NULL AND booking_done_date BETWEEN ? AND ?)
      OR (booking_done_date IS NULL AND ten_percent_paid_date IS NOT NULL AND ten_percent_paid_date BETWEEN ? AND ?)
      OR (booking_done_date IS NULL AND ten_percent_paid_date IS NULL AND booking_date IS NOT NULL AND booking_date BETWEEN ? AND ?)
      OR (booking_done_date IS NULL AND ten_percent_paid_date IS NULL AND booking_date IS NULL AND created_at >= ? AND created_at <= ?)
    )
  `,
  [DATE_FROM, DATE_TO, DATE_FROM, DATE_TO, DATE_FROM, DATE_TO, rangeStartUtc, rangeEndUtc]
);

const byTable = new Map();
for (const r of rows) {
  const table = normalizeCrmLeadTable(r.lead_type);
  const id = Number(r.lead_id);
  if (!table || !Number.isFinite(id) || id <= 0) continue;
  const set = byTable.get(table) || new Set();
  set.add(id);
  byTable.set(table, set);
}

const assigneeMap = new Map();
for (const table of CRM_LEAD_TABLES) {
  const ids = byTable.get(table);
  if (!ids || ids.size === 0) continue;
  const idList = [...ids];
  try {
    const [leadRows] = await pool.query(
      `SELECT id, NULLIF(TRIM(assignee), '') AS assignee
       FROM ${CRM_DB}.${table}
       WHERE id IN (${idList.map(() => '?').join(',')})`,
      idList
    );
    for (const row of leadRows) {
      const assignee = String(row.assignee || '').trim();
      if (assignee) assigneeMap.set(`${table}:${Number(row.id)}`, assignee);
    }
  } catch {
    /* skip */
  }
}

function assignForRow(r) {
  const table = normalizeCrmLeadTable(r.lead_type);
  const id = Number(r.lead_id);
  if (table && Number.isFinite(id) && id > 0) {
    const fromLead = assigneeMap.get(`${table}:${id}`);
    if (fromLead) return fromLead;
  }
  return String(r.submitted_by_name || '').trim();
}

const somashekarDeals = [];
let total = 0;
for (const r of rows) {
  const listingDate = recognitionYmd(r);
  if (!listingDate || listingDate < DATE_FROM || listingDate > DATE_TO) continue;
  const quote = Number(r.quote_amount) || 0;
  if (quote <= 0) continue;
  const assign = assignForRow(r);
  if (!REP_MATCH.test(assign)) continue;
  total += quote;
  somashekarDeals.push({
    booking_id: r.id,
    customer_name: String(r.customer_name || '').trim(),
    quote_inr: quote,
    quote_display: formatL(quote),
    recognition_date: listingDate,
    credited_to: assign,
    lead_type: r.lead_type,
    lead_id: r.lead_id,
    submitted_by_name: r.submitted_by_name,
  });
}

somashekarDeals.sort((a, b) => a.recognition_date.localeCompare(b.recognition_date) || a.booking_id - b.booking_id);

console.log(
  JSON.stringify(
    {
      period: 'October 2026 (IST recognition)',
      credited_rep: 'Somashekar (CRM assignee match)',
      deal_count: somashekarDeals.length,
      total_inr: total,
      total_display: formatL(total),
      bookings: somashekarDeals,
    },
    null,
    2
  )
);

await pool.end();