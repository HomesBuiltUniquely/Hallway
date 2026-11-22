/**
 * My Actions for Design portal — `GET /api/hallway/actions` when enabled; legacy queue APIs otherwise.
 */
import { resolveHallwayScope } from './resolveHallwayScope';
import { isDesignHomeFeedEnabled } from './hallwayFeatureFlags';
import type { TodayViewer } from './hallwayTodayFromCrm';
import type { HallwayActionGroup, HallwayActionsResponse, HallwayActionItem } from '../types/hallway';
import { resolvePortalKind } from './hallwayRoleMatrix';
import { getPool } from './db';
import { loadDesignerTrackerActions, loadExceptionScopes } from './designProjectTrackerActions';
import {
  buildDesignerMeetingOutcomeGroups,
  buildManagerMeetingOutcomeRollup,
  resolveTeamDesignerIds,
} from './meetingOutcomeActions';

const DESIGN_API = (
  process.env.DESIGN_MODULE_BASE_URL || 'https://api.hubinterior.com'
).replace(/\/$/, '');

const DESIGN_FRONTEND = (
  process.env.DESIGN_MODULE_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_DESIGN_MODULE_FRONTEND_URL ||
  'https://design.hubinterior.com'
).replace(/\/$/, '');

export type DesignActionsLoadResult = HallwayActionsResponse & {
  feedError?: boolean;
  message?: string;
  referenceId?: string;
};

import {
  normalizeRole,
  isRoleAllowedForQueue,
  isHoldAuthorityRole,
} from './designActionsRegistry';

async function fetchDesignJson<T>(
  path: string,
  sessionId?: string | null
): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!sessionId) return { ok: false, status: 0, data: null };
  try {
    const res = await fetch(`${DESIGN_API}${path}`, {
      headers: { Authorization: `Bearer ${sessionId}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function loadActionsFromHallwayApi(
  viewer: TodayViewer | undefined,
  designSessionId: string
): Promise<DesignActionsLoadResult> {
  const scope = viewer?.scope || 'my';
  const qs = new URLSearchParams({ scope });
  const ref = `HDA-${Date.now().toString(36)}`;

  try {
    const res = await fetch(`${DESIGN_API}/api/hallway/actions?${qs}`, {
      headers: { Authorization: `Bearer ${designSessionId}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok) {
      return {
        dayBasis: 'Design Module actions feed error',
        scoped: true,
        actions: [],
        feedError: true,
        message:
          (typeof body?.message === 'string' && body.message) ||
          'My Actions is temporarily unavailable.',
        referenceId:
          (typeof body?.referenceId === 'string' && body.referenceId) || ref,
      };
    }

    const rawGroups = Array.isArray(body?.actions) ? body!.actions : [];
    const actions: HallwayActionGroup[] = rawGroups.map((g) => {
      const row = g as Record<string, unknown>;
      const itemsRaw = Array.isArray(row.items) ? row.items : [];
      const items: HallwayActionItem[] = itemsRaw.map((it) => {
        const item = it as Record<string, unknown>;
        return {
          id: String(item.id || item.name),
          name: String(item.name || 'Item'),
          detail: item.detail ? String(item.detail) : undefined,
          done: Boolean(item.done),
        };
      });
      return {
        id: String(row.id || row.title),
        title: String(row.title || 'Queue'),
        count: typeof row.count === 'number' ? row.count : items.length,
        urgent: Boolean(row.urgent),
        items,
      };
    });

    return {
      dayBasis:
        (typeof body?.dayBasis === 'string' && body.dayBasis) ||
        `Design Module · scope=${scope}`,
      scoped: body?.scoped !== false,
      actions,
      referenceId: typeof body?.referenceId === 'string' ? body.referenceId : ref,
    };
  } catch {
    return {
      dayBasis: 'Design Module actions unreachable',
      scoped: true,
      actions: [],
      feedError: true,
      message: 'My Actions is temporarily unavailable.',
      referenceId: ref,
    };
  }
}

type QueueRow = {
  id?: number;
  leadId?: number;
  projectName?: string;
  project_name?: string;
  pid?: string;
  projectStage?: string;
  project_stage?: string;
  status?: string;
  measurementDate?: string;
  designerName?: string;
  dqc1Pending?: boolean;
  dqc2Pending?: boolean;
};

function rowName(r: QueueRow): string {
  return String(r.projectName || r.project_name || r.pid || `Lead ${r.id ?? r.leadId}`).trim();
}

function rowDetail(r: QueueRow, fallback: string): string {
  const stage = r.projectStage || r.project_stage;
  if (stage) return `Stage · ${stage}`;
  if (r.measurementDate) return `Measurement · ${r.measurementDate}`;
  if (r.designerName) return `Designer · ${r.designerName}`;
  if (r.status) return String(r.status);
  return fallback;
}

function groupFromRows(
  id: string,
  title: string,
  rows: QueueRow[],
  urgent = false,
  detailFallback = 'Pending in Design'
): HallwayActionGroup | null {
  if (!rows.length) return null;
  const items: HallwayActionItem[] = rows.slice(0, 40).map((r) => ({
    id: String(r.id ?? r.leadId ?? r.pid ?? `${id}-${rowName(r)}`),
    name: rowName(r),
    detail: rowDetail(r, detailFallback),
    done: false,
  }));
  return { id, title, count: rows.length, urgent, items };
}

function asArray(data: unknown): QueueRow[] {
  if (Array.isArray(data)) return data as QueueRow[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['leads', 'items', 'queue', 'data', 'rows']) {
      if (Array.isArray(o[key])) return o[key] as QueueRow[];
    }
  }
  return [];
}

