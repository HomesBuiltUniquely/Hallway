import { resolvePortalKind } from './hallwayRoleMatrix';
import { loadCrmScopeBundle, type CrmScopeBundle } from './hallwayScopeCrm';
import { loadDesignScopeBundle, type DesignScopeBundle } from './hallwayScopeDesign';
import { roleProfile } from './hallwayRoleMatrix';
import type { User } from '../types';
import type { HallwayHomeViewMode } from './hallwayRoleMatrix';

export type HallwayViewerContext = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  userId?: string | number | null;
  role?: string | null;
  department?: string | null;
};

export type ResolvedHallwayScope = {
  mode: HallwayHomeViewMode;
  portal: 'crm' | 'design';
  crm?: CrmScopeBundle;
  design?: DesignScopeBundle;
};

export function effectiveViewMode(
  user: User | HallwayViewerContext | null | undefined,
  requested?: HallwayHomeViewMode | null
): HallwayHomeViewMode {
  const profile = roleProfile(user as User | null);
  const allowed = new Set(profile.homeModes);
  if (requested && allowed.has(requested)) return requested;
  return profile.defaultMode;
}

export async function resolveHallwayScope(
  viewer: HallwayViewerContext | undefined,
  requestedMode?: HallwayHomeViewMode | null,
  branchId?: string | null
): Promise<ResolvedHallwayScope> {
  const userLike = viewer as User | null;
  const portal = resolvePortalKind(userLike);
  const mode = effectiveViewMode(userLike, requestedMode);

  if (portal === 'design') {
    const design = await loadDesignScopeBundle({
      userId: viewer?.userId,
      role: viewer?.role,
      name: viewer?.name,
      username: viewer?.username,
      mode,
    });
    return { mode, portal, design };
  }

  const crm = await loadCrmScopeBundle({
    userId: viewer?.userId,
    role: viewer?.role,
    mode,
    branchId,
    name: viewer?.name,
    username: viewer?.username,
    email: viewer?.email,
  });
  return { mode, portal, crm };
}