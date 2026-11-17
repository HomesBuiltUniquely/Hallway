'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrmApiError, getStoredCrmToken } from '../lib/crmApi';

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

export function useHallwayQuery<T>(
  fetcher: (token: string, signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CrmApiError | Error | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = getStoredCrmToken() || '';
        const result = await fetcher(token, signal ?? new AbortController().signal);
        if (signal?.aborted) return;
        setData(result);
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return;
        setData(null);
        setError(err instanceof Error ? err : new Error('CRM request failed'));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    // fetcher is recreated by callers; deps capture the query identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...deps]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch, token: null as string | null };
}
