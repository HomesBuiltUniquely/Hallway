import type { User } from '../types';
import {
  roleProfile,
  todayUiMode,
  resolvePortalKind,
  showsScopeToggles as matrixShowsScopeToggles,
  type HallwayHomeViewMode,
} from './hallwayRoleMatrix';

export type { HallwayHomeViewMode };

export function isDesignHomeUser(user?: User | null): boolean {
  return resolvePortalKind(user) === 'design';
}

export function canViewAllHubsHome(user?: User | null): boolean {
  return roleProfile(user).homeModes.includes('all');
}

export function canViewTeamHome(user?: User | null): boolean {
  return roleProfile(user).homeModes.includes('team');
}

export function isFinanceDesignHome(user?: User | null): boolean {
  const role = (user?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  return role === 'FINANCE' && isDesignHomeUser(user);
}

/** View modes exposed in Today / My Actions toggles for this user. */
export function homeViewModes(user?: User | null): HallwayHomeViewMode[] {
  return roleProfile(user).homeModes;
}

export function defaultHomeViewMode(user?: User | null): HallwayHomeViewMode {
  return roleProfile(user).defaultMode;
}

export function showsPersonalHomeToggle(user?: User | null): boolean {
  return roleProfile(user).showsPersonalToggle;
}

export function showsScopeToggleStrip(user?: User | null): boolean {
  return matrixShowsScopeToggles(user);
}

export function todayCardUi(user?: User | null): 'full' | 'minimal' | 'hidden' {
  return todayUiMode(user);
}

export function isCrmSalesContributor(user?: User | null): boolean {
  return resolvePortalKind(user) === 'crm';
}

export function isDesignContributor(user?: User | null): boolean {
  return resolvePortalKind(user) === 'design';
}