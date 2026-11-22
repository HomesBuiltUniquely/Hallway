'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrmApiError, getStoredCrmToken } from '../lib/crmApi';

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

function getSessionCache<T>(key: string | null): T | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setSessionCache<T>(key: string | null, value: T): void {
  if (!key || typeof window === 'undefined' || !value) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota or storage disabled
  }
}

export function useHallwayQuery<T>(
  fetcher: (token: string, signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  enabled = true
) {
  const cacheKey = typeof window !== 'undefined'
    ? `hallway_swr_${deps.map((d) => String(d ?? '')).join('_')}`
    : null;

  const [data, setData] = useState<T | null>(() => getSessionCache<T>(cacheKey));
  const [loading, setLoading] = useState<boolean>(() => (getSessionCache<T>(cacheKey) ? false : true));
  const [error, setError] = useState<CrmApiError | Error | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) {
        setData(null);
        setLoading(false);
        return;
      }
      // If we already have cached data, don't flash loading skeleton during revalidation
      if (!getSessionCache<T>(cacheKey)) {
        setLoading(true);
      }
      setError(null);
      try {
        const token = getStoredCrmToken() || '';
        const result = await fetcher(token, signal ?? new AbortController().signal);
        if (signal?.aborted) return;
        setData(result);
        setSessionCache(cacheKey, result);
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err : new Error('CRM request failed'));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    // fetcher is recreated by callers; deps capture the query identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, cacheKey, ...deps]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch, token: null as string | null };
}
