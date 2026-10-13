'use client';

import React, { useState } from 'react';
import { Calendar, ArrowRight, Clock, UserCheck, Users, ExternalLink } from 'lucide-react';
import { useTodayEvents } from '../../hooks/useTodayEvents';
import { useApp } from '../../context/AppContext';
import { isSuperAdmin } from '../../lib/permissions';
import { getPersonalizedSchedule } from '../../lib/hallwayPersonalization';
import { formatExactDateIst } from '../../lib/hallwayDisplay';
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

  return (
    <>
      <div className="bg-white dark:bg-[#0D1829] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
        {/* Header matching user screenshot */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-sans">
              TODAY
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {formatExactDateIst()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('my')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'my'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show meetings related to me"
                >
                  <UserCheck className="w-3 h-3 text-rose-500" />
                  <span>My Schedule</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show company-wide meetings across all hubs"
                >
                  <Users className="w-3 h-3" />
                  <span>All Hubs ({rawEvents.length || 4})</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Open full day schedule calendar"
            >
              <span>View Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {loading ? (
          <CorridorSkeleton rows={2} />
        ) : (
          <>
            <CorridorBanner error={error} />
            {events.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs font-medium text-slate-400">
                  {viewMode === 'my'
                    ? `No meetings scheduled for you today.`
                    : 'No events scheduled across hubs today.'}
                </p>
                {isAdmin && viewMode === 'my' && rawEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-[11px] text-rose-500 hover:underline mt-1 font-semibold cursor-pointer"
                  >
                    View {rawEvents.length} company-wide meetings →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 3).map((ev) => (
                  <CompactMeetingRow key={ev.id} ev={ev} onOpenCalendar={() => setShowModal(true)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Calendar Full Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {viewMode === 'my' ? "Today's Scheduled Meetings" : "All Hubs Scheduled Meetings"}
                  </h3>
                  <p className="text-[11px] text-slate-400">{formatExactDateIst()} · Direct Schedule View</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('my')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    viewMode === 'my'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  My Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All Hubs ({rawEvents.length})
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
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-rose-500" />
                        {ev.time} {ev.endAt ? `– ${ev.endAt}` : ''}
                      </span>
                      {ev.meetingType && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold uppercase">
                          {ev.meetingType}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{ev.title}</p>
                    {/* Attendee Summary Line */}
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                      {buildAttendeeSubline(ev)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-400">Total {events.length} meetings scheduled</span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
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

/**
 * Clean compact meeting row matching user reference screenshot exactly
 */
function CompactMeetingRow({ ev, onOpenCalendar }: { ev: HallwayTodayEvent; onOpenCalendar: () => void }) {
  // Extract clean start time string (e.g. "10:30 AM" or "4:00 PM")
  const startTime = ev.time ? ev.time.split('–')[0].trim() : '10:30 AM';
  const subline = buildAttendeeSubline(ev);

  return (
    <div
      onClick={onOpenCalendar}
      className="flex items-start gap-3 text-xs group cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 p-1.5 rounded-xl transition-all"
      title="Click to view full calendar"
    >
      {/* Time on left: bold white/dark font */}
      <span className="font-bold text-slate-900 dark:text-white w-18 shrink-0 pt-0.5 text-xs font-mono">
        {startTime}
      </span>

      {/* Right side: Meeting title & clean subline link */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs leading-snug">
          {ev.title}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 mt-0.5 font-medium hover:underline">
          <span className="truncate">{subline}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </div>
      </div>
    </div>
  );
}

/**
 * Builds a clean single-line attendee and corridor tag
 */
function buildAttendeeSubline(ev: HallwayTodayEvent): string {
  const parts: string[] = [];

  if (ev.clientName) parts.push(`Client: ${ev.clientName}`);
  if (ev.crmPersonName) parts.push(`CRM: ${ev.crmPersonName}`);
  if (ev.designerName) parts.push(`Designer: ${ev.designerName}`);

  if (parts.length > 0) {
    return parts.join(' · ');
  }

  // Fallback to location or meeting type if no attendees specified
  return ev.location || ev.meetingType || 'SARJAPUR';
}
