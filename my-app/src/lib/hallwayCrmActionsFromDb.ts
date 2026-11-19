/**
 * My Actions for CRM portal — prefer live Hub CRM `/v1/hallway/actions`, then DB fallback.
 */
import { getPool } from './db';
import { assigneeMatchesScope } from './hallwayIdentity';
import { istTodayYmd } from './hallwayIstDates';
import type { TodayViewer } from './hallwayTodayFromCrm';
import { resolveHallwayScope } from './resolveHallwayScope';
import type { HallwayActionGroup, HallwayActionItem, HallwayActionsResponse } from '../types/hallway';
import { crmActionsStrategy } from './hallwayRoleMatrix';

type LeadRow = {
  lead_key: string;
  name: string;
  assignee: string | null;
  meeting_date: string | null;
  stage_label: string | null;
};

const LEAD_SOURCES: { table: string; type: string }[] = [
  { table: 'mlead', type: 'mlead' },
  { table: 'addlead', type: 'addlead' },
  { table: 'glead', type: 'glead' },
  { table: 'formlead', type: 'formlead' },
  { table: 'walkinlead', type: 'walkinlead' },
  { table: 'websitelead', type: 'websitelead' },
  { table: 'whatsapplead', type: 'whatsapplead' },
  { table: 'ivrlead', type: 'ivrlead' },
  { table: 'quikrlead', type: 'quikrlead' },
];

function meetingDateMatchesToday(raw: string | null | undefined, todayYmd: string): boolean {
  const s = String(raw || '').trim();
  if (!s) return false;
  if (s.startsWith(todayYmd)) return true;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    return ymd === todayYmd;
  }
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}` === todayYmd;
  return false;
}

async function loadLeadsDueTodayFromDb(crmDb: string, todayYmd: string): Promise<LeadRow[]> {
  const pool = getPool();
  const parts: string[] = [];
  for (const src of LEAD_SOURCES) {
    parts.push(`
      SELECT CONCAT('${src.type}-', id) AS lead_key,
             COALESCE(NULLIF(TRIM(name),''), CONCAT('Lead ', id)) AS name,
             NULLIF(TRIM(assignee), '') AS assignee,
             meeting_date,
             NULL AS stage_label
      FROM ${crmDb}.${src.table}
      WHERE meeting_date IS NOT NULL AND TRIM(meeting_date) <> ''
    `);
  }
  const [rows]: any = await pool.query(parts.join(' UNION ALL '));
  const out: LeadRow[] = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (meetingDateMatchesToday(r.meeting_date, todayYmd)) out.push(r);
  }
  return out;
}

function filterByScope(
  leads: LeadRow[],
  mode: 'my' | 'team' | 'all',
  assigneeLabels: Set<string>
): LeadRow[] {
  if (mode === 'all') return leads;
  if (assigneeLabels.size === 0 && mode === 'my') return [];
  if (assigneeLabels.size === 0) return leads;
  return leads.filter((l) => assigneeMatchesScope(l.assignee, assigneeLabels));
}

function toItems(leads: LeadRow[]): HallwayActionItem[] {
  return leads
    .map((l) => ({
      id: l.lead_key,
      name: l.name,
      detail: `Due today · ${l.stage_label || 'Follow-up'}`,
      done: false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function normalizeHubActions(hub: any, mode: 'my' | 'team' | 'all'): HallwayActionsResponse | null {
  if (!hub || !Array.isArray(hub.actions)) return null;
  const followTitle =
    mode === 'my' ? 'My Lead Follow-ups' : mode === 'team' ? 'Team Lead Follow-ups' : 'Lead Follow-ups';

  const actions: HallwayActionGroup[] = hub.actions
    .map((g: any) => {
      const items = Array.isArray(g.items) ? g.items : [];
      return {
        id: String(g.id || 'followups'),
        title:
          String(g.id || '') === 'followups' || /follow-?up/i.test(String(g.title || ''))
            ? followTitle
            : String(g.title || 'Actions'),
        count: items.length || Number(g.count) || 0,
        urgent: Boolean(g.urgent ?? items.length > 0),
        items,
      } satisfies HallwayActionGroup;
    })
    .filter((g: HallwayActionGroup) => g.count > 0 || g.items.length > 0);

  return {
    dayBasis: hub.dayBasis || 'CRM Hub /v1/hallway/actions',
    scoped: true,
    actions,
  };
}

/** Prefer live Hub CRM actions (JWT-scoped). Fallback: CRM DB meetingDate=today. */
export async function loadCrmActionsFromDb(
  viewer?: TodayViewer,
  hubPayload?: HallwayActionsResponse | null
): Promise<HallwayActionsResponse> {
  const todayYmd = istTodayYmd();
  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);
  if (resolved.portal === 'design') {
    return { dayBasis: 'Design portal — use design actions', scoped: true, actions: [] };
  }

  const strategy = crmActionsStrategy(viewer);
  const execFreshOnly =
    strategy === 'fresh_leads' &&
    (String(viewer?.role || '').toUpperCase().includes('EXECUTIVE') ||
      String(viewer?.role || '').toUpperCase() === 'SALES_EXECUTIVE' ||
      String(viewer?.role || '').toUpperCase() === 'PRESALES_EXECUTIVE');

  if (execFreshOnly) {
    return {
      dayBasis: 'Use fresh-leads BFF for executives',
      scoped: true,
      actions: [],
    };
  }

  // Oversight roles never use meetingDate / Hub "Lead Follow-ups".
  if (strategy === 'oversight') {
    return {
      dayBasis: 'Oversight uses Fresh Lead BFF only',
      scoped: true,
      actions: [],
    };
  }

  const fromHub = normalizeHubActions(hubPayload, resolved.mode);
  if (fromHub && fromHub.actions.length > 0 && strategy === 'meeting_followups') {
    return fromHub;
  }

  // Hub empty / 403 (e.g. PRESALES) — build from CRM DB with Insights-style assignee scope
  const crmDb = process.env.CRM_DB_NAME || 'CRM';
  try {
    const leads = await loadLeadsDueTodayFromDb(crmDb, todayYmd);
    const labels = resolved.crm?.assigneeLabels || new Set<string>();
    const scoped = filterByScope(leads, resolved.mode, labels);
    const items = toItems(scoped);
    const role = String(viewer?.role || '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    const groups: HallwayActionGroup[] = [];
    if (items.length > 0) {
      groups.push({
        id: 'followups',
        title:
          resolved.mode === 'my'
            ? 'My Lead Follow-ups'
            : resolved.mode === 'team'
              ? 'Team Lead Follow-ups'
              : 'Lead Follow-ups',
        count: items.length,
        urgent: true,
        items,
      });
    }

    if (role.includes('PRESALES') && items.length > 0) {
      groups.push({
        id: 'presales-queue',
        title: resolved.mode === 'my' ? 'My Presales Tasks' : 'Team Presales Tasks',
        count: items.length,
        urgent: false,
        items: items.slice(0, 20),
      });
    }

    return {
      dayBasis: `CRM DB fallback · meetingDate=${todayYmd} · mode=${resolved.mode}`,
      scoped: true,
      actions: groups,
    };
  } catch (err) {
    console.warn('[loadCrmActionsFromDb] DB fallback failed:', err);
    return fromHub || { dayBasis: 'CRM actions unavailable', scoped: true, actions: [] };
  }
}
