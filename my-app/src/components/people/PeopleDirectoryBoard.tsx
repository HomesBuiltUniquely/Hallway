'use client';

import React, { useMemo } from 'react';
import type { HallwayPerson } from '../../types/hallway';
import { PersonAvatar, displayRate } from '../hallway/CorridorGate';
import { formatPersonName } from '../../lib/hallwayDisplay';

type BranchKey = 'hbr' | 'sj' | 'jp' | 'other';

const BRANCH_ORDER: BranchKey[] = ['hbr', 'sj', 'jp', 'other'];

const BRANCH_META: Record<
  BranchKey,
  { label: string; floor: string; chip: string; card: string }
> = {
  hbr: {
    label: 'HBR Layout',
    floor: 'Brand corridor',
    chip: 'hub-people-chip-hbr',
    card: 'hub-people-card--hbr',
  },
  sj: {
    label: 'Sarjapura',
    floor: 'Sky corridor',
    chip: 'hub-people-chip-sj',
    card: 'hub-people-card--sj',
  },
  jp: {
    label: 'JP Nagar',
    floor: 'Gold corridor',
    chip: 'hub-people-chip-jp',
    card: 'hub-people-card--jp',
  },
  other: {
    label: 'Other hubs',
    floor: 'Shared floor',
    chip: 'hub-people-chip-default',
    card: 'hub-people-card--other',
  },
};

function branchKey(raw?: string | null): BranchKey {
  const b = (raw || '').toUpperCase();
  if (b.includes('JP')) return 'jp';
  if (b.includes('SARJAPUR')) return 'sj';
  if (b.includes('HBR')) return 'hbr';
  return 'other';
}

function formatRole(role: string): string {
  const r = (role || '').trim();
  if (!r) return 'Team member';
  if (/sales[_\s-]?manager/i.test(r) || r.toUpperCase() === 'SALES_MANAGER') return 'Sales Manager';
  if (/sales[_\s-]?executive/i.test(r) || r.toUpperCase() === 'SALES_EXECUTIVE') {
    return 'Sales Executive';
  }
  return r
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function PersonCard({ person, theme }: { person: HallwayPerson; theme: BranchKey }) {
  const meta = BRANCH_META[theme];
  const inactive =
    person.active === false && !person.name.toLowerCase().includes('inactive');
  const isManager = (person.role || '').toLowerCase().includes('manager');
  const displayName = formatPersonName(person.name);
  const role = formatRole(person.role);

  return (
    <article className={`hub-people-card group ${meta.card}`}>
      <div className="hub-people-card-accent" aria-hidden />

      <div className="relative z-[1] flex items-start gap-3.5">
        <div className="hub-people-avatar-ring shrink-0">
          <PersonAvatar name={displayName} src={person.avatar} size={52} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-[15px] font-extrabold tracking-tight text-ink dark:text-white">
              {displayName}
            </h3>
            {inactive && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8a7a6c] bg-[#efe6dc] dark:bg-slate-800 dark:text-slate-400">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] font-semibold text-[#7a6b5c] dark:text-slate-400">
            {role}
          </p>
          <span className={`hub-people-chip mt-2 inline-flex ${meta.chip}`}>{meta.label}</span>
        </div>
      </div>

      <div className="relative z-[1] mt-3.5 space-y-1 text-[11px] text-[#8a7a6c] dark:text-slate-500">
        {person.managerName && (
          <p>
            Reports to{' '}
            <span className="font-semibold text-[#5c4f42] dark:text-slate-300">
              {formatPersonName(person.managerName)}
            </span>
          </p>
        )}
        {person.email && <p className="truncate font-medium tracking-wide">{person.email}</p>}
      </div>

      <div className="hub-people-metrics relative z-[1] mt-4 grid grid-cols-2 gap-2">
        <div className="hub-people-metric">
          <span className="hub-people-metric-label">
            {isManager ? 'Squad YTD' : 'Bookings YTD'}
          </span>
          <span className="hub-people-metric-value">{person.revenueFormatted}</span>
        </div>
        <div className="hub-people-metric hub-people-metric-accent">
          <span className="hub-people-metric-label">
            {isManager ? 'Squad win rate' : 'Conversion'}
          </span>
          <span className="hub-people-metric-value hub-people-conv">
            {displayRate(person.conversionRate)}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function PeopleDirectoryBoard({
  people,
  statsWindow,
}: {
  people: HallwayPerson[];
  statsWindow?: string;
}) {
  const sections = useMemo(() => {
    const buckets: Record<BranchKey, HallwayPerson[]> = {
      hbr: [],
      sj: [],
      jp: [],
      other: [],
    };
    for (const person of people) {
      buckets[branchKey(person.branchId)].push(person);
    }
    return BRANCH_ORDER.map((key) => ({
      key,
      meta: BRANCH_META[key],
      people: buckets[key],
    })).filter((s) => s.people.length > 0);
  }, [people]);

  return (
    <div className="hub-people space-y-7">
      {sections.map((section) => (
        <section key={section.key} className={`hub-people-floor hub-people-floor--${section.key}`}>
          <header className="hub-people-floor-head mb-3 flex flex-wrap items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-70">
                {section.meta.floor}
              </p>
              <h2 className="text-base font-extrabold tracking-tight text-ink dark:text-white">
                {section.meta.label}
              </h2>
            </div>
            <span className={`hub-people-chip ${section.meta.chip}`}>
              {section.people.length} {section.people.length === 1 ? 'person' : 'people'}
            </span>
          </header>

          <div className="hub-people-board grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {section.people.map((person) => (
              <PersonCard key={person.id} person={person} theme={section.key} />
            ))}
          </div>
        </section>
      ))}

      <p className="px-1 text-[11px] text-[#9a8b7c] dark:text-slate-500">
        Portfolio figures are YTD ({statsWindow || '1y'}) from Hub CRM. Each hub floor uses its own
        corridor theme — HBR red, Sarjapura cyan, JP Nagar gold.
      </p>
    </div>
  );
}
