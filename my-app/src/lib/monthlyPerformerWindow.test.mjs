/**
 * Monthly performer IST windows — run: npm run test:monthly-performer
 */
import assert from 'node:assert/strict';

function istYmdFromDate(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function previousMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function resolveMonthly(now) {
  const displayMonthKey = istYmdFromDate(now).slice(0, 7);
  const scoringMonthKey = previousMonthKey(displayMonthKey);
  return {
    displayMonthKey,
    scoringMonthKey,
    monthlyCardId: `crm-monthly-top-${scoringMonthKey}`,
    publishedAt: `${displayMonthKey}-01T00:05:00+05:30`,
  };
}

// Nov 2026 → score October, card id 2026-10
{
  const ctx = resolveMonthly(new Date('2026-11-15T12:00:00+05:30'));
  assert.equal(ctx.displayMonthKey, '2026-11');
  assert.equal(ctx.scoringMonthKey, '2026-10');
  assert.equal(ctx.monthlyCardId, 'crm-monthly-top-2026-10');
  assert.equal(ctx.publishedAt, '2026-11-01T00:05:00+05:30');
}

// Oct 1 → score September (no October winner yet)
{
  const ctx = resolveMonthly(new Date('2026-10-01T00:10:00+05:30'));
  assert.equal(ctx.scoringMonthKey, '2026-09');
  assert.equal(ctx.monthlyCardId, 'crm-monthly-top-2026-09');
}

// Jan → score prior December
{
  const ctx = resolveMonthly(new Date('2027-01-20T12:00:00+05:30'));
  assert.equal(ctx.scoringMonthKey, '2026-12');
}

console.log('monthlyPerformerWindow.test.mjs: ok');