'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { usePeople } from '../../hooks/usePeople';
import type { HallwayPeopleRole } from '../../types/hallway';
import EmptyState from '../../components/common/EmptyState';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
  PersonAvatar,
  displayRate,
} from '../../components/hallway/CorridorGate';
import { CorridorScopeBar, useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import DepartmentPills from '../../components/common/DepartmentPills';

const ROLE_FILTERS: { label: string; value?: HallwayPeopleRole }[] = [
  { label: 'All roles' },
  { label: 'Sales Managers', value: 'SALES_MANAGER' },
  { label: 'Sales Executives', value: 'SALES_EXECUTIVE' },
];

function PeopleInner() {
  const { branchId, setBranchId, options } = useCorridorScope();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<HallwayPeopleRole | undefined>();
  const { data, loading, error } = usePeople({ branchId, role });

  const people = useMemo(() => {
    const rows = data?.people || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (person) =>
        person.name.toLowerCase().includes(q) ||
        person.role.toLowerCase().includes(q) ||
        (person.branchId || '').toLowerCase().includes(q) ||
        (person.email || '').toLowerCase().includes(q) ||
        (person.managerName || '').toLowerCase().includes(q)
    );
  }, [data?.people, search]);

  const statsWindow = data?.statsWindow || '1y';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            People & Operating Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live Hub directory. Gross bookings and conversion are YTD values from CRM.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search directory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Department Filter Pills */}
      <DepartmentPills />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <CorridorScopeBar
          branchId={branchId}
          options={options}
          onBranch={setBranchId}
          showManager={false}
        />
        <div className="flex items-center gap-2 overflow-x-auto">
          {ROLE_FILTERS.map((filter) => {
            const active = role === filter.value;
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setRole(filter.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#0D1829] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <CorridorBanner error={error} />

      {loading ? (
        <CorridorSkeleton rows={6} />
      ) : people.length === 0 ? (
        <EmptyState
          title="No directory members yet"
          description="People will appear here when CRM returns directory rows for this scope."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map((person) => {
            const inactiveSuffix =
              person.active === false && !person.name.toLowerCase().includes('inactive')
                ? ' (Inactive)'
                : '';
            return (
              <div
                key={person.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-3">
                  <PersonAvatar name={person.name} src={person.avatar} size={48} />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {person.name}
                      {inactiveSuffix}
                    </h3>
                    <p className="text-xs text-slate-400">{person.role}</p>
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-1">
                      {person.branchId || '—'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  {person.managerName && <p>Manager: {person.managerName}</p>}
                  {person.email && <p className="font-mono truncate">{person.email}</p>}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500">{person.revenueFormatted} YTD</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {displayRate(person.conversionRate)} conversion
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Stats are YTD ({statsWindow}) from Hub. Inactive people keep the suffix from CRM when present.
      </p>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <CorridorGate>
      <PeopleInner />
    </CorridorGate>
  );
}
