import type { User } from '../types';

export type HallwayHomeViewMode = 'my' | 'team' | 'all';

function normRole(user?: { role?: string } | null): string {
  return (user?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
}

function normDept(user?: { department?: string } | null): string {
  return (user?.department || '').toLowerCase().trim();
}

const CRM_ALL_HUBS = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_ADMIN',
  'TERRITORY_DESIGN_MANAGER',
]);

const CRM_TEAM = new Set(['SALES_MANAGER', 'PRESALES_MANAGER']);

const CRM_MY_ONLY = new Set(['SALES_EXECUTIVE', 'PRESALES_EXECUTIVE']);

const DESIGN_ALL_HUBS = new Set(['ADMIN', 'TERRITORIAL_DESIGN_MANAGER']);

const DESIGN_TEAM = new Set([
  'DESIGN_MANAGER',
  'DQC_MANAGER',
  'MMT_MANAGER',
  'PROJECT_MANAGER',
  'SENIOR_PROJECT_MANAGER',
  'OPERATION_MANAGER',
]);

const DESIGN_MY = new Set(['DESIGNER', 'MMT_EXECUTIVE', 'DQE']);

const DESIGN_FINANCE = new Set(['FINANCE']);

export function isDesignHomeUser(user?: User | null): boolean {
  if (!user) return false;
  const dept = normDept(user);
  if (dept === 'design') return true;
  const role = normRole(user);
  return (
    role.includes('DESIGN') ||
    role.includes('DQC') ||
    role.includes('MMT') ||
    role === 'DQE' ||
    role === 'PROJECT_MANAGER' ||
    role === 'SENIOR_PROJECT_MANAGER' ||
    role === 'OPERATION_MANAGER'
  );
}

export function canViewAllHubsHome(user?: User | null): boolean {
  if (!user) return false;
  const role = normRole(user);
  if (isDesignHomeUser(user)) {
    return DESIGN_ALL_HUBS.has(role);
  }
  return CRM_ALL_HUBS.has(role);
}

export function canViewTeamHome(user?: User | null): boolean {
  if (!user) return false;
  const role = normRole(user);
  if (isDesignHomeUser(user)) {
    return DESIGN_TEAM.has(role);
  }
  return CRM_TEAM.has(role);
}

export function isFinanceDesignHome(user?: User | null): boolean {
  return DESIGN_FINANCE.has(normRole(user));
}

/** View modes exposed in Today / My Actions toggles for this user. */
export function homeViewModes(user?: User | null): HallwayHomeViewMode[] {
  if (!user) return ['my'];
  const modes: HallwayHomeViewMode[] = ['my'];
  if (canViewTeamHome(user)) modes.push('team');
  if (canViewAllHubsHome(user)) modes.push('all');
  return modes;
}

export function defaultHomeViewMode(user?: User | null): HallwayHomeViewMode {
  return 'my';
}

export function isCrmSalesContributor(user?: User | null): boolean {
  const role = normRole(user);
  return CRM_MY_ONLY.has(role) || CRM_TEAM.has(role) || CRM_ALL_HUBS.has(role);
}

export function isDesignContributor(user?: User | null): boolean {
  const role = normRole(user);
  return (
    DESIGN_MY.has(role) ||
    DESIGN_TEAM.has(role) ||
    DESIGN_ALL_HUBS.has(role) ||
    isDesignHomeUser(user)
  );
}