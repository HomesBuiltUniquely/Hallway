'use client';

import React from 'react';
import { Target, TrendingUp, Building2, CheckCircle2, Trophy, Award, Flame, User, ArrowUpRight } from 'lucide-react';
import { useTargets } from '../../hooks/useTargets';
import { useApp } from '../../context/AppContext';
import EmptyState from '../../components/common/EmptyState';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
} from '../../components/hallway/CorridorGate';
import { useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import DepartmentPills from '../../components/common/DepartmentPills';
import { progressWidth } from '../../lib/hallwayDisplay';

interface BranchTargetItem {
  id: string;
  branchId: 'JP_NAGAR' | 'SARJAPUR' | 'HBR';
  branchName: string;
  managerName: string;
  currentFormatted: string;
  targetFormatted: string;
  currentInr: number;
  targetInr: number;
  progress: number;
  topCloserName: string;
  topCloserAmount: string;
  dealCount: number;
}

function TargetsInner() {
  const { branchId, setBranchId, salesManagerId, setSalesManagerId, options, auth } =
    useCorridorScope();
  const { data, loading, error } = useTargets({
    branchId,
    salesManagerId,
    salesExecutiveId: auth.isExecutive ? auth.user?.id : undefined,
  });
  const { feedPosts } = useApp();

  // 1. Overall Company Target
  const overallTargetPost = feedPosts.find(
    (p) => p.id?.includes('overall') || p.title?.toLowerCase().includes('all hubs')
  );
  const overallProgress = overallTargetPost?.quotaProgress?.percentage || 10.4;
  const overallCurrent = overallTargetPost?.quotaProgress?.currentFormatted || '₹49.93L';
  const overallTarget = overallTargetPost?.quotaProgress?.targetFormatted || '₹4.80 Cr';

  // 2. The 3 Hubs of HUB: JP Nagar, Sarjapura, and HBR Layout (Strictly 3 branches)
  const defaultBranchTargets: BranchTargetItem[] = [
    {
      id: 'branch-jp-nagar',
      branchId: 'JP_NAGAR',
      branchName: 'JP Nagar Hub',
      managerName: 'Marfani Hub',
      currentFormatted: '₹31.82L',
      targetFormatted: '₹1.20 Cr',
      currentInr: 3182000,
      targetInr: 12000000,
      progress: 26.5,
      topCloserName: 'Priti Dutta',
      topCloserAmount: '₹31.82L',
      dealCount: 5,
    },
    {
      id: 'branch-sarjapur',
      branchId: 'SARJAPUR',
      branchName: 'Sarjapura Hub',
      managerName: 'Arjun Hub',
      currentFormatted: '₹8.60L',
      targetFormatted: '₹1.20 Cr',
      currentInr: 860000,
      targetInr: 12000000,
      progress: 7.2,
      topCloserName: 'Rahul',
      topCloserAmount: '₹8.40L',
      dealCount: 2,
    },
    {
      id: 'branch-hbr',
      branchId: 'HBR',
      branchName: 'HBR Layout Hub',
      managerName: 'Kulwanth P',
      currentFormatted: '₹1.80L',
      targetFormatted: '₹1.20 Cr',
      currentInr: 180000,
      targetInr: 12000000,
      progress: 1.5,
      topCloserName: 'Meghana',
      topCloserAmount: '₹1.79L',
      dealCount: 1,
    },
  ];

  // Try to sync live targets from data or feedPosts if available
  const branchTargets = defaultBranchTargets.map((b) => {
    // Check if feedPosts or cards has updated data for this branch
    const matchedPost = feedPosts.find(
      (p) =>
        p.quotaProgress &&
        (p.id?.toLowerCase().includes(b.branchId.toLowerCase()) ||
          p.title?.toLowerCase().includes(b.branchName.toLowerCase()) ||
          p.content?.toLowerCase().includes(b.branchName.toLowerCase()))
    );

    if (matchedPost?.quotaProgress) {
      return {
        ...b,
        currentFormatted: matchedPost.quotaProgress.currentFormatted || b.currentFormatted,
        targetFormatted: matchedPost.quotaProgress.targetFormatted || b.targetFormatted,
        progress: matchedPost.quotaProgress.percentage || b.progress,
      };
    }
    return b;
  });

  // Sort descending by percentage achieved
  const sortedBranches = [...branchTargets].sort((a, b) => b.progress - a.progress);

  // Filter if user selected a specific branch
  const displayedBranches = sortedBranches.filter((b) => {
    if (!branchId || branchId === 'all') return true;
    return b.branchId === branchId;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Operating Targets & Quotas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Company-wide macro target and branch-by-branch achieved quotas in real-time.
          </p>
        </div>
      </div>

      {/* Department Filter Pills */}
      <DepartmentPills />

      <CorridorBanner error={error} />

      {loading ? (
        <CorridorSkeleton rows={4} />
      ) : (
        <div className="space-y-6">
          {/* TIER 1: Executive Macro Summary Banner (All Hubs Overall Target) */}
          {(!branchId || branchId === 'all') && (
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-[#0D1829] dark:to-[#09101D] border-2 border-violet-500/30 dark:border-violet-500/40 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-600 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    All Hubs (Overall) Macro Target
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    October 2026
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-violet-600 dark:text-violet-400">
                    {overallProgress}% Achieved
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                    {overallCurrent}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    achieved of <strong className="text-slate-800 dark:text-slate-200">{overallTarget}</strong> quota
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pacing active across all 3 corridors
                </span>
              </div>

              {/* Gradient Progress Bar */}
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-sky-500 to-emerald-500 transition-all duration-500"
                  style={{ width: progressWidth(overallProgress) }}
                />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly gross booking pacing across all 3 corridors (JP Nagar, Sarjapura, HBR) is at {overallCurrent} towards the {overallTarget} target ({overallProgress}% achieved).
              </p>
            </div>
          )}

          {/* TIER 2: Dedicated Branch Performance Scorecards (Strictly 3 Hubs, Sorted by % Descending) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Branch-by-Branch Target Breakdown
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Ranked by target achievement percentage
              </span>
            </div>

            {/* Dribbble / Pinterest Analytics Scorecards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {displayedBranches.map((branch, idx) => {
                const rank = idx + 1;
                const isLeader = rank === 1;
                const isSecond = rank === 2;

                // Calculate remaining gap
                const remainingInr = Math.max(0, branch.targetInr - branch.currentInr);
                const remainingFormatted =
                  remainingInr >= 10000000
                    ? `₹${(remainingInr / 10000000).toFixed(2)} Cr`
                    : `₹${(remainingInr / 100000).toFixed(2)}L`;

                return (
                  <div
                    key={branch.id}
                    className={`rounded-2xl p-5 border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                      isLeader
                        ? 'bg-gradient-to-b from-emerald-500/[0.04] via-white dark:via-[#0D1829] to-teal-500/[0.02] border-emerald-500/40 dark:border-emerald-500/30 ring-1 ring-emerald-500/10'
                        : isSecond
                        ? 'bg-gradient-to-b from-sky-500/[0.04] via-white dark:via-[#0D1829] to-indigo-500/[0.02] border-sky-500/40 dark:border-sky-500/30'
                        : 'bg-white dark:bg-[#0D1829] border-slate-200/90 dark:border-slate-800/90'
                    }`}
                  >
                    <div>
                      {/* Card Header: Branch Name & Rank Pill */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{branch.branchName}</span>
                          </h3>
                          <span className="text-[11px] text-slate-400">Head: {branch.managerName}</span>
                        </div>

                        {/* Rank Pill */}
                        {isLeader ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-black">
                            <Trophy className="w-3.5 h-3.5 text-amber-600" />
                            <span>#1 LEADER</span>
                          </span>
                        ) : isSecond ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300 text-xs font-black">
                            <Award className="w-3.5 h-3.5 text-sky-600" />
                            <span>#2 PACING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black">
                            <span>#3 HUB</span>
                          </span>
                        )}
                      </div>

                      {/* Main Figures: Achieved vs Target */}
                      <div className="my-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-mono text-3xl font-black text-slate-900 dark:text-white">
                            {branch.currentFormatted}
                          </span>
                          <span
                            className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                              isLeader
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {branch.progress}% Achieved
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block">
                          Monthly Goal: <strong className="text-slate-700 dark:text-slate-300">{branch.targetFormatted}</strong>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden my-3">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLeader
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : isSecond
                              ? 'bg-gradient-to-r from-sky-500 to-indigo-500'
                              : 'bg-gradient-to-r from-slate-400 to-slate-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, branch.progress))}%` }}
                        />
                      </div>

                      {/* 2-Column KPI Micro-grid */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs my-2">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Quota</span>
                          <strong className="text-slate-700 dark:text-slate-200">{branch.targetFormatted}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining Gap</span>
                          <strong className="text-rose-600 dark:text-rose-400">{remainingFormatted}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Top Closer in this Corridor */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs mt-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          Top Closer: <strong className="text-slate-800 dark:text-slate-200">{branch.topCloserName}</strong>
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">
                        {branch.topCloserAmount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {displayedBranches.length === 0 && (
              <EmptyState
                title="No branch targets matching scope"
                description="Select 'All branches' or adjust corridor filters to inspect branch quotas."
              />
            )}
          </div>
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
