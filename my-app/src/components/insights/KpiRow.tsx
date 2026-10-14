'use client';

import React from 'react';
import type { InsightsKpis, KpiTile } from '../../types/crmInsights';
import { formatInrCompact, formatNumber, formatPercent, signedNumber } from '../../lib/formatInr';
import { CardSkeleton } from './WidgetShell';

function changeLabel(tile: KpiTile, money: boolean) {
  if (tile.changePercent != null) {
    return `${signedNumber(tile.changePercent, 1)}%`;
  }
  if (tile.changeAbsolute != null) {
    return money ? signedNumber(tile.changeAbsolute, 0) : signedNumber(tile.changeAbsolute, 1);
  }
  return null;
}

function KpiCard({
  label,
  tile,
  money,
  percent,
}: {
  label: string;
  tile?: KpiTile;
  money?: boolean;
  percent?: boolean;
}) {
  if (!tile) {
    return <CardSkeleton className="h-24" />;
  }
  const display = percent
    ? formatPercent(tile.value, 1)
    : money
      ? formatInrCompact(tile.value)
      : formatNumber(tile.value, 0);
  const delta = changeLabel(tile, Boolean(money));
  const up = (tile.changePercent ?? tile.changeAbsolute ?? 0) >= 0;

  return (
    <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{display}</p>
      {delta && (
        <p className={`text-[11px] font-bold mt-1 ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
          {delta} vs prior window
        </p>
      )}
    </div>
  );
}

export function KpiRow({ kpis, loading }: { kpis?: InsightsKpis | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard label="Total leads" tile={kpis?.totalLeads} />
      <KpiCard label="Conversion" tile={kpis?.conversionPercent} percent />
      <KpiCard label="Token value" tile={kpis?.tokenValue} money />
      <KpiCard label="Booking value" tile={kpis?.bookingValue} money />
      <KpiCard label="Gross booking" tile={kpis?.grossBooking} money />
    </div>
  );
}
