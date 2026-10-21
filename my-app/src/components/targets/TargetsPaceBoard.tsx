'use client';

import React, { useMemo } from 'react';
import { formatInrToLakhsOrCrores } from '../../lib/crmAnnouncementsGenerator';
import { istYmd } from '../../lib/hallwayDisplay';

export type TargetQuotaRow = {
  id: string;
  label: string;
  currentFormatted: string;
  targetFormatted: string;
  percentage: number;
  currentInr?: number;
  targetInr?: number;
  periodKey: string;
};

type PaceStatus = 'behind' | 'at_risk' | 'on_track';

type EnrichedHub = {
  id: string;
  name: string;
  isOverall: boolean;
  current: number;
  target: number;
  currentFmt: string;
  targetFmt: string;
  attainment: number;
  rem: number;
  needPerDay: number;
  curPerDay: number;
  forecast: number;
  forecastPct: number;
  status: PaceStatus;
  statusLabel: string;
};

function parseInr(formatted?: string | null, fallback?: number | null): number {
  if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }
  if (!formatted) return 0;
  const t = String(formatted).replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const cr = t.match(/([\d.]+)\s*Cr/i);
  if (cr) return parseFloat(cr[1]) * 10_000_000;
  const l = t.match(/([\d.]+)\s*L(?:akh)?s?/i);
  if (l) return parseFloat(l[1]) * 100_000;
  const bare = t.match(/₹\s*([\d.]+)/);
  if (bare) return parseFloat(bare[1]);
  return 0;
}

function monthPace() {
  const ymd = istYmd();
  const [y, m, d] = ymd.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(d, 1), dim);
  const left = Math.max(dim - day, 1);
  const pacePct = (day / dim) * 100;
  return { day, dim, left, pacePct, monthLabel: new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) };
}

function hubNameFrom(row: TargetQuotaRow): { name: string; isOverall: boolean } {
  const id = row.id.toLowerCase();
  const label = row.label;

  if (
    id.includes('all') ||
    id.includes('overall') ||
    /^monthly gross/i.test(label) ||
    /all hubs/i.test(label)
  ) {
    return { name: 'All Hubs', isOverall: true };
  }

  const branchMatch = label.match(
    /^(JP\s*NAGAR|SARJAPUR(?:A)?|HBR(?:\s*LAYOUT)?)\b/i
  );
  if (branchMatch) {
    let name = branchMatch[1].replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (/sarjapur/i.test(name) && !/a$/i.test(name)) name = 'Sarjapura';
    if (/jp/i.test(name)) name = 'JP Nagar';
    if (/hbr/i.test(name)) name = 'HBR Layout';
    return { name, isOverall: false };
  }

  if (id.includes('jp_nagar') || id.includes('jp-nagar')) return { name: 'JP Nagar', isOverall: false };
  if (id.includes('sarjapur')) return { name: 'Sarjapura', isOverall: false };
  if (id.includes('hbr')) return { name: 'HBR Layout', isOverall: false };

  const cleaned = label
    .replace(/·\s*MONTHLY GROSS BOOKING/i, '')
    .replace(/MONTHLY GROSS BOOKING/i, '')
    .trim();
  return { name: cleaned || 'Hub', isOverall: false };
}

function enrich(row: TargetQuotaRow, pace: ReturnType<typeof monthPace>): EnrichedHub {
  const { name, isOverall } = hubNameFrom(row);
  const current = parseInr(row.currentFormatted, row.currentInr);
  const target = parseInr(row.targetFormatted, row.targetInr) || 1;
  const attainment =
    row.percentage > 0
      ? row.percentage
      : target > 0
        ? (current / target) * 100
        : 0;
  const rem = Math.max(target - current, 0);
  const closed = pace.left <= 0;
  const needPerDay = closed ? 0 : rem / pace.left;
  const curPerDay = current / Math.max(pace.day, 1);
  const forecast = closed ? current : curPerDay * pace.dim;
  const forecastPct = target > 0 ? (forecast / target) * 100 : 0;
  const ratio = attainment / Math.max(pace.pacePct, 1);

  let status: PaceStatus = 'on_track';
  let statusLabel = 'On track';
  if (ratio < 0.5) {
    status = 'behind';
    statusLabel = 'Behind';
  } else if (ratio < 0.9) {
    status = 'at_risk';
    statusLabel = 'At risk';
  }

  return {
    id: row.id,
    name,
    isOverall,
    current,
    target,
    currentFmt: row.currentFormatted || formatInrToLakhsOrCrores(current),
    targetFmt: row.targetFormatted || formatInrToLakhsOrCrores(target),
    attainment,
    rem,
    needPerDay,
    curPerDay,
    forecast,
    forecastPct,
    status,
    statusLabel,
  };
}

