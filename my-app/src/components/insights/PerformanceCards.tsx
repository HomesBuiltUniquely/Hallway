'use client';

import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { ConversionCard, PerformanceCards, PerformanceTone } from '../../types/crmInsights';
import { CardSkeleton } from './WidgetShell';

const toneText: Record<PerformanceTone, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  red: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-700 dark:text-slate-200',
};

const toneBar: Record<PerformanceTone, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  neutral: 'bg-slate-400',
};

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

function ConversionTile({ card }: { card: ConversionCard }) {
  const tone = card.tone || 'neutral';
  return (
    <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
        {card.title}
      </p>
      <div className="flex items-end justify-between gap-2">
        <span className={`text-3xl font-black tracking-tight ${toneText[tone]}`}>
          {card.valuePercent}%
        </span>
        <span className={`text-[11px] font-bold flex items-center gap-1 ${toneText[tone]}`}>
          <TrendIcon trend={card.trend} />
          {card.varianceLabel}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">Target: {card.targetPercent}%</p>
      <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
        <div
          className={`h-full rounded-full ${toneBar[tone]}`}
          style={{ width: `${Math.min(100, card.valuePercent)}%` }}
        />
        <span
          className="absolute top-0 bottom-0 w-0.5 bg-slate-900/40 dark:bg-white/50"
          style={{ left: `${Math.min(100, card.targetPercent)}%` }}
        />
      </div>
    </div>
  );
}

export function PerformanceCards({
  data,
  loading,
}: {
  data?: PerformanceCards | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-36" />
        ))}
      </div>
    );
  }

  const cards = data?.cards;
  const booking = cards?.bookingValue;
  const pipeline = cards?.weightedPipeline;
  const leadToMeeting = cards?.leadToMeeting;
  const meetingToBooking = cards?.meetingToBooking;
  if (!booking || !pipeline || !leadToMeeting || !meetingToBooking) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
          {booking.title}
        </p>
        <p className={`text-3xl font-black tracking-tight ${toneText[booking.tone]}`}>
          {booking.valueLabel}
        </p>
        <p className="text-[11px] text-slate-500 mt-2">Target: {booking.targetLabel}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${toneBar[booking.tone]}`}
              style={{ width: `${Math.min(100, booking.progressRatio * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
            {booking.completionPercent}%
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
          {pipeline.title}
        </p>
        <p className={`text-3xl font-black tracking-tight ${toneText[pipeline.tone]}`}>
          {pipeline.valueLabel}
        </p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-500">
            Rem. target {pipeline.remainingTargetLabel}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full ${
              pipeline.tone === 'green'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Coverage {pipeline.coverageLabel}
          </span>
        </div>
      </div>

      <ConversionTile card={leadToMeeting} />
      <ConversionTile card={meetingToBooking} />
    </div>
  );
}
