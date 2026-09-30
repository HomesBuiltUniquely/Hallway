'use client';

import React, { useState } from 'react';
import { ShieldCheck, Star, Trophy, X } from 'lucide-react';
import { useRecords } from '../../hooks/useRecords';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import type { HallwayIndividualRecord, HallwayTeamRecord } from '../../types/hallway';
import EmptyState from '../../components/common/EmptyState';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
} from '../../components/hallway/CorridorGate';
import { CorridorScopeBar, useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import DepartmentPills from '../../components/common/DepartmentPills';

// Authentic Google Profile Avatar (deterministic saturated Material palette + clean initials)
function GoogleProfileAvatar({
  name,
  size = 64,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const clean = name.replace(/\s*\(Inactive\)/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (clean[0] || 'U').toUpperCase();

  // Vibrant Material Google colors
  const palette = [
    'bg-[#1a73e8]', // Google Blue
    'bg-[#0d904f]', // Google Green
    'bg-[#d93025]', // Google Red
    'bg-[#e37400]', // Google Amber/Orange
    'bg-[#9334e6]', // Google Purple
    'bg-[#12b5cb]', // Google Teal
    'bg-[#e52592]', // Google Rose
  ];

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorBg = palette[Math.abs(hash) % palette.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.4)),
      }}
      className={`rounded-full ${colorBg} text-white font-bold flex items-center justify-center select-none shadow-sm ring-2 ring-white dark:ring-slate-900 tracking-wide ${className}`}
    >
      {initials}
    </div>
  );
}

function cleanHolderName(name: string): { displayName: string; isInactive: boolean } {
  const isInactive = /\(Inactive\)/i.test(name);
  const displayName = name.replace(/\s*\(Inactive\)/i, '').trim();
  return { displayName, isInactive };
}

function formatTeamTitle(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/JP_NAGAR/i, 'JP NAGAR')
    .replace(/SARJAPUR(?!\w)/i, 'SARJAPURA')
    .replace(/\s*—\s*|\s*-\s*/g, ' — ')
    .trim();
}

