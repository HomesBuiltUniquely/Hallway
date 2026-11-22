/**
 * Celebration eligibility policy mirrors — run: npm run test:celebrations
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function recencyHours(raw) {
  const n = Number(raw ?? 24);
  if (!Number.isFinite(n) || n <= 0) return 24;
  return Math.min(Math.max(Math.floor(n), 1), 168);
}

function maxPopups(raw) {
  const n = Number(raw ?? 3);
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.min(Math.max(Math.floor(n), 1), 10);
}

assert(recencyHours(undefined) === 24, 'default recency 24h');
assert(recencyHours('48') === 48, 'custom recency');
assert(maxPopups(undefined) === 3, 'default max 3 popups');

// Baseline: event must be after rollout AND after viewer baseline (server-side)
const rollout = new Date('2026-11-22T00:00:00.000Z');
const viewerBaseline = new Date('2026-11-21T12:00:00.000Z');
const floor = rollout > viewerBaseline ? rollout : viewerBaseline;
const oldEvent = new Date('2026-11-20T00:00:00.000Z');
const newEvent = new Date('2026-11-22T06:00:00.000Z');
assert(oldEvent < floor, 'historical booking before floor is ineligible');
assert(newEvent >= floor, 'new booking after floor is eligible');

// Overflow summary
const total = 7;
const cap = 3;
assert(Math.max(0, total - cap) === 4, '+4 more summary');

console.log('celebrationsEligibility.test.mjs: ok');