import { getPool } from './db';
import { assigneeLabelsForUser, assigneeMatchesScope } from './hallwayIdentity';
import {
  dateMatchesIstToday,
  dateOnOrBeforeIstToday,
  isMissingOrInvalidDue,
  istTodayYmd,
} from './hallwayIstDates';
import { resolveHallwayScope } from './resolveHallwayScope';
import type { TodayViewer } from './hallwayTodayFromCrm';

export type CrmLeadRow = {
  lead_key: string;
  name: string;
  assignee: string | null;
  follow_up_date: string | null;
  milestone_stage: string | null;
  presales_milestone_stage: string | null;
};

const LEAD_TABLES = [
  'mlead',
  'addlead',
  'glead',
  'formlead',
  'walkinlead',
  'websitelead',
  'whatsapplead',
  'ivrlead',
  'quikrlead',
] as const;

const tableColumnCache = new Map<string, Set<string>>();

async function tableColumns(crmDb: string, table: string): Promise<Set<string>> {
  const key = `${crmDb}.${table}`;
  const hit = tableColumnCache.get(key);
  if (hit) return hit;
  const pool = getPool();
  try {
    const [cols]: any = await pool.query(`SHOW COLUMNS FROM \`${crmDb}\`.\`${table}\``);
    const set = new Set<string>((Array.isArray(cols) ? cols : []).map((c: { Field: string }) => c.Field));
    tableColumnCache.set(key, set);
    return set;
  } catch {
    const empty = new Set<string>();
    tableColumnCache.set(key, empty);
    return empty;
  }
}

function isSalesFresh(row: CrmLeadRow): boolean {
  const ms = String(row.milestone_stage || '').trim().toLowerCase();
  return ms === 'fresh lead' || ms === 'fresh' || ms.includes('fresh lead');
}

function isPresalesFresh(row: CrmLeadRow): boolean {
  const ps = String(row.presales_milestone_stage || '').trim().toLowerCase();
  if (ps.includes('fresh data') || ps === 'fresh data') return true;
  const ms = String(row.milestone_stage || '').trim().toLowerCase();
  return ms.includes('fresh data') || ms === 'fresh lead' || ms.includes('fresh lead');
}

function isUnassigned(assignee: string | null): boolean {
  const a = String(assignee || '').trim();
  if (!a) return true;
  return /^unassigned$/i.test(a) || a === '—' || a === '-';
}

/**
 * Load CRM lead rows per table (resilient — missing columns skip that table, not the whole union).
 * Includes Fresh-stage rows even when follow_up_date is missing (walkinlead has no due column).
 */
export async function loadCrmLeadFollowUpRows(): Promise<CrmLeadRow[]> {
  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';
  const out: CrmLeadRow[] = [];

  for (const table of LEAD_TABLES) {
    const cols = await tableColumns(crmDb, table);
    if (!cols.has('name') || !cols.has('assignee')) continue;

    const hasFollow = cols.has('follow_up_date');
    const hasMs = cols.has('milestone_stage');
    const hasPs = cols.has('presales_milestone_stage');
    const followSel = hasFollow ? 'follow_up_date' : 'CAST(NULL AS CHAR) AS follow_up_date';
    const msSel = hasMs ? 'milestone_stage' : 'CAST(NULL AS CHAR) AS milestone_stage';
    const psSel = hasPs ? 'presales_milestone_stage' : 'CAST(NULL AS CHAR) AS presales_milestone_stage';

    const whereParts: string[] = [];
    if (hasFollow) {
      whereParts.push(
        `(follow_up_date IS NOT NULL AND TRIM(CAST(follow_up_date AS CHAR)) <> '' AND CAST(follow_up_date AS CHAR) NOT LIKE '0000%')`
      );
    }
    if (hasMs) {
      whereParts.push(`LOWER(TRIM(COALESCE(milestone_stage,''))) IN ('fresh lead','fresh')`);
      whereParts.push(`LOWER(TRIM(COALESCE(milestone_stage,''))) LIKE '%fresh lead%'`);
    }
    if (hasPs) {
      whereParts.push(`LOWER(TRIM(COALESCE(presales_milestone_stage,''))) LIKE '%fresh data%'`);
    }
    if (!whereParts.length) continue;

    const sql = `
      SELECT CONCAT('${table}-', id) AS lead_key,
             COALESCE(NULLIF(TRIM(name),''), CONCAT('Lead ', id)) AS name,
             NULLIF(TRIM(assignee), '') AS assignee,
             ${followSel},
             ${msSel},
             ${psSel}
      FROM \`${crmDb}\`.\`${table}\`
      WHERE ${whereParts.join(' OR ')}
      LIMIT 2500`;

    try {
      const [rows]: any = await pool.query(sql);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          out.push({
            lead_key: String(r.lead_key),
            name: String(r.name || 'Lead'),
            assignee: r.assignee != null ? String(r.assignee) : null,
            follow_up_date: r.follow_up_date != null ? String(r.follow_up_date) : null,
            milestone_stage: r.milestone_stage != null ? String(r.milestone_stage) : null,
            presales_milestone_stage:
              r.presales_milestone_stage != null ? String(r.presales_milestone_stage) : null,
          });
        }
      }
    } catch (err) {
      console.warn(`[loadCrmLeadFollowUpRows] ${table} skipped:`, err);
    }
  }

  return out;
}

