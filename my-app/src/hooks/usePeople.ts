'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPeople } from '../lib/crmApi';
import type { HallwayPeopleParams, HallwayPeopleResponse } from '../types/hallway';

// In-memory cache across component mounts & page navigation
const peopleMemoryCache = new Map<string, { data: HallwayPeopleResponse; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache

function getStoredPeopleCache(key: string): HallwayPeopleResponse | null {
  const mem = peopleMemoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CLIENT_CACHE_TTL_MS) {
    return mem.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(`hallway_people_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && Date.now() - (parsed.timestamp || 0) < CLIENT_CACHE_TTL_MS * 2) {
          peopleMemoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // ignore storage access errors
    }
  }
  return mem?.data || null;
}

function setStoredPeopleCache(key: string, data: HallwayPeopleResponse) {
  const entry = { data, timestamp: Date.now() };
  peopleMemoryCache.set(key, entry);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(`hallway_people_${key}`, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function usePeople(filters: HallwayPeopleParams = {}) {
  const branchKey = (filters.branchId ?? '').trim().toUpperCase();
  const cacheKey = branchKey || 'ALL';

  // Synchronous cache read for instantaneous 0ms display on repeat navigation
  const cachedData = getStoredPeopleCache(cacheKey);

  const [data, setData] = useState<HallwayPeopleResponse | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(!cachedData);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        const currentCache = getStoredPeopleCache(cacheKey);
        if (currentCache) {
          setData(currentCache);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await fetchPeople('', { branchId: filters.branchId }, controller.signal);
        if (!controller.signal.aborted && result?.people) {
          setData(result);
          setStoredPeopleCache(cacheKey, result);
          setError(null);
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        if (!data) setError(err instanceof Error ? err : new Error('Failed to load directory data'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, filters.branchId]
  );

  useEffect(() => {
    const hasCache = Boolean(getStoredPeopleCache(cacheKey));
    void load(hasCache);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load, cacheKey]);

  return { data, loading, error, refetch: () => load(false) };
}
