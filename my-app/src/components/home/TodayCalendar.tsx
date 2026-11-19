'use client';

import React, { useState } from 'react';
import { Calendar, ArrowRight, Clock, User, Users, ExternalLink } from 'lucide-react';
import { useTodayEvents } from '../../hooks/useTodayEvents';
import { useApp } from '../../context/AppContext';
import { getPersonalizedSchedule } from '../../lib/hallwayPersonalization';
import {
  defaultHomeViewMode,
  homeViewModes,
  showsPersonalHomeToggle,
  showsScopeToggleStrip,
  todayCardUi,
  type HallwayHomeViewMode,
} from '../../lib/hallwayHomePermissions';
import { isPresalesRole } from '../../lib/hallwayRoleMatrix';
import { formatExactDateIst, formatIsoDateIst, formatPersonName } from '../../lib/hallwayDisplay';
import { CorridorBanner, CorridorSkeleton } from '../hallway/CorridorGate';
import type { HallwayTodayEvent } from '../../types/hallway';

export default function TodayCalendar() {
  const { currentUser } = useApp();
  const modes = homeViewModes(currentUser);
  const showTeam = modes.includes('team');
  const showAll = modes.includes('all');
  const showPersonal = showsPersonalHomeToggle(currentUser);
  const showToggles = showsScopeToggleStrip(currentUser);
  const minimalToday = todayCardUi(currentUser) === 'minimal';
  const presalesToday = isPresalesRole(currentUser);
  const defaultMode = defaultHomeViewMode(currentUser);
  const adminAllOnly = showAll && !showToggles;
  const teamOnly = showTeam && !showAll && !showToggles;
  const personalOnly = showPersonal && !showTeam && !showAll && !showToggles;
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<HallwayHomeViewMode>(defaultMode);
  const { data, loading, error } = useTodayEvents(viewMode);

  const rawEvents = data?.events || [];
  const events = data?.scoped
    ? rawEvents
    : getPersonalizedSchedule(rawEvents, currentUser, viewMode);
  // Badge for current scope must match the list — never company-wide while empty team.
  const scopeCount = events.length;
  const companyCount = data?.companyTotal ?? data?.hubTotal ?? rawEvents.length;
  const hubCount = viewMode === 'all' || adminAllOnly ? companyCount : scopeCount;

  return (
    <>
      <div className="bg-white dark:bg-panel border border-slate-200/90 dark:border-surface-warm/50 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              TODAY
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {adminAllOnly ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1">
                All Hubs ({hubCount})
              </span>
            ) : teamOnly ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1">
                {presalesToday ? 'Team callbacks' : 'Team schedule'} ({hubCount})
              </span>
            ) : personalOnly ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1">
                {presalesToday ? 'My callbacks' : 'My Schedule'} ({hubCount})
              </span>
            ) : showToggles ? (
              <div className="flex items-center rounded-lg bg-slate-100/80 dark:bg-surface-muted p-0.5 text-[10px] font-semibold">
                {showPersonal && (
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
                    <span>{presalesToday ? 'My callbacks' : 'My Schedule'}</span>
                  </button>
                )}
                {showTeam && (
                  <button
                    type="button"
                    onClick={() => setViewMode('team')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'team'
                        ? 'bg-brand-soft text-brand shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Meetings in your team scope"
                  >
                    <Users className={`w-3 h-3 ${viewMode === 'team' ? 'text-brand' : 'text-slate-400'}`} />
                    <span>{presalesToday ? 'Team callbacks' : 'Team schedule'}</span>
                  </button>
                )}
                {showAll && (
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
            ) : null}

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
            {minimalToday && events.length === 0 && !presalesToday ? (
              <div className="text-center py-3">
                <p className="text-xs font-medium text-slate-400">Client meetings are on your team&apos;s calendars.</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-xs font-medium text-slate-400">
                  {presalesToday
                    ? viewMode === 'my'
                      ? 'No presales callbacks due today.'
                      : 'No team callbacks due today.'
                    : viewMode === 'my'
                      ? 'No meetings scheduled for you today.'
                      : viewMode === 'team'
                        ? 'No team meetings on the calendar today.'
                        : 'No events scheduled across hubs today.'}
                </p>
                {showAll && showPersonal && viewMode === 'my' && companyCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-[11px] text-brand hover:underline mt-1.5 font-semibold cursor-pointer"
                  >
                    View {companyCount} company-wide meetings →
                  </button>
                )}
              </div>
            ) : (
              <div className="relative space-y-0">
                {events.slice(0, 3).map((ev, index, list) => (
                  <CompactMeetingRow
                    key={ev.id}
                    ev={ev}
                    isLast={index === list.length - 1}
                    onOpenCalendar={() => setShowModal(true)}
                    presales={presalesToday}
                  />
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
                    {presalesToday
                      ? viewMode === 'my'
                        ? 'My callbacks due today'
                        : 'Team callbacks due today'
                      : viewMode === 'my'
                        ? "Today's Scheduled Meetings"
                        : viewMode === 'team'
                          ? "My team's meetings today"
                          : 'All Hubs Scheduled Meetings'}
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

            {showToggles ? (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-surface-muted rounded-xl mb-4 text-xs font-bold">
                {showPersonal && (
                  <button
                    type="button"
                    onClick={() => setViewMode('my')}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      viewMode === 'my'
                        ? 'bg-brand-soft text-brand shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {presalesToday ? 'My callbacks' : 'My Schedule'}
                  </button>
                )}
                {showTeam && (
                  <button
                    type="button"
                    onClick={() => setViewMode('team')}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      viewMode === 'team'
                        ? 'bg-brand-soft text-brand shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {presalesToday ? 'Team callbacks' : 'My team'}
                  </button>
                )}
                {showAll && (
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
                )}
              </div>
            ) : null}

            {events.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                {presalesToday ? 'No presales callbacks due today.' : 'No scheduled meetings for today.'}
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {events.map((ev) => {
                  const view = eventDisplay(ev, presalesToday);
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-surface-muted border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-brand" />
                          {ev.time}
                        </span>
                        <MeetingTypeBadge type={view.meetingType} presales={presalesToday} />
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        {view.clientName}
                      </p>
                      {view.peopleLine ? (
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{view.peopleLine}</p>
                      ) : null}
                      {!presalesToday && ev.linkUrl ? (
                        <a
                          href={ev.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-indigo-500 dark:text-indigo-400 font-medium hover:underline"
                        >
                          <span>Open meeting link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-400">
                {presalesToday
                  ? `Total ${events.length} callbacks due today`
                  : `Total ${events.length} meetings scheduled`}
              </span>
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

function CompactMeetingRow({
  ev,
  isLast,
  onOpenCalendar,
  presales,
}: {
  ev: HallwayTodayEvent;
  isLast: boolean;
  onOpenCalendar: () => void;
  presales?: boolean;
}) {
  const startTime = ev.time ? ev.time.split('–')[0].split('-')[0].trim() : '—';
  const view = eventDisplay(ev, Boolean(presales));

  return (
    <div className="relative flex items-start gap-3 pb-4 last:pb-0">
      {!isLast ? (
        <span className="pointer-events-none absolute left-[5.35rem] top-3 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
      ) : null}
      <span className="w-[4.25rem] shrink-0 pt-0.5 text-xs font-bold tabular-nums text-slate-800 dark:text-white">
        {startTime}
      </span>
      <span className="relative z-[1] mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand ring-2 ring-brand/20" />
      <button
        type="button"
        onClick={onOpenCalendar}
        className="block min-w-0 flex-1 cursor-pointer text-left"
      >
        <p className="truncate text-[13px] leading-snug text-slate-900 dark:text-slate-100">
          <span className="font-bold tracking-tight">{view.clientName}</span>
        </p>
        {view.peopleLine ? (
          <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {view.peopleLine}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <MeetingTypeBadge type={view.meetingType} presales={presales} />
          {!presales && ev.linkUrl ? (
            <a
              href={ev.linkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-500 hover:underline"
            >
              Join
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ) : null}
        </div>
      </button>
    </div>
  );
}

function MeetingTypeBadge({ type, presales }: { type: string; presales?: boolean }) {
  if (presales) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
        {type}
      </span>
    );
  }
  const virtual = /virtual|online|meet/i.test(type);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        virtual
          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
          : 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
      }`}
    >
      {type}
    </span>
  );
}

function isSystemSalesLabel(name: string): boolean {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
  return n === 'admin' || n === 'superadmin' || n === 'user';
}

/** Presales = verification callbacks (owner only). Sales CRM = appointments (Sales + Designer). */
function eventDisplay(ev: HallwayTodayEvent, presales: boolean) {
  const isCallback = presales || ev.category === 'callback';
  const parsed = parseClientAndLead(ev.clientName || ev.title || '', ev.leadId);

  if (isCallback) {
    const ownerRaw = (ev.crmPersonName || '').trim();
    const owner = ownerRaw ? formatPersonName(ownerRaw) || ownerRaw : '';
    const stage = String(ev.meetingType || 'Fresh Data').trim() || 'Fresh Data';
    return {
      clientName: parsed.clientName,
      peopleLine: owner ? `Presales: ${owner}` : undefined,
      meetingType: stage,
    };
  }

  const salesRaw = (ev.crmPersonName || '').trim();
  const designerRaw = (ev.designerName || '').trim();
  const sales = salesRaw ? formatPersonName(salesRaw) : '';
  const designer = designerRaw ? formatPersonName(designerRaw) : '';
  const people: string[] = [];
  if (sales && !isSystemSalesLabel(sales) && !isLeadTypeLabel(sales)) {
    people.push(`Sales: ${sales}`);
  } else {
    people.push('Sales: —');
  }
  if (designer && designer !== 'User' && !isLeadTypeLabel(designer)) {
    people.push(`Designer: ${designer}`);
  } else if (!designer) {
    people.push('Designer: —');
  }
  return {
    clientName: parsed.clientName,
    peopleLine: people.join(' · '),
    meetingType: humanMeetingType(ev.meetingType || 'Meeting'),
  };
}

function isLeadTypeLabel(name: string): boolean {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return (
    n === 'm lead' ||
    n === 'mlead' ||
    n === 'g lead' ||
    n === 'glead' ||
    n === 'add lead' ||
    n === 'addlead' ||
    n === 'form lead' ||
    n === 'formlead'
  );
}

function parseClientAndLead(
  raw: string,
  leadId?: string | number | null
): { clientName: string; leadId: string } {
  const text = String(raw || '').trim();
  const idFromField = leadId != null && String(leadId).trim() ? String(leadId).trim() : '';
  const idMatch = text.match(/lead\s*id\s*[:#]?\s*(\d+)/i) || text.match(/\blead\s+(\d+)\b/i);
  const extractedId = idFromField || idMatch?.[1] || '';
  let name = text
    .replace(/^meeting\s+with\s+/i, '')
    .replace(/\s*[-–—]?\s*lead\s*id\s*[:#]?\s*\d+\s*/gi, ' ')
    .replace(/\s*·\s*lead\s+\d+\s*/gi, ' ')
    .replace(/\b(mlead|glead|addlead|formlead)\b/gi, ' ')
    .replace(/\b(m|g|add|form)\s*lead\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const placeholder =
    !name ||
    /^lead$/i.test(name) ||
    /^client$/i.test(name) ||
    /^lead\s+\d+$/i.test(name) ||
    isLeadTypeLabel(name);
  if (placeholder) {
    name = extractedId ? `Lead ${extractedId}` : 'Client';
  } else {
    name = formatPersonName(name) || name;
  }
  return { clientName: name, leadId: extractedId };
}

function humanMeetingType(raw: string): string {
  const key = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!key) return 'Meeting';
  if (key.includes('VIRTUAL') || key.includes('ONLINE') || key.includes('GOOGLE') || key.includes('MEET')) {
    return 'Virtual meeting';
  }
  if (key.includes('SHOWROOM') || key.includes('OFFLINE')) return 'Showroom visit';
  if (key.includes('SITE')) return 'Site visit';
  const spaced = String(raw).trim().replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
