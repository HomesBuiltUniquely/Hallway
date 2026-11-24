/**
 * Today meetings for Design portal — live Design Module data with fail-safe DB query.
 * Same source of truth as Meeting Management (design.hubinterior.com/meeting-management).
 *
 * HARD RULE: Read-only to Design Module. Server-side scoped, fail-closed.
 * Zero modification to CRM or presales data.
 */
import { getPool } from './db';
import { formatPersonName } from './hallwayDisplay';
import { istTodayYmd } from './hallwayIstDates';
import type { HallwayTodayEvent, HallwayTodayEventsResponse } from '../types/hallway';
import type { TodayViewer } from './hallwayTodayFromCrm';
import { resolveHallwayScope } from './resolveHallwayScope';
import { identityTokens, matchesViewer } from './hallwayIdentity';

export function isDesignTodayWiringEnabled(): boolean {
  if (process.env.FEATURE_DESIGN_TODAY_WIRING === 'false') return false;
  if (process.env.NEXT_PUBLIC_FEATURE_DESIGN_TODAY_WIRING === 'false') return false;
  return true;
}

const DESIGN_API = (
  process.env.DESIGN_MODULE_BASE_URL || 'https://api.hubinterior.com'
).replace(/\/$/, '');

const DESIGN_FRONTEND = (
  process.env.DESIGN_MODULE_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_DESIGN_MODULE_FRONTEND_URL ||
  'https://design.hubinterior.com'
).replace(/\/$/, '');

export type DesignTodayLoadResult = HallwayTodayEventsResponse & {
  feedError?: boolean;
  message?: string;
  referenceId?: string;
};

function normRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Client Meeting Management roles in Design Module. */
export function canAccessMeetingManagementRole(role?: string | null): boolean {
  const r = normRole(role);
  return (
    r === 'admin' ||
    r === 'territorial_design_manager' ||
    r === 'design_manager' ||
    r === 'designer' ||
    r === 'deputy_general_manager' ||
    r.includes('sales')
  );
}

export function cleanPersonName(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (
    !s ||
    /^null$/i.test(s) ||
    /^undefined$/i.test(s) ||
    /^unassigned$/i.test(s) ||
    /^user$/i.test(s) ||
    s === '—' ||
    s === '-'
  ) {
    return null;
  }
  const formatted = formatPersonName(s);
  if (!formatted || /^user$/i.test(formatted) || /^null$/i.test(formatted) || /^undefined$/i.test(formatted)) {
    return null;
  }
  return formatted;
}