function designEndpointsForRole(role: string): Array<{ path: string; id: string; title: string; urgent?: boolean }> {
  const common = [{ path: '/api/leads/queue', id: 'design-queue', title: 'Design Queue', urgent: true }];

  switch (role) {
    case 'DESIGNER':
      return [{ path: '/api/leads/queue', id: 'design-assigned', title: 'My Assigned Leads', urgent: true }];
    case 'DESIGN_MANAGER':
    case 'TERRITORIAL_DESIGN_MANAGER':
      return [{ path: '/api/leads/queue', id: 'dm-team', title: 'Team Design Queue', urgent: true }];
    case 'DQC_MANAGER':
    case 'DQE':
      return [
        { path: '/api/leads/dqc-queue', id: 'dqc-queue', title: 'DQC Queue', urgent: true },
        { path: '/api/leads/queue', id: 'design-queue', title: 'Design Queue', urgent: false },
      ];
    case 'MMT_MANAGER':
      return [
        { path: '/api/leads/d1-pending-requests', id: 'd1-requests', title: 'D1 Pending Requests', urgent: true },
        { path: '/api/leads/queue', id: 'd1-queue', title: 'D1 Upload Queue', urgent: true },
      ];
    case 'MMT_EXECUTIVE':
      return [{ path: '/api/leads/queue', id: 'd1-assignments', title: 'My D1 Assignments', urgent: true }];
    case 'PROJECT_MANAGER':
    case 'SENIOR_PROJECT_MANAGER':
    case 'OPERATION_MANAGER':
      return [
        { path: '/api/leads/queue', id: 'pm-queue', title: 'PM Assigned Queue', urgent: true },
        { path: '/api/leads/queue?type=d2', id: 'd2-queue', title: 'D2 Queue', urgent: true },
      ];
    case 'FINANCE':
      return [
        { path: '/api/leads/finance-10p-queue?status=pending', id: 'finance-10p', title: '10% Payment Reviews', urgent: true },
        { path: '/api/leads/finance-40p-queue?status=pending', id: 'finance-40p', title: '40% Payment Reviews', urgent: true },
        {
          path: '/api/leads/finance-sales-closure-queue?status=pending',
          id: 'finance-closure',
          title: 'Sales Closure Approvals',
          urgent: false,
        },
      ];
  }
  return common;
}

