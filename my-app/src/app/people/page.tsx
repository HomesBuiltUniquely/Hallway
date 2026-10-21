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
} from '../../components/hallway/CorridorGate';
import DepartmentPills, {
  isSalesCrmDepartment,
} from '../../components/common/DepartmentPills';
import PeopleDirectoryBoard from '../../components/people/PeopleDirectoryBoard';
import { useApp } from '../../context/AppContext';
import { formatPersonName } from '../../lib/hallwayDisplay';
import type { HallwayPerson } from '../../types/hallway';

function isManagerRole(role: string): boolean {
  return /manager/i.test(role || '');
}

function personKey(name?: string | null): string {
  return formatPersonName(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** ₹1.04 Cr / ₹56.24L → rupees. Same shapes CRM prints on the directory cards. */
function parseInr(formatted?: string | null): number {
  if (!formatted) return 0;
  const t = String(formatted).replace(/,/g, '').trim();
  const cr = t.match(/([\d.]+)\s*Cr/i);
  if (cr) return parseFloat(cr[1]) * 10_000_000;
  const lakh = t.match(/([\d.]+)\s*L/i);
  if (lakh) return parseFloat(lakh[1]) * 100_000;
  const bare = t.match(/₹\s*([\d.]+)/);
  if (bare) return parseFloat(bare[1]);
  return 0;
}

function formatInr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    return `₹${lakhs.toFixed(2)}L`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function reportsTo(person: HallwayPerson, manager: HallwayPerson): boolean {
  if (String(person.id) === String(manager.id)) return false;
  if (person.managerId != null && String(person.managerId) !== '') {
    return String(person.managerId) === String(manager.id);
  }
  const managerName = personKey(person.managerName);
  const leadName = personKey(manager.name);
  return Boolean(managerName && leadName && managerName === leadName);
}

/** Manager cards show the squad that reports to them, not the manager's own ₹0 book. */
function withSquadMetrics(people: HallwayPerson[]): HallwayPerson[] {
  return people.map((person) => {
    if (!isManagerRole(person.role)) return person;
    const squad = people.filter((member) => reportsTo(member, person));
    if (squad.length === 0) return person;

    let revenue = 0;
    let weighted = 0;
    for (const member of squad) {
      const book = parseInr(member.revenueFormatted);
      const rate = Number(member.conversionRate) || 0;
      revenue += book;
      weighted += book * rate;
    }
    const ownBook = parseInr(person.revenueFormatted);
    if (ownBook > 0) {
      revenue += ownBook;
      weighted += ownBook * (Number(person.conversionRate) || 0);
    }
    const conversion =
      revenue > 0
        ? weighted / revenue
        : squad.reduce((sum, member) => sum + (Number(member.conversionRate) || 0), 0) / squad.length;

    return {
      ...person,
      revenueFormatted: formatInr(revenue),
      conversionRate: Math.round(conversion * 10) / 10,
    };
  });
}

const ROLE_FILTERS: { label: string; value?: HallwayPeopleRole }[] = [
  { label: 'All roles' },
  { label: 'Sales Managers', value: 'SALES_MANAGER' },
  { label: 'Sales Executives', value: 'SALES_EXECUTIVE' },
];

function PeopleInner() {
  const { activeDepartment } = useApp();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<HallwayPeopleRole | undefined>();
  const { data, loading, error } = usePeople();

  const people = useMemo(() => {
    let rows = data?.people || [];

    const testRegex = /\btest\b/i;
    rows = rows.filter((person) => {
      const name = String(person.name || '');
      if (
        testRegex.test(name) ||
        name.toLowerCase().includes('shalny') ||
        name.toLowerCase().includes('razi md') ||
        name.toLowerCase().includes('inactive')
      ) {
        return false;
      }
      return true;
    });

    rows = withSquadMetrics(rows);

    if (role) {
      rows = rows.filter((person) => {
        const r = (person.role || '').toUpperCase();
        if (role === 'SALES_MANAGER') {
          return r.includes('MANAGER');
        }
        if (role === 'SALES_EXECUTIVE') {
          return r.includes('EXECUTIVE') || (!r.includes('MANAGER') && !r.includes('ADMIN'));
        }
        return true;
      });
    }

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
  }, [data?.people, role, search]);

  const statsWindow = data?.statsWindow || '1y';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-tight text-ink dark:text-white sm:text-3xl">
            People &amp; Operating Directory
          </h1>
          <p className="max-w-xl text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
            Showroom floor roster — Hub consultants and floor leads, with YTD portfolio from CRM.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8b7c]" />
          <input
            type="text"
            placeholder="Search the floor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#ddcdc1] bg-[#faf6f1] py-2.5 pl-10 pr-4 text-xs text-ink placeholder-[#a89888] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 dark:border-slate-700 dark:bg-panel dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <DepartmentPills />

      {!isSalesCrmDepartment(activeDepartment) ? (
        <EmptyState
          title="No directory for this department"
          description="Select Sales to open the Hub people directory and role tabs."
        />
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto">
            {ROLE_FILTERS.map((filter) => {
              const active = role === filter.value;
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setRole(filter.value)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-brand text-white shadow-xs'
                      : 'border border-[#ddcdc1] bg-[#faf6f1] text-[#5c4f42] dark:border-slate-700 dark:bg-panel dark:text-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
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
            <PeopleDirectoryBoard people={people} statsWindow={statsWindow} />
          )}
        </>
      )}
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
