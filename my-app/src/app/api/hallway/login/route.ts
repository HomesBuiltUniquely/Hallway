import { NextResponse } from 'next/server';
import { resolveHallwayIdentity } from '../../../lib/hallwayPortalResolve';
import { isDesignRole } from '../../../lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DESIGN_MODULE_BASE_URL = (
  process.env.DESIGN_MODULE_BASE_URL ||
  process.env.DESIGN_API_URL ||
  'https://api.hubinterior.com'
).replace(/\/$/, '');

const CRM_BASE = (
  process.env.CRM_API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_CRM_API_URL ||
  'https://hows.hubinterior.com'
).replace(/\/$/, '');

type AuthAttempt = {
  ok: boolean;
  status: number;
  outage: boolean;
  authFailed: boolean;
  user?: {
    email?: string;
    name?: string;
    username?: string;
    role?: string;
    id?: number | string;
  } | null;
  sessionId?: string | null;
  token?: string | null;
  message?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

async function tryDesignLogin(email: string, password: string): Promise<AuthAttempt> {
  try {
    const res = await fetch(`${DESIGN_MODULE_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    const data = asRecord(await res.json().catch(() => null));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        outage: res.status >= 500,
        authFailed: res.status === 401 || res.status === 400,
        message:
          typeof data?.message === 'string'
            ? data.message
            : res.status >= 500
              ? 'Design Studio is temporarily unavailable.'
              : 'Invalid email or password',
      };
    }
    const user = asRecord(data?.user) || data;
    const sessionId =
      (typeof data?.sessionId === 'string' && data.sessionId) ||
      (typeof data?.session_id === 'string' && data.session_id) ||
      null;
    if (!user || !sessionId) {
      return {
        ok: false,
        status: 502,
        outage: true,
        authFailed: false,
        message: 'Design Studio returned an incomplete login response.',
      };
    }
    return {
      ok: true,
      status: 200,
      outage: false,
      authFailed: false,
      sessionId,
      user: {
        email: typeof user.email === 'string' ? user.email : email,
        name: typeof user.name === 'string' ? user.name : undefined,
        role: typeof user.role === 'string' ? user.role : 'DESIGNER',
        id: (user.id as number | string | undefined) ?? undefined,
      },
    };
  } catch {
    return {
      ok: false,
      status: 503,
      outage: true,
      authFailed: false,
      message: 'Design Studio is temporarily unavailable.',
    };
  }
}

async function tryCrmLogin(identifier: string, password: string): Promise<AuthAttempt> {
  try {
    const res = await fetch(`${CRM_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    const data = asRecord(await res.json().catch(() => null));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        outage: res.status >= 500,
        authFailed: res.status === 401 || res.status === 400,
        message:
          typeof data?.message === 'string'
            ? data.message
            : res.status >= 500
              ? 'CRM is temporarily unavailable.'
              : 'Invalid username or password',
      };
    }
    const token =
      (typeof data?.token === 'string' && data.token) ||
      (typeof asRecord(data?.data)?.token === 'string' && String(asRecord(data?.data)?.token)) ||
      null;
    const userRaw = asRecord(data?.user) || asRecord(asRecord(data?.data)?.user);
    if (!token) {
      return {
        ok: false,
        status: 502,
        outage: true,
        authFailed: false,
        message: 'CRM returned an incomplete login response.',
      };
    }
    return {
      ok: true,
      status: 200,
      outage: false,
      authFailed: false,
      token,
      user: userRaw
        ? {
            email: typeof userRaw.email === 'string' ? userRaw.email : undefined,
            name:
              (typeof userRaw.fullName === 'string' && userRaw.fullName) ||
              (typeof userRaw.name === 'string' && userRaw.name) ||
              (typeof userRaw.username === 'string' && userRaw.username) ||
              undefined,
            username: typeof userRaw.username === 'string' ? userRaw.username : undefined,
            role:
              (typeof userRaw.role === 'string' && userRaw.role) ||
              (typeof userRaw.userRole === 'string' && userRaw.userRole) ||
              undefined,
            id: (userRaw.id as number | string | undefined) ?? undefined,
          }
        : { username: identifier },
    };
  } catch {
    return {
      ok: false,
      status: 503,
      outage: true,
      authFailed: false,
      message: 'CRM is temporarily unavailable.',
    };
  }
}

/**
 * Unified Hallway login.
 * - Designers always get Design portal (CRM tile hidden), even if Design API is down
 *   and Hub auth still works.
 * - Sales get Sales portal.
 * - Error copy is role-aware — never tell a designer "CRM login did not succeed".
 */
export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json().catch(() => null));
    const identifier = String(body?.email || body?.username || body?.identifier || '').trim();
    const password = String(body?.password || '');
    if (!identifier || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const [design, crm] = await Promise.all([
      tryDesignLogin(identifier, password),
      tryCrmLogin(identifier, password),
    ]);

    const identity = await resolveHallwayIdentity({
      email: design.user?.email || crm.user?.email || (identifier.includes('@') ? identifier : ''),
      username: crm.user?.username || (!identifier.includes('@') ? identifier : ''),
      name: design.user?.name || crm.user?.name,
      roleHint: design.user?.role || crm.user?.role,
    });

    const isDesigner =
      identity?.portal === 'design' ||
      isDesignRole(design.user?.role) ||
      isDesignRole(crm.user?.role) ||
      isDesignRole(identity?.role);

    // 1) Design auth succeeded → Design portal
    if (design.ok && design.sessionId && design.user) {
      return NextResponse.json({
        ok: true,
        portal: 'design',
        department: 'Design',
        role: design.user.role || identity?.role || 'DESIGNER',
        user: {
          email: design.user.email || identifier,
          name: design.user.name || design.user.email || identifier,
          role: design.user.role || 'DESIGNER',
        },
        designSession: { user: design.user, sessionId: design.sessionId },
        crmSession: null,
      });
    }

    // 2) Hub auth succeeded
    if (crm.ok && crm.token) {
      if (isDesigner) {
        // Design module may be down — still admit designer to Hallway, never unlock CRM.
        return NextResponse.json({
          ok: true,
          portal: 'design',
          department: 'Design',
          role: identity?.role || crm.user?.role || 'DESIGNER',
          user: {
            email: crm.user?.email || identifier,
            name: crm.user?.name || crm.user?.username || identifier,
            role: identity?.role || crm.user?.role || 'DESIGNER',
          },
          designSession: null,
          crmSession: null,
          notice:
            design.outage
              ? 'Design Studio is temporarily unavailable. You can use Hallway; Design module launch may be blocked until it recovers.'
              : undefined,
        });
      }

      return NextResponse.json({
        ok: true,
        portal: 'crm',
        department: 'Sales',
        role: identity?.role || crm.user?.role || 'SALES_EXECUTIVE',
        user: {
          email: crm.user?.email || identifier,
          name: crm.user?.name || crm.user?.username || identifier,
          role: identity?.role || crm.user?.role || 'SALES_EXECUTIVE',
          username: crm.user?.username,
          id: crm.user?.id,
        },
        designSession: null,
        crmSession: {
          token: crm.token,
          user: crm.user,
        },
      });
    }

    // 3) Failures — accurate, role-aware messages
    if (isDesigner || design.outage) {
      if (design.outage) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Design Studio is temporarily unavailable. Please try again shortly.',
          },
          { status: 503 }
        );
      }
      if (design.authFailed || crm.authFailed) {
        return NextResponse.json(
          { ok: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    if (design.outage && crm.outage) {
      return NextResponse.json(
        { ok: false, message: 'HUB services are temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    if (crm.outage) {
      return NextResponse.json(
        { ok: false, message: 'CRM is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    if (design.authFailed || crm.authFailed) {
      return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, message: design.message || crm.message || 'Login failed. Please try again.' },
      { status: 401 }
    );
  } catch (err) {
    console.error('[hallway/login]', err);
    return NextResponse.json(
      { ok: false, message: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
