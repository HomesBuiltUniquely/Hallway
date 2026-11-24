/**
 * Booking assignee + meeting dedupe mirrors — run: npm run test:booking-attribution
 */
import assert from 'node:assert/strict';

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
  };
  return aliases[raw] || null;
}

function bookingAssignForRow(r, map) {
  const table = normalizeCrmLeadTable(r.lead_type);
  const id = Number(r.lead_id);
  if (table && id > 0) {
    const fromLead = map.get(`${table}:${id}`);
    if (fromLead) return fromLead;
  }
  return String(r.submitted_by_name || '').trim();
}

const map = new Map([['mlead:78015', 'Meghana']]);
const row = {
  lead_id: 78015,
  lead_type: 'mlead',
  submitted_by_name: 'Mohammed Bilal',
};
assert.equal(bookingAssignForRow(row, map), 'Meghana', 'lead assignee wins over submitter');

assert.equal(
  bookingAssignForRow({ submitted_by_name: 'Mohammed Bilal' }, map),
  'Mohammed Bilal',
  'fallback submitter when no lead match'
);

function meetingActivityRank(row) {
  const prog = String(row.progress || '').toLowerCase();
  if (prog === 'in_progress') return 40;
  if (prog === 'scheduled') return 20;
  return 10;
}

function pickBest(group) {
  return [...group].sort((a, b) => meetingActivityRank(b) - meetingActivityRank(a))[0];
}

const group = [
  { id: 1, leadId: 9, progress: 'scheduled', meetingTime: '2:00 PM' },
  { id: 2, leadId: 9, progress: 'in_progress', meetingTime: '4:00 PM' },
  { id: 3, leadId: 9, progress: 'scheduled', meetingTime: '5:30 PM' },
];
assert.equal(pickBest(group).id, 2, 'in_progress wins for same lead');

console.log('bookingAttribution.test.mjs: ok');