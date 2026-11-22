import assert from 'node:assert/strict';
import {
  normalizeRole,
  isRoleAllowedForQueue,
  getQueuesForRole,
  isHoldAuthorityRole,
  calculateDaysOnHold,
  isLongHoldEligible,
  LONG_HOLD_DAYS_THRESHOLD,
  ACTION_QUEUES,
} from './designActionsRegistry.ts';

console.log('Testing designActionsRegistry...');

// 1. Role Normalization
assert.equal(normalizeRole('designer'), 'DESIGNER');
assert.equal(normalizeRole('design_manager'), 'DESIGN_MANAGER');
assert.equal(normalizeRole('territorial-design-manager'), 'TERRITORIAL_DESIGN_MANAGER');
assert.equal(normalizeRole('  operation manager '), 'OPERATION_MANAGER');
assert.equal(normalizeRole('DQC_Manager'), 'DQC_MANAGER');

// 2. Queue Permissions Matrix
// Designer should only see designer-specific action queues, NEVER holds or manager queues
assert.equal(isRoleAllowedForQueue('DESIGNER', 'tracker-tasks'), true);
assert.equal(isRoleAllowedForQueue('DESIGNER', 'meeting-outcomes'), true);
assert.equal(isRoleAllowedForQueue('DESIGNER', 'extended-holds-watchlist'), false, 'Designer must NOT see holds watchlist');
assert.equal(isRoleAllowedForQueue('DESIGNER', 'team-overdue-exceptions'), false);
assert.equal(isRoleAllowedForQueue('DESIGNER', 'dqc-pending'), false);

// Design Manager should see team overdue exceptions and hold watchlist, NOT other department queues
assert.equal(isRoleAllowedForQueue('DESIGN_MANAGER', 'team-overdue-exceptions'), true);
assert.equal(isRoleAllowedForQueue('DESIGN_MANAGER', 'extended-holds-watchlist'), true);
assert.equal(isRoleAllowedForQueue('DESIGN_MANAGER', 'holds-resuming-soon'), true);
assert.equal(isRoleAllowedForQueue('DESIGN_MANAGER', 'dqc-pending'), false, 'DM must NOT see DQC queue');
assert.equal(isRoleAllowedForQueue('DESIGN_MANAGER', 'd1-requests'), false, 'DM must NOT see MMT queue');
assert.equal(isRoleAllowedForQueue('DESIGN_MANAGER', 'finance-payments'), false, 'DM must NOT see Finance queue');

// Territorial Design Manager
assert.equal(isRoleAllowedForQueue('TERRITORIAL_DESIGN_MANAGER', 'team-overdue-exceptions'), true);
assert.equal(isRoleAllowedForQueue('TERRITORIAL_DESIGN_MANAGER', 'extended-holds-watchlist'), true);
assert.equal(isRoleAllowedForQueue('TERRITORIAL_DESIGN_MANAGER', 'dqc-pending'), false, 'TDM must NOT see DQC queue');
assert.equal(isRoleAllowedForQueue('TERRITORIAL_DESIGN_MANAGER', 'd1-requests'), false, 'TDM must NOT see MMT queue');
assert.equal(isRoleAllowedForQueue('TERRITORIAL_DESIGN_MANAGER', 'finance-payments'), false, 'TDM must NOT see Finance queue');

// Admin & DGM
assert.equal(isRoleAllowedForQueue('ADMIN', 'admin-overdue-escalations'), true);
assert.equal(isRoleAllowedForQueue('ADMIN', 'extended-holds-watchlist'), true);
assert.equal(isRoleAllowedForQueue('DEPUTY_GENERAL_MANAGER', 'admin-overdue-escalations'), true);
assert.equal(isRoleAllowedForQueue('DEPUTY_GENERAL_MANAGER', 'extended-holds-watchlist'), true);

// Operations Manager has NO hold authority over design leads
assert.equal(isHoldAuthorityRole('OPERATION_MANAGER'), false, 'Operation Manager must NOT have hold authority');
assert.equal(isRoleAllowedForQueue('OPERATION_MANAGER', 'extended-holds-watchlist'), false);