async function loadLegacyDesignActions(
  viewer: TodayViewer | undefined,
  designSessionId: string
): Promise<DesignActionsLoadResult> {
  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);
  const role = normalizeRole(viewer?.role);

  const endpoints = designEndpointsForRole(role);
  const results = await Promise.all(
    endpoints.map(async (ep) => {
      const res = await fetchDesignJson<unknown>(ep.path, designSessionId);
      return { ep, res };
    })
  );

  const groups: HallwayActionGroup[] = [];
  let anyOk = false;

  for (const { ep, res } of results) {
    if (!res.ok) continue;
    anyOk = true;
    let rows = asArray(res.data);

    if (ep.id === 'dqc-queue') {
      const d1 = rows.filter((r) => r.dqc1Pending);
      const d2 = rows.filter((r) => r.dqc2Pending);
      const g1 = groupFromRows('dqc1', 'DQC 1 Pending', d1, true, 'Needs DQC 1 approval');
      const g2 = groupFromRows('dqc2', 'DQC 2 Pending', d2, true, 'Needs DQC 2 approval');
      if (g1) groups.push(g1);
      if (g2) groups.push(g2);
      continue;
    }

    const g = groupFromRows(ep.id, ep.title, rows, ep.urgent !== false);
    if (g) {
      if (role === 'DESIGNER' && ep.id === 'design-assigned') g.designerXpTier = 'Active';
      groups.push(g);
    }
  }

  return {
    dayBasis: anyOk
      ? `Design Module API · ${DESIGN_API} · mode=${resolved.mode}`
      : `Design Module unreachable or empty · ${DESIGN_API}`,
    scoped: true,
    actions: groups,
    feedError: !anyOk && endpoints.length > 0,
  };
}

