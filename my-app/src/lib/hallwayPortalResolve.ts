import { getPool } from './db';
import { isDesignRole, isSuperAdmin } from './permissions';

export type HallwayPortal = 'crm' | 'design';

export type HallwayIdentityClass = {
  portal: HallwayPortal;
  department: 'Sales' | 'Design';
  role: string;
  source: 'crm_users' | 'crm_designer' | 'designmod_users' | 'hint';
};

function normRole(role?: string | null): string {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Resolve Hallway app-switcher portal from CRM / Design identity tables.
 * Designers must never get CRM in the switcher — even if Design auth is down
 * and Hub also has a CRM user row for them.
 */
export async function resolveHallwayIdentity(input: {
  email?: string | null;
  username?: string | null;
  name?: string | null;
  roleHint?: string | null;
}): Promise<HallwayIdentityClass | null> {
  const email = String(input.email || '')
    .trim()
    .toLowerCase();
  const username = String(input.username || '')
    .trim()
    .toLowerCase();
  const name = String(input.name || '')
    .trim()
    .toLowerCase();
  const local = email.includes('@') ? email.split('@')[0] : email || username;

  if (!email && !username && !name) return null;

  // Fast path from authenticated role hint (CRM JWT / Design session).
  const hint = normRole(input.roleHint);
  if (hint && isSuperAdmin({ role: hint, email, name })) {
    return { portal: 'crm', department: 'Sales', role: hint, source: 'hint' };
  }
  if (hint && isDesignRole(hint)) {
    return { portal: 'design', department: 'Design', role: hint, source: 'hint' };
  }

  try {
    const pool = getPool();
    const crmDb = process.env.CRM_DB_NAME || 'CRM';
    const designDb = process.env.DESIGN_DB_NAME || 'DesignMod';

    // Designer roster first — never classify a designer as Sales because of a dual CRM row.
    const [designers]: any = await pool.query(
      `
      SELECT id, name, email
      FROM ${crmDb}.designer
      WHERE (? <> '' AND LOWER(TRIM(email)) = ?)
         OR (? <> '' AND LOWER(TRIM(name)) = ?)
         OR (? <> '' AND LOWER(TRIM(name)) LIKE ?)
      LIMIT 3
      `,
      [email, email, name, name, local, `%${local}%`]
    );
    if (Array.isArray(designers) && designers.length > 0) {
      return {
        portal: 'design',
        department: 'Design',
        role: hint && isDesignRole(hint) ? hint : 'DESIGNER',
        source: 'crm_designer',
      };
    }

    try {
      const [designUsers]: any = await pool.query(
        `
        SELECT id, email, name, role
        FROM ${designDb}.users
        WHERE (? <> '' AND LOWER(TRIM(email)) = ?)
           OR (? <> '' AND LOWER(TRIM(name)) = ?)
        LIMIT 3
        `,
        [email, email, name, name]
      );
      if (Array.isArray(designUsers) && designUsers.length > 0) {
        const role = normRole(designUsers[0].role) || 'DESIGNER';
        return { portal: 'design', department: 'Design', role, source: 'designmod_users' };
      }
    } catch {
      /* DesignMod optional */
    }

    const [crmUsers]: any = await pool.query(
      `
      SELECT id, email, username, full_name, role
      FROM ${crmDb}.users
      WHERE (? <> '' AND LOWER(TRIM(email)) = ?)
         OR (? <> '' AND LOWER(TRIM(username)) = ?)
         OR (? <> '' AND LOWER(TRIM(username)) = ?)
         OR (? <> '' AND LOWER(TRIM(full_name)) = ?)
      LIMIT 5
      `,
      [email, email, username, username, local, local, name, name]
    );

    for (const u of Array.isArray(crmUsers) ? crmUsers : []) {
      const role = normRole(u.role);
      if (isDesignRole(role) || role === 'DESIGNER') {
        return { portal: 'design', department: 'Design', role: role || 'DESIGNER', source: 'crm_users' };
      }
      if (isSuperAdmin({ role, email: u.email, name: u.full_name })) {
        return { portal: 'crm', department: 'Sales', role: role || 'ADMIN', source: 'crm_users' };
      }
      if (role.includes('PRESALES') || role === 'SALES_EXECUTIVE' || role === 'SALES_MANAGER') {
        return { portal: 'crm', department: 'Sales', role, source: 'crm_users' };
      }
      if (role.includes('SALES') || role.includes('CRM') || role === 'MANAGER') {
        return { portal: 'crm', department: 'Sales', role, source: 'crm_users' };
      }
    }

    if (Array.isArray(crmUsers) && crmUsers.length > 0) {
      const role = normRole(crmUsers[0].role) || 'SALES_EXECUTIVE';
      if (isDesignRole(role)) {
        return { portal: 'design', department: 'Design', role, source: 'crm_users' };
      }
      return { portal: 'crm', department: 'Sales', role, source: 'crm_users' };
    }
  } catch (err) {
    console.warn('[resolveHallwayIdentity] failed:', err);
  }

  if (hint && isDesignRole(hint)) {
    return { portal: 'design', department: 'Design', role: hint, source: 'hint' };
  }
  if (hint) {
    return { portal: 'crm', department: 'Sales', role: hint, source: 'hint' };
  }
  return null;
}
