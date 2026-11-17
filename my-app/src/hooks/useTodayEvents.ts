'use client';

import { fetchTodayEvents } from '../lib/crmApi';
import { useHallwayQuery } from './useHallwayQuery';
import { useApp } from '../context/AppContext';
import type { HallwayHomeViewMode } from '../lib/hallwayHomePermissions';

export function useTodayEvents(scope: HallwayHomeViewMode = 'my') {
  const { currentUser } = useApp();
  const username =
    (currentUser as { username?: string } | null)?.username ||
    (typeof window !== 'undefined'
      ? window.localStorage.getItem('crm_login_username') || undefined
      : undefined);
  const { data, loading, error, refetch } = useHallwayQuery(
    (token, signal) =>
      fetchTodayEvents(token, signal, {
        scope,
        name: currentUser?.name,
        username,
        email: currentUser?.email,
        role: currentUser?.role,
        userId: currentUser?.id,
      }),
    [scope, currentUser?.name, username, currentUser?.email, currentUser?.role, currentUser?.id]
  );

  return { data, loading, error, refetch };
}