function seedLabelsFromViewer(viewer: TodayViewer | undefined, labels: Set<string>): Set<string> {
  const next = new Set(labels);
  for (const l of assigneeLabelsForUser({
    full_name: viewer?.name || undefined,
    username: viewer?.username || undefined,
    email: viewer?.email || undefined,
  })) {
    next.add(l);
  }
  return next;
}

export async function filterLeadsForViewer(
  viewer: TodayViewer | undefined,
  opts: {
    presales?: boolean;
    salesFresh?: boolean;
    presalesFresh?: boolean;
    /** Exact calendar day = today (IST). */
    dueTodayOnly?: boolean;
    /** Due today or overdue (IST). */
    dueOnOrBeforeToday?: boolean;
    /**
     * Fresh action queue: due today / overdue, OR missing due date on a Fresh-stage lead
     * (CRM walk-in bucket often has no follow_up_date column).
     */
    actionQueue?: boolean;
    unassignedOnly?: boolean;
    scopeMode?: 'my' | 'team' | 'all';
    limit?: number;
  }
): Promise<CrmLeadRow[]> {
  const todayYmd = istTodayYmd();
  const resolved = await resolveHallwayScope(viewer, opts.scopeMode || viewer?.scope, viewer?.branchId);
  const all = await loadCrmLeadFollowUpRows();
  const labels = seedLabelsFromViewer(viewer, resolved.crm?.assigneeLabels || new Set<string>());
  const mode = opts.scopeMode || resolved.mode;
  const limit = opts.limit ?? 80;

  const filtered = all.filter((row) => {
    if (opts.dueTodayOnly && !dateMatchesIstToday(row.follow_up_date, todayYmd)) return false;

    if (opts.dueOnOrBeforeToday) {
      if (!dateOnOrBeforeIstToday(row.follow_up_date, todayYmd)) return false;
    }

    if (opts.actionQueue) {
      const dueOk = dateOnOrBeforeIstToday(row.follow_up_date, todayYmd);
      const missingOk = isMissingOrInvalidDue(row.follow_up_date);
      // Future-dated leads stay out; missing due still counts for Fresh bucket.
      if (!dueOk && !missingOk) return false;
    }

    if (opts.unassignedOnly) {
      if (!isUnassigned(row.assignee)) return false;
    } else if (mode !== 'all') {
      if (labels.size === 0 && mode === 'my') return false;
      if (labels.size > 0 && !assigneeMatchesScope(row.assignee, labels)) return false;
    }

    if (opts.presales && !isPresalesFresh(row)) return false;
    if (opts.salesFresh && !isSalesFresh(row)) return false;
    if (opts.presalesFresh && !isPresalesFresh(row)) return false;
    return true;
  });

  // Prefer overdue, then due today, then missing due; then name.
  filtered.sort((a, b) => {
    const ay = a.follow_up_date || '';
    const by = b.follow_up_date || '';
    const aMissing = isMissingOrInvalidDue(a.follow_up_date);
    const bMissing = isMissingOrInvalidDue(b.follow_up_date);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (ay !== by) return ay.localeCompare(by);
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return filtered.slice(0, limit);
}

export { isPresalesFresh, isSalesFresh, isUnassigned };
