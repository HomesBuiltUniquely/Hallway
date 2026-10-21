'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
} from '../../components/hallway/CorridorGate';
import DepartmentPills, {
  isSalesCrmDepartment,
} from '../../components/common/DepartmentPills';
import EmptyState from '../../components/common/EmptyState';
import TargetsPaceBoard, {
  type TargetPaceWindow,
  type TargetQuotaRow,
} from '../../components/targets/TargetsPaceBoard';
import { fetchInsightsDashboard } from '../../lib/crmApi';
import { formatInrToLakhsOrCrores } from '../../lib/crmAnnouncementsGenerator';
import { istYmd } from '../../lib/hallwayDisplay';
import type { DateRangeKey } from '../../types/crmInsights';

const BRANCH_TARGET_CONFIGS = [
  { id: 'JP_NAGAR', name: 'JP Nagar' },
  { id: 'SARJAPUR', name: 'Sarjapura' },
  { id: 'HBR', name: 'HBR Layout' },
] as const;

type RangeKind = 'this_month' | 'previous_month' | 'custom';

type AppliedRange =
  | { kind: 'this_month' }
  | { kind: 'previous_month' }
  | { kind: 'custom'; from: string; to: string };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseYmd(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function inclusiveDays(from: string, to: string) {
  const ms = parseYmd(to).getTime() - parseYmd(from).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function monthTitle(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function prettyDate(value: string) {
  return parseYmd(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function thisMonthParts() {
  const [y, m, d] = istYmd().split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(d, 1), dim);
  return { y, m, day, dim };
}

function previousMonthRange() {
  const { y, m } = thisMonthParts();
  const prev = new Date(y, m - 2, 1);
  const py = prev.getFullYear();
  const pm = prev.getMonth() + 1;
  const dim = new Date(py, pm, 0).getDate();
  return { from: ymd(py, pm, 1), to: ymd(py, pm, dim), y: py, m: pm, dim };
}

function paceFor(applied: AppliedRange): TargetPaceWindow {
  if (applied.kind === 'previous_month') {
    const prev = previousMonthRange();
    return {
      label: monthTitle(prev.y, prev.m),
      day: prev.dim,
      dim: prev.dim,
      left: 0,
      pacePct: 100,
      closed: true,
      showQuota: true,
    };
  }
  if (applied.kind === 'custom') {
    const dim = Math.max(inclusiveDays(applied.from, applied.to), 1);
    const today = istYmd();
    const closed = applied.to < today;
    const elapsedEnd = today < applied.to ? today : applied.to;
    const day = closed ? dim : Math.max(inclusiveDays(applied.from, elapsedEnd), 1);
    const left = Math.max(dim - day, 0);
    return {
      label: `${prettyDate(applied.from)} – ${prettyDate(applied.to)}`,
      day,
      dim,
      left,
      pacePct: closed ? 100 : (day / dim) * 100,
      closed,
      showQuota: false,
    };
  }
  const now = thisMonthParts();
  const left = Math.max(now.dim - now.day, 0);
  return {
    label: monthTitle(now.y, now.m),
    day: now.day,
    dim: now.dim,
    left: left === 0 ? 0 : left,
    pacePct: (now.day / now.dim) * 100,
    closed: false,
    showQuota: true,
  };
}

function TargetsInner() {
  const { activeDepartment } = useApp();
  const [rows, setRows] = useState<TargetQuotaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [applied, setApplied] = useState<AppliedRange>({ kind: 'this_month' });
  const [customOpen, setCustomOpen] = useState(false);
  const monthNow = thisMonthParts();
  const [draftFrom, setDraftFrom] = useState(() => ymd(monthNow.y, monthNow.m, 1));
  const [draftTo, setDraftTo] = useState(() => istYmd());
  const [draftError, setDraftError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const dateRange: DateRangeKey =
      applied.kind === 'previous_month'
        ? 'previous_month'
        : applied.kind === 'custom'
          ? 'custom'
          : 'current_month';
    try {
      const scopes = [
        { id: 'all', name: 'All Hubs (Overall)' },
        ...BRANCH_TARGET_CONFIGS.map((b) => ({ id: b.id, name: b.name })),
      ];
      const loaded = await Promise.all(
        scopes.map(async (scope) => {
          try {
            const data = await fetchInsightsDashboard({
              dateRange,
              dateFrom: applied.kind === 'custom' ? applied.from : undefined,
              dateTo: applied.kind === 'custom' ? applied.to : undefined,
              branchId: scope.id === 'all' ? undefined : scope.id,
              teamPeriod: 'monthly',
              funnelMode: 'inventory',
              pathFilter: 'all',
            });
            const forecast = data.revenueForecast;
            const currentInr = Number(forecast?.actual) || 0;
            const targetInr = Number(forecast?.target) || 0;
            const percentage = targetInr > 0 ? (currentInr / targetInr) * 100 : 0;
            return {
              id: `crm-target-${scope.id}-${forecast?.targetYearMonth || dateRange}`,
              label:
                scope.id === 'all'
                  ? 'MONTHLY GROSS BOOKING'
                  : `${scope.name.toUpperCase()} · MONTHLY GROSS BOOKING`,
              currentFormatted: formatInrToLakhsOrCrores(currentInr),
              targetFormatted: formatInrToLakhsOrCrores(targetInr),
              percentage,
              currentInr,
              targetInr,
              periodKey: forecast?.targetYearMonth || dateRange,
            } satisfies TargetQuotaRow;
          } catch {
            return null;
          }
        })
      );
      const next = loaded.filter((row) => row != null);
      if (next.length === 0) {
        throw new Error('Failed to load CRM targets');
      }
      setRows(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load CRM targets'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-ink dark:text-white sm:text-3xl">
          Operating Targets &amp; Quotas
        </h1>
        <p className="max-w-2xl text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
          Live gross booking vs the Hub quota from CRM. This month, previous month, or any dates you choose.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex p-1 bg-surface-muted dark:bg-slate-800 rounded-xl text-xs">
          {(
            [
              ['this_month', 'This month'],
              ['previous_month', 'Previous month'],
              ['custom', 'Custom range'],
            ] as const
          ).map(([id, label]) => {
            const selected = id === 'custom' ? customOpen || applied.kind === 'custom' : !customOpen && applied.kind === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'custom') {
                    setCustomOpen(true);
                    setDraftError('');
                    return;
                  }
                  setCustomOpen(false);
                  setDraftError('');
                  setApplied({ kind: id });
                }}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  selected
                    ? 'bg-white dark:bg-panel text-brand shadow-xs ring-1 ring-brand/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {customOpen && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draftFrom || !draftTo) {
                setDraftError('Choose a start and an end date.');
                return;
              }
              if (draftFrom > draftTo) {
                setDraftError('The start date has to be on or before the end date.');
                return;
              }
              setDraftError('');
              setApplied({ kind: 'custom', from: draftFrom, to: draftTo });
            }}
          >
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                From
              </span>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink dark:border-slate-700 dark:bg-panel dark:text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                To
              </span>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink dark:border-slate-700 dark:bg-panel dark:text-white"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-brand/20"
            >
              Apply
            </button>
          </form>
        )}
        {draftError ? <p className="text-xs font-semibold text-brand">{draftError}</p> : null}
      </div>

      <DepartmentPills />

      {!isSalesCrmDepartment(activeDepartment) ? (
        <EmptyState
          title="No targets for this department"
          description="Sales CRM quotas appear when Sales is selected."
        />
      ) : (
        <>
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3 text-xs text-brand">
              <span>{error.message}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
              >
                Retry
              </button>
            </div>
          )}
          <CorridorBanner error={error} />

          {loading ? (
            <CorridorSkeleton rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No targets yet"
              description="Branch quotas will appear here when CRM publishes monthly gross booking targets."
            />
          ) : (
            <TargetsPaceBoard rows={rows} window={paceFor(applied)} />
          )}
        </>
      )}
    </div>
  );
}

export default function TargetsPage() {
  return (
    <CorridorGate>
      <TargetsInner />
    </CorridorGate>
  );
}
