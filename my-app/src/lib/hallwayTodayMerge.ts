import { getPool } from './db';
import { formatPersonName } from './hallwayDisplay';
import type { HallwayTodayEvent, HallwayTodayEventsResponse } from '../types/hallway';

function istTodayBounds(): { dateYmd: string; start: Date; end: Date } {
  const dateYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const start = new Date(`${dateYmd}T00:00:00+05:30`);
  const end = new Date(`${dateYmd}T23:59:59.999+05:30`);
  return { dateYmd, start, end };
}

function formatIstTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function isPlaceholderClient(name?: string | null): boolean {
  const n = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return (
    !n ||
    n === 'client' ||
    n === 'user' ||
    n === 'lead' ||
    n === 'm lead' ||
    n === 'mlead' ||
    n === 'g lead' ||
    n === 'glead' ||
    n === 'add lead' ||
    n === 'addlead' ||
    n === 'form lead' ||
    n === 'formlead' ||
    n === 'walkin lead' ||
    n === 'walkinlead' ||
    /^lead\s+\d+$/.test(n) ||
    n.startsWith('meeting with')
  );
}

function humanMeetingType(raw?: string | null): string {
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

function pickBestName(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const t = String(c || '').trim();
    if (t && !isPlaceholderClient(t)) return formatPersonName(t);
  }
  return null;
}

const CRM_LEAD_TABLES = [
  'mlead',
  'addlead',
  'glead',
  'formlead',
  'walkinlead',
  'websitelead',
  'whatsapplead',
] as const;

async function resolveLeadCustomerName(
  pool: ReturnType<typeof getPool>,
  crmDb: string,
  leadType: string | null | undefined,
  leadId: string | number | null | undefined
): Promise<string | null> {
  if (leadId == null || String(leadId).trim() === '') return null;
  const id = Number(leadId);
  if (!Number.isFinite(id)) return null;
  const type = String(leadType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-_]+/g, '');

  const preferred: string[] =
    type === 'm' || type === 'mlead'
      ? ['mlead']
      : type === 'g' || type === 'glead'
        ? ['glead']
        : type === 'form' || type === 'formlead'
          ? ['formlead']
          : type === 'add' || type === 'addlead'
            ? ['addlead']
            : type === 'walkin' || type === 'walkinlead'
              ? ['walkinlead']
              : type === 'website' || type === 'websitelead'
                ? ['websitelead']
                : type === 'whatsapp' || type === 'whatsapplead'
                  ? ['whatsapplead']
                  : [];

  const tables = [
    ...preferred,
    ...CRM_LEAD_TABLES.filter((t) => !preferred.includes(t)),
  ];

  for (const table of tables) {
    try {
      const [rows]: any = await pool.query(
        `SELECT COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(customer_name), '')) AS name
         FROM ${crmDb}.${table}
         WHERE id = ?
         LIMIT 1`,
        [id]
      );
      const name = rows?.[0]?.name;
      if (name && !isPlaceholderClient(name)) return String(name).trim();
    } catch {
      try {
        const [rows]: any = await pool.query(
          `SELECT name FROM ${crmDb}.${table} WHERE id = ? LIMIT 1`,
          [id]
        );
        const name = rows?.[0]?.name;
        if (name && !isPlaceholderClient(name)) return String(name).trim();
      } catch {
        /* table / column may not exist */
      }
    }
  }

  // Design module leads (same DB host, optional schema)
  const designDb = process.env.DESIGN_DB_NAME || process.env.DESIGN_DB_SCHEMA || '';
  if (designDb) {
    try {
      const [rows]: any = await pool.query(
        `SELECT COALESCE(
           NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.customerName'))), ''),
           NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.name'))), ''),
           NULLIF(TRIM(customer_name), ''),
           NULLIF(TRIM(name), '')
         ) AS name
         FROM ${designDb}.leads
         WHERE id = ?
         LIMIT 1`,
        [id]
      );
      const name = rows?.[0]?.name;
      if (name && !isPlaceholderClient(name)) return String(name).trim();
    } catch {
      /* design schema optional */
    }
  }

  return null;
}

