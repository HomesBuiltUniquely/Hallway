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
  type TargetQuotaRow,
} from '../../components/targets/TargetsPaceBoard';
import { fetchTargets } from '../../lib/crmApi';
import { formatInrToLakhsOrCrores } from '../../lib/crmAnnouncementsGenerator';
import type { HallwayTargetCard } from '../../types/hallway';

const BRANCH_TARGET_CONFIGS = [
  { id: 'JP_NAGAR', name: 'JP Nagar' },
  { id: 'SARJAPUR', name: 'Sarjapura' },
  { id: 'HBR', name: 'HBR Layout' },
] as const;

type TargetCardWithBranch = HallwayTargetCard & {
  branchId?: string;
  branchName?: string;
};

function toRow(card: TargetCardWithBranch, index: number): TargetQuotaRow {
  const currentInr =
    typeof card.currentInr === 'number' && card.currentInr > 0 ? card.currentInr : undefined;
  const targetInr =
    typeof card.targetInr === 'number' && card.targetInr > 0 ? card.targetInr : undefined;
  const currentFormatted =
    currentInr != null
      ? formatInrToLakhsOrCrores(currentInr)
      : card.current || '₹0';
  const targetFormatted =
    targetInr != null
      ? formatInrToLakhsOrCrores(targetInr)
      : card.target || '₹0';

  const isOverall =
    !card.branchId ||
    card.branchId === 'all' ||
    /overall|all hubs/i.test(card.branchName || '') ||
    /overall|all hubs/i.test(card.title || '');

  const label = isOverall
    ? (card.title || 'MONTHLY GROSS BOOKING').toUpperCase()
    : `${(card.branchName || card.branchId || 'HUB').toUpperCase()} · ${(card.title || 'MONTHLY GROSS BOOKING').toUpperCase()}`;

  return {
    id: `crm-target-${card.branchId || 'all'}-${card.yearMonth || 'current'}-${index}`,
    label,
    currentFormatted,
    targetFormatted,
    percentage: Number(card.progress) || 0,
    currentInr,
    targetInr,
    periodKey: card.yearMonth
      ? `sales_targets - ${card.yearMonth}`
      : `sales_targets - ${new Date().toISOString().slice(0, 7)}`,
  };
}

function TargetsInner() {
  const { activeDepartment } = useApp();
  const [rows, setRows] = useState<TargetQuotaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overallRes = await fetchTargets('', {});
      const overallCards = (overallRes?.cards || []).map((card, i) =>
        toRow({ ...card, branchId: 'all', branchName: 'All Hubs (Overall)' }, i)
      );

      const branchArrays = await Promise.all(
        BRANCH_TARGET_CONFIGS.map(async (b) => {
          try {
            const res = await fetchTargets('', { branchId: b.id });
            return (res?.cards || []).map((card, i) =>
              toRow({ ...card, branchId: b.id, branchName: b.name }, i + 10)
            );
          } catch {
            return [] as TargetQuotaRow[];
          }
        })
      );

      const branchRows = branchArrays.flat();
      // Prefer one overall card, then one card per branch (highest progress if duplicates)
      const byBranch = new Map<string, TargetQuotaRow>();
      for (const row of [...overallCards, ...branchRows]) {
        const key = row.id.includes('-all-')
          ? 'all'
          : row.label.split('·')[0]?.trim().toUpperCase() || row.id;
        const prev = byBranch.get(key);
        if (!prev || row.percentage >= prev.percentage) byBranch.set(key, row);
      }

      const ordered: TargetQuotaRow[] = [];
      const all = byBranch.get('all') || overallCards[0];
      if (all) ordered.push(all);
      for (const b of BRANCH_TARGET_CONFIGS) {
        const hit = byBranch.get(b.name.toUpperCase()) || byBranch.get(b.id);
        if (hit && hit !== all) ordered.push(hit);
      }
      // Any remaining CRM cards not matched above
      for (const row of byBranch.values()) {
        if (!ordered.includes(row)) ordered.push(row);
      }

      setRows(ordered);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load CRM targets'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
          Live monthly gross booking vs Hub target from CRM — pace, forecast, and which corridor
          needs attention.
        </p>
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
            <TargetsPaceBoard rows={rows} />
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
