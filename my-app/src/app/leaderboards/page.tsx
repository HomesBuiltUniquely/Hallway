'use client';

import React, { useMemo, useState } from 'react';
import { ChevronRight, Search, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import type { HallwayTrend, LeaderboardPeriod } from '../../types/hallway';
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
import { useApp } from '../../context/AppContext';
import { progressWidth } from '../../lib/hallwayDisplay';

const PERIODS: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'MTD', value: 'mtd' },
  { label: 'QTD', value: 'qtd' },
  { label: 'All-Time', value: 'all_time' },
];

const DEPARTMENTS = [
  'All Departments',
  'Sales',
  'Design',
  'Operations',
  'HR',
  'Finance',
] as const;

function TrendMark({ trend }: { trend?: HallwayTrend }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return null;
}

function LeaderboardsInner() {
  const { activeDepartment, setActiveDepartment } = useApp();
  const { branchId, setBranchId, salesManagerId, setSalesManagerId, options } = useCorridorScope();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const [view, setView] = useState<'Individual' | 'Team'>('Individual');
  const [localSearch, setLocalSearch] = useState('');
  const [showFullRosterModal, setShowFullRosterModal] = useState(false);

  const { data, loading, error } = useLeaderboard(period, { branchId, salesManagerId });

  const individuals = useMemo(() => {
    let rows = data?.individuals || [];

    // Filter test accounts, Shalny, and inactive users
    const testRegex = /\btest\b/i;
    rows = rows.filter((row) => {
      const name = String(row.name || '');
      if (testRegex.test(name) || name.toLowerCase().includes('shalny') || name.toLowerCase().includes('inactive')) {
        return false;
      }
      return true;
    });

    if (activeDepartment && activeDepartment !== 'All Departments') {
      rows = rows.filter((row) => {
        if (!row.department) {
          return activeDepartment === 'Sales';
        }
        return row.department.toLowerCase() === activeDepartment.toLowerCase();
      });
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          (row.role || '').toLowerCase().includes(q)
      );
    }

    // Sort strictly by highest gross booking value (revenue) descending, then bookings count
    const sorted = [...rows].sort((a, b) => {
      const revA = Number(a.revenue) || 0;
      const revB = Number(b.revenue) || 0;
      if (revB !== revA) return revB - revA;
      return (Number(b.bookings) || 0) - (Number(a.bookings) || 0);
    });

    // Only assign numbered podium ranks (1, 2, 3...) to members with positive revenue or bookings.
    // If a member has 0 revenue and 0 bookings, rank is null (displayed as '-').
    let currentRank = 1;
    return sorted.map((member) => {
      const hasBooking = (Number(member.revenue) || 0) > 0 || (Number(member.bookings) || 0) > 0;
      return {
        ...member,
        rank: hasBooking ? currentRank++ : null,
      };
    });
  }, [data?.individuals, localSearch, activeDepartment]);

  const teams = useMemo(() => {
    let rows = data?.teams || [];

    // Filter test teams & inactive squads
    const testRegex = /\btest\b/i;
    rows = rows.filter((row) => {
      const teamName = String(row.teamName || '');
      const leadName = String(row.leadName || '');
      if (
        testRegex.test(teamName) ||
        testRegex.test(leadName) ||
        teamName.toLowerCase().includes('inactive') ||
        leadName.toLowerCase().includes('inactive') ||
        teamName.toLowerCase().includes('razi') ||
        leadName.toLowerCase().includes('razi')
      ) {
        return false;
      }
      return true;
    });

    if (activeDepartment && activeDepartment !== 'All Departments') {
      rows = rows.filter((row) => {
        if (!row.department) {
          return activeDepartment === 'Sales';
        }
        return row.department.toLowerCase() === activeDepartment.toLowerCase();
      });
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.teamName.toLowerCase().includes(q) ||
          (row.leadName || '').toLowerCase().includes(q)
      );
    }

    // Sort strictly by highest team gross booking value descending, then dealsClosed
    const sorted = [...rows].sort((a, b) => {
      const revA = Number(a.totalRevenueInr) || 0;
      const revB = Number(b.totalRevenueInr) || 0;
      if (revB !== revA) return revB - revA;
      return (Number(b.dealsClosed) || 0) - (Number(a.dealsClosed) || 0);
    });

    // Only assign numbered podium ranks to teams with positive revenue or deals closed
    let currentRank = 1;
    return sorted.map((team) => {
      const hasDeals = (Number(team.totalRevenueInr) || 0) > 0 || (Number(team.dealsClosed) || 0) > 0;
      return {
        ...team,
        rank: hasDeals ? currentRank++ : null,
      };
    });
  }, [data?.teams, localSearch, activeDepartment]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Performance <span className="text-rose-500 dark:text-rose-400">Leaderboards</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time velocity metrics across all operating divisions.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Find member..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Department Filter Pills */}
      <DepartmentPills />

      <CorridorScopeBar
        branchId={branchId}
        salesManagerId={salesManagerId}
        options={options}
        onBranch={setBranchId}
        onManager={setSalesManagerId}
      />

      <CorridorBanner error={error} />

      <div className="bg-white dark:bg-[#0D1829] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                SALES VELOCITY
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Top performers ranked by highest gross booking value and conversion efficiency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setView('Individual')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  view === 'Individual'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setView('Team')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  view === 'Team'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Team
              </button>
            </div>

            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
              {PERIODS.map((tf) => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => setPeriod(tf.value)}
                  className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                    period === tf.value
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <CorridorSkeleton rows={5} />
        ) : view === 'Individual' ? (
          individuals.length === 0 ? (
            <EmptyState
              title="No individual standings yet"
              description="Live sales velocity ranks will appear here when CRM returns people for this period."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Rank</th>
                    <th className="pb-3">Member</th>
                    <th className="pb-3 text-right">Gross Bookings</th>
                    <th className="pb-3 text-center">Bookings</th>
                    <th className="pb-3 pr-2 text-right">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {individuals.map((member) => {
                    const rankStyles =
                      member.rank === 1
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                        : member.rank === 2
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300'
                          : member.rank === 3
                            ? 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-400/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-4 pl-2">
                          <span
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${rankStyles}`}
                          >
                            {member.rank ?? '-'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <PersonAvatar name={member.name} src={member.avatar} size={36} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {member.name}
                                </span>
                                {member.rank === 1 && (
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                                <TrendMark trend={member.trend} />
                              </div>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {member.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                            {member.revenueFormatted}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {member.bookings}
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-bold text-slate-900 dark:text-white font-mono w-12 text-right">
                              {displayRate(member.conversionRate)}
                            </span>
                            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full ${
                                  member.rank === 1
                                    ? 'bg-emerald-500'
                                    : member.rank === 2
                                      ? 'bg-blue-500'
                                      : 'bg-purple-500'
                                }`}
                                style={{ width: progressWidth(member.conversionRate) }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : teams.length === 0 ? (
          <EmptyState
            title="No team standings yet"
            description="Squad velocity ranks will appear here when CRM returns teams for this period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Squad / Team</th>
                  <th className="pb-3 text-right">Gross Bookings</th>
                  <th className="pb-3 text-center">Deals Closed</th>
                  <th className="pb-3 pr-2 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {teams.map((team) => {
                  const teamRankStyles =
                    team.rank === 1
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                      : team.rank === 2
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300'
                        : team.rank === 3
                          ? 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-400/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';

                  return (
                    <tr key={team.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 pl-2">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${teamRankStyles}`}
                        >
                          {team.rank ?? '-'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={team.teamName} src={team.avatar} size={36} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{team.teamName}</p>
                              {team.rank === 1 && (
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            {team.leadName && (
                              <p className="text-[11px] text-slate-400 font-normal">Led by {team.leadName}</p>
                            )}
                          </div>
                          <TrendMark trend={team.trend} />
                        </div>
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {team.totalRevenue}
                      </td>
                      <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {team.dealsClosed}
                      </td>
                      <td className="py-4 pr-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {displayRate(team.winRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>
            {view === 'Individual'
              ? `Showing all ${individuals.length} sales executives`
              : `Showing all ${teams.length} sales squads`}
          </span>
          <button
            type="button"
            onClick={() => setShowFullRosterModal(true)}
            className="font-bold text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>View Full Roster</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showFullRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Operating Division Roster
              </h3>
              <button
                type="button"
                onClick={() => setShowFullRosterModal(false)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {individuals.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No roster members yet.</p>
              ) : (
                individuals.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400 w-4">{member.rank ?? '-'}</span>
                      <PersonAvatar name={member.name} src={member.avatar} size={32} />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{member.name}</p>
                        <p className="text-[11px] text-slate-400">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-900 dark:text-white">{member.revenueFormatted}</p>
                      <p className="text-[11px] text-emerald-500 font-semibold">
                        {displayRate(member.conversionRate)} conversion
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardsPage() {
  return (
    <CorridorGate>
      <LeaderboardsInner />
    </CorridorGate>
  );
}
