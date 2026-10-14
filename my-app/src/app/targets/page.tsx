'use client';

import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CorridorGate } from '../../components/hallway/CorridorGate';
import { CorridorScopeBar, useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import DepartmentPills, {
  isSalesCrmDepartment,
} from '../../components/common/DepartmentPills';
import { FeedPost } from '../../types';
import EmptyState from '../../components/common/EmptyState';

type QuotaCard = {
  id: string;
  label: string;
  currentFormatted: string;
  targetFormatted: string;
  percentage: number;
  periodKey: string;
};

const FALLBACK_CARDS: QuotaCard[] = [
  {
    id: 'crm-target-all-current',
    label: 'MONTHLY GROSS BOOKING',
    currentFormatted: '₹71.79L',
    targetFormatted: '₹4.80 Cr',
    percentage: 15,
    periodKey: 'sales_targets - 2026-10',
  },
  {
    id: 'crm-target-JP_NAGAR-current',
    label: 'JP NAGAR · MONTHLY GROSS BOOKING',
    currentFormatted: '₹31.82L',
    targetFormatted: '₹1.20 Cr',
    percentage: 26.5,
    periodKey: 'sales_targets - 2026-10',
  },
  {
    id: 'crm-target-SARJAPUR-current',
    label: 'SARJAPURA · MONTHLY GROSS BOOKING',
    currentFormatted: '₹24.40L',
    targetFormatted: '₹1.20 Cr',
    percentage: 20.3,
    periodKey: 'sales_targets - 2026-10',
  },
  {
    id: 'crm-target-HBR-current',
    label: 'HBR LAYOUT · MONTHLY GROSS BOOKING',
    currentFormatted: '₹15.45L',
    targetFormatted: '₹2.40 Cr',
    percentage: 6.4,
    periodKey: 'sales_targets - 2026-10',
  },
];

function toQuotaCard(post: FeedPost): QuotaCard | null {
  const q = post.quotaProgress;
  if (!q) return null;
  const label =
    q.label?.toUpperCase().includes('GROSS') || q.label?.toUpperCase().includes('TARGET')
      ? q.label.replace(/Target/i, '').trim().toUpperCase() || 'MONTHLY GROSS BOOKING'
      : 'MONTHLY GROSS BOOKING';
  return {
    id: post.id,
    label: label.includes('GROSS') ? label : `${label} · MONTHLY GROSS BOOKING`,
    currentFormatted: q.currentFormatted || `₹${q.current}`,
    targetFormatted: q.targetFormatted || `₹${q.target}`,
    percentage: Number(q.percentage) || 0,
    periodKey: `sales_targets - ${new Date().toISOString().slice(0, 7)}`,
  };
}

function TargetQuotaCard({ card }: { card: QuotaCard }) {
  const pct = Math.max(0, Math.min(100, card.percentage));
  return (
    <div className="bg-white dark:bg-panel border border-slate-200/90 dark:border-surface-warm/60 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {card.label}
      </p>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="text-3xl sm:text-4xl font-black text-ink dark:text-white tracking-tight font-mono">
          {card.currentFormatted}
        </p>
        <div className="text-right">
          <p className="text-lg sm:text-xl font-black text-ink dark:text-white">{Math.round(pct)}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Target: <span className="font-semibold text-accent-cyan">{card.targetFormatted}</span>
          </p>
        </div>
      </div>

      <div className="h-2.5 w-full bg-surface-muted dark:bg-surface-warm/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand via-brand-hover to-accent-cyan transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{card.periodKey}</p>
    </div>
  );
}

function TargetsInner() {
  const { branchId, setBranchId, salesManagerId, setSalesManagerId, options } = useCorridorScope();
  const { feedPosts, activeDepartment } = useApp();

  const cards = useMemo(() => {
    const dynamic = (feedPosts || [])
      .filter((p) => p.type === 'quota' || p.id?.startsWith('crm-target-'))
      .map(toQuotaCard)
      .filter((c): c is QuotaCard => Boolean(c));

    const source = dynamic.length > 0 ? dynamic : FALLBACK_CARDS;

    return source.filter((card) => {
      if (!branchId || branchId === 'all') return true;
      const b = branchId.toLowerCase();
      const id = card.id.toLowerCase();
      const label = card.label.toLowerCase();
      return (
        id.includes(b) ||
        label.includes(b) ||
        id.includes('overall') ||
        id.includes('all') ||
        label.includes('all hubs')
      );
    });
  }, [feedPosts, branchId]);

  return (
    <div className="space-y-6">
      {/* Page title — matches Operating Targets & Quotas reference */}
      <div className="pb-1 border-b border-slate-200/80 dark:border-surface-warm/50">
        <h1 className="text-2xl sm:text-3xl font-black text-ink dark:text-white tracking-tight">
          Operating Targets &amp; Quotas
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">
          Monthly gross booking vs Hub incentives target. Progress comes from CRM.
        </p>
      </div>

      <DepartmentPills />

      <CorridorScopeBar
        branchId={branchId}
        salesManagerId={salesManagerId}
        options={options}
        onBranch={setBranchId}
        onManager={setSalesManagerId}
      />

      {!isSalesCrmDepartment(activeDepartment) ? (
        <EmptyState
          title="No individual standings yet"
          description="Live sales velocity ranks will appear here when CRM returns people for this period."
        />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No targets matching scope"
          description="Select 'All branches' or adjust corridor filters to inspect branch quotas."
        />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <TargetQuotaCard key={card.id} card={card} />
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
