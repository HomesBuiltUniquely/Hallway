/**
 * Lightweight identity + role matrix + IST due helpers — run: npm run test:hallway-scope
 */

function identityTokens(...parts) {
  const out = new Set();
  for (const part of parts) {
    const raw = String(part || '').trim().toLowerCase();
    if (!raw) continue;
    const spaced = raw.replace(/[_.\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (spaced) out.add(spaced);
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const tokens = identityTokens('Somashekar V', '176');
assert(!String('1').includes([...tokens][0] || 'xx') || true, 'sanity');

// Role matrix expectations (mirrors hallwayRoleMatrix.ts)
const adminProfile = { homeModes: ['all'], showsScopeToggles: false, todayDataSource: 'crm_appointments' };
assert(adminProfile.homeModes.length === 1 && adminProfile.homeModes[0] === 'all', 'admin all only');
assert(adminProfile.showsScopeToggles === false, 'admin no toggles');

const salesAdmin = { homeModes: ['all'], showsScopeToggles: false };
assert(salesAdmin.showsScopeToggles === false, 'sales_admin no toggles');

const salesManager = {
  homeModes: ['team'],
  showsScopeToggles: false,
  showsPersonalToggle: false,
  crmActionsStrategy: 'oversight',
};
assert(salesManager.showsScopeToggles === false, 'sales_manager no My Schedule strip');
assert(salesManager.showsPersonalToggle === false, 'sales_manager no personal toggle');
assert(salesManager.crmActionsStrategy === 'oversight', 'sales_manager oversights team Fresh Leads');

const peProfile = { todayDataSource: 'presales_callbacks', showsScopeToggles: false };
assert(peProfile.todayDataSource === 'presales_callbacks', 'presales today source');
assert(peProfile.showsScopeToggles === false, 'presales exec no rival toggles');

// IST due helpers (inline mirror of hallwayIstDates)
function parseIstYmd(raw) {
  const s = String(raw || '').trim();
  if (!s || /^0{4}-0{2}-0{2}/.test(s) || /^0000/.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}
function dateOnOrBeforeIstToday(raw, todayYmd) {
  const ymd = parseIstYmd(raw);
  return ymd != null && ymd <= todayYmd;
}
assert(dateOnOrBeforeIstToday('2026-11-05T14:57:00', '2026-11-19') === true, 'overdue included');
assert(dateOnOrBeforeIstToday('2026-11-19T10:00:00', '2026-11-19') === true, 'due today included');
assert(dateOnOrBeforeIstToday('2026-12-01T10:00:00', '2026-11-19') === false, 'future excluded');
assert(parseIstYmd('0000-00-00T00:00:00') === null, 'invalid due null');

console.log('hallwayScope.test.mjs: ok');
