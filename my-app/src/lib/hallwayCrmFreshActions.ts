import type { TodayViewer } from './hallwayTodayFromCrm';
import { resolveHallwayScope } from './resolveHallwayScope';
import { filterLeadsForViewer, type CrmLeadRow } from './hallwayCrmLeadRows';
import { dueToneLabel, formatIstDueDateLabel, istTodayYmd } from './hallwayIstDates';
import type { HallwayActionGroup, HallwayActionItem, HallwayActionsResponse } from '../types/hallway';
import { crmActionsStrategy } from './hallwayRoleMatrix';
import { formatPersonName } from './hallwayDisplay';

function normRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Sales pipeline stage for Hallway copy.
 * Never prefer leftover `presales_milestone_stage` ("Fresh Data") on sales views —
 * CRM often leaves that column set after handoff.
 */
function salesStageLabel(row: CrmLeadRow): string {
  const ms = String(row.milestone_stage || '').trim();
  if (ms) return ms;
  return 'Fresh Lead';
}

/** Presales pipeline: Fresh Data → Data Discovery → Data Conversion. */
function presalesStageLabel(row: CrmLeadRow): string {
  const ps = String(row.presales_milestone_stage || '').trim();
  if (ps) return ps;
  const ms = String(row.milestone_stage || '').trim();
  if (ms) return ms;
  return 'Fresh Data';
}

function ownerLabel(assignee: string | null | undefined): string {
  const raw = String(assignee || '').trim();
  if (!raw || /^unassigned$/i.test(raw) || raw === '—' || raw === '-') return 'Unassigned';
  return formatPersonName(raw) || raw;
}

type ItemOpts = {
  todayYmd: string;
  workspace: 'sales' | 'presales';
  /** Managers/admins: show owner. Executives: omit (it's their own queue). */
  showOwner: boolean;
};

function toActionItems(rows: CrmLeadRow[], opts: ItemOpts): HallwayActionItem[] {
  return rows.map((r) => {
    const tone = dueToneLabel(r.follow_up_date, opts.todayYmd);
    const stage = opts.workspace === 'presales' ? presalesStageLabel(r) : salesStageLabel(r);
    return {
      id: r.lead_key,
      name: r.name,
      detail: stage,
      done: false,
      assignee: opts.showOwner ? ownerLabel(r.assignee) : undefined,
      dueDateLabel: formatIstDueDateLabel(r.follow_up_date, opts.todayYmd),
      statusLabel: tone,
    };
  });
}

function group(id: string, title: string, items: HallwayActionItem[], urgent = true): HallwayActionGroup | null {
  if (!items.length) return null;
  return { id, title, count: items.length, urgent, items };
}

export async function loadCrmFreshActions(viewer?: TodayViewer): Promise<HallwayActionsResponse> {
  const todayYmd = istTodayYmd();
  const role = normRole(viewer?.role);
  const strategy = crmActionsStrategy(viewer);
  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);
  const mode = resolved.mode;

  // ——— Presales Executive: personal Fresh Data verification queue ———
  if (role === 'PRESALES_EXECUTIVE') {
    const rows = await filterLeadsForViewer(viewer, {
      actionQueue: true,
      presalesFresh: true,
      scopeMode: 'my',
      limit: 40,
    });
    const g = group(
      'presales-my-fresh-data',
      'My Fresh Data',
      toActionItems(rows, { todayYmd, workspace: 'presales', showOwner: false })
    );
    return {
      dayBasis: `Presales Fresh Data · due≤${todayYmd} IST`,
      scoped: true,
      actions: g ? [g] : [],
    };
  }

  // ——— Presales Manager: team Fresh Data oversight (PE names, not Sales) ———
  if (role === 'PRESALES_MANAGER') {
    const rows = await filterLeadsForViewer(viewer, {
      dueTodayOnly: true,
      presalesFresh: true,
      scopeMode: 'team',
      limit: 40,
    });
    const g = group(
      'presales-team-fresh-data',
      'Team Fresh Data due today',
      toActionItems(rows, { todayYmd, workspace: 'presales', showOwner: true })
    );
    return {
      dayBasis: `Presales team Fresh Data · due=${todayYmd} IST`,
      scoped: true,
      actions: g ? [g] : [],
    };
  }

  // ——— Sales Executive ———
  if (role === 'SALES_EXECUTIVE') {
    const rows = await filterLeadsForViewer(viewer, {
      actionQueue: true,
      salesFresh: true,
      scopeMode: 'my',
      limit: 40,
    });
    const g = group(
      'sales-my-fresh-leads',
      'My Fresh Leads',
      toActionItems(rows, { todayYmd, workspace: 'sales', showOwner: false })
    );
    return {
      dayBasis: `My Fresh Leads · due≤${todayYmd} IST`,
      scoped: true,
      actions: g ? [g] : [],
    };
  }

  // ——— Admin / Sales Admin / Sales Manager: sales Fresh Lead oversight ———
  const isOversightAdmin =
    strategy === 'oversight' &&
    (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SALES_ADMIN');
  const isSalesManager = role === 'SALES_MANAGER';

  if (isOversightAdmin || isSalesManager || strategy === 'oversight') {
    const groups: HallwayActionGroup[] = [];
    const scopeMode = isSalesManager ? 'team' : 'all';

    if (isOversightAdmin) {
      const unassignedSales = await filterLeadsForViewer(viewer, {
        actionQueue: true,
        salesFresh: true,
        unassignedOnly: true,
        scopeMode: 'all',
        limit: 15,
      });
      const g1 = group(
        'fresh-unassigned',
        'Unassigned Fresh Leads',
        toActionItems(unassignedSales, { todayYmd, workspace: 'sales', showOwner: true }),
        true
      );
      if (g1) groups.push(g1);
    }

    const dueTodayFresh = await filterLeadsForViewer(viewer, {
      dueTodayOnly: true,
      salesFresh: true,
      scopeMode,
      limit: 40,
    });
    const dueTodayScoped = isOversightAdmin
      ? dueTodayFresh.filter((r) => {
          const a = String(r.assignee || '').trim();
          return a && !/^unassigned$/i.test(a);
        })
      : dueTodayFresh;

    const g2 = group(
      'fresh-due-today-oversight',
      isSalesManager ? 'Team Fresh Leads due today' : 'Fresh Leads due today',
      toActionItems(dueTodayScoped, { todayYmd, workspace: 'sales', showOwner: true }),
      true
    );
    if (g2) groups.push(g2);

    return {
      dayBasis: isSalesManager
        ? `Team Fresh Lead oversight · due=${todayYmd} IST`
        : `Company Fresh Lead oversight · due=${todayYmd} IST`,
      scoped: true,
      actions: groups,
    };
  }

  // Fallback (legacy meeting_followups roles)
  if (strategy === 'fresh_leads') {
    const rows = await filterLeadsForViewer(viewer, {
      actionQueue: true,
      salesFresh: true,
      scopeMode: mode,
      limit: 40,
    });
    const g = group(
      'fresh-due-today',
      mode === 'my' ? 'My Fresh Leads' : 'Team Fresh Leads',
      toActionItems(rows, { todayYmd, workspace: 'sales', showOwner: mode !== 'my' })
    );
    return {
      dayBasis: `CRM Fresh Leads · ${todayYmd} IST`,
      scoped: true,
      actions: g ? [g] : [],
    };
  }

  return {
    dayBasis: `CRM actions · ${todayYmd} IST`,
    scoped: true,
    actions: [],
  };
}
