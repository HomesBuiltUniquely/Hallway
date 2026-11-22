import type { Pool } from 'mysql2/promise';
import { getPool } from './db';
import type { HallwayActionGroup, HallwayActionItem } from '../types/hallway';

const DESIGN_FRONTEND = (
  process.env.DESIGN_MODULE_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_DESIGN_MODULE_FRONTEND_URL ||
  'https://design.hubinterior.com'
).replace(/\/$/, '');

export const TDM_OVERDUE_DAYS_THRESHOLD = 2;
export const ADMIN_OVERDUE_DAYS_THRESHOLD = 5;
export const LONG_HOLD_DAYS_THRESHOLD = 30;

export const MILESTONE_NAMES = [
  'D1 SITE MEASUREMENT',
  'DQC1',
  '10% PAYMENT',
  'D2 SITE MASKING',
  'DQC2',
  '40% PAYMENT',
  'PUSH TO PRODUCTION',
  'KT TRANSFER',
];

export const MILESTONE_TASKS: string[][] = [
  ['Mail loop chain 2 initiate', 'D1 for MMT request', 'D1 files upload'],
  [
    'First cut design + quotation discussion meeting request',
    'meeting completed',
    'DQC 1 submission - dwg + quotation',
    'DQC 1 approval',
  ],
  ['10% payment collection', '10% payment approval'],
  ['D2 - masking request raise', 'D2 - files upload'],
  [
    'Material selection meeting + quotation discussion',
    'Material selection meeting completed',
    'DQC 2 submission',
    'DQC 2 approval ',
    'Project manager approval',
  ],
  ['Design sign off', 'meeting completed', '40% collection', '40% payment approval'],
  ['Cx approval for production', 'POC mail'],
  ['Upload KT files'],
];

// Tasks belonging to external roles (NOT owned by designer)
export const EXTERNAL_TASKS = new Set([
  '0::D1 files upload',
  '1::DQC 1 approval',
  '2::10% payment approval',
  '3::D2 - files upload',
  '4::DQC 2 approval ',
  '4::Project manager approval',
  '5::40% payment approval',
]);

const MILESTONE_WORKFLOW_ORDER = [7, 0, 1, 2, 3, 4, 5, 6];

export function getCurrentMilestoneIndex(
  completions: Array<{ milestoneIndex: number; taskName: string }>
): number {
  const completedSet = new Set(completions.map((c) => `${c.milestoneIndex}::${c.taskName}`));
  for (const i of MILESTONE_WORKFLOW_ORDER) {
    if (i === 7) continue; // KT transfer lives in lead header
    const tasks = MILESTONE_TASKS[i];
    const allDone = tasks?.every((t) => completedSet.has(`${i}::${t}`));
    if (!allDone) return i;
  }
  return 6;
}

export function isProjectFullyCompleted(
  completions: Array<{ milestoneIndex: number; taskName: string }>
): boolean {
  return [0, 1, 2, 3, 4, 5, 6].every((mIdx) => {
    const tasks = MILESTONE_TASKS[mIdx];
    const doneSet = new Set(
      completions.filter((c) => c.milestoneIndex === mIdx).map((c) => c.taskName)
    );
    return tasks.every((t) => doneSet.has(t));
  });
}

// SLA Hours default configuration from taskDeadlineConfig.ts
export const TASK_SLA_HOURS: Record<string, number> = {
  '0::Mail loop chain 2 initiate': 12,
  '0::D1 for MMT request': 48,
  '0::D1 files upload': 24,
  '1::First cut design + quotation discussion meeting request': 48,
  '1::meeting completed': 48,
  '1::DQC 1 submission - dwg + quotation': 72,
  '1::DQC 1 approval': 24,
  '2::10% payment collection': 48,
  '2::10% payment approval': 24,
  '3::D2 - masking request raise': 48,
  '3::D2 - files upload': 12,
  '4::Material selection meeting + quotation discussion': 12,
  '4::Material selection meeting completed': 24,
  '4::DQC 2 submission': 48,
  '4::DQC 2 approval ': 24,
  '4::Project manager approval': 24,
  '5::Design sign off': 48,
  '5::meeting completed': 24,
  '5::40% collection': 48,
  '5::40% payment approval': 24,
  '6::Cx approval for production': 24,
  '6::POC mail': 24,
  '7::Upload KT files': 12,
};

