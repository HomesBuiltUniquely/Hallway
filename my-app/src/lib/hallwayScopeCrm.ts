import { getPool } from './db';
import { assigneeLabelsForUser } from './hallwayIdentity';

export type CrmScopeBundle = {
  mode: 'my' | 'team' | 'all';
  salesUserIds: Set<number>;
  assigneeLabels: Set<string>;
  branch?: string | null;
};

function normRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

const scopeCache = new Map<string, { at: number; bundle: CrmScopeBundle }>();
const CACHE_MS = 10 * 60 * 1000;

function cacheKey(
  userId: number | string,
  role: string,
  mode: string,
  branch?: string,
  identity?: string
) {
  return `${userId}|${role}|${mode}|${branch || ''}|${identity || ''}`;
}

async function resolveCrmUserRow(
  pool: ReturnType<typeof getPool>,
  crmDb: string,
  input: {
    userId?: number | string | null;
    name?: string | null;
    username?: string | null;
    email?: string | null;
  }
): Promise<{
  id: number;
  full_name?: string;
  username?: string;
  email?: string;
  role?: string;
  manager_id?: number | null;
  branch?: string | null;
} | null> {
  const uid = input.userId != null ? Number(input.userId) : NaN;
  if (Number.isFinite(uid)) {
    const [selfRows]: any = await pool.query(
      `SELECT id, full_name, username, email, role, manager_id, branch FROM ${crmDb}.users WHERE id = ? LIMIT 1`,
      [uid]
    );
    if (Array.isArray(selfRows) && selfRows[0]) return selfRows[0];
  }

  const username = String(input.username || '').trim();
  const email = String(input.email || '').trim();
  const name = String(input.name || '').trim();

  if (username) {
    const [rows]: any = await pool.query(
      `SELECT id, full_name, username, email, role, manager_id, branch FROM ${crmDb}.users
       WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(full_name)) = LOWER(?)
       LIMIT 1`,
      [username, username]
    );
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  if (email) {
    const [rows]: any = await pool.query(
      `SELECT id, full_name, username, email, role, manager_id, branch FROM ${crmDb}.users
       WHERE LOWER(TRIM(email)) = LOWER(?) LIMIT 1`,
      [email]
    );
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  if (name) {
    const [rows]: any = await pool.query(
      `SELECT id, full_name, username, email, role, manager_id, branch FROM ${crmDb}.users
       WHERE LOWER(TRIM(full_name)) = LOWER(?) OR LOWER(TRIM(username)) = LOWER(?)
       LIMIT 1`,
      [name, name]
    );
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  return null;
}

export async function loadCrmScopeBundle(input: {
  userId?: number | string | null;
  role?: string | null;
  mode: 'my' | 'team' | 'all';
  branchId?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
}): Promise<CrmScopeBundle> {
  const role = normRole(input.role);
  const mode = input.mode;
  const branch = input.branchId?.trim() || null;
  const uid = input.userId != null ? Number(input.userId) : NaN;
  const identity = [input.name, input.username, input.email].filter(Boolean).join('|');
  const key = cacheKey(uid || 'anon', role, mode, branch || '', identity);
  const hit = scopeCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.bundle;

  const pool = getPool();
  const crmDb = process.env.CRM_DB_NAME || 'CRM';

  const salesUserIds = new Set<number>();
  const assigneeLabels = new Set<string>();

  const addUserRow = (row: { id: number; full_name?: string; username?: string; email?: string }) => {
    if (row?.id != null) salesUserIds.add(Number(row.id));
    for (const l of assigneeLabelsForUser(row)) {
      assigneeLabels.add(l);
    }
  };

  // Always seed viewer identity so assignee "Meghana" / "Uma_S" match even if CRM id differs.
  for (const l of assigneeLabelsForUser({
    full_name: input.name || undefined,
    username: input.username || undefined,
    email: input.email || undefined,
  })) {
    assigneeLabels.add(l);
  }

  if (mode === 'all' || role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'SALES_ADMIN') {
    const [rows]: any = await pool.query(
      `SELECT id, full_name, username, email FROM ${crmDb}.users
       WHERE UPPER(REPLACE(role,' ','_')) IN ('SALES_EXECUTIVE','SALES_MANAGER','PRESALES_EXECUTIVE','PRESALES_MANAGER')
       ${branch ? 'AND (branch IS NULL OR branch = ? OR TRIM(branch) = ?)' : ''}`,
      branch ? [branch, branch] : []
    );
    for (const r of Array.isArray(rows) ? rows : []) addUserRow(r);
    const bundle: CrmScopeBundle = { mode: 'all', salesUserIds, assigneeLabels, branch };
    scopeCache.set(key, { at: Date.now(), bundle });
    return bundle;
  }

  const self = await resolveCrmUserRow(pool, crmDb, input);
  if (self) addUserRow(self);

  if (mode === 'my') {
    const bundle: CrmScopeBundle = {
      mode: 'my',
      salesUserIds,
      assigneeLabels,
      branch: self?.branch || branch,
    };
    scopeCache.set(key, { at: Date.now(), bundle });
    return bundle;
  }

  // team: manager + reports
  if (self && (role === 'SALES_MANAGER' || role === 'PRESALES_MANAGER' || role.includes('MANAGER'))) {
    const [teamRows]: any = await pool.query(
      `SELECT id, full_name, username, email FROM ${crmDb}.users WHERE manager_id = ?
       ${branch ? 'AND (branch IS NULL OR branch = ? OR TRIM(branch) = ?)' : ''}`,
      branch ? [self.id, branch, branch] : [self.id]
    );
    for (const r of Array.isArray(teamRows) ? teamRows : []) addUserRow(r);
  }

  const bundle: CrmScopeBundle = {
    mode: 'team',
    salesUserIds,
    assigneeLabels,
    branch: self?.branch || branch,
  };
  scopeCache.set(key, { at: Date.now(), bundle });
  return bundle;
}