/** Clean customer name — never display lead placeholders like "M Lead". */
export function cleanCustomerName(raw?: string | null, leadId?: number | string | null): string {
  const text = String(raw || '').trim();
  const idStr = leadId != null && String(leadId).trim() ? String(leadId).trim() : '';
  const idMatch = text.match(/lead\s*id\s*[:#]?\s*(\d+)/i) || text.match(/\blead\s+(\d+)\b/i);
  const extractedId = idStr || idMatch?.[1] || '';

  let name = text
    .replace(/^meeting\s+with\s+/i, '')
    .replace(/\s*[-–—]?\s*lead\s*id\s*[:#]?\s*\d+\s*/gi, ' ')
    .replace(/\s*·\s*lead\s+\d+\s*/gi, ' ')
    .replace(/\b(mlead|glead|addlead|formlead|walkinlead|websitelead|whatsapplead|ivrlead|quikrlead)\b/gi, ' ')
    .replace(/\b(m|g|add|form|walkin|website|whatsapp|ivr|quikr)\s*lead\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const isPlaceholder =
    !name ||
    /^lead$/i.test(name) ||
    /^client$/i.test(name) ||
    /^customer$/i.test(name) ||
    /^lead\s+\d+$/i.test(name) ||
    /^(m|g|add|form|walkin|website|whatsapp|ivr|quikr)\s*lead$/i.test(name);

  if (isPlaceholder) {
    return extractedId ? `Lead ${extractedId}` : 'Customer';
  }
  return formatPersonName(name) || name;
}

/** Check if meeting has a valid HTTPS link */
export function sanitizeHttpsLink(rawLink?: string | null): string | null {
  if (!rawLink || typeof rawLink !== 'string') return null;
  const trimmed = rawLink.trim();
  if (/^https:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export type ParsedMeetingTime = {
  displayTime: string;
  startMinutes: number; // For sorting; Infinity if no time
  startAtIso?: string;
  endAtIso?: string;
};

/**
 * Robust meeting time parser:
 * - Empty / null -> display "Time not set", sortOrder = Infinity, never "12:00 am".
 * - Real midnight -> "12:00 am".
 * - Normal times -> e.g. "10:00 am" or "10:00 am – 11:30 am".
 */
export function parseMeetingTime(
  rawTime: string | null | undefined,
  dateYmd: string
): ParsedMeetingTime {
  const text = String(rawTime || '').trim();

  if (
    !text ||
    /^time\s*not\s*set$/i.test(text) ||
    /^null$/i.test(text) ||
    /^undefined$/i.test(text) ||
    text === '—' ||
    text === '-'
  ) {
    return {
      displayTime: 'Time not set',
      startMinutes: Infinity,
      startAtIso: `${dateYmd}T99:99:99.999Z`,
    };
  }

  const rangeParts = text.split(/\s*[-–—]\s*/);
  const startStr = rangeParts[0] || text;
  const endStr = rangeParts.length > 1 ? rangeParts[1] : null;

  function parsePart(partStr: string): { hours: number; minutes: number } | null {
    const match = partStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const mer = match[3] ? match[3].toLowerCase() : null;

    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  const startParsed = parsePart(startStr);
  if (!startParsed) {
    return {
      displayTime: text,
      startMinutes: Infinity,
      startAtIso: `${dateYmd}T99:99:99.999Z`,
    };
  }

  const startMinutes = startParsed.hours * 60 + startParsed.minutes;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startAtIso = `${dateYmd}T${pad(startParsed.hours)}:${pad(startParsed.minutes)}:00.000Z`;

  let endAtIso: string | undefined;
  let endFormatted: string | null = null;

  if (endStr) {
    const endParsed = parsePart(endStr);
    if (endParsed) {
      endAtIso = `${dateYmd}T${pad(endParsed.hours)}:${pad(endParsed.minutes)}:00.000Z`;
      const endAt = new Date(`${dateYmd}T${pad(endParsed.hours)}:${pad(endParsed.minutes)}:00+05:30`);
      if (!Number.isNaN(endAt.getTime())) {
        endFormatted = endAt.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });
      }
    }
  }

  const startAt = new Date(`${dateYmd}T${pad(startParsed.hours)}:${pad(startParsed.minutes)}:00+05:30`);
  const startFormatted = startAt.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const displayTime = endFormatted ? `${startFormatted} – ${endFormatted}` : startFormatted;

  return {
    displayTime,
    startMinutes,
    startAtIso,
    endAtIso,
  };
}

type RawDesignMeeting = {
  id: number;
  leadId: number;
  projectName?: string | null;
  customerName?: string | null;
  designerName?: string | null;
  designerId?: number | null;
  salesName?: string | null;
  branchName?: string | null;
  meetingDate?: string | null;
  meetingTime?: string | null;
  meetingMode?: string | null;
  meetingType?: string | null;
  meetingStatus?: string | null;
  progress?: string | null;
  meetingLink?: string | null;
};

function sameName(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nb = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return na === nb;
}

/**
 * Fetch scheduled meetings from Design Module backend API via session auth.
 * Calls /api/meetings/scheduled — the same endpoint Meeting Management uses.
 */
async function fetchMeetingsFromDesignApi(
  designSessionId: string,
  scopeMode: 'my' | 'team' | 'all',
  viewer: TodayViewer | undefined,
  dateYmd: string
): Promise<HallwayTodayEvent[] | null> {
  try {
    // 1. Try /api/hallway/today first (dedicated lightweight today endpoint if available)
    try {
      const qs = new URLSearchParams({ scope: scopeMode });
      const hRes = await fetch(`${DESIGN_API}/api/hallway/today?${qs}`, {
        headers: {
          Authorization: `Bearer ${designSessionId}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      if (hRes.ok) {
        const body = await hRes.json().catch(() => null);
        if (body && Array.isArray(body.events)) {
          return (body.events as any[]).map((ev) => {
            const s = cleanPersonName(ev.salesName || ev.crmPersonName);
            const d = cleanPersonName(ev.designerName);
            return {
              ...ev,
              salesName: s,
              crmPersonName: s,
              designerName: d,
            };
          }) as HallwayTodayEvent[];
        }
      }
    } catch {
      // Fall through to /api/meetings/scheduled
    }

    // 2. Call /api/meetings/scheduled — the exact authoritative endpoint that Meeting Management uses
    const res = await fetch(`${DESIGN_API}/api/meetings/scheduled`, {
      headers: {
        Authorization: `Bearer ${designSessionId}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    if (!body || !Array.isArray(body.meetings)) return null;

    const meetings: any[] = body.meetings;
    const todayMeetings = meetings.filter((m) => {
      const mDate = String(m.meetingDate || '').slice(0, 10);
      if (mDate !== dateYmd) return false;
      if (m.personal || m.source === 'personal') return false;
      if (String(m.meetingStatus || '').toLowerCase() === 'cancelled') return false;
      return true;
    });

    const sortable: Array<HallwayTodayEvent & { startMinutes: number; meetId: number }> = [];

    for (const m of todayMeetings) {
      const timeInfo = parseMeetingTime(m.meetingTime || m.meetingTimeLabel, dateYmd);
      const rawClient = m.customerName || m.projectName || '';
      const clientName = cleanCustomerName(rawClient, m.leadId);
      const leadIdNum = Number(m.leadId) || null;

      const mode = String(m.meetingMode || '').toLowerCase();
      const typeStr = String(m.meetingType || '').toLowerCase();
      const isOnline = mode === 'online' || /virtual|online|meet/i.test(typeStr);
      const meetingType = isOnline ? 'Virtual meeting' : 'Showroom visit';

      const stageTag = /pre\s*10|pre_10/i.test(typeStr) ? 'Pre 10%' : undefined;
      const progressLabel =
        m.progressLabel ||
        (m.progress === 'completed' || m.meetingStatus === 'Meeting Successful'
          ? 'Meeting Successful'
          : m.progress === 'in_progress' || m.meetingStatus === 'In progress'
          ? 'In progress'
          : m.meetingStatus || 'Scheduled');

      const rawLink = m.meetingLink || null;
      const httpsLink = isOnline ? sanitizeHttpsLink(rawLink) : null;
      const leadDetailUrl = leadIdNum ? `${DESIGN_FRONTEND}/leads/${leadIdNum}` : null;

      const salesName = cleanPersonName(m.salesName);
      const designerName = cleanPersonName(m.designerName);
      const hub = m.branchName || 'All Hubs';

      // If scope is 'my' and user is not a regular designer, show only their personal meetings
      if (scopeMode === 'my' && normRole(viewer?.role) !== 'designer') {
        const uid = Number(viewer?.userId);
        const matchesId = Number.isFinite(uid) && m.designerId === uid;
        const matchesName = viewer?.name && sameName(designerName, viewer.name);
        if (!matchesId && !matchesName) continue;
      }

      sortable.push({
        id: `d-meet-${m.id}`,
        time: timeInfo.displayTime,
        title: clientName,
        location: hub,
        isLink: Boolean(leadDetailUrl || httpsLink),
        linkUrl: httpsLink || leadDetailUrl,
        category: 'meeting',
        startAt: timeInfo.startAtIso || `${dateYmd}T12:00:00.000Z`,
        endAt: timeInfo.endAtIso,
        clientName,
        leadId: leadIdNum,
        salesName,
        crmPersonName: salesName,
        designerName,
        meetingType,
        stageTag: stageTag || 'Pre 10%',
        status: progressLabel,
        startMinutes: timeInfo.startMinutes,
        meetId: Number(m.id) || 0,
      });
    }

    sortable.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.meetId - b.meetId;
    });

    return sortable.map(({ startMinutes, meetId, ...ev }) => ev);
  } catch (err) {
    console.warn('[loadTodayMeetingsFromDesign] Design API call failed, falling back to DB:', err);
    return null;
  }
}

const scopeCache = new Map<string, { expiresAt: number; value: { all: boolean; userIds: number[] } }>();

/**
 * Mirror of meetingViewerScope from Design Module server:
 * Determines the set of allowed designer IDs for the logged-in user without ad-hoc string filtering.
 */
export async function getDesignViewerScope(
  pool: any,
  designDb: string,
  viewer?: TodayViewer,
  scopeMode: 'my' | 'team' | 'all' = 'team'
): Promise<{ all: boolean; userIds: number[] }> {
  const role = normRole(viewer?.role);
  const cacheKey = `${role}:${viewer?.userId || ''}:${viewer?.email || ''}:${viewer?.name || ''}:${scopeMode}`;
  const now = Date.now();
  const cached = scopeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let uid = viewer?.userId != null ? Number(viewer.userId) : NaN;

  // Resolve user id from DB if not provided
  if (!Number.isFinite(uid) || uid <= 0) {
    const email = String(viewer?.email || '').trim().toLowerCase();
    const name = String(viewer?.name || '').trim().toLowerCase();
    if (email || name) {
      const [uRows]: any = await pool.query(
        `SELECT id, role FROM ${designDb}.users WHERE (? <> '' AND LOWER(email) = ?) OR (? <> '' AND LOWER(name) = ?) LIMIT 1`,
        [email, email, name, name]
      );
      if (Array.isArray(uRows) && uRows[0]) {
        uid = Number(uRows[0].id);
      }
    }
  }

  let result: { all: boolean; userIds: number[] };

  if (scopeMode === 'my' || role === 'designer') {
    result = { all: false, userIds: Number.isFinite(uid) && uid > 0 ? [uid] : [] };
  } else if (scopeMode === 'all' && (role === 'admin' || role === 'deputy_general_manager')) {
    result = { all: true, userIds: [] };
  } else if (role === 'admin' || role === 'deputy_general_manager') {
    const [rows]: any = await pool.query(
      `SELECT id FROM ${designDb}.users WHERE role IN ('designer', 'design_manager')`
    );
    result = { all: false, userIds: (rows as any[]).map((r) => Number(r.id)).filter((id) => id > 0) };
  } else if (role === 'territorial_design_manager') {
    const [rows]: any = await pool.query(
      `SELECT DISTINCT u.id
       FROM ${designDb}.users u
       LEFT JOIN ${designDb}.users dm ON dm.id = u.design_manager_id
       WHERE u.role IN ('designer','design_manager')
         AND (
           u.id = ?
           OR (u.role = 'design_manager' AND u.territorial_design_manager_id = ?)
           OR (u.role = 'designer' AND dm.territorial_design_manager_id = ?)
         )`,
      [uid, uid, uid]
    );
    result = { all: false, userIds: (rows as any[]).map((r) => Number(r.id)).filter((id) => id > 0) };
  } else if (role === 'design_manager') {
    const [rows]: any = await pool.query(
      `SELECT DISTINCT u.id
       FROM ${designDb}.users u
       WHERE u.role IN ('designer','design_manager')
         AND (u.id = ? OR (u.role = 'designer' AND u.design_manager_id = ?))`,
      [uid, uid]
    );
    result = { all: false, userIds: (rows as any[]).map((r) => Number(r.id)).filter((id) => id > 0) };
  } else {
    result = { all: false, userIds: Number.isFinite(uid) && uid > 0 ? [uid] : [] };
  }

  scopeCache.set(cacheKey, { expiresAt: now + 60_000, value: result });
  return result;
}

/**
 * Resilient DB query: query DesignMod.lead_meetings directly from shared RDS instance
 * using the EXACT same scoping query as Meeting Management in Design Module.
 */
async function queryMeetingsFromDesignDb(
  dateYmd: string,
  viewer?: TodayViewer,
  scopeMode: 'my' | 'team' | 'all' = 'team'
): Promise<RawDesignMeeting[]> {
  try {
    const pool = getPool();
    const designDb = process.env.DESIGN_DB_NAME || 'DesignMod';
    const vis = await getDesignViewerScope(pool, designDb, viewer, scopeMode);

    if (!vis.all && vis.userIds.length === 0) {
      return [];
    }

    const whereParts: string[] = [
      'm.meeting_date >= ? AND m.meeting_date <= ?',
      "m.meeting_status <> 'cancelled'",
    ];
    const queryParams: unknown[] = [`${dateYmd} 00:00:00`, `${dateYmd} 23:59:59`];

    if (!vis.all) {
      whereParts.push(
        `COALESCE(NULLIF(m.designer_id, 0), NULLIF(l.assigned_designer_id, 0)) IN (${vis.userIds.map(() => '?').join(',')})`
      );
      queryParams.push(...vis.userIds);
    }

    const [rows]: any = await pool.query(
      `SELECT m.id,
              l.id AS leadId,
              l.project_name AS projectName,
              l.assigned_branch AS leadBranch,
              m.branch AS meetingBranch,
              DATE_FORMAT(m.meeting_date, '%Y-%m-%d') AS meetingDate,
              m.meeting_time AS meetingTime,
              m.meeting_type AS meetingType,
              m.meeting_mode AS meetingMode,
              m.meeting_status AS meetingStatus,
              m.progress,
              u.id AS designerId,
              COALESCE(
                NULLIF(TRIM(u.name), ''),
                NULLIF(TRIM(u2.name), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.formData.designer'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.form_data.designer'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.designerName'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.designer'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.assigned_designer'))), '')
              ) AS designerName,
              COALESCE(u.branch, u2.branch) AS designerBranch,
              COALESCE(
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.formData.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.formData.sales_executive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.formData.sales_person'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.formData.salesPerson'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.form_data.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.form_data.sales_executive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.form_data.sales_person'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.form_data.salesPerson'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.fetchedData.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.fetchedData.sales_person'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.fetched_data.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.fetched_data.sales_person'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.rawPayload.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.rawPayload.sales_executive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.sales_executive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.sales_person'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.crmSchedule.salesExecutive'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.assigned_to'))), ''),
                NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(l.payload), l.payload, '{}'), '$.assignedTo'))), '')
              ) AS salesName,
              JSON_UNQUOTE(JSON_EXTRACT(l.payload, '$.meetingLink')) AS leadMeetingLink
       FROM ${designDb}.lead_meetings m
       JOIN ${designDb}.leads l ON l.id = m.lead_id
       LEFT JOIN ${designDb}.users u ON u.id = COALESCE(NULLIF(m.designer_id, 0), NULLIF(l.assigned_designer_id, 0))
       LEFT JOIN ${designDb}.users u2 ON u2.id = NULLIF(l.assigned_designer_id, 0)
       WHERE ${whereParts.join(' AND ')}
       ORDER BY m.meeting_time ASC, m.id ASC`,
      queryParams
    );

    return (rows as any[]).map((r) => ({
      id: Number(r.id),
      leadId: Number(r.leadId),
      projectName: r.projectName,
      customerName: r.projectName,
      designerName: r.designerName,
      designerId: r.designerId ? Number(r.designerId) : null,
      salesName: r.salesName || null,
      branchName: r.meetingBranch || r.designerBranch || r.leadBranch || null,
      meetingDate: r.meetingDate,
      meetingTime: r.meetingTime,
      meetingMode: r.meetingMode,
      meetingType: r.meetingType,
      meetingStatus: r.meetingStatus,
      progress: r.progress,
      meetingLink: r.leadMeetingLink || null,
    }));
  } catch (err) {
    console.error('[loadTodayMeetingsFromDesign] DB query fallback failed:', err);
    return [];
  }
}

/**
 * Main entry point: load today's meetings for Design Module logins.
 * Same source of truth as Meeting Management (design.hubinterior.com/meeting-management).
 */
export async function loadTodayMeetingsFromDesign(
  viewer: TodayViewer | undefined,
  designSessionId?: string | null
): Promise<DesignTodayLoadResult | null> {
  const dateYmd = istTodayYmd();
  const role = normRole(viewer?.role);
  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);
  const scopeMode = resolved.mode; // 'my' | 'team' | 'all'

  // 1. Try Design Module API first if session is available
  if (designSessionId) {
    const apiEvents = await fetchMeetingsFromDesignApi(designSessionId, scopeMode, viewer, dateYmd);
    if (apiEvents != null) {
      return {
        dayBasis: `Design Module · ${scopeMode} schedule (${dateYmd} IST)`,
        date: dateYmd,
        scoped: true,
        hubTotal: apiEvents.length,
        companyTotal: apiEvents.length,
        events: apiEvents,
      };
    }
  }

  // 2. Direct database query from shared RDS DesignMod with server-side scoping matching Meeting Management
  const rawMeetings = await queryMeetingsFromDesignDb(dateYmd, viewer, scopeMode);

  const mappedAll: Array<HallwayTodayEvent & { startMinutes: number; meetId: number }> = [];

  for (const r of rawMeetings) {
    const rawClient = r.customerName || r.projectName || '';
    const clientName = cleanCustomerName(rawClient, r.leadId);
    const timeInfo = parseMeetingTime(r.meetingTime, dateYmd);

    const mode = String(r.meetingMode || '').toLowerCase();
    const typeStr = String(r.meetingType || '').toLowerCase();
    const isOnline = mode === 'online' || /virtual|online|meet/i.test(typeStr);
    const meetingType = isOnline ? 'Virtual meeting' : 'Showroom visit';

    const stageTag = /pre\s*10|pre_10/i.test(typeStr) ? 'Pre 10%' : undefined;
    const progressLabel =
      r.progress === 'completed' || r.meetingStatus === 'Meeting Successful'
        ? 'Meeting Successful'
        : r.progress === 'in_progress' || r.meetingStatus === 'In progress'
        ? 'In progress'
        : r.meetingStatus || 'Scheduled';

    const rawLink = r.meetingLink || null;
    const httpsLink = isOnline ? sanitizeHttpsLink(rawLink) : null;
    const leadDetailUrl = `${DESIGN_FRONTEND}/leads/${r.leadId}`;

    const salesName = cleanPersonName(r.salesName);
    const designerName = cleanPersonName(r.designerName);
    const hub = r.branchName || 'All Hubs';

    mappedAll.push({
      id: `d-meet-${r.id}`,
      time: timeInfo.displayTime,
      title: clientName,
      location: hub,
      isLink: true,
      linkUrl: httpsLink || leadDetailUrl,
      category: 'meeting',
      startAt: timeInfo.startAtIso || `${dateYmd}T12:00:00.000Z`,
      endAt: timeInfo.endAtIso,
      clientName,
      leadId: r.leadId,
      salesName,
      crmPersonName: salesName,
      designerName,
      meetingType,
      stageTag: stageTag || 'Pre 10%',
      status: progressLabel,
      startMinutes: timeInfo.startMinutes,
      meetId: Number(r.id) || 0,
    });
  }

  mappedAll.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.meetId - b.meetId;
  });

  const finalEvents: HallwayTodayEvent[] = mappedAll.map(({ startMinutes, meetId, ...ev }) => ev);

  return {
    dayBasis: `Design Module · ${scopeMode} schedule (${dateYmd} IST)`,
    date: dateYmd,
    scoped: true,
    hubTotal: finalEvents.length,
    companyTotal: finalEvents.length,
    events: finalEvents,
  };
}
