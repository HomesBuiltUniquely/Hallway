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

/**
 * Cleanly formats a raw username, email, or handle into a proper human display name.
 * e.g. "sachin_shekar" -> "Sachin Shekar"
 *      "somashekar_v" -> "Somashekar V"
 *      "sachin.shekar@hubinterior.com" -> "Sachin Shekar"
 *      "ranjith" -> "Ranjith"
 */
export function formatPersonName(raw?: string | null): string {
  if (!raw) return 'User';
  let clean = raw.trim();

  // Strip email domain if provided: e.g. sachin_shekar@hubinterior.com -> sachin_shekar
  if (clean.includes('@')) {
    clean = clean.split('@')[0];
  }

  // Replace underscores, dots, and hyphens with spaces: sachin_shekar -> sachin shekar
  clean = clean.replace(/[_\.\-]+/g, ' ').trim();

  // Title-case each word: "sachin shekar" -> "Sachin Shekar"
  return (
    clean
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'User'
  );
}

/**
 * Returns a warm first name or friendly name for dashboard greetings.
 * e.g. "sachin_shekar" -> "Sachin"
 *      "Sachin Shekar" -> "Sachin"
 *      "Ranjith" -> "Ranjith"
 *      "Super Admin" -> "Admin"
 */
export function getGreetingName(raw?: string | null): string {
  const formatted = formatPersonName(raw);
  if (!formatted || formatted.toLowerCase() === 'user') return 'there';
  if (formatted.toLowerCase().includes('admin')) return 'Admin';
  const first = formatted.split(' ')[0];
  return first || formatted;
}

/**
 * Computes the time-of-day greeting based on the current local hour.
 * - 04:00 to 11:59: "Good morning"
 * - 12:00 to 16:59: "Good afternoon"
 * - 17:00 to 03:59: "Good evening"
 */
export function getTimeBasedGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 4 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}