// DQC Roles
assert.equal(isRoleAllowedForQueue('DQC_MANAGER', 'dqc-pending'), true);
assert.equal(isRoleAllowedForQueue('DQE', 'dqc-pending'), true);
assert.equal(isRoleAllowedForQueue('DQC_MANAGER', 'extended-holds-watchlist'), false);

// MMT Roles
assert.equal(isRoleAllowedForQueue('MMT_MANAGER', 'd1-requests'), true);
assert.equal(isRoleAllowedForQueue('MMT_EXECUTIVE', 'd1-assignments'), true);
assert.equal(isRoleAllowedForQueue('MMT_EXECUTIVE', 'd1-requests'), false);
assert.equal(isRoleAllowedForQueue('MMT_MANAGER', 'extended-holds-watchlist'), false);

// Finance
assert.equal(isRoleAllowedForQueue('FINANCE', 'finance-payments'), true);
assert.equal(isRoleAllowedForQueue('FINANCE', 'extended-holds-watchlist'), false);

// Project Managers
assert.equal(isRoleAllowedForQueue('PROJECT_MANAGER', 'pm-assigned'), true);
assert.equal(isRoleAllowedForQueue('SENIOR_PROJECT_MANAGER', 'spm-assigned'), true);

// 3. Hold Authority Function
assert.equal(isHoldAuthorityRole('DESIGN_MANAGER'), true);
assert.equal(isHoldAuthorityRole('TERRITORIAL_DESIGN_MANAGER'), true);
assert.equal(isHoldAuthorityRole('ADMIN'), true);
assert.equal(isHoldAuthorityRole('DEPUTY_GENERAL_MANAGER'), true);
assert.equal(isHoldAuthorityRole('DESIGNER'), false);
assert.equal(isHoldAuthorityRole('FINANCE'), false);
assert.equal(isHoldAuthorityRole('DQC_MANAGER'), false);

// 4. Hold Threshold Tests (Strictly > 30 days)
const anchor = new Date('2026-11-21T12:00:00.000Z');

// 30 days ago exactly
const date30DaysAgo = new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
const res30 = isLongHoldEligible(date30DaysAgo, new Date('2026-11-25T12:00:00.000Z'), anchor);
assert.equal(res30.daysOnHold, 30);
assert.equal(res30.isLong, false, 'Exactly 30 days should NOT exceed 30 days threshold');

// 31 days ago (strictly > 30 days)
const date31DaysAgo = new Date(anchor.getTime() - 31 * 24 * 60 * 60 * 1000);
const res31 = isLongHoldEligible(date31DaysAgo, new Date('2026-11-25T12:00:00.000Z'), anchor);
assert.equal(res31.daysOnHold, 31);
assert.equal(res31.isLong, true, '31 days must be flagged as long hold');

// Indefinite hold (resumeAt is null)
const resIndefinite = isLongHoldEligible(new Date(anchor.getTime() - 5 * 24 * 60 * 60 * 1000), null, anchor);
assert.equal(resIndefinite.isIndefinite, true);
assert.equal(resIndefinite.isLong, true, 'Indefinite hold must be eligible for watchlist');

// Placed on hold 5 days ago with future resume date (not yet >30 days elapsed)
const resRecent = isLongHoldEligible(
  new Date(anchor.getTime() - 5 * 24 * 60 * 60 * 1000),
  new Date(anchor.getTime() + 40 * 24 * 60 * 60 * 1000),
  anchor
);
assert.equal(resRecent.isLong, false, 'Only 5 days elapsed on hold; must NOT be flagged as >30d hold');

// 5. Counted vs Uncounted Registry Verification
assert.equal(ACTION_QUEUES['extended-holds-watchlist'].isCounted, false, 'Holds watchlist MUST be uncounted');
assert.equal(ACTION_QUEUES['holds-resuming-soon'].isCounted, false, 'Holds resuming soon MUST be uncounted');
assert.equal(ACTION_QUEUES['tracker-tasks'].isCounted, true, 'Tracker tasks MUST be counted');
assert.equal(ACTION_QUEUES['team-overdue-exceptions'].isCounted, true, 'Team overdue exceptions MUST be counted');

console.log('designActionsRegistry.test.mjs: ALL PASS');
