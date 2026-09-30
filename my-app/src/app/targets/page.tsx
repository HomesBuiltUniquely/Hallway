'use client';

import React from 'react';
import { useTargets } from '../../hooks/useTargets';
import EmptyState from '../../components/common/EmptyState';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
} from '../../components/hallway/CorridorGate';
import { CorridorScopeBar, useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import DepartmentPills from '../../components/common/DepartmentPills';
import { progressWidth } from '../../lib/hallwayDisplay';

function TargetsInner() {
  const { branchId, setBranchId, salesManagerId, setSalesManagerId, options, auth } =
    useCorridorScope();
  const { data, loading, error } = useTargets({
    branchId,
    salesManagerId,
    salesExecutiveId: auth.isExecutive ? auth.user?.id : undefined,
  });
  const cards = data?.cards || [];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Operating Targets & Quotas
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monthly gross booking vs Hub incentives target. Progress comes from CRM.
        </p>
      </div>

      {/* Department Filter Pills */}
      <DepartmentPills />

      <CorridorScopeBar
        branchId={branchId}
        salesManagerId={salesManagerId}
        options={options}
        onBranch={setBranchId}
        onManager={setSalesManagerId}
        showManager={!auth.isExecutive}
      />

      <CorridorBanner error={error} />

      {loading ? (
        <CorridorSkeleton rows={4} />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No operating targets yet"
          description="Quota and pacing cards will appear here when CRM returns target rows."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card, idx) => (
            <div
              key={`${card.title}-${card.yearMonth || idx}`}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {card.title}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {card.progress}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                  {card.current}
                </span>
                <span className="text-xs text-slate-400">Target: {card.target}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                  style={{ width: progressWidth(card.progress) }}
                />
              </div>
              {(card.targetSource || card.yearMonth) && (
                <p className="text-[11px] text-slate-400">
                  {[card.targetSource, card.yearMonth].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
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
