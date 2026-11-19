import { getPool } from './db';
import { formatPersonName } from './hallwayDisplay';
import {
  isPlaceholderClient,
  mergeTodayEventsWithAppointments,
} from './hallwayTodayMerge';
import type { HallwayTodayEvent, HallwayTodayEventsResponse } from '../types/hallway';
import { istTodayYmd } from './hallwayIstDates';
import { identityTokens, matchesViewer } from './hallwayIdentity';
import { resolveHallwayScope } from './resolveHallwayScope';
import type { HallwayHomeViewMode } from './hallwayRoleMatrix';

function istTodayBounds(): { dateYmd: string; start: Date; end: Date } {
  const dateYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const start = new Date(`${dateYmd}T00:00:00+05:30`);
  const end = new Date(`${dateYmd}T23:59:59.999+05:30`);
  return { dateYmd, start, end };
}

function formatIstTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function humanMeetingType(raw?: string | null): string {
  const key = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!key) return 'Meeting';
  if (key.includes('VIRTUAL') || key.includes('ONLINE') || key.includes('GOOGLE') || key.includes('MEET')) {
    return 'Virtual meeting';
  }
  if (key.includes('SHOWROOM') || key.includes('OFFLINE')) return 'Showroom visit';
  if (key.includes('SITE')) return 'Site visit';
  const spaced = String(raw).trim().replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** System / placeholder CRM accounts — never show these as the salesperson. */
function isSystemSalesAccount(
  username?: string | null,
  fullName?: string | null,
  role?: string | null
): boolean {
  const u = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');
  const n = String(fullName || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');
  const r = String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (u === 'admin' || u === 'superadmin' || n === 'admin' || n === 'superadmin') return true;
  if (r === 'SUPER_ADMIN' && (!fullName || !String(fullName).trim())) return true;
  return false;
}

function firstNonBlank(...vals: Array<string | null | undefined>): string {
  for (const v of vals) {
    const s = String(v || '').trim();
    if (s) return s;
  }
  return '';
}

/**
 * CRM Meeting Management sales column = lead.assignee (assignedSalesName).
 * appointment.sales_user_id is often left as admin (id=1) when the SE is only on the lead.
 */
function resolveSalesDisplayName(row: {
  lead_assignee?: string | null;
  sales_person_name?: string | null;
  sales_username?: string | null;
  sales_role?: string | null;
}): string {
  const assignee = String(row.lead_assignee || '').trim();
  if (assignee && assignee !== '—' && !/^unassigned$/i.test(assignee)) {
    return formatPersonName(assignee) || assignee;
  }
  if (isSystemSalesAccount(row.sales_username, row.sales_person_name, row.sales_role)) {
    return '';
  }
  const fromUser = firstNonBlank(row.sales_person_name, row.sales_username);
  return fromUser ? formatPersonName(fromUser) || fromUser : '';
}

export type TodayViewer = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  userId?: string | number | null;
  role?: string | null;
  department?: string | null;
  scope?: import('./hallwayRoleMatrix').HallwayHomeViewMode | null;
  branchId?: string | null;
};

/**
 * Build today's meetings from CRM appointments (IST day).
 * Sales person = lead assignee (CRM Meeting Management parity), not bare sales_user_id.
 */
