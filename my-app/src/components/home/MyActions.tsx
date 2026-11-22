'use client';

import React, { useState } from 'react';
import { CheckCircle, ArrowRight, ShieldCheck, ListOrdered, Zap, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useActions } from '../../hooks/useActions';
import { useApp } from '../../context/AppContext';
import { getPersonalizedActions } from '../../lib/hallwayPersonalization';
import {
  defaultHomeViewMode,
  homeViewModes,
  showsPersonalHomeToggle,
  showsScopeToggleStrip,
  isDesignHomeUser,
  type HallwayHomeViewMode,
} from '../../lib/hallwayHomePermissions';
import { CorridorBanner, CorridorSkeleton } from '../hallway/CorridorGate';
import type { HallwayActionGroup, HallwayActionItem } from '../../types/hallway';

export default function MyActions() {
  const { currentUser } = useApp();
  const modes = homeViewModes(currentUser);
  const showTeam = modes.includes('team');
  const showAll = modes.includes('all');
  const showPersonal = showsPersonalHomeToggle(currentUser);
  const showToggles = showsScopeToggleStrip(currentUser);
  const defaultMode = defaultHomeViewMode(currentUser);
  const [viewMode, setViewMode] = useState<HallwayHomeViewMode>(defaultMode);
  const [selectedGroup, setSelectedGroup] = useState<HallwayActionGroup | null>(null);
  const { data, loading, error, refetch } = useActions(undefined, viewMode);

  const rawGroups = data?.actions || [];
  const groups = data?.scoped
    ? rawGroups.filter((g) => (g.items?.length ?? g.count) > 0)
    : getPersonalizedActions(rawGroups, currentUser, viewMode);

  const countedGroups = groups.filter((g) => !g.uncounted && !g.isWatchlist);
  const watchlistGroups = groups.filter((g) => g.uncounted || g.isWatchlist);
  const primary = countedGroups[0];

  const myTotalCount = getPersonalizedActions(rawGroups, currentUser, 'my')
    .filter((g) => !g.uncounted && !g.isWatchlist)
    .reduce((acc, g) => acc + g.count, 0);
  const allTotalCount = rawGroups
    .filter((g) => !g.uncounted && !g.isWatchlist)
    .reduce((acc, g) => acc + g.count, 0);

  const isInitialLoading = loading && !data;
  const countBadge = (cnt: number) => (isInitialLoading ? '—' : cnt);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
              My Actions
            </span>
            {primary?.designerXpTier ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                <Zap className="w-2.5 h-2.5 fill-violet-500 text-violet-500" />
                {primary.designerXpTier}
              </span>
            ) : primary?.urgent ? (
              <span className="text-[10px] font-extrabold uppercase text-rose-500 hidden sm:inline">Urgent</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {!showToggles && showAll && !showTeam && !showPersonal ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1">
                All ({countBadge(allTotalCount)})
              </span>
            ) : !showToggles && showTeam && !showAll && !showPersonal ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1">
                Team
              </span>
            ) : !showToggles && showPersonal && !showTeam && !showAll ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1">
                My ({countBadge(myTotalCount)})
              </span>
            ) : showToggles && (showPersonal || showTeam || showAll) ? (
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-[10px] font-bold">
                {showPersonal && (
                  <button
                    type="button"
                    onClick={() => setViewMode('my')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'my'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Show personal action items"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>My ({countBadge(myTotalCount)})</span>
                  </button>
                )}
                {showTeam && (
                  <button
                    type="button"
                    onClick={() => setViewMode('team')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'team'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Team follow-ups in your scope"
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>Team</span>
                  </button>
                )}
                {showAll && (
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'all'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="All follow-ups in your admin scope"
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>All ({countBadge(allTotalCount)})</span>
                  </button>
                )}
              </div>
            ) : null}

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
              {countedGroups.length === 0 ? (
                <div className="py-2">
                  <div className="text-center py-3">
                    <p className="text-xs font-medium text-slate-400">
                      {data?.feedError || error
                        ? data?.message ||
                          'My Actions is temporarily unavailable. Try again in a moment.'
                        : isDesignHomeUser(currentUser) &&
                            !String(currentUser?.role || '')
                              .toUpperCase()
                              .match(/SALES|PRESALES/) &&
                            String(data?.dayBasis || '').toLowerCase().includes('session missing')
                          ? 'Connect Design Studio once from the app switcher to load your live queues.'
                          : `All caught up! No pending actions for ${currentUser?.name?.split(' ')[0] || 'you'} today.`}
                    </p>
                    {(data?.feedError || error) && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => refetch()}
                          className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 underline cursor-pointer"
                        >
                          Retry
                        </button>
                        {data?.referenceId && (
                          <span className="text-[10px] text-slate-400 font-mono">({data.referenceId})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Uncounted Watchlist under All caught up */}
                  {watchlistGroups.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Watchlist (Uncounted)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Informational</span>
                      </div>
                      <div className="space-y-1.5">
                        {watchlistGroups.map((group) => (
                          <div
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 text-xs min-w-0">
                              <span className="text-slate-400 shrink-0">⏳</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate" title={group.title}>
                                {group.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:underline shrink-0 ml-2">
                              Review →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : countedGroups[0]?.id === 'tracker-tasks' && (countedGroups[0]?.items?.length ?? 0) > 0 ? (
                <>
                  <div className="space-y-1.5">
                    {countedGroups[0].items.slice(0, 6).map((it) => (
                      <a
                        key={it.id}
                        href={it.linkUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800 gap-2 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400" title={it.name}>
                            {it.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {it.detail}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {it.statusLabel === 'Overdue' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                              {it.dueDateLabel || 'Overdue'}
                            </span>
                          ) : it.statusLabel === 'Due today' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Due today
                            </span>
                          ) : it.dueDateLabel ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {it.dueDateLabel}
                            </span>
                          ) : null}
                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>
                    ))}
                  </div>

                  {countedGroups.slice(1).map((otherGroup) => (
                    <div
                      key={otherGroup.id}
                      onClick={() => setSelectedGroup(otherGroup)}
                      className="mt-2 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-dashed border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2 text-xs min-w-0">
                        <span className="text-slate-400 shrink-0">📄</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{otherGroup.title}</span>
                      </div>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-slate-500 shadow-xs shrink-0 ml-2">
                        {otherGroup.count}
                      </span>
                    </div>
                  ))}

                  {/* Watchlist section under counted groups */}
                  {watchlistGroups.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Watchlist (Uncounted)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Informational</span>
                      </div>
                      <div className="space-y-1.5">
                        {watchlistGroups.map((group) => (
                          <div
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 text-xs min-w-0">
                              <span className="text-slate-400 shrink-0">⏳</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate" title={group.title}>
                                {group.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:underline shrink-0 ml-2">
                              Review →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {countedGroups.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedGroup(item)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                    >
                      <div className="flex items-center gap-2 text-xs min-w-0">
                        <span className="text-slate-400 shrink-0">
                          {item.designerXpTier ? '🎨' : '📄'}
                        </span>
                        <div className="truncate">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
                          {item.designerTotalXp ? (
                            <span className="ml-1.5 text-[10px] text-violet-500 font-semibold">
                              ({item.designerTotalXp} XP)
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0 ml-2 ${
                          item.urgent ? 'bg-rose-500' : 'bg-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>
                  ))}

                  {/* Watchlist section under other counted groups */}
                  {watchlistGroups.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Watchlist (Uncounted)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Informational</span>
                      </div>
                      <div className="space-y-1.5">
                        {watchlistGroups.map((group) => (
                          <div
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 text-xs min-w-0">
                              <span className="text-slate-400 shrink-0">⏳</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate" title={group.title}>
                                {group.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:underline shrink-0 ml-2">
                              Review →
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {isDesignHomeUser(currentUser) &&
              !String(currentUser?.role || '')
                .toUpperCase()
                .match(/SALES|PRESALES/)
                ? 'Live from Design Module · role-scoped queues.'
                : String(currentUser?.role || '')
                      .toUpperCase()
                      .includes('PRESALES')
                  ? 'Presales Fresh Data · verify then hand off to Sales.'
                  : viewMode === 'team'
                    ? 'Team Fresh Lead oversight · CRM.'
                    : viewMode === 'all'
                      ? 'Company Fresh Lead oversight · CRM.'
                      : 'Fresh leads due today · CRM.'}
            </p>
          </>
        )}
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedGroup.title}</h3>
                  {selectedGroup.designerXpTier && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                      <Zap className="w-2.5 h-2.5 fill-violet-500 text-violet-500" />
                      {selectedGroup.designerXpTier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {selectedGroup.isWatchlist || selectedGroup.uncounted
                    ? `${selectedGroup.count} projects on hold · Uncounted watchlist`
                    : `${selectedGroup.count} pending items`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(selectedGroup.items || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No items in this group.</p>
              ) : (
                selectedGroup.items.map((it: HallwayActionItem) => (
                  <ActionLeadRow key={it.id} item={it} />
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * One row layout for every role (SE / PE / manager / admin).
 * Full rich display for holds (reason, days, held by, held since) or standard tasks.
 */
function ActionLeadRow({ item }: { item: HallwayActionItem }) {
  const initial = (item.assignee || '?').trim().charAt(0).toUpperCase() || '?';
  const status = item.statusLabel;

  if (item.holdMetadata) {
    return (
      <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-xs space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate" title={item.name}>
              {item.name}
            </p>
            <div className="mt-1 flex items-center gap-1.5 min-w-0">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-200">
                {initial}
              </span>
              <span className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                Designer: {item.holdMetadata.designerName}
              </span>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {item.holdMetadata.daysOnHold} days on hold
          </span>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-1.5">
          <p><span className="font-semibold text-slate-700 dark:text-slate-300">Hold reason:</span> {item.holdMetadata.holdReason}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
            <p><span className="font-semibold text-slate-700 dark:text-slate-300">Held since:</span> {item.holdMetadata.heldSinceDate}</p>
            <p><span className="font-semibold text-slate-700 dark:text-slate-300">Held by:</span> {item.holdMetadata.heldBy}</p>
            {item.holdMetadata.resumeAtDate && (
              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Resume target:</span> {item.holdMetadata.resumeAtDate}</p>
            )}
          </div>
        </div>

        {item.linkUrl && (
          <div className="pt-0.5">
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              <span>
                {item.linkUrl?.includes('meetingId=') ? 'Record outcome' : 'Open in Design Module'}
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate" title={item.name}>
            {item.name}
          </p>
          {item.detail && (
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{item.detail}</p>
          )}
          {item.assignee && (
            <div className="mt-1 flex items-center gap-1.5 min-w-0">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-200">
                {initial}
              </span>
              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{item.assignee}</span>
            </div>
          )}
          {item.linkUrl && (
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              <span>
                {item.linkUrl?.includes('meetingId=') ? 'Record outcome' : 'Open in Design Module'}
              </span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {(item.xpPoints || item.xpPenaltyWarning) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.xpPoints ? (
                <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <Zap className="h-2.5 w-2.5 fill-violet-500" />
                  +{item.xpPoints} XP
                </span>
              ) : null}
              {item.xpPenaltyWarning ? (
                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertTriangle className="h-2.5 w-2.5 text-rose-500" />
                  {item.xpPenaltyWarning}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {item.dueDateLabel && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3" />
              Due {item.dueDateLabel}
            </span>
          )}
          {status && <StatusPill label={status} />}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const overdue = label === 'Overdue';
  const today = label === 'Due today';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
        overdue
          ? 'bg-rose-500 text-white'
          : today
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      }`}
    >
      {label}
    </span>
  );
}
