'use client';

import React, { useEffect, useState } from 'react';
import { fetchInsightsFilterOptions } from '../../lib/crmApi';
import type { InsightsFilterOptions } from '../../types/crmInsights';

const selectClass =
  'px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100';

export function useCorridorScope() {
  const [branchId, setBranchId] = useState<string | undefined>();
  const [salesManagerId, setSalesManagerId] = useState<number | undefined>();
  const [options, setOptions] = useState<InsightsFilterOptions | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchInsightsFilterOptions(undefined, null, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOptions(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions(null);
      });
    return () => controller.abort();
  }, []);

  return { branchId, setBranchId, salesManagerId, setSalesManagerId, options, auth: { isExecutive: false, user: undefined as { id?: number } | undefined } };
}

export function CorridorScopeBar({
  branchId,
  salesManagerId,
  options,
  onBranch,
  onManager,
  showManager = true,
}: {
  branchId?: string;
  salesManagerId?: number;
  options: InsightsFilterOptions | null;
  onBranch: (branchId?: string) => void;
  onManager?: (salesManagerId?: number) => void;
  showManager?: boolean;
}) {
  const branches = (options?.branches || []).map((branch) => {
    const rawId = branch.id?.trim().toUpperCase();
    if (rawId === 'SARJAPUR' || rawId === 'SARJAPURA') {
      return { id: 'SARJAPUR', name: 'Sarjapura' };
    }
    if (rawId === 'JP_NAGAR') {
      return { id: 'JP_NAGAR', name: 'JP Nagar' };
    }
    if (rawId === 'HBR') {
      return { id: 'HBR', name: 'HBR Layout' };
    }
    return branch;
  });
  const managers = options?.salesManagers || [];

  const normalizedSelectedBranch =
    branchId?.trim().toUpperCase() === 'SARJAPURA' ? 'SARJAPUR' : (branchId || '');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={normalizedSelectedBranch}
        onChange={(e) => onBranch(e.target.value || undefined)}
      >
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name || branch.id}
          </option>
        ))}
      </select>
      {showManager && onManager && (
        <select
          className={selectClass}
          value={salesManagerId != null ? String(salesManagerId) : ''}
          onChange={(e) =>
            onManager(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">All managers</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
