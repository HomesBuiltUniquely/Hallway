/**
 * Mirrors meetingOutcomePolicy.ts — run: npm run test:meeting-outcomes
 */
import assert from 'node:assert/strict';

const MEETING_ABANDON_BUFFER_MIN = 4 * 60;
const HUB_MEETING_DURATION_MIN = 90;

function clockLabelToMinutes(label) {
  const raw = String(label || '').trim();
  if (!raw || /^time\s*not\s*set$/i.test(raw)) return null;
  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    const ap = m12[3].toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}

function kolkataParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function meetingEndedForOutcome(row, now) {
  const status = String(row.meetingStatus || '').toLowerCase();
  if (status === 'cancelled') return false;
  const progress = String(row.progress || 'scheduled').toLowerCase();
  if (progress === 'completed' || progress === 'meeting_never_happened') return false;
  const dateIso = String(row.meetingDate || '').slice(0, 10);
  const today = kolkataParts(now);
  if (dateIso > today.date) return false;
  const startMin = clockLabelToMinutes(row.meetingTime);
  const endMin = (startMin == null ? 20 * 60 : startMin) + HUB_MEETING_DURATION_MIN + MEETING_ABANDON_BUFFER_MIN;
  return today.date > dateIso || today.minutes >= endMin;
}

const now = new Date('2026-11-22T15:00:00+05:30');

assert.equal(meetingEndedForOutcome({ meetingDate: '2026-11-25', meetingTime: '3:00 PM', progress: 'scheduled' }, now), false);
assert.equal(meetingEndedForOutcome({ meetingDate: '2026-05-08', meetingTime: '3:00 PM', progress: 'scheduled' }, now), true);
assert.equal(meetingEndedForOutcome({ meetingDate: '2026-05-08', progress: 'completed' }, now), false);

console.log('meetingOutcomePolicy.test.mjs: ok');