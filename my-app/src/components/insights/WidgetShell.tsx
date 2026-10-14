'use client';

import React from 'react';

export function WidgetShell({
  title,
  subtitle,
  loading,
  error,
  empty,
  emptyText = 'No data for this scope',
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs min-h-[220px] flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {loading ? (
        <div className="flex-1 space-y-3 animate-pulse">
          <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-4 py-6 text-center">
          {error}
        </div>
      ) : empty ? (
        <div className="flex-1 flex items-center justify-center text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-6 text-center">
          {emptyText}
        </div>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </section>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl ${className}`} />;
}
