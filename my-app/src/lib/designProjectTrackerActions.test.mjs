/**
 * Designer Project Tracker SLA, Hold & Exception Scopes — run: npm run test:design-actions
 */
import assert from 'node:assert/strict';

const EXTERNAL_TASKS = new Set([
  '0::D1 files upload',
  '1::DQC 1 approval',
  '2::10% payment approval',
  '3::D2 files upload',
  '4::DQC 2 approval',
  '4::Project manager approval',
  '5::40% payment approval',
]);

const MILESTONE_TASKS = [
  ['Mail loop chain 2 initiate', 'D1 for MMT request', 'D1 files upload'],
  [
    'First cut design + quotation discussion meeting request',
    'meeting completed',
    'DQC 1 submission - dwg + quotation',
    'DQC 1 approval',
  ],
  ['10% payment request', '10% payment approval'],
  ['D2 for MMT request', 'D2 files upload'],
  [
    'DQC 2 submission - 2D, 3D and quotation',
    'DQC 2 approval',
    'Project manager approval',
  ],
  ['40% payment request', '40% payment approval'],
  ['Push to production request'],
  ['KT transfer request'],
];

function holdOverlapMs(holdPeriods, fromMs, toMs) {
  if (toMs <= fromMs) return 0;
  let overlap = 0;
  for (const hp of holdPeriods) {
    const s = new Date(hp.startedAt).getTime();
    if (isNaN(s)) continue;
    const e = hp.endedAt ? new Date(hp.endedAt).getTime() : toMs;
    const effEnd = isNaN(e) ? toMs : e;
    const oStart = Math.max(fromMs, s);
    const oEnd = Math.min(toMs, effEnd);
    if (oEnd > oStart) {
      overlap += (oEnd - oStart);
    }
  }
  return overlap;
}

function activeElapsedMs(holdPeriods, fromMs, toMs) {
  if (toMs <= fromMs) return 0;
  const raw = toMs - fromMs;
  const hold = holdOverlapMs(holdPeriods, fromMs, toMs);
  return Math.max(0, raw - hold);
}

function projectDueMs(anchorMs, slaMs, holdPeriods, holdResumeAt, now) {
  const nowMs = now.getTime();
  const pastHoldOverlap = holdOverlapMs(holdPeriods, anchorMs, nowMs);
  const activeElapsed = Math.max(0, nowMs - anchorMs - pastHoldOverlap);
  const remainingSla = Math.max(0, slaMs - activeElapsed);

  let effectiveAnchor = anchorMs;
  if (holdResumeAt) {
    const resumeMs = new Date(holdResumeAt).getTime();
    if (!isNaN(resumeMs) && resumeMs > nowMs) {
      effectiveAnchor = resumeMs;
      return effectiveAnchor + remainingSla;
    }
  }
  return anchorMs + slaMs + pastHoldOverlap;
}

function getCurrentMilestoneIndex(completions) {
  const completedSet = new Set(
    completions.map(c => `${c.milestoneIndex}::${c.taskName}`)
  );
  for (let m = 0; m <= 6; m++) {
    const tasks = MILESTONE_TASKS[m] || [];
    const isCompleted = tasks.every(t => completedSet.has(`${m}::${t}`));
    if (!isCompleted) return m;
  }
  return 6;
}

function isProjectFullyCompleted(completions) {
  const completedSet = new Set(
    completions.map(c => `${c.milestoneIndex}::${c.taskName}`)
  );
  for (let m = 0; m <= 6; m++) {
    const tasks = MILESTONE_TASKS[m] || [];
    if (!tasks.every(t => completedSet.has(`${m}::${t}`))) return false;
  }
  return true;
}

function getIstDateParts(d) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    date: istDate.getUTCDate(),
    ymd: `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, '0')}-${String(istDate.getUTCDate()).padStart(2, '0')}`,
  };
}

