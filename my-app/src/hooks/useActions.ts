'use client';

import { fetchActions } from '../lib/crmApi';
import { useHallwayQuery } from './useHallwayQuery';
import { useApp } from '../context/AppContext';
import type { HallwayHomeViewMode } from '../lib/hallwayHomePermissions';

export function useActions(branchId?: string, scope: HallwayHomeViewMode = 'my') {
  const { currentUser } = useApp();
  const username =
    (currentUser as { username?: string } | null)?.username ||
    (typeof window !== 'undefined'
      ? window.localStorage.getItem('crm_login_username') || undefined
      : undefined);

  const { data, loading, error, refetch } = useHallwayQuery(
    (token, signal) =>
      fetchActions(token, branchId, signal, {
        scope,
        name: currentUser?.name,
        username,
        email: currentUser?.email,
        role: currentUser?.role,
        department: currentUser?.department,
        userId: currentUser?.id,
      }),
    [
      branchId ?? '',
      scope,
      currentUser?.name,
      username,
      currentUser?.email,
      currentUser?.role,
      currentUser?.department,
      currentUser?.id,
    ]
  );

  return { data, loading, error, refetch };
}