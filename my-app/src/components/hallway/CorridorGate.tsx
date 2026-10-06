'use client';

import React from 'react';
import { CrmApiError } from '../../lib/crmApi';
import UserAvatar from '../common/UserAvatar';

export function corridorErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof CrmApiError) {
    if (error.status === 401) return error.message || 'CRM authorization failed.';
    if (error.status === 403) return error.message || 'You do not have access to this corridor.';
    if (error.status === 400) return error.message || 'Bad request.';
    if (error.status === 503) {
      return error.message || 'Hub CRM is unreachable. Confirm https://hows.hubinterior.com is available.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'CRM request failed';
}

export function CorridorGate({ children }: { children: React.ReactNode; title?: string; description?: string; error?: unknown }) {
  return <>{children}</>;
}

export function CorridorBanner({ error }: { error: unknown }) {
  const message = corridorErrorMessage(error);
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs font-semibold text-rose-600">
      {message}
    </div>
  );
}

export function CorridorSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      ))}
    </div>
  );
}

export function PersonAvatar({
  name,
  src,
  size = 36,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  return <UserAvatar name={name} avatar={src} size={size} />;
}

export function displayRate(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  return `${value}%`;
}