function StatusChip({ status, label }: { status: PaceStatus; label: string }) {
  const cls =
    status === 'behind'
      ? 'border-brand/40 bg-brand-soft text-brand'
      : status === 'at_risk'
        ? 'border-amber-400/50 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
        : 'border-emerald-400/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

function PaceBar({ attainment, pacePct }: { attainment: number; pacePct: number }) {
  const fill = Math.max(0, Math.min(100, attainment));
  const tick = Math.max(0, Math.min(100, pacePct));
  return (
    <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/80">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all duration-700"
        style={{ width: `${fill}%` }}
      />
      <span
        className="absolute top-[-5px] bottom-[-5px] w-0.5 bg-ink dark:bg-white"
        style={{ left: `${tick}%` }}
        title={`Expected by today · ${tick.toFixed(0)}%`}
        aria-hidden
      />
    </div>
  );
}

export type TargetPaceWindow = {
  label: string;
  day: number;
  dim: number;
  left: number;
  pacePct: number;
  closed: boolean;
  showQuota: boolean;
};

export default function TargetsPaceBoard({
  rows,
  window,
}: {
  rows: TargetQuotaRow[];
  window?: TargetPaceWindow;
}) {
  const pace = useMemo(() => {
    if (!window) {
      const live = monthPace();
      return { ...live, closed: false, showQuota: true };
    }
    return {
      monthLabel: window.label,
      day: window.day,
      dim: window.dim,
      left: window.left,
      pacePct: window.pacePct,
      closed: window.closed,
      showQuota: window.showQuota,
    };
  }, [window]);

  const hubs = useMemo(() => rows.map((r) => enrich(r, pace)), [rows, pace]);

  const overall = hubs.find((h) => h.isOverall) || hubs[0];
  const branches = hubs.filter((h) => !h.isOverall);
  const cards = branches.length > 0 ? branches : hubs.filter((h) => h.id !== overall?.id);

  if (!overall) return null;

  const kpis = pace.showQuota
    ? [
        {
          label: 'Achieved',
          value: overall.currentFmt,
          hint: overall.name,
          warn: false,
        },
        {
          label: 'Target',
          value: overall.targetFmt,
          hint: 'Monthly gross booking',
          warn: false,
        },
        {
          label: 'Attainment',
          value: `${overall.attainment.toFixed(1)}%`,
          hint: pace.closed ? 'Month closed' : `Pace today ${pace.pacePct.toFixed(0)}%`,
          warn: false,
        },
        pace.closed
          ? {
              label: 'Shortfall',
              value: formatInrToLakhsOrCrores(overall.rem),
              hint: overall.rem <= 0 ? 'Quota met' : 'Under the month quota',
              warn: overall.rem > 0,
            }
          : {
              label: 'Needed per day',
              value: formatInrToLakhsOrCrores(overall.needPerDay),
              hint: `${pace.left} days left`,
              warn: true,
            },
        pace.closed
          ? {
              label: 'Final gross',
              value: overall.currentFmt,
              hint: 'Nothing further in this month',
              warn: false,
            }
          : {
              label: 'Month-end forecast',
              value: formatInrToLakhsOrCrores(overall.forecast),
              hint: `${overall.forecastPct.toFixed(0)}% of target`,
              warn: false,
            },
      ]
    : [
        {
          label: 'Achieved',
          value: overall.currentFmt,
          hint: 'Gross booking in this range',
          warn: false,
        },
      ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            {pace.monthLabel}
            {pace.showQuota && !pace.closed ? ` · day ${pace.day} of ${pace.dim}` : ''}
            {pace.closed ? ' · closed' : ''}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {pace.showQuota
              ? pace.closed
                ? 'Attainment is gross booking against that month’s quota.'
                : 'Status compares attainment with calendar pace. Tick on each bar = expected today.'
              : 'Gross booking for the dates you picked. A partial range is not scored against the full month quota.'}
          </p>
        </div>
      </div>

      {/* KPI strip — overall */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl border px-3.5 py-3 ${
              k.warn
                ? 'border-brand/35 bg-brand-soft dark:border-brand/40'
                : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-panel'
            }`}
          >
            <span
              className={`block text-[10px] font-bold uppercase tracking-wider ${
                k.warn ? 'text-brand' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {k.label}
            </span>
            <b
              className={`mt-1 block text-lg font-black tracking-tight ${
                k.warn ? 'text-brand' : 'text-ink dark:text-white'
              }`}
            >
              {k.value}
            </b>
            <em className="mt-0.5 block text-[10.5px] not-italic text-slate-400 dark:text-slate-500">
              {k.hint}
            </em>
          </div>
        ))}
      </div>

      {/* Hub status cards */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((hub) => (
            <article
              key={hub.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-panel sm:p-5"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-extrabold text-ink dark:text-white">{hub.name}</h3>
                {pace.showQuota && (
                  <span className="ml-auto">
                    <StatusChip status={hub.status} label={hub.statusLabel} />
                  </span>
                )}
              </div>

              {pace.showQuota ? (
                <>
                  <div className="mt-2 text-[26px] font-black tracking-tight text-ink dark:text-white">
                    {hub.attainment.toFixed(1)}%
                  </div>
                  <p className="mt-0.5 text-[13px] font-bold tracking-tight text-ink dark:text-slate-100">
                    <span className="text-brand dark:text-red-400">{hub.currentFmt}</span>
                    <span className="mx-1 font-semibold text-slate-400 dark:text-slate-500">of</span>
                    <span>{hub.targetFmt}</span>
                  </p>
                  <div className="mt-3">
                    <PaceBar attainment={hub.attainment} pacePct={pace.pacePct} />
                  </div>
                  {pace.closed ? (
                    <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {hub.rem <= 0
                        ? 'Quota met'
                        : `${formatInrToLakhsOrCrores(hub.rem)} short of quota`}
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Needs {formatInrToLakhsOrCrores(hub.needPerDay)} a day for {pace.left} days
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        Forecast {formatInrToLakhsOrCrores(hub.forecast)} ({hub.forecastPct.toFixed(0)}% of
                        target) · so far {formatInrToLakhsOrCrores(hub.curPerDay)}/day
                      </p>
                    </>
                  )}
                </>
              ) : (
                <div className="mt-2 text-[26px] font-black tracking-tight text-ink dark:text-white">
                  {hub.currentFmt}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* When only overall is in scope, still show its pace card */}
      {cards.length === 0 && (
        <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-panel">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-extrabold text-ink dark:text-white">{overall.name}</h3>
            <span className="ml-auto">
              <StatusChip status={overall.status} label={overall.statusLabel} />
            </span>
          </div>
          <div className="mt-2 text-[26px] font-black tracking-tight text-ink dark:text-white">
            {overall.attainment.toFixed(1)}%
          </div>
          <p className="mt-0.5 text-[13px] font-bold tracking-tight text-ink dark:text-slate-100">
            <span className="text-brand dark:text-red-400">{overall.currentFmt}</span>
            <span className="mx-1 font-semibold text-slate-400 dark:text-slate-500">of</span>
            <span>{overall.targetFmt}</span>
          </p>
          <div className="mt-3">
            <PaceBar attainment={overall.attainment} pacePct={pace.pacePct} />
          </div>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            {pace.closed
              ? overall.rem <= 0
                ? 'Quota met'
                : `${formatInrToLakhsOrCrores(overall.rem)} short of quota`
              : `Needs ${formatInrToLakhsOrCrores(overall.needPerDay)} a day for ${pace.left} days`}
          </p>
        </article>
      )}
    </div>
  );
}