async function queryDesignActionsFromDb(
  viewer?: TodayViewer
): Promise<DesignActionsLoadResult> {
  const pool = getPool();
  const designDb = process.env.DESIGN_DB_NAME || 'DesignMod';
  const role = normalizeRole(viewer?.role);
  const scope = viewer?.scope || 'my';

  let userId: number | null = viewer?.userId != null ? Number(viewer.userId) : null;
  if (!Number.isFinite(userId) || (userId ?? 0) <= 0) {
    userId = null;
  }

  if (!userId && (viewer?.email || viewer?.name)) {
    try {
      const email = String(viewer.email || '').trim().toLowerCase();
      const name = String(viewer.name || '').trim().toLowerCase();
      const [uRows]: any = await pool.query(
        `SELECT id, role FROM ${designDb}.users
         WHERE (? <> '' AND LOWER(email) = ?)
            OR (? <> '' AND LOWER(name) = ?)
         LIMIT 1`,
        [email, email, name, name]
      );
      if (Array.isArray(uRows) && uRows.length > 0 && uRows[0].id) {
        userId = Number(uRows[0].id);
      }
    } catch (err) {
      console.warn('[queryDesignActionsFromDb] user lookup failed:', err);
    }
  }

  const groups: HallwayActionGroup[] = [];
  const pushGroup = (
    id: string,
    title: string,
    rows: Array<{ id?: number | string; leadId?: number | string; projectName?: string; detail?: string }>,
    urgent = false
  ) => {
    if (!rows.length) return;
    groups.push({
      id,
      title,
      count: rows.length,
      urgent,
      items: rows.slice(0, 40).map((r) => {
        const leadIdNum = Number(r.leadId ?? r.id) || null;
        return {
          id: String(r.id ?? r.leadId),
          name: String(r.projectName || (leadIdNum ? `Lead ${leadIdNum}` : 'Item')),
          detail: r.detail,
          done: false,
          linkUrl: leadIdNum ? `${DESIGN_FRONTEND}/leads/${leadIdNum}` : undefined,
        };
      }),
    });
  };

  try {
    const now = new Date();

    // 1. Designer Actions: Live Project Tracker Milestone Tasks & Meeting Outcomes
    if (isRoleAllowedForQueue(role, 'tracker-tasks') && userId) {
      const trackerItems = await loadDesignerTrackerActions(pool, designDb, userId, now);
      if (trackerItems.length > 0) {
        groups.push({
          id: 'tracker-tasks',
          title: 'Milestone Tasks',
          count: trackerItems.length,
          urgent: trackerItems.some((it) => it.isOverdue),
          items: trackerItems,
        });
      }
    }

    if (isRoleAllowedForQueue(role, 'meeting-outcomes') && userId) {
      const outcomeGroups = await buildDesignerMeetingOutcomeGroups(
        pool,
        designDb,
        userId,
        now
      );
      for (const og of outcomeGroups) {
        groups.push(og);
      }
    }

    // 2. Manager (TDM / DM) and Admin Scopes: Exception-only & Holds Watchlist
    if (
      role === 'TERRITORIAL_DESIGN_MANAGER' ||
      role === 'DESIGN_MANAGER' ||
      role === 'ADMIN' ||
      role === 'DEPUTY_GENERAL_MANAGER'
    ) {
      if (userId) {
        const teamIds = await resolveTeamDesignerIds(
          pool,
          designDb,
          normalizeRole(role).toLowerCase(),
          userId
        );
        const rollup =
          role === 'ADMIN' || role === 'DEPUTY_GENERAL_MANAGER'
            ? await buildManagerMeetingOutcomeRollup(pool, designDb, teamIds, {
                groupId: 'meeting-outcomes-hub-watchlist',
                titlePrefix: 'Hub meetings missing outcome',
              }, now)
            : await buildManagerMeetingOutcomeRollup(pool, designDb, teamIds, {
                groupId: 'meeting-outcomes-team-watchlist',
                titlePrefix: 'Team meetings missing outcome',
              }, now);
        if (rollup) groups.push(rollup);
      }
      const exceptionGroups = await loadExceptionScopes(
        pool,
        designDb,
        { id: userId || 0, role },
        now
      );
      for (const eg of exceptionGroups) {
        groups.push(eg);
      }
    }

    // 3. DQC Queue (Reviews awaiting verdict) — strictly DQC roles only
    if (isRoleAllowedForQueue(role, 'dqc-pending')) {
      const [dqcRows]: any = await pool.query(
        `SELECT r.id, r.lead_id AS leadId, l.project_name AS projectName,
                'Needs DQC Review' AS detail
         FROM ${designDb}.lead_dqc_reviews r
         JOIN ${designDb}.leads l ON l.id = r.lead_id
         WHERE r.verdict IS NULL OR r.verdict = 'pending'
         ORDER BY r.created_at ASC
         LIMIT 30`
      ).catch(() => [[]]);
      pushGroup('dqc-pending', 'DQC Reviews Awaiting Verdict', dqcRows || [], true);
    }

    // 4. MMT Manager Queue (D1 pending requests) — strictly MMT Manager only
    if (isRoleAllowedForQueue(role, 'd1-requests')) {
      let sql = `
        SELECT a.id, a.lead_id AS leadId, l.project_name AS projectName,
               'Awaiting executive assignment' AS detail
        FROM ${designDb}.lead_d1_assignments a
        INNER JOIN ${designDb}.leads l ON l.id = a.lead_id
        WHERE a.status = 'awaiting_manager' AND a.assigned_to_user_id IS NULL`;
      const params: number[] = [];
      if (userId) {
        sql += ' AND a.requested_mmt_manager_id = ?';
        params.push(userId);
      }
      sql += ' ORDER BY a.created_at ASC LIMIT 30';
      const [pendingD1]: any = await pool.query(sql, params).catch(() => [[]]);
      pushGroup('d1-requests', 'D1 Pending Requests', pendingD1 || [], true);
    }

    // 5. MMT Executive Queue (D1 assigned visits) — strictly MMT Executive only
    if (isRoleAllowedForQueue(role, 'd1-assignments') && userId) {
      const [myD1]: any = await pool.query(
        `SELECT a.id, a.lead_id AS leadId, l.project_name AS projectName,
                'Site measurement assigned' AS detail
         FROM ${designDb}.lead_d1_assignments a
         INNER JOIN ${designDb}.leads l ON l.id = a.lead_id
         WHERE a.assigned_to_user_id = ? AND a.status NOT IN ('completed', 'cancelled')
         ORDER BY a.id DESC LIMIT 30`,
        [userId]
      ).catch(() => [[]]);
      pushGroup('d1-assignments', 'My D1 Assignments', myD1 || [], true);
    }

    // 6. Finance Queue (Payment approvals 10% & 40%) — strictly Finance only
    if (isRoleAllowedForQueue(role, 'finance-payments')) {
      const [uploads]: any = await pool.query(
        `SELECT u.id, u.lead_id AS leadId, l.project_name AS projectName,
                CONCAT('Payment · ', u.upload_type) AS detail
         FROM ${designDb}.lead_uploads u
         INNER JOIN ${designDb}.leads l ON l.id = u.lead_id
         WHERE u.status = 'pending' AND u.upload_type IN ('payment_10p', 'payment_40p')
         LIMIT 30`
      ).catch(() => [[]]);
      pushGroup('finance-payments', 'Payment Approvals', uploads || [], true);
    }

    // 7. Senior Project Manager Queue (D2 Masking requests awaiting PM assignment)
    if (isRoleAllowedForQueue(role, 'spm-assigned')) {
      const [spmRows]: any = await pool.query(
        `SELECT a.id, a.lead_id AS leadId, l.project_name AS projectName,
                'Awaiting PM assignment for D2 Masking' AS detail
         FROM ${designDb}.lead_d2_assignments a
         INNER JOIN ${designDb}.leads l ON l.id = a.lead_id
         WHERE a.status IN ('pending', 'awaiting_spm') AND a.assigned_to_user_id IS NULL
         ORDER BY a.created_at ASC LIMIT 30`
      ).catch(() => [[]]);
      pushGroup('spm-assigned', 'D2 Requests Awaiting PM Assignment', spmRows || [], true);
    }

    // 8. Project Manager Queue (Assigned D2 site masking visits)
    if (isRoleAllowedForQueue(role, 'pm-assigned') && userId) {
      const [pmRows]: any = await pool.query(
        `SELECT a.id, a.lead_id AS leadId, l.project_name AS projectName,
                'Site masking visit assigned' AS detail
         FROM ${designDb}.lead_d2_assignments a
         INNER JOIN ${designDb}.leads l ON l.id = a.lead_id
         WHERE a.assigned_to_user_id = ? AND a.status NOT IN ('completed', 'cancelled')
         ORDER BY a.id DESC LIMIT 30`,
        [userId]
      ).catch(() => [[]]);
      pushGroup('pm-assigned', 'D2 Masking & PM Approvals', pmRows || [], true);
    }

    const countedGroups = groups.filter((g) => !g.uncounted && !g.isWatchlist);

    return {
      dayBasis: countedGroups.length
        ? `Live from Design Module · ${role} scope (${scope})`
        : 'All caught up! No pending actions.',
      scoped: true,
      actions: groups,
    };
  } catch (err) {
    console.error('[queryDesignActionsFromDb] failed:', err);
    return {
      dayBasis: 'Design Module actions DB query error',
      scoped: true,
      actions: [],
      feedError: true,
      message: 'My Actions is temporarily unavailable.',
    };
  }
}

export async function loadDesignActions(
  viewer?: TodayViewer,
  designSessionId?: string | null
): Promise<DesignActionsLoadResult> {
  if (
    resolvePortalKind({
      role: viewer?.role || '',
      department: viewer?.department || 'Design',
    }) !== 'design'
  ) {
    return { scoped: true, actions: [], dayBasis: 'not design portal' };
  }

  // 1. Try Design Module live HTTP API if session available
  if (designSessionId) {
    try {
      const apiResult = await loadActionsFromHallwayApi(viewer, designSessionId);
      if (!apiResult.feedError) {
        return apiResult;
      }
    } catch {
      // Fall through to DB fallback
    }
  }

  // 2. Direct resilient MySQL DB query fallback from shared RDS DesignMod
  return queryDesignActionsFromDb(viewer);
}