export async function loadTodayMeetingsFromCrm(
  viewer?: TodayViewer
): Promise<HallwayTodayEventsResponse> {
  const { dateYmd, start, end } = istTodayBounds();
  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';

  // Lead-type-aware assignee/name — lead ids collide across tables (e.g. 1515).
  const leadTypeKey = `LOWER(REPLACE(REPLACE(TRIM(COALESCE(a.lead_type,'')), ' ', ''), '_', ''))`;

  const [rows]: any = await pool.query(
    `
    SELECT
      a.id,
      a.start_time,
      a.end_time,
      a.customer_name,
      a.designer_name,
      a.meeting_type,
      a.google_html_link,
      a.lead_id,
      a.lead_type,
      a.sales_user_id,
      u.full_name AS sales_person_name,
      u.username AS sales_username,
      u.email AS sales_email,
      u.role AS sales_role,
      u.branch AS sales_branch,
      CASE
        WHEN ${leadTypeKey} IN ('mlead','m') THEN NULLIF(TRIM(ml.assignee), '')
        WHEN ${leadTypeKey} IN ('addlead','add') THEN NULLIF(TRIM(al.assignee), '')
        WHEN ${leadTypeKey} IN ('glead','g') THEN NULLIF(TRIM(gl.assignee), '')
        WHEN ${leadTypeKey} IN ('formlead','form') THEN NULLIF(TRIM(fl.assignee), '')
        WHEN ${leadTypeKey} IN ('walkinlead','walkin') THEN NULLIF(TRIM(wl.assignee), '')
        WHEN ${leadTypeKey} IN ('websitelead','website') THEN NULLIF(TRIM(web.assignee), '')
        WHEN ${leadTypeKey} IN ('whatsapplead','whatsapp') THEN NULLIF(TRIM(wa.assignee), '')
        WHEN ${leadTypeKey} IN ('ivrlead','ivr') THEN NULLIF(TRIM(ivr.assignee), '')
        WHEN ${leadTypeKey} IN ('quikrlead','quikr') THEN NULLIF(TRIM(qk.assignee), '')
        ELSE COALESCE(
          NULLIF(TRIM(ml.assignee), ''),
          NULLIF(TRIM(al.assignee), ''),
          NULLIF(TRIM(gl.assignee), ''),
          NULLIF(TRIM(fl.assignee), ''),
          NULLIF(TRIM(wl.assignee), ''),
          NULLIF(TRIM(web.assignee), ''),
          NULLIF(TRIM(wa.assignee), ''),
          NULLIF(TRIM(ivr.assignee), ''),
          NULLIF(TRIM(qk.assignee), '')
        )
      END AS lead_assignee,
      CASE
        WHEN ${leadTypeKey} IN ('mlead','m') THEN NULLIF(TRIM(ml.name), '')
        WHEN ${leadTypeKey} IN ('addlead','add') THEN NULLIF(TRIM(al.name), '')
        WHEN ${leadTypeKey} IN ('glead','g') THEN NULLIF(TRIM(gl.name), '')
        WHEN ${leadTypeKey} IN ('formlead','form') THEN NULLIF(TRIM(fl.name), '')
        WHEN ${leadTypeKey} IN ('walkinlead','walkin') THEN NULLIF(TRIM(wl.name), '')
        WHEN ${leadTypeKey} IN ('websitelead','website') THEN NULLIF(TRIM(web.name), '')
        WHEN ${leadTypeKey} IN ('whatsapplead','whatsapp') THEN NULLIF(TRIM(wa.name), '')
        WHEN ${leadTypeKey} IN ('ivrlead','ivr') THEN NULLIF(TRIM(ivr.name), '')
        WHEN ${leadTypeKey} IN ('quikrlead','quikr') THEN NULLIF(TRIM(qk.name), '')
        ELSE COALESCE(
          NULLIF(TRIM(ml.name), ''),
          NULLIF(TRIM(al.name), ''),
          NULLIF(TRIM(gl.name), ''),
          NULLIF(TRIM(fl.name), ''),
          NULLIF(TRIM(wl.name), ''),
          NULLIF(TRIM(web.name), ''),
          NULLIF(TRIM(wa.name), ''),
          NULLIF(TRIM(ivr.name), ''),
          NULLIF(TRIM(qk.name), ''),
          NULLIF(TRIM(a.customer_name), '')
        )
      END AS resolved_customer_name
    FROM ${crmDb}.appointment a
    LEFT JOIN ${crmDb}.users u ON a.sales_user_id = u.id
    LEFT JOIN ${crmDb}.mlead ml ON a.lead_id = ml.id
    LEFT JOIN ${crmDb}.addlead al ON a.lead_id = al.id
    LEFT JOIN ${crmDb}.glead gl ON a.lead_id = gl.id
    LEFT JOIN ${crmDb}.formlead fl ON a.lead_id = fl.id
    LEFT JOIN ${crmDb}.walkinlead wl ON a.lead_id = wl.id
    LEFT JOIN ${crmDb}.websitelead web ON a.lead_id = web.id
    LEFT JOIN ${crmDb}.whatsapplead wa ON a.lead_id = wa.id
    LEFT JOIN ${crmDb}.ivrlead ivr ON a.lead_id = ivr.id
    LEFT JOIN ${crmDb}.quikrlead qk ON a.lead_id = qk.id
    WHERE a.start_time >= ? AND a.start_time <= ?
      AND (a.meeting_status IS NULL OR UPPER(TRIM(a.meeting_status)) <> 'CANCELLED')
    ORDER BY a.start_time ASC
  `,
    [start, end]
  );

  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);
  const scope = resolved.mode;
  const tokens = identityTokens(
    viewer?.name,
    viewer?.username,
    viewer?.email,
    viewer?.userId != null ? String(viewer.userId) : null
  );

  const events: HallwayTodayEvent[] = [];
  let companyTotal = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const startTime = r.start_time ? new Date(r.start_time) : null;
    if (!startTime || Number.isNaN(startTime.getTime())) continue;

    const salesName = resolveSalesDisplayName(r);
    const designerName = r.designer_name ? formatPersonName(r.designer_name) : '';
    const assigneeRaw = String(r.lead_assignee || '').trim();

    const rawClientPre = String(r.resolved_customer_name || r.customer_name || '').trim();
    const isOrphanPre = !r.lead_id && (!rawClientPre || isPlaceholderClient(rawClientPre));
    // Company-wide tally (before my/team filter) — never show this as "Team schedule (N)".
    if (!isOrphanPre) companyTotal += 1;

    if (resolved.portal === 'design') {
      if (scope === 'my') {
        const mine = matchesViewer(tokens, designerName, r.designer_name);
        if (!mine) continue;
      } else if (scope === 'team' && resolved.design) {
        const dname = String(r.designer_name || designerName || '')
          .trim()
          .toLowerCase();
        const inTeam =
          dname &&
          (resolved.design.designerNames.has(dname) ||
            [...resolved.design.designerNames].some((n) => dname.includes(n) || n.includes(dname)));
        if (!inTeam) continue;
      }
    } else if (scope === 'my' && tokens.size > 0) {
      // Sales "My Schedule" = sales owner / lead assignee only.
      // Never match designer name or client title (Meghana ≠ meeting "Megha").
      const mine = matchesViewer(
        tokens,
        salesName,
        assigneeRaw,
        r.sales_person_name,
        r.sales_username,
        r.sales_email,
        r.sales_user_id != null ? String(r.sales_user_id) : null
      );
      if (!mine) continue;
    } else if (scope === 'team' && resolved.crm) {
      const salesUid = r.sales_user_id != null ? Number(r.sales_user_id) : NaN;
      const idMatch = Number.isFinite(salesUid) && resolved.crm.salesUserIds.has(salesUid);
      const labelMatch = [...resolved.crm.assigneeLabels].some((lbl) => {
        const blob = `${assigneeRaw} ${salesName}`;
        return blob.toLowerCase().includes(lbl.toLowerCase());
      });
      if (!idMatch && !labelMatch) continue;
    }

    const rawClient = String(r.resolved_customer_name || r.customer_name || '').trim();
    if (!r.lead_id && (!rawClient || isPlaceholderClient(rawClient))) {
      continue;
    }

    let clientName = rawClient ? formatPersonName(rawClient) : '';
    if (!clientName || isPlaceholderClient(clientName)) {
      if (!r.lead_id) continue;
      clientName = `Lead ${r.lead_id}`;
    }

    const endTime = r.end_time ? new Date(r.end_time) : null;
    const typeLabel = humanMeetingType(r.meeting_type);
    const timeStr =
      endTime && !Number.isNaN(endTime.getTime())
        ? `${formatIstTime(startTime)} - ${formatIstTime(endTime)}`
        : formatIstTime(startTime);

    events.push({
      id: `apt-${r.id}`,
      time: timeStr,
      title: clientName,
      location: r.sales_branch || undefined,
      isLink: Boolean(r.google_html_link),
      linkUrl: r.google_html_link || null,
      category: 'meeting',
      startAt: startTime.toISOString(),
      endAt: endTime && !Number.isNaN(endTime.getTime()) ? endTime.toISOString() : undefined,
      clientName,
      leadId: r.lead_id ?? null,
      crmPersonName: salesName || null,
      designerName: designerName || null,
      meetingType: typeLabel,
    });
  }

  return {
    dayBasis: 'Asia/Kolkata — CRM appointment table (Hallway BFF)',
    date: dateYmd,
    scoped: true,
    // Scoped count must match the list (fixes Team schedule (6) with empty body).
    hubTotal: events.length,
    companyTotal,
    events,
  };
}

/** Prefer CRM DB today list; optionally merge Hub payload fields. */
export async function buildTodayEventsPayload(
  hubPayload: HallwayTodayEventsResponse | null,
  viewer?: TodayViewer
): Promise<HallwayTodayEventsResponse> {
  try {
    const fromCrm = await loadTodayMeetingsFromCrm(viewer);
    if (fromCrm.events.length > 0) {
      return fromCrm;
    }
    if (hubPayload && Array.isArray(hubPayload.events) && hubPayload.events.length > 0) {
      return mergeTodayEventsWithAppointments(hubPayload);
    }
    return fromCrm;
  } catch (err) {
    console.warn('[buildTodayEventsPayload] CRM load failed:', err);
    if (hubPayload) {
      try {
        return await mergeTodayEventsWithAppointments(hubPayload);
      } catch {
        return hubPayload;
      }
    }
    const dateYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    return { dayBasis: 'error', date: dateYmd, events: [] };
  }
}
