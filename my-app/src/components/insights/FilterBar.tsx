'use client';

import React from 'react';
import type {
  DateRangeKey,
  FilterPerson,
  FunnelMode,
  InsightsFilterOptions,
  InsightsFilterParams,
  PathFilter,
  TeamPeriod,
} from '../../types/crmInsights';

const FALLBACK_DATES: { id: DateRangeKey; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'current_month', label: 'This month' },
  { id: '3m', label: 'Last 3 months' },
  { id: '6m', label: 'Last 6 months' },
  { id: '1y', label: 'Last 1 year' },
  { id: 'previous_month', label: 'Previous month' },
  { id: 'custom', label: 'Custom range' },
];

const FUNNEL_MODES: { id: FunnelMode; label: string }[] = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'passages', label: 'Passages' },
  { id: 'created_cohort', label: 'Created cohort' },
];

const PATHS: { id: PathFilter; label: string }[] = [
  { id: 'all', label: 'All paths' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'hold', label: 'Hold' },
];

const selectClass =
  'px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 min-w-[140px]';

export function FilterBar({
  filters,
  options,
  isAdmin,
  isManager,
  isExecutive,
  onChange,
}: {
  filters: InsightsFilterParams;
  options: InsightsFilterOptions | null;
  isAdmin: boolean;
  isManager: boolean;
  isExecutive: boolean;
  onChange: (patch: Partial<InsightsFilterParams>) => void;
}) {
  const dateOptions = FALLBACK_DATES.map((preset) => {
    const fromApi = options?.datePresets?.find((p) => p.id === preset.id);
    return { id: preset.id, label: fromApi?.label || preset.label };
  });

  const executives = (options?.salesExecutives || []).filter((exec) => {
    if (!filters.salesManagerId) return true;
    return exec.managerId === filters.salesManagerId;
  });

  const lockManager = isManager || isExecutive;
  const hideManager = isExecutive;

  return (
    <div className="bg-white dark:bg-[#0D1829] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Date range
          </span>
          <select
            className={selectClass}
            value={filters.dateRange}
            onChange={(e) => onChange({ dateRange: e.target.value as DateRangeKey })}
          >
            {dateOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {filters.dateRange === 'custom' && (
          <>
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                From
              </span>
              <input
                type="date"
                className={selectClass}
                value={filters.dateFrom || ''}
                onChange={(e) => onChange({ dateFrom: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                To
              </span>
              <input
                type="date"
                className={selectClass}
                value={filters.dateTo || ''}
                onChange={(e) => onChange({ dateTo: e.target.value })}
              />
            </label>
          </>
        )}

        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Branch
          </span>
          <select
            className={selectClass}
            value={filters.branchId || ''}
            onChange={(e) =>
              onChange({
                branchId: e.target.value || undefined,
                salesManagerId: undefined,
                salesExecutiveId: undefined,
              })
            }
          >
            <option value="">All branches</option>
            {(options?.branches || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        {!hideManager && (
          <label className="space-y-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Manager
            </span>
            <select
              className={selectClass}
              disabled={lockManager && !isAdmin}
              value={filters.salesManagerId ?? ''}
              onChange={(e) =>
                onChange({
                  salesManagerId: e.target.value ? Number(e.target.value) : undefined,
                  salesExecutiveId: undefined,
                })
              }
            >
              {isAdmin && <option value="">All managers</option>}
              {(options?.salesManagers || []).map((m: FilterPerson) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Executive
          </span>
          <select
            className={selectClass}
            disabled={isExecutive}
            value={filters.salesExecutiveId ?? ''}
            onChange={(e) =>
              onChange({
                salesExecutiveId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            {!isExecutive && <option value="">All executives</option>}
            {executives.map((exec) => (
              <option key={exec.id} value={exec.id}>
                {exec.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Funnel mode
          </span>
          <select
            className={selectClass}
            value={filters.funnelMode}
            onChange={(e) => onChange({ funnelMode: e.target.value as FunnelMode })}
          >
            {FUNNEL_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Path filter
          </span>
          <select
            className={selectClass}
            value={filters.pathFilter}
            onChange={(e) => onChange({ pathFilter: e.target.value as PathFilter })}
          >
            {PATHS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Team period
          </span>
          <select
            className={selectClass}
            value={filters.teamPeriod}
            onChange={(e) => onChange({ teamPeriod: e.target.value as TeamPeriod })}
          >
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>
        </label>
      </div>
    </div>
  );
}
