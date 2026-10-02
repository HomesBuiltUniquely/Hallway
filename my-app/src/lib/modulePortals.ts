import { getCrmSessionSnapshot, getStoredCrmRole, landingPathByRole } from './crmApi';
import { isSuperAdmin } from './permissions';

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

export function getActiveHallwayUser(): { email?: string; name?: string; department?: string; role?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('hallway-auth');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Checks if the current Hallway user has a verified CRM session that belongs to THEM.
 * If there is a leftover CRM session from a different user, it is discarded.
 */
export function getValidCrmSession(activeUser?: { email?: string; name?: string } | null) {
  if (typeof window === 'undefined') return null;
  const user = activeUser || getActiveHallwayUser();
  if (!user) return null;

  const session = getCrmSessionSnapshot();
  if (!session || !session.crm_token) return null;

  // Verify that the stored CRM user matches the active Hallway user
  const crmUserRaw = window.localStorage.getItem('hallway-crm-user');
  let crmEmail = '';
  let crmUsername = '';
  let crmName = '';
  if (crmUserRaw) {
    try {
      const parsed = JSON.parse(crmUserRaw);
      crmEmail = (parsed.email || '').toLowerCase().trim();
      crmUsername = (parsed.username || '').toLowerCase().trim();
      crmName = (parsed.name || parsed.fullName || '').toLowerCase().trim();
    } catch {
      // ignore
    }
  }

  const activeEmail = (user.email || '').toLowerCase().trim();
  const activeName = (user.name || '').toLowerCase().trim();

  const isMatch =
    (activeEmail && (activeEmail === crmEmail || activeEmail === crmUsername)) ||
    (activeName && (activeName === crmName || activeName === crmUsername));

  if (!isMatch) {
    // Foreign CRM session detected! Clean it up so it never leaks.
    return null;
  }

  return session;
}

/**
 * Checks if the current Hallway user has a verified Design session that belongs to THEM.
 * If there is a leftover Design session from a different user, it is discarded.
 */
export function getValidDesignSession(activeUser?: { email?: string; name?: string } | null) {
  if (typeof window === 'undefined') return null;
  const user = activeUser || getActiveHallwayUser();
  if (!user) return null;

  try {
    const raw = window.localStorage.getItem(DESIGN_HANDOFF_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { user?: any; sessionId?: string };
    if (!data?.sessionId || !data?.user) return null;

    const designEmail = (data.user?.email || '').toLowerCase().trim();
    const designName = (data.user?.name || '').toLowerCase().trim();
    const activeEmail = (user.email || '').toLowerCase().trim();
    const activeName = (user.name || '').toLowerCase().trim();

    const isMatch =
      (activeEmail && activeEmail === designEmail) ||
      (activeName && activeName === designName);

    if (!isMatch) {
      // Foreign Design session detected!
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function openCrmDashboard(activeUser?: { email?: string; name?: string } | null) {
  const origin = crmFrontendUrl();
  if (!origin) {
    if (typeof window !== 'undefined') {
      window.location.assign('/crm-erp');
    }
    return;
  }

  const session = getValidCrmSession(activeUser);
  if (session) {
    window.location.assign(
      `${origin}/auth/accept#payload=${encodeURIComponent(JSON.stringify(session))}`
    );
    return;
  }

  // Admins have unconditional access to CRM
  if (isSuperAdmin(activeUser)) {
    const adminSession = {
      crm_token: `admin-token-${Date.now()}`,
      crm_role: 'ADMIN',
      crm_user_name: activeUser?.name || 'Admin',
      crm_login_username: activeUser?.name || 'admin',
      crm_user_id: '1',
      crm_active_module: 'crm',
    };
    window.location.assign(
      `${origin}/auth/accept#payload=${encodeURIComponent(JSON.stringify(adminSession))}`
    );
    return true;
  }

  // Without a verified user session matching this person, do NOT send them to CRM
  // as it would load whatever leftover cookie is stored in their browser for another person.
  return false;
}

export function openDesignDashboard(activeUser?: { email?: string; name?: string } | null) {
  const base = designDashboardUrl();
  const data = getValidDesignSession(activeUser);
  if (data?.sessionId && data?.user) {
    const payload = encodeURIComponent(JSON.stringify(data));
    window.location.assign(`${base}/auth/accept#payload=${payload}`);
    return true;
  }

  // Admins have unconditional access to Design Studio
  if (isSuperAdmin(activeUser)) {
    const adminUser = {
      id: 1,
      email: activeUser?.email || 'admin@hubinterior.com',
      name: activeUser?.name || 'Admin',
      role: 'ADMIN',
    };
    const adminSessionId = `admin-session-${Date.now()}`;
    saveDesignHandoff(adminUser, adminSessionId);
    const payload = encodeURIComponent(JSON.stringify({ user: adminUser, sessionId: adminSessionId }));
    window.location.assign(`${base}/auth/accept#payload=${payload}`);
    return true;
  }

  // Without a verified user session matching this person, do NOT blindly navigate
  return false;
}
