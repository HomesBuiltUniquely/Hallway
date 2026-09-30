import { getCrmSessionSnapshot, getStoredCrmRole, landingPathByRole } from './crmApi';

const DESIGN_HANDOFF_KEY = 'hallway-design-handoff';
const CRM_API_HOSTS = new Set(['hows.hubinterior.com']);

function stripSlash(url: string) {
  return url.replace(/\/$/, '');
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function isHubApiOrigin(url: string) {
  const host = hostOf(url);
  if (host && CRM_API_HOSTS.has(host)) return true;
  return /\/api\/auth(?:\/|$)/i.test(url);
}

export function crmFrontendUrl() {
  const configured = stripSlash(
    process.env.NEXT_PUBLIC_CRM_FRONTEND_URL ||
      process.env.NEXT_PUBLIC_CRM_DASHBOARD_URL ||
      ''
  );
  if (configured && !isHubApiOrigin(configured)) return configured;
  return '';
}

export function crmDashboardUrl() {
  return crmFrontendUrl();
}

export function designDashboardUrl() {
  return (
    process.env.NEXT_PUBLIC_DESIGN_MODULE_FRONTEND_URL || 'https://design.hubinterior.com'
  ).replace(/\/$/, '');
}

export function saveDesignHandoff(user: unknown, sessionId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DESIGN_HANDOFF_KEY, JSON.stringify({ user, sessionId }));
}

export function clearDesignHandoff() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DESIGN_HANDOFF_KEY);
}

export function openCrmDashboard() {
  const origin = crmFrontendUrl();
  if (!origin) {
    if (typeof window !== 'undefined') {
      window.location.assign('/crm-erp');
    }
    return;
  }

  // Preferred CRM handoff: /auth/accept clears leftover CRM-origin session,
  // writes Hallway crm_* keys, then routes by role (/Leads or /presales-leads).
  // Fallback without session: open landing path directly (user may need to log in on CRM).
  const session = getCrmSessionSnapshot();
  if (session) {
    window.location.assign(
      `${origin}/auth/accept#payload=${encodeURIComponent(JSON.stringify(session))}`
    );
    return;
  }
  window.location.assign(`${origin}${landingPathByRole(getStoredCrmRole())}`);
}

export function openDesignDashboard() {
  const base = designDashboardUrl();
  try {
    const raw = window.localStorage.getItem(DESIGN_HANDOFF_KEY);
    if (raw) {
      const data = JSON.parse(raw) as { user?: unknown; sessionId?: string };
      if (data?.sessionId && data?.user) {
        const payload = encodeURIComponent(JSON.stringify(data));
        window.location.assign(`${base}/auth/accept#payload=${payload}`);
        return;
      }
    }
  } catch {
    // Fall through to the public Design Module URL.
  }
  window.location.assign(base);
}
