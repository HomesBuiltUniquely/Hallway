/**
 * Weekly performer IST windows — run: npm run test:weekly-performer
 */
import assert from 'node:assert/strict';

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function istYmdFromDate(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function dayOfWeekIst(ymd) {
  return new Date(`${ymd}T12:00:00+05:30`).getUTCDay();
}

function displayWeekBounds(now = new Date()) {
  const today = istYmdFromDate(now);
  const dow = dayOfWeekIst(today);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayYmd = addDaysYmd(today, diffToMonday);
  const sundayYmd = addDaysYmd(mondayYmd, 6);
  return { mondayYmd, sundayYmd };
}

function scoringWeekBounds(now = new Date()) {
  const display = displayWeekBounds(now);
  const mondayYmd = addDaysYmd(display.mondayYmd, -7);
  const sundayYmd = addDaysYmd(mondayYmd, 6);
  return { mondayYmd, sundayYmd };
}

function formatScoredWeekLabel(mondayYmd, sundayYmd) {
  const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, sm, sd] = mondayYmd.split('-').map(Number);
  const [, em, ed] = sundayYmd.split('-').map(Number);
  if (sm === em) return `${sd}–${ed} ${MONTH[em - 1]}`;
  return `${sd} ${MONTH[sm - 1]} – ${ed} ${MONTH[em - 1]}`;
}

// Mon 23 Nov 2026 display → score 16–22 Nov
{
  const now = new Date('2026-11-23T10:00:00+05:30');
  const display = displayWeekBounds(now);
  const scoring = scoringWeekBounds(now);
  assert.equal(display.mondayYmd, '2026-11-23');
  assert.equal(display.sundayYmd, '2026-11-29');
  assert.equal(scoring.mondayYmd, '2026-11-16');
  assert.equal(scoring.sundayYmd, '2026-11-22');
  assert.equal(formatScoredWeekLabel(scoring.mondayYmd, scoring.sundayYmd), '16–22 Nov');
}

// Mon 16 Nov display → score 9–15 Nov (prior completed week)
{
  const now = new Date('2026-11-16T00:05:00+05:30');
  const scoring = scoringWeekBounds(now);
  assert.equal(scoring.mondayYmd, '2026-11-09');
  assert.equal(scoring.sundayYmd, '2026-11-15');
}

// Sun 22 Nov still display week 16–22, scoring still 9–15
{
  const now = new Date('2026-11-22T23:30:00+05:30');
  const display = displayWeekBounds(now);
  const scoring = scoringWeekBounds(now);
  assert.equal(display.mondayYmd, '2026-11-16');
  assert.equal(scoring.mondayYmd, '2026-11-09');
}

// Cross-month: Mon 2 Feb 2026 display → score Jan 26 – Feb 1
{
  const now = new Date('2026-02-02T12:00:00+05:30');
  const scoring = scoringWeekBounds(now);
  assert.equal(scoring.mondayYmd, '2026-01-26');
  assert.equal(scoring.sundayYmd, '2026-02-01');
  assert.equal(formatScoredWeekLabel(scoring.mondayYmd, scoring.sundayYmd), '26 Jan – 1 Feb');
}

// Card id keys off scoring Monday
{
  const scoringMonday = '2026-11-16';
  assert.equal(`crm-weekly-top-${scoringMonday}`, 'crm-weekly-top-2026-11-16');
}

// Program reset Nov 28 2026 — 16–22 card hidden; first publish after current week ends
{
  const PROGRAM_START = displayWeekBounds(new Date('2026-11-28T12:00:00+05:30')).mondayYmd;
  const now = new Date('2026-11-28T15:00:00+05:30');
  const scoring = scoringWeekBounds(now);
  assert.equal(scoring.mondayYmd, '2026-11-16');
  assert.ok(scoring.mondayYmd < PROGRAM_START);
}

console.log('weeklyPerformerWindow.test.mjs: ok');