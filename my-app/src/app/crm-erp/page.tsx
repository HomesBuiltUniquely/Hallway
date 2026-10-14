'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHallwayLeads } from '../../hooks/useHallwayLeads';
import { useMilestoneCounts } from '../../hooks/useMilestoneCounts';
import EmptyState from '../../components/common/EmptyState';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
} from '../../components/hallway/CorridorGate';
import { CorridorScopeBar, useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import { istMonthBounds, milestoneLabel, progressWidth } from '../../lib/hallwayDisplay';

const PAGE_SIZE = 20;

function heatmapTone(count: number, max: number) {
  if (max <= 0 || count <= 0) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  const ratio = count / max;
  if (ratio >= 0.66) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (ratio >= 0.33) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300';
}

function CrmErpInner() {
  const { branchId, setBranchId, salesManagerId, setSalesManagerId, options } = useCorridorScope();
  const [page, setPage] = useState(0);
  const [phasesOpen, setPhasesOpen] = useState(true);
  const month = useMemo(() => istMonthBounds(), []);

  const { data, loading, error } = useHallwayLeads({
    page,
    size: PAGE_SIZE,
    branchId,
    salesManagerId,
  });

  const milestoneParams = useMemo(() => {
    const params: Record<string, string> = {
      dateField: 'created',
      dateFrom: month.dateFrom,
      dateTo: month.dateTo,
    };
    if (branchId) params.branchId = branchId;
    return params;
  }, [branchId, month.dateFrom, month.dateTo]);

  const {
    data: milestones,
    loading: milestonesLoading,
    error: milestonesError,
  } = useMilestoneCounts(milestoneParams);

  const leads = data?.leads || [];
  const total = data?.total ?? 0;
  const categories = milestones?.countsByMilestoneStageCategory || [];
  const maxCount = Math.max(0, ...categories.map((item) => Number(item.count) || 0));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Journey Phase Heatmap
        </h1>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Higher count</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Medium count</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Lower count</span>
          </div>
        </div>
      </div>

      <CorridorScopeBar
        branchId={branchId}
        salesManagerId={salesManagerId}
        options={options}
        onBranch={(next) => {
          setPage(0);
          setBranchId(next);
        }}
        onManager={(next) => {
          setPage(0);
          setSalesManagerId(next);
        }}
      />

      <CorridorBanner error={error || milestonesError} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-panel border-2 border-[#F59E0B] rounded-3xl p-6 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
            SUMMARY
          </span>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Total</h2>
            <span className="font-mono text-3xl font-black text-slate-900 dark:text-white">
              {milestonesLoading ? '—' : milestones?.totalCrmLeads ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-right text-slate-400 mt-2 font-medium">
            created {month.dateFrom} → {month.dateTo}
          </p>
        </div>
        <div className="bg-white dark:bg-panel border-2 border-[#F59E0B] rounded-3xl p-6 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
            BOARD
          </span>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Leads</h2>
            <span className="font-mono text-3xl font-black text-slate-900 dark:text-white">
              {loading ? '—' : total}
            </span>
          </div>
          <p className="text-[11px] text-right text-slate-400 mt-2 font-medium">read-only showcase</p>
        </div>
      </div>

      <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Journey phases</span>
          <button
            type="button"
            onClick={() => setPhasesOpen((open) => !open)}
            className="text-xs font-bold text-amber-500 hover:text-amber-600"
          >
            {phasesOpen ? 'Close' : 'Open'}
          </button>
        </div>
        {phasesOpen &&
          (milestonesLoading ? (
            <CorridorSkeleton rows={2} />
          ) : categories.length === 0 ? (
            <p className="text-xs text-slate-400">No milestone counts for this window.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <span
                  key={milestoneLabel(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${heatmapTone(Number(item.count) || 0, maxCount)}`}
                >
                  {milestoneLabel(item)} · {item.count}
                </span>
              ))}
            </div>
          ))}
      </div>

      <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-xs">
        <p className="text-xs text-slate-500">Live CRM leads. Assign and delete are disabled in Hallway.</p>
        <span className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold">
          Total Leads {total}
        </span>
      </div>

      <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-x-auto">
        {loading ? (
          <div className="p-6">
            <CorridorSkeleton rows={8} />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/40">
                <th className="py-3.5 pl-4">Enquiry date</th>
                <th className="py-3.5">Lead name</th>
                <th className="py-3.5">Code</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Journey track</th>
                <th className="py-3.5">Owner</th>
                <th className="py-3.5">Engagement</th>
                <th className="py-3.5 pr-4">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10">
                    <EmptyState title="No leads yet" description="CRM returned no lead rows for this scope." />
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const track = lead.journeyTrack;
                  const stepPct =
                    track && track.totalSteps > 0
                      ? (track.currentStep / track.totalSteps) * 100
                      : 0;
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 pl-4 text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">
                        {lead.enquiryDate || '—'}
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {lead.leadName}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {(lead.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 font-mono text-slate-500">{lead.leadCode || '—'}</td>
                      <td className="py-4 text-slate-600 dark:text-slate-400">{lead.status || '—'}</td>
                      <td className="py-4">
                        {track ? (
                          <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                              {track.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: progressWidth(stepPct) }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {track.currentStep}/{track.totalSteps}
                              </span>
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 text-slate-800 dark:text-slate-200 font-bold">
                        {lead.owner || '—'}
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400 text-xs">
                        {lead.engagement || '—'}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-bold text-blue-600 dark:text-blue-400">{lead.dueDate || '—'}</p>
                        {lead.dueTime && <p className="text-[11px] text-slate-400">{lead.dueTime}</p>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-slate-500">
            Page {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CrmErpPage() {
  return (
    <CorridorGate>
      <CrmErpInner />
    </CorridorGate>
  );
}
