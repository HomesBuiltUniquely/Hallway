'use client';

import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Check, ShieldCheck, ListOrdered } from 'lucide-react';
import { useActions } from '../../hooks/useActions';
import { useApp } from '../../context/AppContext';
import { isSuperAdmin } from '../../lib/permissions';
import { getPersonalizedActions } from '../../lib/hallwayPersonalization';
import { CorridorBanner, CorridorSkeleton } from '../hallway/CorridorGate';
import type { HallwayActionGroup } from '../../types/hallway';

export default function MyActions() {
  const { currentUser } = useApp();
  const isAdmin = isSuperAdmin(currentUser);
  const { data, loading, error } = useActions();
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [selectedGroup, setSelectedGroup] = useState<HallwayActionGroup | null>(null);

  const rawGroups = data?.actions || [];
  const groups = getPersonalizedActions(rawGroups, currentUser, viewMode);
  const primary = groups[0];

  const myTotalCount = getPersonalizedActions(rawGroups, currentUser, 'my').reduce(
    (acc, g) => acc + g.count,
    0
  );
  const allTotalCount = rawGroups.reduce((acc, g) => acc + g.count, 0);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
              My Actions
            </span>
            {primary?.urgent && (
              <span className="text-[10px] font-extrabold uppercase text-rose-500 hidden sm:inline">Urgent</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('my')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'my'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show personal action items and approvals"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>My Approvals ({myTotalCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show all corridor follow-ups across sales reps"
                >
                  <ListOrdered className="w-3 h-3" />
                  <span>Corridor Leads ({allTotalCount})</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedGroup(primary || null)}
              className="text-xs font-semibold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {loading ? (
          <CorridorSkeleton rows={2} />
        ) : (
          <>
            <CorridorBanner error={error} />
            <div className="space-y-2.5">
              {groups.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs font-medium text-slate-400">
                    All caught up! No pending actions for {currentUser?.name?.split(' ')[0] || 'you'} today.
                  </p>
                  {isAdmin && viewMode === 'my' && rawGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setViewMode('all')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline mt-1 font-semibold cursor-pointer"
                    >
                      Inspect {allTotalCount} corridor lead follow-ups →
                    </button>
                  )}
                </div>
              ) : (
                groups.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedGroup(item)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">📄</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                        item.urgent ? 'bg-rose-500' : 'bg-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {viewMode === 'my'
                ? `Personalized for ${currentUser?.name || 'current session'}`
                : 'Based on meetingDate = today (IST) across all corridors.'}
            </p>
          </>
        )}
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedGroup.title}</h3>
                <p className="text-xs text-slate-400">{selectedGroup.count} pending items</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(selectedGroup.items || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No items in this group.</p>
              ) : (
                selectedGroup.items.map((it) => (
                  <div
                    key={it.id}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                      it.done
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-slate-400 line-through'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        it.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {it.done && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <p className="font-semibold">{it.name}</p>
                      {it.detail && <p className="text-[11px] text-slate-400">{it.detail}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