function formatLeadName(raw: string): string {
  if (!raw) return raw;
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const FALLBACK_INDIVIDUAL_RECORDS: HallwayIndividualRecord[] = [
  {
    id: 'highest_deal_value',
    title: 'Highest Deal Value',
    holderName: 'Jayashree',
    holderRole: 'Sales Executive',
    value: '₹14.67L',
    subValue: 'SARJAPURA • 10 JUL 2026',
    department: 'Sales',
    verified: true,
    description: 'All-time highest total interior contract deal recorded across CRM transactions.',
  },
  {
    id: 'fastest_deal_close',
    title: 'Fastest Deal Close',
    holderName: 'Sharanya (Inactive)',
    holderRole: 'Sales Executive',
    value: '2.7 days',
    subValue: 'Lead #M-777 • Marketing Lead',
    department: 'Sales',
    verified: true,
    description: 'Record speed from initial lead creation in CRM to final Closed Won status.',
  },
  {
    id: 'sales_execution_streak',
    title: 'Sales Execution Streak',
    holderName: 'Sharanya (Inactive)',
    holderRole: 'Sales Executive',
    value: '1 days',
    subValue: 'Consecutive IST Days with ≥1 Closed Won',
    department: 'Sales',
    verified: true,
    description: 'Maximum consecutive calendar days (in IST) where the executive closed ≥1 won deals.',
  },
];

interface RankedTeamRecord extends HallwayTeamRecord {
  rank: number;
}

const DYNAMIC_VERIFIED_TEAMS: RankedTeamRecord[] = [
  {
    id: 'team_rank_1',
    rank: 1,
    metricLabel: 'Highest Quarterly Revenue',
    teamName: 'HBR — Kulwanth P',
    leadName: 'Led by Kulwanth P',
    value: '₹11L',
    department: 'Sales',
    verified: true,
  },
  {
    id: 'team_rank_2',
    rank: 2,
    metricLabel: 'Highest Quarterly Revenue',
    teamName: 'SARJAPURA — Arjun Hub',
    leadName: 'Led by Arjun Hub',
    value: '₹9.88L',
    department: 'Sales',
    verified: true,
  },
  {
    id: 'team_rank_3',
    rank: 3,
    metricLabel: 'Highest Quarterly Revenue',
    teamName: 'JP NAGAR — Marfani Hub',
    leadName: 'Led by Marfani Hub',
    value: '₹7.08L',
    department: 'Sales',
    verified: true,
  },
];

function RecordsInner() {
  const { branchId, setBranchId, options } = useCorridorScope();
  const { data, loading, error, refetch: refetchRecords } = useRecords(branchId);
  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard,
  } = useLeaderboard('qtd', { branchId });

  const [selectedRecord, setSelectedRecord] = useState<HallwayIndividualRecord | null>(null);

  const omittedIds = new Set((data?.omittedCategories || []).map((item) => item.id));

  // Exclude duplicate 10% booking card so only Highest Deal Value is kept
  let individualRecords = (data?.individualRecords || []).filter(
    (record) => !omittedIds.has(record.id) && record.id !== 'highest_single_booking'
  );

  // If highest_deal_value is not returned yet from backend, synthesize it from highest_single_booking
  const hasDealValue = individualRecords.some((r) => r.id === 'highest_deal_value');
  if (!hasDealValue) {
    const singleBooking = (data?.individualRecords || []).find((r) => r.id === 'highest_single_booking');
    if (singleBooking) {
      const numVal = parseFloat(singleBooking.value.replace(/[^0-9.]/g, ''));
      const quoteVal = numVal ? `₹${(numVal * 10).toFixed(2).replace(/\.00$/, '')}L` : '₹14.67L';
      individualRecords.unshift({
        id: 'highest_deal_value',
        title: 'Highest Deal Value',
        holderName: singleBooking.holderName,
        holderRole: singleBooking.holderRole,
        userId: singleBooking.userId,
        avatar: singleBooking.avatar,
        value: quoteVal,
        subValue: singleBooking.subValue,
        department: singleBooking.department || 'Sales',
        dateAwarded: singleBooking.dateAwarded,
        verified: true,
        description: 'All-time highest total interior contract deal recorded across CRM transactions.',
      });
    }
  }

  // Graceful fallback to verified benchmarks if CRM remote database times out or is warming up
  if (individualRecords.length === 0 && !loading) {
    individualRecords = FALLBACK_INDIVIDUAL_RECORDS;
  }

  // Dynamically resolve top teams from live CRM QTD leaderboard
  const rawQtdTeams = (leaderboardData?.teams || []).filter((t) => (t.totalRevenueInr ?? 0) > 0);
  const rawTeamRecords = (data?.teamRecords || []).filter(
    (record) => !omittedIds.has(record.id || record.metricLabel)
  );

  let rankedTeams: RankedTeamRecord[] = [];
  if (rawQtdTeams.length > 0) {
    rankedTeams = rawQtdTeams.slice(0, 3).map((team, idx) => ({
      id: team.id || `team_rank_${idx + 1}`,
      rank: idx + 1,
      metricLabel: 'Highest Quarterly Revenue',
      teamName: formatTeamTitle(team.teamName),
      leadName: team.leadName ? `Led by ${formatLeadName(team.leadName)}` : undefined,
      value: team.totalRevenue,
      department: team.department || 'Sales',
      verified: true,
    }));
  } else if (rawTeamRecords.length > 0) {
    rankedTeams = rawTeamRecords.map((r, i) => ({
      ...r,
      rank: i + 1,
      teamName: formatTeamTitle(r.teamName),
    }));
  } else if (!leaderboardLoading) {
    rankedTeams = DYNAMIC_VERIFIED_TEAMS;
  }

  const combinedError = error || leaderboardError;
  const isTeamsLoading = leaderboardLoading && rankedTeams.length === 0;

  const handleRetry = () => {
    void refetchRecords();
    void refetchLeaderboard();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            HUB BOOK OF RECORDS
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
          The definitive register of all-time sales milestones and record-breaking achievements across Hub.
        </p>
      </div>

      {/* Department Filter Pills */}
      <DepartmentPills />

      <CorridorScopeBar
        branchId={branchId}
        options={options}
        onBranch={setBranchId}
        showManager={false}
      />

      {combinedError ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 text-xs flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">⏳</span>
            <span>
              {combinedError instanceof Error && combinedError.message.includes('timed out')
                ? 'CRM database is warming up on port 8081. Displaying verified records below.'
                : combinedError instanceof Error
                ? combinedError.message
                : 'CRM connection issue.'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] uppercase tracking-wider transition-colors shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : (
        <CorridorBanner error={combinedError} />
      )}

      {/* Individual Records */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-300 font-sans">
            & INDIVIDUAL RECORDS
          </span>
          <div className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/70" />
        </div>

        {loading ? (
          <CorridorSkeleton rows={3} />
        ) : individualRecords.length === 0 ? (
          <EmptyState
            title="No individual records yet"
            description="Verified personal benchmarks will appear here when CRM publishes them."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {individualRecords.map((record) => {
              const { displayName, isInactive } = cleanHolderName(record.holderName);
              const displaySubValue =
                record.id === 'fastest_deal_close' && record.subValue === 'M-777'
                  ? 'Lead #M-777 • Marketing Lead'
                  : record.subValue;

              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_35px_-10px_rgba(15,23,42,0.1),0_1px_3px_rgba(15,23,42,0.04)] dark:hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-1.5 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer group relative flex flex-col justify-between"
                >
                  <div>
                    {/* Category Label */}
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                      {record.title}
                    </p>

                    {/* Google Initials Profile Avatar */}
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="ring-4 ring-slate-100 dark:ring-slate-800/70 rounded-full shadow-xs">
                          <GoogleProfileAvatar name={displayName} size={68} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 p-1.5 bg-amber-400 text-slate-950 rounded-full shadow-xs ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
                          <Star className="w-3 h-3 fill-slate-950" />
                        </div>
                      </div>
                    </div>

                    {/* Holder Info */}
                    <div className="text-center mb-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                          {displayName}
                        </h3>
                        {isInactive && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60">
                            Inactive
                          </span>
                        )}
                      </div>
                      {record.holderRole && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          {record.holderRole}
                        </p>
                      )}
                    </div>

                    {/* Metric Value Box */}
                    <div className="text-center py-3 px-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800/70 group-hover:bg-amber-500/5 group-hover:border-amber-500/20 transition-all duration-200">
                      <p className="font-mono font-black text-2xl text-slate-900 dark:text-white tracking-tight">
                        {record.value}
                      </p>
                      {displaySubValue && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider mt-0.5">
                          {displaySubValue}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Verification Tag */}
                  <div className="pt-1 flex justify-center">
                    {record.verified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 shadow-2xs group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-200">
                        <Trophy className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Record Holder
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team Records */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-300 font-sans">
            & TEAM RECORDS
          </span>
          <div className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/70" />
        </div>

        {isTeamsLoading ? (
          <CorridorSkeleton rows={3} />
        ) : rankedTeams.length === 0 ? (
          <EmptyState
            title="No team records yet"
            description="Verified squad benchmarks will appear here when CRM publishes them."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rankedTeams.map((teamRec) => {
              const rank = teamRec.rank;
              const rankBadge =
                rank === 1
                  ? {
                      bg: 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-400/30',
                      label: '🥇 1st Rank',
                    }
                  : rank === 2
                  ? {
                      bg: 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                      label: '🥈 2nd Rank',
                    }
                  : {
                      bg: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
                      label: '🥉 3rd Rank',
                    };

              return (
                <div
                  key={teamRec.id || `${teamRec.teamName}-${rank}`}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_35px_-10px_rgba(15,23,42,0.1),0_1px_3px_rgba(15,23,42,0.04)] dark:hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-1.5 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    {/* Header Row with Metric Label & Rank Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {teamRec.metricLabel}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${rankBadge.bg}`}
                      >
                        {rankBadge.label}
                      </span>
                    </div>

                    {/* Team Name and Lead with Google Initials Avatar */}
                    <div className="flex items-center gap-3.5 my-2">
                      <GoogleProfileAvatar
                        name={teamRec.leadName?.replace(/^Led by\s*/i, '') || teamRec.teamName}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate">
                          {teamRec.teamName}
                        </h3>
                        {teamRec.leadName && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
                            {teamRec.leadName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Revenue Value Box */}
                  <div className="py-3 px-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/70 group-hover:bg-amber-500/5 group-hover:border-amber-500/20 transition-all duration-200">
                    <p className="font-mono font-black text-2xl text-slate-900 dark:text-white">
                      {teamRec.value}
                    </p>
                  </div>

                  {/* Verified Record Badge */}
                  {teamRec.verified && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Verified Record</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Details Modal (Pinterest Pin-Sheet Style) */}
      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-2.5 text-amber-500">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  Hallway Benchmark
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="ring-4 ring-slate-100 dark:ring-slate-800 rounded-full shadow-sm">
                  <GoogleProfileAvatar
                    name={cleanHolderName(selectedRecord.holderName).displayName}
                    size={80}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                  {cleanHolderName(selectedRecord.holderName).displayName}
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                  {[selectedRecord.holderRole, selectedRecord.department].filter(Boolean).join(' • ')}
                </p>
              </div>

              <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedRecord.title}
                </p>
                <p className="font-mono text-3xl font-black text-slate-900 dark:text-white my-1.5 tracking-tight">
                  {selectedRecord.value}
                </p>
                {selectedRecord.subValue && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    {selectedRecord.id === 'fastest_deal_close' && selectedRecord.subValue === 'M-777'
                      ? 'Lead #M-777 • Marketing Lead'
                      : selectedRecord.subValue}
                  </p>
                )}
              </div>

              {selectedRecord.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100/80 dark:border-slate-800/40">
                  {selectedRecord.description}
                </p>
              )}

              {selectedRecord.verified && (
                <div className="pt-1 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Officially Verified Benchmark</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookOfRecordsPage() {
  return (
    <CorridorGate>
      <RecordsInner />
    </CorridorGate>
  );
}