/** Enrich Hub today-events with appointment fields + real client names from CRM / Design leads. */
export async function mergeTodayEventsWithAppointments(
  hubPayload: HallwayTodayEventsResponse
): Promise<HallwayTodayEventsResponse> {
  const events = Array.isArray(hubPayload.events) ? [...hubPayload.events] : [];
  const byId = new Map<string, HallwayTodayEvent>();
  for (const ev of events) {
    if (ev?.id) byId.set(ev.id, { ...ev });
  }

  try {
    const pool = getPool();
    const crmDb = process.env.CRM_DB_NAME || 'CRM';
    const { dateYmd, start, end } = istTodayBounds();
    const [rows]: any = await pool.query(
      `
      SELECT
        a.id,
        a.start_time,
        a.end_time,
        a.description,
        a.customer_name,
        a.designer_name,
        a.meeting_type,
        a.google_html_link,
        a.lead_id,
        a.lead_type,
        u.full_name as sales_person_name,
        u.branch as sales_branch,
        COALESCE(
          NULLIF(TRIM(ml.name), ''),
          NULLIF(TRIM(al.name), ''),
          NULLIF(TRIM(gl.name), ''),
          NULLIF(TRIM(fl.name), ''),
          NULLIF(TRIM(wl.name), ''),
          NULLIF(TRIM(a.customer_name), '')
        ) AS resolved_customer_name
      FROM ${crmDb}.appointment a
      LEFT JOIN ${crmDb}.users u ON a.sales_user_id = u.id
      LEFT JOIN ${crmDb}.mlead ml ON a.lead_id = ml.id
      LEFT JOIN ${crmDb}.addlead al ON a.lead_id = al.id
      LEFT JOIN ${crmDb}.glead gl ON a.lead_id = gl.id
      LEFT JOIN ${crmDb}.formlead fl ON a.lead_id = fl.id
      LEFT JOIN ${crmDb}.walkinlead wl ON a.lead_id = wl.id
      WHERE a.start_time >= ? AND a.start_time <= ?
      ORDER BY a.start_time ASC
    `,
      [start, end]
    );

    for (const r of Array.isArray(rows) ? rows : []) {
      const id = `apt-${r.id}`;
      const startTime = r.start_time ? new Date(r.start_time) : null;
      const endTime = r.end_time ? new Date(r.end_time) : null;
      if (!startTime || Number.isNaN(startTime.getTime())) continue;

      const existing = byId.get(id);
      const leadId = existing?.leadId ?? r.lead_id ?? null;
      let clientName = pickBestName(
        existing?.clientName,
        r.resolved_customer_name,
        r.customer_name,
        existing?.title
      );

      if (!clientName || isPlaceholderClient(clientName)) {
        const resolved = await resolveLeadCustomerName(pool, crmDb, r.lead_type, leadId || r.lead_id);
        if (resolved) clientName = formatPersonName(resolved);
      }

      const typeLabel = humanMeetingType(existing?.meetingType || r.meeting_type);
      const timeStr =
        startTime && endTime
          ? `${formatIstTime(startTime)} – ${formatIstTime(endTime)}`
          : formatIstTime(startTime);

      const displayName = clientName || (leadId ? `Lead ${leadId}` : 'Client');

      const merged: HallwayTodayEvent = {
        id,
        time: existing?.time || timeStr,
        title: displayName,
        location: existing?.location || r.sales_branch || undefined,
        isLink: Boolean(r.google_html_link || existing?.linkUrl),
        linkUrl: existing?.linkUrl || r.google_html_link || null,
        category: existing?.category || 'meeting',
        startAt: existing?.startAt || startTime.toISOString(),
        endAt:
          existing?.endAt ||
          (endTime && !Number.isNaN(endTime.getTime()) ? endTime.toISOString() : undefined),
        clientName: displayName,
        leadId,
        crmPersonName: existing?.crmPersonName || r.sales_person_name || null,
        designerName: existing?.designerName || r.designer_name || null,
        meetingType: typeLabel,
      };
      byId.set(id, merged);
    }

    for (const [id, ev] of byId) {
      if (!isPlaceholderClient(ev.clientName) && !isPlaceholderClient(ev.title)) continue;
      const leadMatch =
        String(ev.title || ev.clientName || '').match(/lead\s*id\s*[:#]?\s*(\d+)/i) ||
        String(ev.title || ev.clientName || '').match(/\blead\s+(\d+)\b/i);
      const leadId = ev.leadId || leadMatch?.[1];
      if (!leadId) continue;
      const resolved = await resolveLeadCustomerName(pool, crmDb, null, leadId);
      if (!resolved) continue;
      const name = formatPersonName(resolved);
      byId.set(id, {
        ...ev,
        clientName: name,
        title: name,
        leadId: ev.leadId || leadId,
      });
    }

    const mergedList = Array.from(byId.values()).sort((a, b) => {
      const ta = a.startAt ? Date.parse(a.startAt) : 0;
      const tb = b.startAt ? Date.parse(b.startAt) : 0;
      return ta - tb;
    });

    return {
      ...hubPayload,
      dayBasis: hubPayload.dayBasis || 'Asia/Kolkata calendar day (Hub + appointments)',
      date: hubPayload.date || dateYmd,
      events: mergedList,
    };
  } catch (err) {
    console.warn('[hallwayTodayMerge] appointment merge skipped:', err);
    return hubPayload;
  }
}
