'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HallwayLeaderboardIndividual, HallwayLeaderboardTeam } from '../../types/hallway';
import { displayRate } from '../hallway/CorridorGate';

type MetricKey = 'gross' | 'count' | 'rate';

type IndividualProps = {
  mode: 'individual';
  items: HallwayLeaderboardIndividual[];
  onViewFull?: () => void;
};

type TeamProps = {
  mode: 'team';
  items: HallwayLeaderboardTeam[];
  onViewFull?: () => void;
};

type RackPerson = {
  id: string;
  name: string;
  gross: number;
  grossLabel: string;
  count: number;
  countLabel: string;
  rate: number;
  rateLabel: string;
};

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'gross', label: 'Gross bookings' },
  { key: 'count', label: 'Bookings' },
  { key: 'rate', label: 'Conversion %' },
];

const TEAM_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'gross', label: 'Gross bookings' },
  { key: 'count', label: 'Deals closed' },
  { key: 'rate', label: 'Win rate' },
];

const CYCLE_MS = 6000;

/** Parse ₹ amounts from CRM formatted strings when numeric INR is missing. */
function parseInr(formatted?: string | null, fallback?: number | null): number {
  if (typeof fallback === 'number' && fallback > 0) return fallback;
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

function formatInrGap(diff: number): string {
  if (diff >= 10_000_000) return `-₹${(diff / 10_000_000).toFixed(2)} Cr behind`;
  if (diff >= 100_000) return `-₹${(diff / 100_000).toFixed(2)}L behind`;
  return `-₹${Math.round(diff).toLocaleString('en-IN')} behind`;
}

function formatGap(leader: number, current: number, metric: MetricKey, mode: 'individual' | 'team') {
  const d = leader - current;
  if (d <= 0) return 'Leader';
  if (metric === 'gross') return formatInrGap(d);
  if (metric === 'count') {
    const unit = mode === 'team' ? (d === 1 ? 'deal' : 'deals') : d === 1 ? 'booking' : 'bookings';
    return `-${d} ${unit} behind`;
  }
  return `-${d.toFixed(1)} pts behind`;
}

/** Clean hub labels: JP_NAGAR – marfani hub → JP Nagar · Marfani Hub */
function formatDisplayName(raw: string, leadName?: string): string {
  const parts = String(raw || '')
    .split(/\s*[–—-]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  const titleCase = (s: string) =>
    s
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => {
        const lower = w.toLowerCase();
        if (['hbr', 'jp', 'mvp'].includes(lower)) return w.toUpperCase();
        if (lower === 'nagara' || lower === 'nagar') return 'Nagar';
        if (lower === 'sarjapur' || lower === 'sarjapura') return 'Sarjapura';
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');

  if (parts.length >= 2) {
    return `${titleCase(parts[0])} · ${titleCase(parts.slice(1).join(' '))}`;
  }
  const base = titleCase(parts[0] || raw || 'HUB');
  if (leadName?.trim()) return `${base} · ${titleCase(leadName)}`;
  return base;
}

function KeySvg({ leader }: { leader: boolean }) {
  const tone = leader ? '#e0b24a' : '#c9962b';
  return (
    <svg
      width="44"
      height="108"
      viewBox="0 0 44 108"
      aria-hidden
      className="shrink-0 max-sm:h-[84px] max-sm:w-[34px]"
    >
      <circle cx="22" cy="18" r="12" fill="none" stroke={tone} strokeWidth="6" />
      <rect x="19" y="30" width="6" height="64" rx="3" fill={tone} stroke={tone} />
      <rect x="25" y="70" width="12" height="6" fill={tone} stroke={tone} />
      <rect x="25" y="82" width="9" height="6" fill={tone} stroke={tone} />
    </svg>
  );
}

function toIndividuals(items: HallwayLeaderboardIndividual[]): RackPerson[] {
  return items.slice(0, 5).map((m) => {
    const gross = parseInr(m.revenueFormatted, m.revenue);
    return {
      id: m.id,
      name: formatDisplayName(m.name),
      gross,
      grossLabel: m.revenueFormatted || '₹0',
      count: Number(m.bookings) || 0,
      countLabel: `${Number(m.bookings) || 0} bookings`,
      rate: Number(m.conversionRate) || 0,
      rateLabel: displayRate(m.conversionRate),
    };
  });
}

function toTeams(items: HallwayLeaderboardTeam[]): RackPerson[] {
  return items.slice(0, 5).map((t) => {
    const gross = parseInr(t.totalRevenue, t.totalRevenueInr);
    return {
      id: t.id,
      name: formatDisplayName(t.teamName, t.leadName),
      gross,
      grossLabel: t.totalRevenue || '₹0',
      count: Number(t.dealsClosed) || 0,
      countLabel: `${Number(t.dealsClosed) || 0} deals`,
      rate: Number(t.winRate) || 0,
      rateLabel: displayRate(t.winRate),
    };
  });
}

function metricValue(p: RackPerson, key: MetricKey) {
  return p[key];
}

function metricLabel(p: RackPerson, key: MetricKey) {
  if (key === 'gross') return p.grossLabel;
  if (key === 'count') return p.countLabel;
  return p.rateLabel;
}

/**
 * HUB showroom key-rack — Top CRM sales (or squads) hanging on a rail.
 * Keys reorder when ranking metric cycles; layout stays even for 1–5 keys.
 */
export default function TopFiveShowroom(props: IndividualProps | TeamProps) {
  const mode = props.mode;
  const onViewFull = props.onViewFull;
  const metrics = mode === 'individual' ? METRICS : TEAM_METRICS;

  const people = useMemo(
    () => (mode === 'individual' ? toIndividuals(props.items) : toTeams(props.items)),
    [mode, props.items]
  );

  const n = people.length;
  const slotPct = n > 0 ? 100 / n : 20;

  const [metricIndex, setMetricIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [swingIds, setSwingIds] = useState<Set<string>>(new Set());
  const firstRender = useRef(true);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Reset metric when switching Individual ↔ Team
  useEffect(() => {
    setMetricIndex(0);
  }, [mode]);

  const metric = metrics[metricIndex].key;

  const ranked = useMemo(() => {
    return [...people].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  }, [people, metric]);

  const slotById = useMemo(() => {
    const map = new Map<string, number>();
    ranked.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [ranked]);

  const leader = ranked[0];

  const bumpMetric = useCallback(() => {
    setMetricIndex((i) => (i + 1) % metrics.length);
  }, [metrics.length]);

  useEffect(() => {
    if (reduceMotion.current || hovered || people.length === 0) return;
    const t = window.setInterval(bumpMetric, CYCLE_MS);
    return () => window.clearInterval(t);
  }, [hovered, people.length, bumpMetric]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduceMotion.current) return;
    setSwingIds(new Set(people.map((p) => p.id)));
    const t = window.setTimeout(() => setSwingIds(new Set()), 1100);
    return () => window.clearTimeout(t);
  }, [metricIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (people.length === 0) return null;

  const footerLabel =
    mode === 'individual'
      ? `Showing top ${n} sales executive${n === 1 ? '' : 's'}`
      : `Showing top ${n} sales squad${n === 1 ? '' : 's'}`;

  return (
    <div
      className="hub-keyrack overflow-hidden rounded-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={mode === 'individual' ? 'Top sales executives' : 'Top sales squads'}
    >
      <div className="flex flex-wrap gap-2 px-1 pb-3.5 pt-1" role="group" aria-label="Rank by">
        {metrics.map((m, i) => {
          const on = i === metricIndex;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => setMetricIndex(i)}
              className={`relative overflow-hidden rounded-full border px-4 py-1.5 text-[12.5px] font-bold transition-colors ${
                on
                  ? 'border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-panel dark:text-white'
                  : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {m.label}
              {on && !hovered && !reduceMotion.current && (
                <i
                  className="hub-keyrack-tab-fill absolute bottom-0 left-0 h-[3px] bg-brand"
                  key={`fill-${metricIndex}-${hovered}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="relative bg-[#f6e6dd] px-2 pb-6 pt-5 text-[#2b1d14] dark:bg-[#2a1f18]">
        <div
          className="mx-2.5 h-3.5 rounded-[7px] shadow-[0_3px_6px_rgba(80,40,20,0.25)]"
          style={{ background: 'linear-gradient(#e6c9a6,#c79a6b)' }}
        />
        <div className="relative mx-2.5 mt-[-4px] h-[230px] max-sm:h-[210px]">
          {people.map((p, stableIndex) => {
            const slot = slotById.get(p.id) ?? stableIndex;
            const isLeader = slot === 0;
            const rank = slot + 1;
            const swinging = swingIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`hub-keyrack-key absolute top-0 flex flex-col items-center px-0.5 ${
                  swinging ? 'hub-keyrack-swing' : ''
                }`}
                style={
                  {
                    width: `${slotPct}%`,
                    left: `calc(${slot} * ${slotPct}%)`,
                    ['--d' as string]: `${slot * 0.06}s`,
                  } as React.CSSProperties
                }
              >
                <i className="mt-0 block h-2.5 w-2.5 rounded-full bg-[#7a5230]" />
                <KeySvg leader={isLeader} />
                <div
                  className={`mt-0.5 w-[94%] max-w-[148px] rounded-[7px] px-1.5 py-2 text-center shadow-[0_5px_12px_rgba(80,40,20,0.2)] max-sm:px-1 max-sm:py-1.5 ${
                    isLeader ? 'bg-brand text-white' : 'bg-white text-[#2b1d14]'
                  }`}
                >
                  <span
                    className={`inline-grid h-6 w-6 place-items-center rounded-full border text-[11px] font-extrabold ${
                      rank === 1
                        ? 'border-amber-400 bg-amber-100 text-amber-900'
                        : rank === 2
                          ? 'border-slate-400 bg-slate-200 text-slate-700'
                          : rank === 3
                            ? 'border-orange-400 bg-orange-100 text-orange-900'
                            : 'border-[#d7c8bd] bg-white text-slate-600'
                    }`}
                  >
                    {rank}
                  </span>
                  <div
                    className="mt-1 line-clamp-2 text-[12px] font-extrabold leading-tight max-sm:text-[11px]"
                    title={p.name}
                  >
                    {p.name}
                  </div>
                  <div className="hub-keyrack-fade mt-0.5 font-mono text-xs font-bold max-sm:text-[10.5px]">
                    {metricLabel(p, metric)}
                  </div>
                  <small className="hub-keyrack-fade mt-0.5 block text-[10px] leading-snug opacity-80">
                    {leader
                      ? isLeader
                        ? 'Leader'
                        : formatGap(
                            metricValue(leader, metric),
                            metricValue(p, metric),
                            metric,
                            mode
                          )
                      : ''}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center px-5 py-3 text-xs text-slate-400">
        <span>{footerLabel}</span>
        {onViewFull && (
          <button
            type="button"
            onClick={onViewFull}
            className="ml-auto font-extrabold text-brand hover:text-brand-hover"
          >
            View full leaderboard
          </button>
        )}
      </div>
    </div>
  );
}