export type HoldPeriod = {
  startedAt: string;
  endedAt?: string | null;
};

export function holdOverlapMs(
  periods: HoldPeriod[] | null | undefined,
  fromMs: number,
  toMs: number
): number {
  if (!periods?.length || !(toMs > fromMs)) return 0;
  let total = 0;
  for (const period of periods) {
    const start = Date.parse(period.startedAt);
    if (!Number.isFinite(start)) continue;
    const rawEnd = period.endedAt ? Date.parse(period.endedAt) : toMs;
    const end = Number.isFinite(rawEnd) ? rawEnd : toMs;
    const overlapStart = Math.max(start, fromMs);
    const overlapEnd = Math.min(end, toMs);
    if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
  }
  return total;
}

export function activeElapsedMs(
  periods: HoldPeriod[] | null | undefined,
  fromMs: number,
  toMs: number
): number {
  if (!(toMs > fromMs)) return 0;
  return Math.max(0, toMs - fromMs - holdOverlapMs(periods, fromMs, toMs));
}

export function projectDueMs(
  anchorMs: number,
  slaMs: number,
  holdPeriods: HoldPeriod[] | null | undefined,
  holdResumeAt: string | null | undefined,
  now: Date = new Date()
): number {
  const periods = holdPeriods ?? [];
  const nowMs = now.getTime();
  const elapsed = activeElapsedMs(periods, anchorMs, nowMs);
  if (elapsed >= slaMs) {
    let lo = anchorMs;
    let hi = Math.max(anchorMs, nowMs);
    for (let i = 0; i < 40 && hi - lo > 1000; i += 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (activeElapsedMs(periods, anchorMs, mid) >= slaMs) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  const remaining = slaMs - elapsed;
  const resumeMs = holdResumeAt ? Date.parse(holdResumeAt) : NaN;
  const hasOpen = periods.some((p) => !p.endedAt);
  const base = hasOpen && Number.isFinite(resumeMs) && resumeMs > nowMs ? resumeMs : nowMs;
  return base + remaining;
}

export function formatTaskDue(dueAt: Date, now: Date = new Date()): {
  isOverdue: boolean;
  overdueByDays: number;
  dueText: string;
  statusLabel?: 'Overdue' | 'Due today' | 'No due date';
  state: 'overdue' | 'due_today' | 'in_progress';
} {
  const dueMs = dueAt.getTime();
  const nowMs = now.getTime();
  const isOverdue = nowMs > dueMs;

  const dueParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dueAt);

  const nowParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const getVal = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value;
  const isToday =
    getVal(dueParts, 'year') === getVal(nowParts, 'year') &&
    getVal(dueParts, 'month') === getVal(nowParts, 'month') &&
    getVal(dueParts, 'day') === getVal(nowParts, 'day');

  if (isOverdue) {
    const diffDays = Math.max(1, Math.floor((nowMs - dueMs) / (24 * 60 * 60 * 1000)));
    return {
      isOverdue: true,
      overdueByDays: diffDays,
      dueText: `Overdue · ${diffDays}d`,
      statusLabel: 'Overdue',
      state: 'overdue',
    };
  }

  if (isToday) {
    return {
      isOverdue: false,
      overdueByDays: 0,
      dueText: 'Due today',
      statusLabel: 'Due today',
      state: 'due_today',
    };
  }

  const dateStr = dueAt.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
  });
  return {
    isOverdue: false,
    overdueByDays: 0,
    dueText: `Due ${dateStr}`,
    statusLabel: undefined,
    state: 'in_progress',
  };
}

export type TaskTrackerActionItem = HallwayActionItem & {
  projectId: string;
  customerName: string;
  milestoneName: string;
  taskTitle: string;
  dueAt: string;
  isOverdue: boolean;
  overdueByDays: number;
  state: string;
};

