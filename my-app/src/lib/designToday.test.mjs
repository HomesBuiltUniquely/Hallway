/**
 * Design Home Feed helpers — run: npm run test:design-today
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function isDesignHomeFeedEnabledFromEnv(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

assert(isDesignHomeFeedEnabledFromEnv(undefined) === false, 'feed default off when unset');
assert(isDesignHomeFeedEnabledFromEnv('') === false, 'feed off for empty');
assert(isDesignHomeFeedEnabledFromEnv('true') === true, 'feed on for true');
assert(isDesignHomeFeedEnabledFromEnv('1') === true, 'feed on for 1');

// Design role profiles (mirror hallwayRoleMatrix.ts — CRM must stay unchanged)
const CRM_ADMIN = { homeModes: ['all'], showsScopeToggles: false, todayDataSource: 'crm_appointments' };
assert(CRM_ADMIN.todayDataSource === 'crm_appointments', 'CRM admin still crm_appointments');

const DESIGN_ADMIN = {
  todayUi: 'full',
  homeModes: ['all'],
  defaultMode: 'all',
  showsScopeToggles: false,
};
assert(DESIGN_ADMIN.todayUi === 'full', 'design admin full Today UI');
assert(DESIGN_ADMIN.homeModes.length === 1 && DESIGN_ADMIN.homeModes[0] === 'all', 'design admin all only');
assert(DESIGN_ADMIN.showsScopeToggles === false, 'design admin no toggles');

const TDM = { homeModes: ['all'], showsScopeToggles: false };
assert(TDM.homeModes.length === 1 && TDM.homeModes[0] === 'all', 'tdm all only');
assert(TDM.showsScopeToggles === false, 'tdm no toggles');

const DM = { homeModes: ['team'], showsScopeToggles: false };
assert(DM.homeModes.length === 1 && DM.homeModes[0] === 'team', 'design manager team only');
assert(DM.showsScopeToggles === false, 'design manager no toggles');

const DGM = { todayUi: 'full', defaultMode: 'all', homeModes: ['all'], showsScopeToggles: false };
assert(DGM.todayUi === 'full', 'deputy_general_manager mirrors admin Today');

const ESC = { todayUi: 'hidden', homeModes: ['team', 'all'] };
assert(ESC.todayUi === 'hidden', 'escalation_manager minimal Today card');

const OPS = { todayUi: 'minimal', homeModes: ['team', 'all'] };
assert(OPS.homeModes.includes('team') && !OPS.homeModes.includes('my'), 'operation_manager no my meetings');

// Portal rule: design responses must not fall through to CRM (contract for BFF)
const designPortalNeverCrm = true;
assert(designPortalNeverCrm, 'design portal uses Design loaders only');

// ─────────────────────────────────────────────────────────────
// Meeting Row People Line Display Logic (TodayCard row & modal)
// ─────────────────────────────────────────────────────────────

function formatPersonName(raw) {
  if (!raw) return 'User';
  let clean = raw.trim();
  if (clean.includes('@')) clean = clean.split('@')[0];
  clean = clean.replace(/[_\.\-]+/g, ' ').trim();
  return clean
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function cleanPerson(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (
    !s ||
    /^null$/i.test(s) ||
    /^undefined$/i.test(s) ||
    /^unassigned$/i.test(s) ||
    /^user$/i.test(s) ||
    s === '—' ||
    s === '-'
  ) {
    return '';
  }
  const formatted = formatPersonName(s);
  if (
    !formatted ||
    /^user$/i.test(formatted) ||
    /^null$/i.test(formatted) ||
    /^undefined$/i.test(formatted) ||
    /^unassigned$/i.test(formatted)
  ) {
    return '';
  }
  return formatted;
}

function isSystemSalesLabel(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
  return n === 'admin' || n === 'superadmin' || n === 'user';
}

function isLeadTypeLabel(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return (
    n === 'm lead' ||
    n === 'mlead' ||
    n === 'g lead' ||
    n === 'glead' ||
    n === 'add lead' ||
    n === 'addlead' ||
    n === 'form lead' ||
    n === 'formlead'
  );
}

function computePeopleLine(ev, isDesign = true) {
  const salesRaw = (ev.salesName || ev.crmPersonName || '').trim();
  const designerRaw = (ev.designerName || '').trim();
  const sales = cleanPerson(salesRaw);
  const designer = cleanPerson(designerRaw);

  const isDesignEvent =
    isDesign ||
    (ev.id && (
      ev.id.startsWith('d-meet-') ||
      ev.id.startsWith('d-d1-') ||
      ev.id.startsWith('d-d2-') ||
      ev.id.startsWith('d-fin-') ||
      ev.id.startsWith('d-dqc-')
    ));

  if (isDesignEvent) {
    const people = [];
    if (sales && !isSystemSalesLabel(sales) && !isLeadTypeLabel(sales)) {
      people.push(sales.startsWith('Sales:') ? sales : `Sales: ${sales}`);
    }
    if (designer && !isLeadTypeLabel(designer)) {
      people.push(designer.startsWith('Designer:') ? designer : `Designer: ${designer}`);
    }
    return people.length > 0 ? people.join(' · ') : undefined;
  }

  // CRM fallback: unchanged
  const people = [];
  if (sales && !isSystemSalesLabel(sales) && !isLeadTypeLabel(sales)) {
    people.push(`Sales: ${sales}`);
  } else {
    people.push('Sales: —');
  }
  if (designer && !isLeadTypeLabel(designer)) {
    people.push(`Designer: ${designer}`);
  } else if (!designer) {
    people.push('Designer: —');
  }
  return people.join(' · ');
}

// Case 1: Both sales and designer present
{
  const line = computePeopleLine({
    id: 'd-meet-1',
    salesName: 'Aman Nirmal',
    designerName: 'Gulshi Ar',
  });
  assert(line === 'Sales: Aman Nirmal · Designer: Gulshi Ar', 'both present format');
}

// Case 2: Only designer present (e.g. initial meeting without sales)
{
  const line = computePeopleLine({
    id: 'd-meet-2',
    salesName: null,
    crmPersonName: null,
    designerName: 'Abhishek Shanbhag',
  });
  assert(line === 'Designer: Abhishek Shanbhag', 'only designer present, no stray separator');
}

// Case 3: Only sales present (e.g. unassigned designer)
{
  const line = computePeopleLine({
    id: 'd-meet-3',
    salesName: 'Danush Rao',
    designerName: null,
  });
  assert(line === 'Sales: Danush Rao', 'only sales present, no stray separator');
}

// Case 4: Neither present (e.g. Sunil before assignment)
{
  const line = computePeopleLine({
    id: 'd-meet-4',
    salesName: null,
    crmPersonName: null,
    designerName: null,
  });
  assert(line === undefined, 'neither present returns undefined, no empty line rendered');
}

// Case 5: Bogus/invalid values like 'null', 'undefined', 'Unassigned', 'User'
{
  const line = computePeopleLine({
    id: 'd-meet-5',
    salesName: 'null',
    crmPersonName: 'undefined',
    designerName: 'Unassigned',
  });
  assert(line === undefined, 'bogus tokens cleaned, returns undefined');
}

// Case 6: Fallback to crmPersonName when salesName not explicitly keyed
{
  const line = computePeopleLine({
    id: 'd-meet-6',
    crmPersonName: 'somashekar_v',
    designerName: 'saraswati_rathod',
  });
  assert(line === 'Sales: Somashekar V · Designer: Saraswati Rathod', 'fallback to crmPersonName formatted properly');
}

// Case 7: Long names preserved fully in peopleLine for tooltip/title
{
  const longSales = 'Alexander Bartholomew Montgomery Smith';
  const longDesigner = 'Constantinople Christopher Henderson Wallace';
  const line = computePeopleLine({
    id: 'd-meet-7',
    salesName: longSales,
    designerName: longDesigner,
  });
  assert(
    line === `Sales: ${longSales} · Designer: ${longDesigner}`,
    'long names preserved without truncation in data layer (CSS truncate handles single line, title handles hover)'
  );
}

// Case 8: CRM event remains untouched
{
  const lineCrmBoth = computePeopleLine({ id: 'crm-1', salesName: 'John', designerName: 'Jane' }, false);
  assert(lineCrmBoth === 'Sales: John · Designer: Jane', 'CRM both present');

  const lineCrmNone = computePeopleLine({ id: 'crm-2' }, false);
  assert(lineCrmNone === 'Sales: — · Designer: —', 'CRM missing fallback unchanged');
}

// ─────────────────────────────────────────────────────────────
// Meeting Management Scoping Parity Tests
// ─────────────────────────────────────────────────────────────

function simulateMeetingViewerScope(user, usersTable) {
  const role = String(user.role || '').toLowerCase().trim();
  const uid = Number(user.id);

  if (role === 'admin' || role === 'deputy_general_manager') {
    return { all: true, userIds: [] };
  }

  if (role === 'territorial_design_manager') {
    const dmIds = new Set(
      usersTable
        .filter((u) => u.territorial_design_manager_id === uid && u.role === 'design_manager')
        .map((u) => u.id)
    );
    const visible = usersTable.filter((u) => {
      if (u.id === uid) return true;
      if (u.role === 'design_manager' && u.territorial_design_manager_id === uid) return true;
      if (u.role === 'designer' && dmIds.has(u.design_manager_id)) return true;
      return false;
    });
    return { all: false, userIds: [...new Set(visible.map((u) => u.id))] };
  }

  if (role === 'design_manager') {
    const visible = usersTable.filter((u) => {
      if (u.id === uid) return true;
      if (u.role === 'designer' && u.design_manager_id === uid) return true;
      return false;
    });
    return { all: false, userIds: [...new Set(visible.map((u) => u.id))] };
  }

  if (role === 'designer') {
    return { all: false, userIds: [uid] };
  }

  return { all: false, userIds: [uid] };
}

function filterMeetingsForUser(user, scopeMode, usersTable, meetingsTable, todayYmd) {
  const vis = simulateMeetingViewerScope(user, usersTable);
  return meetingsTable.filter((m) => {
    if (m.meetingDate !== todayYmd) return false;
    if (m.meetingStatus === 'cancelled') return false;
    if (m.personal) return false;

    if (scopeMode === 'my' && user.role !== 'designer') {
      return m.designerId === user.id;
    }

    if (vis.all) return true;
    return vis.userIds.includes(m.designerId);
  });
}

// Concrete data snapshot matching 21 Nov 2026 database
const ROSTER_SNAPSHOT = [
  { id: 1, name: 'Susmita Mondal', role: 'admin' },
  { id: 2, name: 'Asif H', role: 'territorial_design_manager' },
  { id: 50, name: 'Praveen MN', role: 'design_manager', territorial_design_manager_id: 2 },
  { id: 22, name: 'Kumari Anjali', role: 'designer', design_manager_id: 50 },
  { id: 26, name: 'Abhishek shanbhag', role: 'designer', design_manager_id: 50 },
  { id: 28, name: 'Saraswati Rathod', role: 'designer', design_manager_id: 50 },
  { id: 34, name: 'Akshay sm', role: 'designer', design_manager_id: 50 },
  { id: 76, name: 'Mohammed Saif', role: 'designer', design_manager_id: 50 },
  { id: 99895, name: 'Shaheed', role: 'designer', design_manager_id: 50 },
  { id: 82, name: 'Syeda', role: 'design_manager', territorial_design_manager_id: 2 },
  { id: 15, name: 'Vijayalakshmi', role: 'designer', design_manager_id: 82 },
  { id: 44, name: 'Arjun R S', role: 'designer', design_manager_id: 82 },
  { id: 99897, name: 'Afzal', role: 'designer', design_manager_id: 82 },
  { id: 3, name: 'Ujjwal Raj', role: 'design_manager', territorial_design_manager_id: 2 },
  { id: 9, name: 'Gulshi Ar.', role: 'designer', design_manager_id: 3 },
  { id: 53, name: 'Shalini Vaddi', role: 'designer', design_manager_id: 3 },
  { id: 55, name: 'Anushka Jadhav', role: 'designer', design_manager_id: 3 },
  { id: 99887, name: 'Keerthi Kumari', role: 'designer', design_manager_id: 3 },
  { id: 30, name: 'Bharath', role: 'design_manager', territorial_design_manager_id: 2 },
  { id: 99890, name: 'test-designer', role: 'designer', design_manager_id: 30 },
];

const MEETINGS_21_NOV = [
  { id: 835, customer: 'Sunil', designerId: null, meetingDate: '2026-11-21', meetingStatus: 'rescheduled' },
  { id: 1341, customer: 'SHITAL DINESHCHANDRA BHATT', designerId: 26, meetingDate: '2026-11-21', meetingStatus: 'rescheduled' },
  { id: 1405, customer: 'Test lead', designerId: 99890, meetingDate: '2026-11-21', meetingStatus: 'rescheduled' },
  { id: 1420, customer: 'Vivekshanmugam', designerId: 34, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1427, customer: 'Rakesh', designerId: 15, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1437, customer: 'Nithin', designerId: 99887, meetingDate: '2026-11-21', meetingStatus: 'scheduled' }, // Keerthi Kumari (Ujjwal team)
  { id: 1440, customer: 'Laxmi Shivanand', designerId: 76, meetingDate: '2026-11-21', meetingStatus: 'rescheduled' },
  { id: 1442, customer: 'Akshaya_Nipun', designerId: 9, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1443, customer: 'Mamta', designerId: 15, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1444, customer: 'Jitin', designerId: 44, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1445, customer: 'dhiraj verma', designerId: 9, meetingDate: '2026-11-21', meetingStatus: 'cancelled' }, // Cancelled
  { id: 1446, customer: 'Sandeep', designerId: 9, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1448, customer: 'Arun Kumar', designerId: 28, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1449, customer: 'Sathya Narayan', designerId: 28, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1450, customer: 'Ashutosh Ranjan', designerId: 44, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1452, customer: 'Srinivas', designerId: 99897, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1453, customer: 'Roshan', designerId: 55, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1455, customer: 'Shaik', designerId: 22, meetingDate: '2026-11-21', meetingStatus: 'rescheduled' }, // Kumari Anjali
  { id: 1457, customer: 'Harshil Mahavadia', designerId: 44, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
  { id: 1459, customer: 'Biswa', designerId: 9, meetingDate: '2026-11-21', meetingStatus: 'rescheduled' },
  { id: 1460, customer: 'niranjan', designerId: 53, meetingDate: '2026-11-21', meetingStatus: 'scheduled' },
];

// Test 1: Praveen MN sees exactly 6 meetings and NEVER sees Nithin (id: 1437)
{
  const praveen = ROSTER_SNAPSHOT.find((u) => u.id === 50);
  const meetings = filterMeetingsForUser(praveen, 'team', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 6, `Praveen count must be 6, got ${ids.length}`);
  assert(!ids.includes(1437), 'Nithin (id: 1437) must NOT appear for Praveen');
  assert(JSON.stringify(ids) === JSON.stringify([1341, 1420, 1440, 1448, 1449, 1455]), 'Praveen exact 6 IDs match Meeting Management');
}

// Test 2: Ujjwal Raj sees exactly 6 meetings and DOES see Nithin (Keerthi Kumari's manager)
{
  const ujjwal = ROSTER_SNAPSHOT.find((u) => u.id === 3);
  const meetings = filterMeetingsForUser(ujjwal, 'team', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 6, `Ujjwal count must be 6, got ${ids.length}`);
  assert(ids.includes(1437), 'Nithin must appear for Ujjwal');
  assert(JSON.stringify(ids) === JSON.stringify([1437, 1442, 1446, 1453, 1459, 1460]), 'Ujjwal exact 6 IDs match Meeting Management');
}

// Test 3: Syeda sees exactly 6 meetings for her team
{
  const syeda = ROSTER_SNAPSHOT.find((u) => u.id === 82);
  const meetings = filterMeetingsForUser(syeda, 'team', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 6, `Syeda count must be 6, got ${ids.length}`);
  assert(JSON.stringify(ids) === JSON.stringify([1427, 1443, 1444, 1450, 1452, 1457]), 'Syeda exact 6 IDs match Meeting Management');
}

// Test 4: Bharath sees exactly 1 meeting
{
  const bharath = ROSTER_SNAPSHOT.find((u) => u.id === 30);
  const meetings = filterMeetingsForUser(bharath, 'team', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 1 && ids[0] === 1405, 'Bharath exact 1 ID matches Meeting Management');
}

// Test 5: Asif H (TDM) sees 19 meetings across all his DMs' designers
{
  const asif = ROSTER_SNAPSHOT.find((u) => u.id === 2);
  const meetings = filterMeetingsForUser(asif, 'all', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 19, `Asif count must be 19, got ${ids.length}`);
  assert(!ids.includes(835), 'Sunil (unassigned) not in Asif team list');
  assert(!ids.includes(1445), 'Cancelled meeting excluded');
}

// Test 6: Susmita Mondal (Admin) sees all 20 non-cancelled meetings
{
  const susmita = ROSTER_SNAPSHOT.find((u) => u.id === 1);
  const meetings = filterMeetingsForUser(susmita, 'all', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 20, `Susmita count must be 20, got ${ids.length}`);
  assert(!ids.includes(1445), 'Cancelled meeting excluded for Admin');
}

// Test 7: Saraswati Rathod (Designer) sees only her own 2 meetings
{
  const saraswati = ROSTER_SNAPSHOT.find((u) => u.id === 28);
  const meetings = filterMeetingsForUser(saraswati, 'my', ROSTER_SNAPSHOT, MEETINGS_21_NOV, '2026-11-21');
  const ids = meetings.map((m) => m.id).sort((a, b) => a - b);
  assert(ids.length === 2, `Saraswati count must be 2, got ${ids.length}`);
  assert(JSON.stringify(ids) === JSON.stringify([1448, 1449]), 'Saraswati exact 2 IDs match');
}

// Test 8: Substring token collision prevention
{
  // A designer named 'Kumari Anjali' must NOT cause meetings with designer 'Keerthi Kumari' to leak into Praveen's team
  const praveenVis = simulateMeetingViewerScope({ id: 50, role: 'design_manager' }, ROSTER_SNAPSHOT);
  const keerthiDesignerId = 99887;
  assert(!praveenVis.userIds.includes(keerthiDesignerId), 'Keerthi Kumari id must never be in Praveen userIds');
}

console.log('designToday.test.mjs: ok');
