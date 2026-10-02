'use client';

import React, { useState } from 'react';
import { Calendar, ArrowRight, ExternalLink, Clock, MapPin, UserCheck, Users } from 'lucide-react';
import { useTodayEvents } from '../../hooks/useTodayEvents';
import { useApp } from '../../context/AppContext';
import { isSuperAdmin } from '../../lib/permissions';
import { getPersonalizedSchedule } from '../../lib/hallwayPersonalization';
import { CorridorBanner, CorridorSkeleton } from '../hallway/CorridorGate';

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
              TODAY
            </span>
            {data?.date && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">{data.date}</span>
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
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show meetings related to me"
                >
                  <UserCheck className="w-3 h-3" />
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
                  <span>All Hubs ({rawEvents.length})</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">View Calendar</span>
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
                  <div key={ev.id} className="flex items-start gap-3 text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100 w-16 shrink-0 pt-0.5">
                      {ev.time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{ev.title}</p>
                      {ev.isLink && ev.linkUrl ? (
                        <a
                          href={ev.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                        >
                          <span>{ev.location || 'Join Meeting'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <p className="text-slate-400 text-[11px] mt-0.5">{ev.location || 'Showroom'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {viewMode === 'my' ? "My Today's Schedule" : "All HUB Today's Schedule"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer"
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
              <p className="text-xs text-slate-400 text-center py-6">No events scheduled today.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ev.time}
                      </span>
                      {ev.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                          {ev.category}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{ev.title}</p>
                    {ev.location && (
                      <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {ev.location}
                      </p>
                    )}
                    {ev.isLink && ev.linkUrl && (
                      <a
                        href={ev.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1 font-semibold"
                      >
                        <span>Join meeting</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

