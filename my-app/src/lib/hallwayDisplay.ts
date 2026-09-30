export function istYmd(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function istMonthBounds() {
  const today = istYmd();
  const [year, month] = today.split('-');
  return { dateFrom: `${year}-${month}-01`, dateTo: today };
}

export function milestoneLabel(item: { name?: string; key?: string }): string {
  return item.name || item.key || 'Unknown';
}

export function progressWidth(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '0%';
  return `${Math.max(0, Math.min(100, Number(value)))}%`;
}

export function getYesterdayYmd(): string {
  const now = new Date();
  const todayYmd = istYmd(now);
  const [y, m, d] = todayYmd.split('-').map(Number);
  const istDateObj = new Date(y, m - 1, d);
  istDateObj.setDate(istDateObj.getDate() - 1);
  return istYmd(istDateObj);
}

export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Just now';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : 'Just now';
  }

  const now = new Date();
  const todayYmd = istYmd(now);
  const itemYmd = istYmd(date);
  const yesterdayYmd = getYesterdayYmd();

  if (itemYmd === yesterdayYmd) {
    return 'Yesterday';
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0 || diffMs < 45_000) return 'Just now';
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function isTodayOrYesterday(
  dateInput?: string | Date | null,
  fallbackTimestamp?: string | null
): boolean {
  const now = new Date();
  const todayYmd = istYmd(now);
  const yesterdayYmd = getYesterdayYmd();

  if (dateInput) {
    const parsed = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!isNaN(parsed.getTime())) {
      const itemYmd = istYmd(parsed);
      return itemYmd === todayYmd || itemYmd === yesterdayYmd;
    }
  }

  if (fallbackTimestamp) {
    const lower = fallbackTimestamp.trim().toLowerCase();
    if (
      lower.includes('just now') ||
      lower.includes('live') ||
      lower.includes('min') ||
      lower.includes('sec') ||
      lower.includes('hour') ||
      lower.includes('today') ||
      lower.includes('yesterday') ||
      lower === '1d ago' ||
      lower === '1 day ago'
    ) {
      return true;
    }
    if (
      /\b([2-9]|\d{2,})\s*(d|day|days|w|week|weeks|m|month|months|y|year|years)\s*ago\b/i.test(lower) ||
      /\b([2-9]|\d{2,})d\b/i.test(lower)
    ) {
      return false;
    }
  }

  return true;
}

export function cleanPostContent(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\s*Synced directly from CRM.*?\./gi, '')
    .replace(/\s*Synced directly from CRM sales_targets\.?/gi, '')
    .trim();
}