/**
 * Loads live designer milestone tasks for a specific designer.
 * Excludes projects on hold, completed, or cancelled.
 */
export async function loadDesignerTrackerActions(
  pool: Pool,
  designDb: string,
  designerId: number,
  now: Date = new Date()
): Promise<TaskTrackerActionItem[]> {
  const [leads]: any = await pool.query(
    `SELECT l.id, l.pid, l.project_name AS projectName, l.project_stage AS projectStage,
            l.is_on_hold AS isOnHold, l.resume_at AS resumeAt, l.payload, l.create_at AS createAt, l.update_at AS updateAt
     FROM ${designDb}.leads l
     WHERE l.assigned_designer_id = ?
       AND l.project_stage IN ('10-20%', '20-60%', 'Active')`,
    [designerId]
  );

  if (!Array.isArray(leads) || leads.length === 0) return [];

  // Filter qualifying active leads
  const activeLeads: any[] = [];
  for (const l of leads) {
    if (String(l.projectStage || '').trim().toLowerCase() === 'cancelled') continue;
    let isOnHold = Boolean(l.isOnHold);
    const resumeDate = l.resumeAt ? new Date(l.resumeAt) : null;
    if (isOnHold && resumeDate && resumeDate <= now) {
      isOnHold = false;
    }
    if (isOnHold) continue;
    activeLeads.push(l);
  }

  if (activeLeads.length === 0) return [];

  const leadIds = activeLeads.map((l) => l.id);

  // Batch query completions and hold periods in 2 queries instead of 2*N queries
  const [allComps]: any = await pool.query(
    `SELECT lead_id AS leadId, milestone_index AS milestoneIndex, task_name AS taskName, completed_at AS completedAt
     FROM ${designDb}.lead_task_completions
     WHERE lead_id IN (${leadIds.join(',')})`
  );
  const compsByLead = new Map<number, Array<{ milestoneIndex: number; taskName: string; completedAt?: string }>>();
  for (const c of Array.isArray(allComps) ? allComps : []) {
    const arr = compsByLead.get(c.leadId) ?? [];
    arr.push(c);
    compsByLead.set(c.leadId, arr);
  }

  const [allHolds]: any = await pool.query(
    `SELECT lead_id AS leadId, started_at AS startedAt, ended_at AS endedAt
     FROM ${designDb}.lead_hold_periods
     WHERE lead_id IN (${leadIds.join(',')})`
  );
  const holdsByLead = new Map<number, HoldPeriod[]>();
  for (const h of Array.isArray(allHolds) ? allHolds : []) {
    const arr = holdsByLead.get(h.leadId) ?? [];
    arr.push(h);
    holdsByLead.set(h.leadId, arr);
  }

  const items: TaskTrackerActionItem[] = [];

  for (const l of activeLeads) {
    const completions: Array<{ milestoneIndex: number; taskName: string; completedAt?: string }> =
      compsByLead.get(l.id) || [];

    // Edge case 1: Fully completed project
    if (isProjectFullyCompleted(completions)) continue;

    const activeMilestone = getCurrentMilestoneIndex(completions);
    const tasks = MILESTONE_TASKS[activeMilestone] || [];
    const completedSet = new Set(completions.map((c) => `${c.milestoneIndex}::${c.taskName}`));
    const holdPeriods: HoldPeriod[] = holdsByLead.get(l.id) || [];

    // Anchor time for active milestone
    let anchorDate = l.createAt ? new Date(l.createAt) : now;
    if (activeMilestone > 0) {
      const prevMilestoneComps = completions.filter(
        (c) => c.milestoneIndex === activeMilestone - 1 && c.completedAt
      );
      if (prevMilestoneComps.length > 0) {
        prevMilestoneComps.sort(
          (a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
        );
        anchorDate = new Date(prevMilestoneComps[0].completedAt!);
      }
    }

    const hubPid = l.pid ? (String(l.pid).startsWith('HUB') ? String(l.pid) : `HUB-${l.id}`) : `HUB-${l.id}`;
    const customer = String(l.projectName || 'Customer').trim();
    const milestoneName = MILESTONE_NAMES[activeMilestone] || `Milestone ${activeMilestone}`;

    for (let tIdx = 0; tIdx < tasks.length; tIdx++) {
      const taskTitle = tasks[tIdx];
      const taskKey = `${activeMilestone}::${taskTitle}`;

      // Completed task disappears immediately
      if (completedSet.has(taskKey)) continue;

      // Tasks owned by other roles (MMT, DQC, Finance, PM) excluded from designer actions
      if (EXTERNAL_TASKS.has(taskKey)) continue;

      const slaHours = TASK_SLA_HOURS[taskKey] || 48;
      const dueMs = projectDueMs(
        anchorDate.getTime(),
        slaHours * 3600 * 1000,
        holdPeriods,
        null,
        now
      );
      const dueAt = new Date(dueMs);
      const dueInfo = formatTaskDue(dueAt, now);

      items.push({
        id: `tracker-${l.id}-${activeMilestone}-${tIdx}`,
        name: `${taskTitle} · ${hubPid} (${customer})`,
        detail: `${milestoneName} · ${dueInfo.dueText}`,
        done: false,
        linkUrl: `${DESIGN_FRONTEND}/Leads/${l.id}`,
        dueDateLabel: dueInfo.dueText,
        statusLabel: dueInfo.statusLabel,
        projectId: hubPid,
        customerName: customer,
        milestoneName,
        taskTitle,
        dueAt: dueAt.toISOString(),
        isOverdue: dueInfo.isOverdue,
        overdueByDays: dueInfo.overdueByDays,
        state: dueInfo.state,
      });
    }
  }

  // Sorting: Overdue first (most overdue first), then due soonest, then no due date
  items.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) {
      if (b.overdueByDays !== a.overdueByDays) return b.overdueByDays - a.overdueByDays;
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return items;
}

/**
 * Loads exception-only scopes for TDM, Design Managers, and Admin.
 */
export async function loadExceptionScopes(
  pool: Pool,
  designDb: string,
  user: { id: number; role: string },
  now: Date = new Date()
): Promise<HallwayActionGroup[]> {
  const role = String(user.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const groups: HallwayActionGroup[] = [];

  // Determine designers in scope
  let designerIds: number[] = [];

  if (role === 'TERRITORIAL_DESIGN_MANAGER') {
    const [dRows]: any = await pool.query(
      `SELECT u.id, u.name, dm.name as dm_name, dm.branch
       FROM ${designDb}.users u
       JOIN ${designDb}.users dm ON dm.id = u.design_manager_id
       WHERE dm.territorial_design_manager_id = ? AND u.role = 'designer'`,
      [user.id]
    );
    designerIds = Array.isArray(dRows) ? dRows.map((r) => Number(r.id)).filter((id) => id > 0) : [];
  } else if (role === 'DESIGN_MANAGER') {
    const [dRows]: any = await pool.query(
      `SELECT u.id, u.name
       FROM ${designDb}.users u
       WHERE u.design_manager_id = ? AND u.role = 'designer'`,
      [user.id]
    );
    designerIds = Array.isArray(dRows) ? dRows.map((r) => Number(r.id)).filter((id) => id > 0) : [];
  } else if (role === 'ADMIN' || role === 'DEPUTY_GENERAL_MANAGER') {
    const [dRows]: any = await pool.query(
      `SELECT u.id FROM ${designDb}.users u WHERE u.role = 'designer'`
    );
    designerIds = Array.isArray(dRows) ? dRows.map((r) => Number(r.id)).filter((id) => id > 0) : [];
  }

  // 1. Overdue Exceptions
  const minOverdueDays =
    role === 'ADMIN' || role === 'DEPUTY_GENERAL_MANAGER'
      ? ADMIN_OVERDUE_DAYS_THRESHOLD
      : TDM_OVERDUE_DAYS_THRESHOLD;

  if (designerIds.length > 0) {
    const overdueItems: HallwayActionItem[] = [];

    // Scan projects of designers in scope for overdue tasks
    const [leads]: any = await pool.query(
      `SELECT l.id, l.pid, l.project_name AS projectName, l.assigned_designer_id AS designerId,
              u.name AS designerName, l.create_at AS createAt, l.is_on_hold AS isOnHold, l.resume_at AS resumeAt
       FROM ${designDb}.leads l
       JOIN ${designDb}.users u ON u.id = l.assigned_designer_id
       WHERE l.assigned_designer_id IN (${designerIds.join(',')})
         AND l.is_on_hold = 0
         AND l.project_stage IN ('10-20%', '20-60%', 'Active')`
    );

    if (Array.isArray(leads) && leads.length > 0) {
      const leadIds = leads.map((l) => l.id);
      const [allComps]: any = await pool.query(
        `SELECT lead_id AS leadId, milestone_index AS milestoneIndex, task_name AS taskName, completed_at AS completedAt
         FROM ${designDb}.lead_task_completions
         WHERE lead_id IN (${leadIds.join(',')})`
      );
      const compsByLead = new Map<number, Array<{ milestoneIndex: number; taskName: string; completedAt?: string }>>();
      for (const c of Array.isArray(allComps) ? allComps : []) {
        const arr = compsByLead.get(c.leadId) ?? [];
        arr.push(c);
        compsByLead.set(c.leadId, arr);
      }

      for (const l of leads) {
        const completions = compsByLead.get(l.id) ?? [];
        if (isProjectFullyCompleted(completions)) continue;

        const activeMilestone = getCurrentMilestoneIndex(completions);
        const tasks = MILESTONE_TASKS[activeMilestone] || [];
        const completedSet = new Set(completions.map((c) => `${c.milestoneIndex}::${c.taskName}`));

        let anchorDate = l.createAt ? new Date(l.createAt) : now;
        if (activeMilestone > 0) {
          const prevMilestoneComps = completions.filter(
            (c) => c.milestoneIndex === activeMilestone - 1 && c.completedAt
          );
          if (prevMilestoneComps.length > 0) {
            prevMilestoneComps.sort(
              (a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
            );
            anchorDate = new Date(prevMilestoneComps[0].completedAt!);
          }
        }

        const hubPid = l.pid ? (String(l.pid).startsWith('HUB') ? String(l.pid) : `HUB-${l.id}`) : `HUB-${l.id}`;
        const milestoneName = MILESTONE_NAMES[activeMilestone] || `Milestone ${activeMilestone}`;

        for (let tIdx = 0; tIdx < tasks.length; tIdx++) {
          const taskTitle = tasks[tIdx];
          const taskKey = `${activeMilestone}::${taskTitle}`;
          if (completedSet.has(taskKey) || EXTERNAL_TASKS.has(taskKey)) continue;

          const slaHours = TASK_SLA_HOURS[taskKey] || 48;
          const dueMs = anchorDate.getTime() + slaHours * 3600 * 1000;
          const dueAt = new Date(dueMs);
          const dueInfo = formatTaskDue(dueAt, now);

          if (dueInfo.isOverdue && dueInfo.overdueByDays >= minOverdueDays) {
            overdueItems.push({
              id: `exc-${l.id}-${activeMilestone}-${tIdx}`,
              name: `${taskTitle} · ${hubPid} (${l.projectName})`,
              detail: `${milestoneName} · ${dueInfo.dueText} · Designer: ${l.designerName}`,
              done: false,
              linkUrl: `${DESIGN_FRONTEND}/Leads/${l.id}`,
              assignee: l.designerName,
              dueDateLabel: dueInfo.dueText,
              statusLabel: 'Overdue',
            });
          }
        }
      }
    }

    if (overdueItems.length > 0) {
      overdueItems.sort((a, b) => (b.dueDateLabel?.localeCompare(a.dueDateLabel || '') || 0));
      groups.push({
        id: role === 'ADMIN' ? 'admin-overdue-escalations' : 'tdm-overdue-exceptions',
        title:
          role === 'ADMIN'
            ? `Org Overdue Escalations (${minOverdueDays}+ days)`
            : `Team Overdue Exceptions (${minOverdueDays}+ days)`,
        count: overdueItems.length,
        urgent: true,
        items: overdueItems.slice(0, 30),
      });
    }

    // 2. Holds Ending Soon (Today/Tomorrow) for TDM and DM (Uncounted Watchlist)
    if (role === 'TERRITORIAL_DESIGN_MANAGER' || role === 'DESIGN_MANAGER' || role === 'ADMIN' || role === 'DEPUTY_GENERAL_MANAGER') {
      const [endingSoon]: any = await pool.query(
        `SELECT l.id, l.pid, l.project_name AS projectName, u.name AS designerName,
                DATE_FORMAT(l.resume_at, '%d %b') AS resumeDateLabel
         FROM ${designDb}.leads l
         JOIN ${designDb}.users u ON u.id = l.assigned_designer_id
         WHERE l.assigned_designer_id IN (${designerIds.join(',')})
           AND l.is_on_hold = 1
           AND DATE(l.resume_at) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
         ORDER BY l.resume_at ASC
         LIMIT 20`
      );
      if (Array.isArray(endingSoon) && endingSoon.length > 0) {
        groups.push({
          id: 'holds-resuming-soon',
          title: 'Holds Ending Soon (Today/Tomorrow)',
          count: endingSoon.length,
          urgent: false,
          uncounted: true,
          isWatchlist: true,
          items: endingSoon.map((r: any) => ({
            id: `hold-end-${r.id}`,
            name: `${r.pid || `HUB-${r.id}`} · ${r.projectName}`,
            detail: `Hold ends ${r.resumeDateLabel} · Designer: ${r.designerName}`,
            done: false,
            linkUrl: `${DESIGN_FRONTEND}/Leads/${r.id}`,
            assignee: r.designerName,
          })),
        });
      }

      // 3. Long Holds (>30 days or no end date) - Collapsed Single Watchlist Row
      const [longHolds]: any = await pool.query(
        `SELECT l.id, l.pid, l.project_name AS projectName, u.name AS designerName,
                COALESCE(dm.branch, 'Main') AS branch,
                l.resume_at AS resumeAt, l.hold_note AS holdNote,
                COALESCE(p.started_at, l.update_at) AS heldSince,
                DATEDIFF(CURDATE(), DATE(COALESCE(p.started_at, l.update_at))) AS elapsedDays,
                DATEDIFF(l.resume_at, DATE(COALESCE(p.started_at, l.update_at))) AS scheduledDays
         FROM ${designDb}.leads l
         JOIN ${designDb}.users u ON u.id = l.assigned_designer_id
         LEFT JOIN ${designDb}.users dm ON dm.id = u.design_manager_id
         LEFT JOIN ${designDb}.lead_hold_periods p ON p.lead_id = l.id AND p.ended_at IS NULL
         WHERE l.assigned_designer_id IN (${designerIds.join(',')})
           AND l.is_on_hold = 1
           AND (
             DATEDIFF(CURDATE(), DATE(COALESCE(p.started_at, l.update_at))) > ${LONG_HOLD_DAYS_THRESHOLD}
             OR l.resume_at IS NULL
           )
         ORDER BY elapsedDays DESC
         LIMIT 40`
      );
      if (Array.isArray(longHolds) && longHolds.length > 0) {
        const holdLeadIds = longHolds.map((r: any) => r.id);
        const heldByMap = new Map<number, string>();
        try {
          const [histRows]: any = await pool.query(
            `SELECT h.lead_id AS leadId, JSON_UNQUOTE(JSON_EXTRACT(h.event, '$.user.name')) AS heldBy
             FROM ${designDb}.lead_history h
             WHERE h.lead_id IN (${holdLeadIds.join(',')})
               AND (
                 JSON_UNQUOTE(JSON_EXTRACT(h.event, '$.taskName')) = 'Project on hold'
                 OR h.event LIKE '%"Project on hold"%'
                 OR h.event LIKE '%hold%'
               )
             ORDER BY h.id ASC`
          );
          for (const hr of Array.isArray(histRows) ? histRows : []) {
            if (hr.heldBy) heldByMap.set(hr.leadId, hr.heldBy);
          }
        } catch {
          // Non-critical metadata fallback
        }

        const oldestDays = Math.max(...longHolds.map((r: any) => Number(r.elapsedDays || 0)));
        const formatHoldDate = (d: any) => {
          if (!d) return 'Not recorded';
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return 'Not recorded';
          return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        const holdItems = longHolds.map((r: any) => {
          const daysOnHold = r.elapsedDays != null ? Number(r.elapsedDays) : 0;
          const holdReason = String(r.holdNote || '').trim() || 'Not recorded';
          const heldBy = String(heldByMap.get(r.id) || '').trim() || 'Not recorded';
          const heldSinceFormatted = formatHoldDate(r.heldSince);
          const resumeFormatted = r.resumeAt ? formatHoldDate(r.resumeAt) : 'Indefinite (No date set)';

          return {
            id: `long-hold-${r.id}`,
            name: `${r.pid || `HUB-${r.id}`} · ${r.projectName || 'Not recorded'}`,
            detail: `Hold reason: ${holdReason} · ${daysOnHold} days on hold · Held since: ${heldSinceFormatted} · Held by: ${heldBy}`,
            done: false,
            linkUrl: `${DESIGN_FRONTEND}/Leads/${r.id}`,
            assignee: r.designerName || 'Not recorded',
            dueDateLabel: resumeFormatted,
            statusLabel: 'Overdue' as const,
            holdMetadata: {
              projectId: r.pid || `HUB-${r.id}`,
              customerName: r.projectName || 'Not recorded',
              designerName: r.designerName || 'Not recorded',
              daysOnHold,
              holdReason,
              heldSinceDate: heldSinceFormatted,
              heldBy,
              resumeAtDate: resumeFormatted,
            },
          };
        });

        // Summary title per role (hub-breakdown for Admin/TDM, team-focused for DM)
        const summaryTitle = `${longHolds.length} projects on hold > 30 days · oldest ${oldestDays} days · Review`;

        groups.push({
          id: 'extended-holds-watchlist',
          title: summaryTitle,
          count: longHolds.length,
          urgent: false,
          uncounted: true,
          isWatchlist: true,
          items: holdItems,
          collapsedSummary: {
            projectCount: longHolds.length,
            oldestDays,
          },
        });
      }
    }
  }

  // 4. Admin Org-level Rollup by Branch (Uncounted Watchlist)
  if (role === 'ADMIN' || role === 'DEPUTY_GENERAL_MANAGER') {
    const [branchStats]: any = await pool.query(
      `SELECT COALESCE(dm.branch, 'Unassigned') AS branch,
              dm.name AS managerName,
              COUNT(DISTINCT l.id) AS totalProjects,
              SUM(CASE WHEN l.is_on_hold = 0 THEN 1 ELSE 0 END) AS activeCount,
              SUM(CASE WHEN l.is_on_hold = 1 THEN 1 ELSE 0 END) AS onHoldCount
       FROM ${designDb}.leads l
       JOIN ${designDb}.users u ON u.id = l.assigned_designer_id
       LEFT JOIN ${designDb}.users dm ON dm.id = u.design_manager_id
       WHERE l.project_stage IN ('10-20%', '20-60%', 'Active')
       GROUP BY dm.branch, dm.name
       ORDER BY activeCount DESC`
    );
    if (Array.isArray(branchStats) && branchStats.length > 0) {
      groups.push({
        id: 'branch-rollup',
        title: 'Design Team Rollup',
        count: branchStats.length,
        urgent: false,
        uncounted: true,
        isWatchlist: true,
        items: branchStats.map((b: any, idx: number) => ({
          id: `branch-stat-${idx}`,
          name: `${b.branch} · ${b.managerName || 'General'}`,
          detail: `${b.activeCount} active projects · ${b.onHoldCount} on hold (${b.totalProjects} total)`,
          done: false,
          linkUrl: `${DESIGN_FRONTEND}/dashboard`,
        })),
      });
    }
  }

  return groups;
}

