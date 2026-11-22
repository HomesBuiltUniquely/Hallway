import { getPool } from './db';
import { assigneeLabelsForUser } from './hallwayIdentity';

export type DesignScopeBundle = {
  mode: 'my' | 'team' | 'all';
  designUserIds: Set<number>;
  designerNames: Set<string>;
};

function normRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

const scopeCache = new Map<string, { at: number; bundle: DesignScopeBundle }>();
const CACHE_MS = 10 * 60 * 1000;

export async function loadDesignScopeBundle(input: {
  userId?: number | string | null;
  role?: string | null;
  name?: string | null;
  username?: string | null;
  mode: 'my' | 'team' | 'all';
}): Promise<DesignScopeBundle> {
  const role = normRole(input.role);
  const mode = input.mode;
  const uid = input.userId != null ? Number(input.userId) : NaN;
  const key = `${uid}|${role}|${mode}`;
  const hit = scopeCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.bundle;

  const pool = getPool();
  const designDb = process.env.DESIGN_DB_NAME || 'DesignMod';
  const designUserIds = new Set<number>();
  const designerNames = new Set<string>();

  const addRow = (row: { id: number; name?: string; email?: string; username?: string }) => {
    if (row?.id != null) designUserIds.add(Number(row.id));
    const nm = String(row.name || '').trim();
    if (nm) designerNames.add(nm.toLowerCase());
    for (const l of assigneeLabelsForUser({
      full_name: row.name,
      username: row.username,
      email: row.email,
    })) {
      designerNames.add(l.toLowerCase());
    }
  };

  if (mode === 'all' || role === 'ADMIN' || role === 'TERRITORIAL_DESIGN_MANAGER') {
    const [rows]: any = await pool.query(
      `SELECT id, name, email FROM ${designDb}.users WHERE LOWER(TRIM(role)) = 'designer'`
    );
    for (const r of Array.isArray(rows) ? rows : []) addRow(r);
    const bundle: DesignScopeBundle = { mode: 'all', designUserIds, designerNames };
    scopeCache.set(key, { at: Date.now(), bundle });
    return bundle;
  }

  if (Number.isFinite(uid)) {
    const [selfRows]: any = await pool.query(
      `SELECT id, name, email, role FROM ${designDb}.users WHERE id = ? LIMIT 1`,
      [uid]
    );
    const self = Array.isArray(selfRows) && selfRows[0] ? selfRows[0] : null;
    if (self) addRow(self);
  }

  if (input.name) designerNames.add(String(input.name).trim().toLowerCase());
  if (input.username) designerNames.add(String(input.username).trim().toLowerCase());

  if (mode === 'my') {
    const bundle: DesignScopeBundle = { mode: 'my', designUserIds, designerNames };
    scopeCache.set(key, { at: Date.now(), bundle });
    return bundle;
  }

  // team subtree by hierarchy
  if (Number.isFinite(uid)) {
    if (role === 'DESIGN_MANAGER') {
      const [rows]: any = await pool.query(
        `SELECT id, name, email FROM ${designDb}.users WHERE design_manager_id = ?`,
        [uid]
      );
      for (const r of Array.isArray(rows) ? rows : []) addRow(r);
    } else if (role === 'TERRITORIAL_DESIGN_MANAGER') {
      const [dmRows]: any = await pool.query(
        `SELECT id FROM ${designDb}.users WHERE territorial_design_manager_id = ? AND LOWER(role) = 'design_manager'`,
        [uid]
      );
      const dmIds = (Array.isArray(dmRows) ? dmRows : []).map((d: { id: number }) => d.id);
      if (dmIds.length) {
        const placeholders = dmIds.map(() => '?').join(',');
        const [rows]: any = await pool.query(
          `SELECT id, name, email FROM ${designDb}.users
           WHERE design_manager_id IN (${placeholders}) OR id IN (${placeholders})`,
          [...dmIds, ...dmIds]
        );
        for (const r of Array.isArray(rows) ? rows : []) addRow(r);
      }
    } else if (role === 'ADMIN') {
      const [rows]: any = await pool.query(
        `SELECT id, name, email FROM ${designDb}.users WHERE LOWER(TRIM(role)) = 'designer' LIMIT 500`
      );
      for (const r of Array.isArray(rows) ? rows : []) addRow(r);
    }
  }

  const bundle: DesignScopeBundle = { mode: 'team', designUserIds, designerNames };
  scopeCache.set(key, { at: Date.now(), bundle });
  return bundle;
}