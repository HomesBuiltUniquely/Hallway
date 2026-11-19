/** Shared IST date helpers for Today + My Actions BFF. */

export function istTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Parse follow-up / due strings into YYYY-MM-DD in Asia/Kolkata. */
export function parseIstYmd(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^0{4}-0{2}-0{2}/.test(s) || /^0000/.test(s)) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const ymd = s.slice(0, 10);
    if (ymd.startsWith('0000')) return null;
    return ymd;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 1971) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  }

  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m && m[1] !== '0000') return `${m[1]}-${m[2]}-${m[3]}`;

  const dm = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dm) {
    const dd = dm[1].padStart(2, '0');
    const mm = dm[2].padStart(2, '0');
    return `${dm[3]}-${mm}-${dd}`;
  }
  return null;
}

export function dateMatchesIstToday(raw: string | null | undefined, todayYmd: string): boolean {
  const ymd = parseIstYmd(raw);
  return ymd != null && ymd === todayYmd;
}

/** Due today or overdue (IST calendar day). Missing/invalid dates are not matches. */
export function dateOnOrBeforeIstToday(raw: string | null | undefined, todayYmd: string): boolean {
  const ymd = parseIstYmd(raw);
  if (!ymd) return false;
  return ymd <= todayYmd;
}

export function isMissingOrInvalidDue(raw: string | null | undefined): boolean {
  return parseIstYmd(raw) == null;
}

export function dueToneLabel(raw: string | null | undefined, todayYmd: string): 'Overdue' | 'Due today' | 'No due date' {
  const ymd = parseIstYmd(raw);
  if (!ymd) return 'No due date';
  if (ymd < todayYmd) return 'Overdue';
  if (ymd === todayYmd) return 'Due today';
  return 'Due today';
}

export function formatIstTimeFromRaw(raw: string | null | undefined): string {
  const s = String(raw || '').trim();
  if (!s || /^0{4}-0{2}-0{2}/.test(s)) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1971) {
    const tm = s.match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      const h = Number(tm[1]);
      const ap = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${tm[2]} ${ap}`;
    }
    return '';
  }
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/** Short IST due date for oversight lists — not a clock time. */
export function formatIstDueDateLabel(
  raw: string | null | undefined,
  todayYmd: string
): string {
  const ymd = parseIstYmd(raw);
  if (!ymd) return 'No due date';
  if (ymd === todayYmd) return 'Today';
  const d = new Date(`${ymd}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
}
