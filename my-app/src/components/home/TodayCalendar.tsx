'use client';

import React, { useState } from 'react';
import { Calendar, ArrowRight, Clock, User, Users, ExternalLink } from 'lucide-react';
import { useTodayEvents } from '../../hooks/useTodayEvents';
import { useApp } from '../../context/AppContext';
import { isSuperAdmin } from '../../lib/permissions';
import { getPersonalizedSchedule } from '../../lib/hallwayPersonalization';
import { formatExactDateIst, formatIsoDateIst } from '../../lib/hallwayDisplay';
import { CorridorBanner, CorridorSkeleton } from '../hallway/CorridorGate';
import type { HallwayTodayEvent } from '../../types/hallway';

export default function TodayCalendar() {
  const { currentUser } = useApp();
  const isAdmin = isSuperAdmin(currentUser);
  const { data, loading, error } = useTodayEvents();
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  const rawEvents = data?.events || [];
  const events = getPersonalizedSchedule(rawEvents, currentUser, viewMode);
  const hubCount = rawEvents.length;

  return (
    <>
      <div className="bg-white dark:bg-panel border border-slate-200/90 dark:border-surface-warm/50 rounded-2xl p-5 shadow-sm">
        {/* Header — exact SS layout: TODAY + date | My Schedule / All Hubs | View Calendar */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              TODAY
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg bg-slate-100/80 dark:bg-surface-muted p-0.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('my')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'my'
                    ? 'bg-brand-soft text-brand shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Show meetings related to me"
              >
                <User className={`w-3 h-3 ${viewMode === 'my' ? 'text-brand' : 'text-slate-400'}`} />
                <span>My Schedule</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'all'
                      ? 'bg-brand-soft text-brand shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show company-wide meetings across all hubs"
                >
                  <Users className={`w-3 h-3 ${viewMode === 'all' ? 'text-brand' : 'text-slate-400'}`} />
                  <span>All Hubs ({hubCount})</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-xs font-medium text-slate-500 hover:text-brand flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Open full day schedule"
            >
              <span>View Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <CorridorSkeleton rows={2} />
        ) : (
          <>
            <CorridorBanner error={error} />
            {events.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-xs font-medium text-slate-400">
                  {viewMode === 'my'
                    ? 'No meetings scheduled for you today.'
                    : 'No events scheduled across hubs today.'}
                </p>
                {isAdmin && viewMode === 'my' && rawEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-[11px] text-brand hover:underline mt-1.5 font-semibold cursor-pointer"
                  >
                    View {rawEvents.length} company-wide meetings →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {events.slice(0, 3).map((ev) => (
                  <CompactMeetingRow key={ev.id} ev={ev} onOpenCalendar={() => setShowModal(true)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-panel border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {viewMode === 'my' ? "Today's Scheduled Meetings" : 'All Hubs Scheduled Meetings'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {formatExactDateIst()} · {formatIsoDateIst()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-surface-muted rounded-xl mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('my')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    viewMode === 'my'
                      ? 'bg-brand-soft text-brand shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  My Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-brand-soft text-brand shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  All Hubs ({hubCount})
                </button>
              </div>
            )}

            {events.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No scheduled meetings for today.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-surface-muted border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand" />
                        {ev.time}
                        {ev.endAt ? ` – ${ev.endAt}` : ''}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
                      {ev.title}
                    </p>
                    <a
                      href={ev.linkUrl || '#'}
                      target={ev.linkUrl ? '_blank' : undefined}
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!ev.linkUrl) e.preventDefault();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400 font-medium hover:underline"
                    >
                      <span>{locationLabel(ev)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-400">Total {events.length} meetings scheduled</span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-muted hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Row format from SS: time | title | location link */
function CompactMeetingRow({
  ev,
  onOpenCalendar,
}: {
  ev: HallwayTodayEvent;
  onOpenCalendar: () => void;
}) {
  const startTime = ev.time ? ev.time.split('–')[0].split('-')[0].trim() : '10:30 AM';
  const loc = locationLabel(ev);
  const href = ev.linkUrl || undefined;

  return (
    <div className="flex items-start gap-4 text-xs">
      <span className="font-bold text-slate-800 dark:text-white w-[4.5rem] shrink-0 pt-0.5 tabular-nums">
        {startTime}
      </span>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenCalendar}
          className="block w-full text-left cursor-pointer"
        >
          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-snug uppercase tracking-tight truncate">
            {ev.title}
          </p>
        </button>
        <a
          href={href || '#'}
          target={href ? '_blank' : undefined}
          rel="noreferrer"
          onClick={(e) => {
            if (!href) {
              e.preventDefault();
              onOpenCalendar();
            }
          }}
          className="inline-flex items-center gap-1 mt-0.5 text-[11px] text-indigo-500 dark:text-indigo-400 font-medium hover:underline"
        >
          <span className="uppercase tracking-wide">{loc}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      </div>
    </div>
  );
}

function locationLabel(ev: HallwayTodayEvent): string {
  const loc = (ev.location || '').trim();
  if (loc) return loc.toUpperCase();
  if (ev.meetingType) return String(ev.meetingType).toUpperCase();
  return 'HUB';
}
