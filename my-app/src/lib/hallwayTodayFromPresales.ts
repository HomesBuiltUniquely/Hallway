import { filterLeadsForViewer } from './hallwayCrmLeadRows';
import {
  dueToneLabel,
  formatIstDueDateLabel,
  formatIstTimeFromRaw,
  istTodayYmd,
} from './hallwayIstDates';
import { formatPersonName } from './hallwayDisplay';
import type { HallwayTodayEventsResponse, HallwayTodayEvent } from '../types/hallway';
import type { TodayViewer } from './hallwayTodayFromCrm';

/**
 * Presales Today — verification callbacks due today (IST).
 * Not sales/designer appointments. Leads sit with Presales until verified / handed to Sales CRM.
 */
export async function loadTodayPresalesCallbacks(
  viewer?: TodayViewer
): Promise<HallwayTodayEventsResponse> {
  const dateYmd = istTodayYmd();
  const rows = await filterLeadsForViewer(viewer, {
    dueTodayOnly: true,
    presalesFresh: true,
    scopeMode: viewer?.scope || undefined,
    limit: 60,
  });

  const events: HallwayTodayEvent[] = rows.map((r) => {
    const tone = dueToneLabel(r.follow_up_date, dateYmd);
    const time =
      formatIstTimeFromRaw(r.follow_up_date) ||
      formatIstDueDateLabel(r.follow_up_date, dateYmd) ||
      tone;
    const stage = r.presales_milestone_stage?.trim() || r.milestone_stage?.trim() || 'Fresh Data';
    const owner = String(r.assignee || '').trim();
    return {
      id: `callback-${r.lead_key}`,
      time,
      title: r.name,
      category: 'callback',
      startAt: r.follow_up_date || undefined,
      clientName: r.name,
      // Reuse crmPersonName as Presales owner (UI maps this for callback rows).
      crmPersonName: owner ? formatPersonName(owner) || owner : null,
      designerName: null,
      meetingType: stage,
      location: tone === 'Overdue' ? 'Overdue callback' : 'Presales callback',
    };
  });

  events.sort((a, b) => String(a.time).localeCompare(String(b.time)));

  return {
    dayBasis: `Presales callbacks · followUpDate = ${dateYmd} IST`,
    date: dateYmd,
    scoped: true,
    hubTotal: events.length,
    companyTotal: events.length,
    events,
  };
}
