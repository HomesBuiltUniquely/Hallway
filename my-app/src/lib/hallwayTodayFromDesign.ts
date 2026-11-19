/**
 * Today meetings for Design portal — live Design Module Google Calendar API.
 */
import { formatPersonName } from './hallwayDisplay';
import { istTodayYmd } from './hallwayIstDates';
import type { HallwayTodayEvent, HallwayTodayEventsResponse } from '../types/hallway';
import type { TodayViewer } from './hallwayTodayFromCrm';
import { resolveHallwayScope } from './resolveHallwayScope';

const DESIGN_API = (
  process.env.DESIGN_MODULE_BASE_URL || 'https://api.hubinterior.com'
).replace(/\/$/, '');

function formatIstTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

type DesignCalEvent = {
  id?: string;
  summary?: string;
  title?: string;
  start?: string;
  end?: string;
  htmlLink?: string;
  location?: string;
  user_name?: string;
  userName?: string;
  designerName?: string;
};

export async function loadTodayMeetingsFromDesign(
  viewer: TodayViewer | undefined,
  designSessionId?: string | null
): Promise<HallwayTodayEventsResponse | null> {
  if (!designSessionId) return null;

  const dateYmd = istTodayYmd();
  const start = new Date(`${dateYmd}T00:00:00+05:30`);
  const end = new Date(`${dateYmd}T23:59:59.999+05:30`);
  const resolved = await resolveHallwayScope(viewer, viewer?.scope, viewer?.branchId);

  const qs = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  });

  // Admin / TDM: try all-events; everyone else: my-events (Design scopes by session role)
  const path =
    resolved.mode === 'all'
      ? `/api/google-calendar/all-events?${qs}`
      : `/api/google-calendar/my-events?${qs}`;

  try {
    let res = await fetch(`${DESIGN_API}${path}`, {
      headers: { Authorization: `Bearer ${designSessionId}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok && path.includes('all-events')) {
      res = await fetch(`${DESIGN_API}/api/google-calendar/my-events?${qs}`, {
        headers: { Authorization: `Bearer ${designSessionId}`, Accept: 'application/json' },
        cache: 'no-store',
      });
    }
    if (!res.ok) return null;
    const body = await res.json();
    const raw: DesignCalEvent[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.events)
        ? body.events
        : [];

    const events: HallwayTodayEvent[] = [];
    for (const ev of raw) {
      const startAt = ev.start || '';
      if (!startAt) continue;
      const startDate = new Date(startAt);
      if (Number.isNaN(startDate.getTime())) continue;
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(startDate);
      if (ymd !== dateYmd) continue;

      const title = String(ev.summary || ev.title || 'Meeting').trim();
      const endAt = ev.end || undefined;
      const timeStr = endAt
        ? `${formatIstTime(startAt)} – ${formatIstTime(endAt)}`
        : formatIstTime(startAt);
      const designer =
        formatPersonName(ev.user_name || ev.userName || ev.designerName || '') || null;

      events.push({
        id: String(ev.id || `design-cal-${startAt}-${title}`),
        time: timeStr,
        title,
        location: ev.location || undefined,
        isLink: Boolean(ev.htmlLink),
        linkUrl: ev.htmlLink || null,
        category: 'meeting',
        startAt: startDate.toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        clientName: title,
        designerName: designer,
        meetingType: 'Meeting',
      });
    }

    events.sort((a, b) => String(a.startAt || '').localeCompare(String(b.startAt || '')));

    return {
      dayBasis: `Design Module calendar · ${DESIGN_API}`,
      date: dateYmd,
      scoped: true,
      hubTotal: events.length,
      events,
    };
  } catch (err) {
    console.warn('[loadTodayMeetingsFromDesign] failed:', err);
    return null;
  }
}
