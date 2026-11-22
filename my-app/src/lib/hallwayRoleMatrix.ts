import type { User } from '../types';

export type HallwayHomeViewMode = 'my' | 'team' | 'all';
export type HallwayPortalKind = 'crm' | 'design';
export type TodayUiMode = 'full' | 'minimal' | 'hidden';
export type TodayDataSource = 'crm_appointments' | 'presales_callbacks' | 'design_calendar';

export type CrmActionsStrategy = 'fresh_leads' | 'oversight' | 'meeting_followups';

export type RoleProfile = {
  portal: HallwayPortalKind;
  todayUi: TodayUiMode;
  todayDataSource: TodayDataSource;
  homeModes: HallwayHomeViewMode[];
  defaultMode: HallwayHomeViewMode;
  showsPersonalToggle: boolean;
  showsScopeToggles: boolean;
  crmActionsStrategy: CrmActionsStrategy;
};

function normRole(user?: { role?: string; department?: string } | null): string {
  let r = String(user?.role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (r === 'TERRITORY_DESIGN_MANAGER') r = 'TERRITORIAL_DESIGN_MANAGER';
  return r;
}

function normDept(user?: { department?: string } | null): string {
  return String(user?.department || '')
    .trim()
    .toLowerCase();
}

export function resolvePortalKind(
  user?: Pick<User, 'role' | 'department'> | { role?: string; department?: string } | null
): HallwayPortalKind {
  if (!user) return 'crm';
  const dept = normDept(user);
  const role = normRole(user);
  if (role.includes('PRESALES') || role === 'SALES_EXECUTIVE' || role === 'SALES_MANAGER') return 'crm';
  if (dept === 'design') return 'design';
  if (
    role.includes('DESIGN') ||
    role.includes('DQC') ||
    role.includes('MMT') ||
    role === 'DQE' ||
    role === 'PROJECT_MANAGER' ||
    role === 'SENIOR_PROJECT_MANAGER' ||
    role === 'OPERATION_MANAGER' ||
    role === 'FINANCE' ||
    (role === 'ADMIN' && dept === 'design')
  ) {
    return 'design';
  }
  if (role.includes('SALES') || role === 'SUPER_ADMIN') return 'crm';
  return dept === 'design' ? 'design' : 'crm';
}

export function isPresalesRole(user?: { role?: string } | null): boolean {
  return normRole(user).includes('PRESALES');
}

const CRM_PROFILES: Record<string, Omit<RoleProfile, 'portal'>> = {
  SUPER_ADMIN: {
    todayUi: 'full',
    todayDataSource: 'crm_appointments',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'oversight',
  },
  ADMIN: {
    todayUi: 'full',
    todayDataSource: 'crm_appointments',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'oversight',
  },
  SALES_ADMIN: {
    todayUi: 'full',
    todayDataSource: 'crm_appointments',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'oversight',
  },
  SALES_MANAGER: {
    todayUi: 'full',
    todayDataSource: 'crm_appointments',
    homeModes: ['team'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    // Single scope (team) — no My Schedule / All Hubs strip.
    showsScopeToggles: false,
    // Oversight of team Fresh Leads — not personal lead follow-ups.
    crmActionsStrategy: 'oversight',
  },
  PRESALES_MANAGER: {
    todayUi: 'full',
    todayDataSource: 'presales_callbacks',
    homeModes: ['team'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  SALES_EXECUTIVE: {
    todayUi: 'full',
    todayDataSource: 'crm_appointments',
    homeModes: ['my'],
    defaultMode: 'my',
    showsPersonalToggle: true,
    // Personal-only scope — pill is informational; no rival toggles.
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  PRESALES_EXECUTIVE: {
    todayUi: 'full',
    todayDataSource: 'presales_callbacks',
    homeModes: ['my'],
    defaultMode: 'my',
    showsPersonalToggle: true,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
};

const DESIGN_PROFILES: Record<string, Omit<RoleProfile, 'portal'>> = {
  ADMIN: {
    todayUi: 'full',
    todayDataSource: 'design_calendar',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'oversight',
  },
  DEPUTY_GENERAL_MANAGER: {
    todayUi: 'full',
    todayDataSource: 'design_calendar',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'oversight',
  },
  TERRITORIAL_DESIGN_MANAGER: {
    todayUi: 'full',
    todayDataSource: 'design_calendar',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'oversight',
  },
  DESIGN_MANAGER: {
    todayUi: 'full',
    todayDataSource: 'design_calendar',
    homeModes: ['team'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  DQC_MANAGER: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['team', 'all'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: true,
    crmActionsStrategy: 'fresh_leads',
  },
  MMT_MANAGER: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['team', 'all'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: true,
    crmActionsStrategy: 'fresh_leads',
  },
  PROJECT_MANAGER: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['team'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  SENIOR_PROJECT_MANAGER: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['team', 'all'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: true,
    crmActionsStrategy: 'fresh_leads',
  },
  OPERATION_MANAGER: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['team', 'all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: true,
    crmActionsStrategy: 'fresh_leads',
  },
  ESCALATION_MANAGER: {
    todayUi: 'hidden',
    todayDataSource: 'design_calendar',
    homeModes: ['team', 'all'],
    defaultMode: 'team',
    showsPersonalToggle: false,
    showsScopeToggles: true,
    crmActionsStrategy: 'fresh_leads',
  },
  DESIGNER: {
    todayUi: 'full',
    todayDataSource: 'design_calendar',
    homeModes: ['my'],
    defaultMode: 'my',
    showsPersonalToggle: true,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  MMT_EXECUTIVE: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['my'],
    defaultMode: 'my',
    showsPersonalToggle: true,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  FINANCE: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['all'],
    defaultMode: 'all',
    showsPersonalToggle: false,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
  DQE: {
    todayUi: 'minimal',
    todayDataSource: 'design_calendar',
    homeModes: ['my'],
    defaultMode: 'my',
    showsPersonalToggle: true,
    showsScopeToggles: false,
    crmActionsStrategy: 'fresh_leads',
  },
};

const FALLBACK_CRM: RoleProfile = {
  portal: 'crm',
  todayUi: 'full',
  todayDataSource: 'crm_appointments',
  homeModes: ['my'],
  defaultMode: 'my',
  showsPersonalToggle: true,
  showsScopeToggles: true,
  crmActionsStrategy: 'meeting_followups',
};

const FALLBACK_DESIGN: RoleProfile = {
  portal: 'design',
  todayUi: 'minimal',
  todayDataSource: 'design_calendar',
  homeModes: ['my'],
  defaultMode: 'my',
  showsPersonalToggle: false,
  showsScopeToggles: false,
  crmActionsStrategy: 'fresh_leads',
};

export function roleProfile(user?: User | null): RoleProfile {
  const portal = resolvePortalKind(user);
  const role = normRole(user);
  const table = portal === 'design' ? DESIGN_PROFILES : CRM_PROFILES;
  const base = table[role] || (portal === 'design' ? FALLBACK_DESIGN : FALLBACK_CRM);
  return { portal, ...base };
}

export function todayUiMode(user?: User | null): TodayUiMode {
  return roleProfile(user).todayUi;
}

export function todayDataSource(
  user?: { role?: string; department?: string } | null
): TodayDataSource {
  return roleProfile(user as User | null).todayDataSource;
}

export function showsScopeToggles(user?: User | null): boolean {
  return roleProfile(user).showsScopeToggles;
}

export function crmActionsStrategy(
  user?: { role?: string | null; department?: string | null } | null
): CrmActionsStrategy {
  const role = String(user?.role || '');
  const department = String(user?.department || '');
  return roleProfile({ role, department } as User).crmActionsStrategy;
}