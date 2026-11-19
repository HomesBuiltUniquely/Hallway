/**
 * My Actions for Design portal — live Design Module APIs only (role-scoped by Design session).
 */
import { resolveHallwayScope } from './resolveHallwayScope';
import type { TodayViewer } from './hallwayTodayFromCrm';
import type { HallwayActionGroup, HallwayActionsResponse, HallwayActionItem } from '../types/hallway';
import { resolvePortalKind } from './hallwayRoleMatrix';

const DESIGN_API = (
  process.env.DESIGN_MODULE_BASE_URL || 'https://api.hubinterior.com'
).replace(/\/$/, '');

function normRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

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

/** Role → Design Module endpoints (session auth scopes each queue). */
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
        { path: '/api/leads/queue?type=d2', id: 'd2-queue', title: 'D2 Follow-ups', urgent: false },
      ];
    case 'FINANCE':
      return [
        {
          path: '/api/leads/finance-10p-queue?status=pending',
          id: 'finance-10p',
          title: '10% Payment Approvals',
          urgent: true,
        },
        {
          path: '/api/leads/finance-40p-queue?status=pending',
          id: 'finance-40p',
          title: '40% Payment Approvals',
          urgent: true,
        },
        {
          path: '/api/leads/finance-sales-closure-queue?status=pending',
          id: 'finance-closure',
          title: 'Sales Closure Approvals',
          urgent: true,
        },
      ];
    case 'ADMIN':
      return [
        ...common,
        {
          path: '/api/leads/d1-pending-requests',
          id: 'd1-requests',
          title: 'D1 Pending Requests',
          urgent: true,
        },
        {
          path: '/api/leads/finance-10p-queue?status=pending',
          id: 'finance-10p',
          title: '10% Payment Approvals',
          urgent: false,
        },
        {
          path: '/api/leads/finance-sales-closure-queue?status=pending',
          id: 'finance-closure',
          title: 'Sales Closure Approvals',
          urgent: false,
        },
      ];
    default:
      return common;
  }
}

export async function loadDesignActions(
  viewer?: TodayViewer,
  designSessionId?: string | null
): Promise<HallwayActionsResponse> {
  if (
    resolvePortalKind({
      role: viewer?.role || '',
      department: viewer?.department || 'Design',
    }) !== 'design'
  ) {
    return { scoped: true, actions: [], dayBasis: 'not design portal' };
  }

  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);
  const role = normRole(viewer?.role);

  if (!designSessionId) {
    return {
      dayBasis: 'Design session missing — open Design Studio once from Hallway to sync actions',
      scoped: true,
      actions: [],
    };
  }

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
  };
}
