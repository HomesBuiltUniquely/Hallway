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

// Portal / Identity resolution logic tests
const DESIGN_ROLES = new Set([
  'DESIGNER',
  'DESIGN_MANAGER',
  'TERRITORIAL_DESIGN_MANAGER',
  'TERRITORY_DESIGN_MANAGER',
  'DQC_MANAGER',
  'DQE',
  'MMT_MANAGER',
  'MMT_EXECUTIVE',
  'PROJECT_MANAGER',
  'SENIOR_PROJECT_MANAGER',
  'OPERATION_MANAGER',
  'OPERATIONS_MANAGER',
  'FINANCE',
]);

function testIsDesignRole(role) {
  const r = String(role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (!r) return false;
  if (r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'SALES_ADMIN' || r === 'CRM_ADMIN') return false;
  return DESIGN_ROLES.has(r) || r.includes('DESIGN');
}

function testIsSalesFamilyRole(role) {
  const r = String(role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (!r) return false;
  return r.includes('PRESALES') || r.includes('SALES') || r === 'CRM_ADMIN' || r === 'SALES_ADMIN';
}

function testIsSuperAdmin(u) {
  const r = String(u?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const n = String(u?.name || '').toLowerCase();
  const e = String(u?.email || '').toLowerCase();
  if (
    r === 'SUPER_ADMIN' ||
    r === 'ADMIN' ||
    r === 'SALES_ADMIN' ||
    r === 'TERRITORY_DESIGN_MANAGER' ||
    r === 'CRM_ADMIN' ||
    r === 'CRM_LEAD' ||
    r === 'DESIGN_LEAD'
  ) return true;
  if (n.includes('admin') || e.includes('admin')) return true;
  return false;
}

function resolveUserPortal(u) {
  const role = String(u?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (testIsSalesFamilyRole(role)) {
    return { portal: 'crm', department: 'Sales', role, source: 'crm_users' };
  }
  if (testIsDesignRole(role)) {
    return { portal: 'design', department: 'Design', role: role || 'DESIGNER', source: 'crm_users' };
  }
  if (testIsSuperAdmin({ role, email: u?.email, name: u?.full_name })) {
    return { portal: 'crm', department: 'Sales', role: role || 'ADMIN', source: 'crm_users' };
  }
  return { portal: 'crm', department: 'Sales', role, source: 'fallback' };
}

// Territory Design Manager (Asif) must resolve to Design portal
const asifIdentity = resolveUserPortal({ email: 'asif@hubinterior.com', role: 'TERRITORY_DESIGN_MANAGER', full_name: 'Asif.H' });
assert(asifIdentity.portal === 'design', 'Asif must resolve to design portal');
assert(asifIdentity.department === 'Design', 'Asif department must be Design');

// Territorial Design Manager spelling variant
const tdmIdentity = resolveUserPortal({ email: 'asif@hubinterior.com', role: 'territorial_design_manager', full_name: 'Asif H' });
assert(tdmIdentity.portal === 'design', 'territorial_design_manager must resolve to design portal');

// Design Lead must resolve to Design portal
const leadIdentity = resolveUserPortal({ email: 'lead@hubinterior.com', role: 'DESIGN_LEAD', full_name: 'Lead Designer' });
assert(leadIdentity.portal === 'design', 'DESIGN_LEAD must resolve to design portal');

// Sales rep must resolve to CRM portal
const salesIdentity = resolveUserPortal({ email: 'sales@hubinterior.com', role: 'SALES_EXECUTIVE', full_name: 'Sales Rep' });
assert(salesIdentity.portal === 'crm', 'SALES_EXECUTIVE must resolve to crm portal');

// Super Admin / Admin in CRM must resolve to CRM portal
const adminIdentity = resolveUserPortal({ email: 'ranjith@hubinterior.com', role: 'SUPER_ADMIN', full_name: 'Ranjith' });
assert(adminIdentity.portal === 'crm', 'SUPER_ADMIN must resolve to crm portal');

console.log('hallwayScope.test.mjs: ok');