function formatTaskDue(dueAt, now = new Date()) {
  const nowMs = now.getTime();
  const dueMs = dueAt.getTime();
  const isOverdue = nowMs > dueMs;

  const nowIst = getIstDateParts(now);
  const dueIst = getIstDateParts(dueAt);

  if (isOverdue) {
    const startOfTodayIstMs = Date.UTC(nowIst.year, nowIst.month, nowIst.date) - 5.5 * 3600 * 1000;
    const startOfDueDayIstMs = Date.UTC(dueIst.year, dueIst.month, dueIst.date) - 5.5 * 3600 * 1000;
    const diffDays = Math.max(1, Math.round((startOfTodayIstMs - startOfDueDayIstMs) / (24 * 3600 * 1000)));

    return {
      dueText: `Overdue · ${diffDays}d`,
      isOverdue: true,
      overdueByDays: diffDays,
      statusLabel: 'Overdue',
    };
  }

  if (nowIst.ymd === dueIst.ymd) {
    return {
      dueText: 'Due today',
      isOverdue: false,
      overdueByDays: 0,
      statusLabel: 'Due today',
    };
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dueText = `Due ${dueIst.date} ${months[dueIst.month]}`;
  return {
    dueText,
    isOverdue: false,
    overdueByDays: 0,
    statusLabel: undefined,
  };
}

console.log('Running designProjectTrackerActions.test.mjs...');

// 1. Milestone progress & completion
{
  const emptyComps = [];
  assert.equal(getCurrentMilestoneIndex(emptyComps), 0, 'Empty completions should be on milestone 0 (D1)');

  const d1Comps = [
    { milestoneIndex: 0, taskName: 'Mail loop chain 2 initiate' },
    { milestoneIndex: 0, taskName: 'D1 for MMT request' },
    { milestoneIndex: 0, taskName: 'D1 files upload' },
  ];
  assert.equal(getCurrentMilestoneIndex(d1Comps), 1, 'Completed D1 should move to milestone 1 (DQC1)');

  const allComps = [];
  for (let m = 0; m <= 6; m++) {
    for (const t of MILESTONE_TASKS[m]) {
      allComps.push({ milestoneIndex: m, taskName: t });
    }
  }
  assert.equal(isProjectFullyCompleted(allComps), true, 'All tasks completed should be fully complete');
  assert.equal(isProjectFullyCompleted(d1Comps), false, 'Partial tasks should not be fully complete');
}

// 2. External role tasks exclusion
{
  assert.equal(EXTERNAL_TASKS.has('0::D1 files upload'), true, 'MMT file upload is external');
  assert.equal(EXTERNAL_TASKS.has('1::DQC 1 approval'), true, 'DQC 1 approval is external');
  assert.equal(EXTERNAL_TASKS.has('2::10% payment approval'), true, 'Finance 10% approval is external');
  assert.equal(EXTERNAL_TASKS.has('4::Project manager approval'), true, 'PM approval is external');
  assert.equal(EXTERNAL_TASKS.has('1::First cut design + quotation discussion meeting request'), false, 'Designer task is not external');
  assert.equal(EXTERNAL_TASKS.has('1::DQC 1 submission - dwg + quotation'), false, 'Designer submission is not external');
}

// 3. Hold window overlap and timeline pause
{
  const holdPeriods = [
    {
      startedAt: '2026-11-01T00:00:00.000Z',
      endedAt: '2026-11-10T00:00:00.000Z', // 9 days hold
    },
  ];

  const fromMs = new Date('2026-10-25T00:00:00.000Z').getTime();
  const toMs = new Date('2026-11-15T00:00:00.000Z').getTime();

  const overlap = holdOverlapMs(holdPeriods, fromMs, toMs);
  assert.equal(overlap, 9 * 24 * 3600 * 1000, 'Overlap should match the 9 days on hold');

  const elapsed = activeElapsedMs(holdPeriods, fromMs, toMs);
  assert.equal(elapsed, (21 - 9) * 24 * 3600 * 1000, 'Elapsed active time should exclude the hold duration');
}

// 4. Due date calculation and hold extension
{
  const anchorMs = new Date('2026-11-01T00:00:00.000Z').getTime();
  const slaMs = 48 * 3600 * 1000; // 48 hours
  const now = new Date('2026-11-02T00:00:00.000Z');

  // Without hold
  const dueWithoutHold = projectDueMs(anchorMs, slaMs, [], null, now);
  assert.equal(dueWithoutHold, anchorMs + slaMs, 'Without hold, due date = anchor + SLA');

  // With open hold ending Nov 15
  const openHold = [{ startedAt: '2026-11-01T12:00:00.000Z', endedAt: null }];
  const holdResumeAt = '2026-11-15T00:00:00.000Z';
  const dueWithHold = projectDueMs(anchorMs, slaMs, openHold, holdResumeAt, now);
  assert.ok(dueWithHold > new Date('2026-11-15T00:00:00.000Z').getTime(), 'Due date shifts beyond the resume date by remaining SLA');
}

// 5. IST Day boundary formatting (Overdue vs Due Today vs Future)
{
  // Simulated "now" in IST: 2026-11-21 15:00:00 IST (09:30 UTC)
  const now = new Date('2026-11-21T09:30:00.000Z');

  // Case A: Due 2 days ago -> Overdue · 2d
  const pastDue = new Date('2026-11-19T09:30:00.000Z');
  const pastRes = formatTaskDue(pastDue, now);
  assert.equal(pastRes.isOverdue, true);
  assert.equal(pastRes.statusLabel, 'Overdue');
  assert.equal(pastRes.overdueByDays, 2);
  assert.equal(pastRes.dueText, 'Overdue · 2d');

  // Case B: Due today in IST at 23:00 IST (17:30 UTC)
  const dueTodayLater = new Date('2026-11-21T17:30:00.000Z');
  const todayRes = formatTaskDue(dueTodayLater, now);
  assert.equal(todayRes.isOverdue, false);
  assert.equal(todayRes.statusLabel, 'Due today');
  assert.equal(todayRes.dueText, 'Due today');

  // Case C: Due tomorrow in IST (2026-11-22 10:00 IST)
  const dueFuture = new Date('2026-11-22T04:30:00.000Z');
  const futureRes = formatTaskDue(dueFuture, now);
  assert.equal(futureRes.isOverdue, false);
  assert.equal(futureRes.statusLabel, undefined);
  assert.equal(futureRes.dueText, 'Due 22 Nov');
}

console.log('designProjectTrackerActions.test.mjs: All unit tests passed!');
