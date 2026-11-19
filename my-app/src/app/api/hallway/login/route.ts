import { NextResponse } from 'next/server';
import { resolveHallwayIdentity } from '../../../../lib/hallwayPortalResolve';
import { isDesignRole } from '../../../../lib/permissions';

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

/** Keep Hallway login snappy — never wait on a dead Design/CRM host. */
const AUTH_TIMEOUT_MS = 4500;
const IDENTITY_TIMEOUT_MS = 2500;

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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function tryDesignLogin(email: string, password: string): Promise<AuthAttempt> {
  try {
    const res = await fetch(`${DESIGN_MODULE_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
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
 * Unified Hallway login — identity-first so designers are never routed to CRM
 * and we do not wait on both Design + CRM when we already know the portal.
 */
export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json().catch(() => null));
    const identifier = String(body?.email || body?.username || body?.identifier || '').trim();
    const password = String(body?.password || '');
    if (!identifier || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const emailGuess = identifier.includes('@') ? identifier : '';
    const usernameGuess = identifier.includes('@') ? identifier.split('@')[0] : identifier;

    // 1) Resolve portal from DB first (short timeout) — Anushka = DESIGNER.
    const identity = await withTimeout(
      resolveHallwayIdentity({
        email: emailGuess,
        username: usernameGuess,
        name: '',
        roleHint: null,
      }),
      IDENTITY_TIMEOUT_MS,
      null
    );

    const preferDesign =
      identity?.portal === 'design' || isDesignRole(identity?.role);

    let design: AuthAttempt = {
      ok: false,
      status: 0,
      outage: false,
      authFailed: false,
    };
    let crm: AuthAttempt = {
      ok: false,
      status: 0,
      outage: false,
      authFailed: false,
    };

    if (preferDesign) {
      // Designer path: Design first; CRM only as Hallway admit fallback (no CRM session).
      design = await tryDesignLogin(identifier.includes('@') ? identifier : emailGuess || identifier, password);
      if (!design.ok) {
        crm = await tryCrmLogin(identifier, password);
      }
    } else if (identity?.portal === 'crm') {
      crm = await tryCrmLogin(identifier, password);
    } else {
      // Unknown identity — parallel, but each call is hard-capped.
      [design, crm] = await Promise.all([
        tryDesignLogin(identifier.includes('@') ? identifier : identifier, password),
        tryCrmLogin(identifier, password),
      ]);
    }

    const resolvedIdentity =
      identity ||
      (await withTimeout(
        resolveHallwayIdentity({
          email: design.user?.email || crm.user?.email || emailGuess,
          username: crm.user?.username || usernameGuess,
          name: design.user?.name || crm.user?.name,
          roleHint: design.user?.role || crm.user?.role,
        }),
        IDENTITY_TIMEOUT_MS,
        null
      ));

    const isDesigner =
      preferDesign ||
      resolvedIdentity?.portal === 'design' ||
      isDesignRole(design.user?.role) ||
      isDesignRole(crm.user?.role) ||
      isDesignRole(resolvedIdentity?.role);

    // Design auth succeeded → Design portal
    if (design.ok && design.sessionId && design.user) {
      return NextResponse.json({
        ok: true,
        portal: 'design',
        department: 'Design',
        role: design.user.role || resolvedIdentity?.role || 'DESIGNER',
        user: {
          email: design.user.email || identifier,
          name: design.user.name || design.user.email || identifier,
          role: design.user.role || 'DESIGNER',
        },
        designSession: { user: design.user, sessionId: design.sessionId },
        crmSession: null,
      });
    }

    // Hub auth succeeded
    if (crm.ok && crm.token) {
      if (isDesigner) {
        // Design module down — still admit designer to Hallway; never unlock CRM.
        return NextResponse.json({
          ok: true,
          portal: 'design',
          department: 'Design',
          role: resolvedIdentity?.role || crm.user?.role || 'DESIGNER',
          user: {
            email: crm.user?.email || identifier,
            name: crm.user?.name || crm.user?.username || identifier,
            role: resolvedIdentity?.role || crm.user?.role || 'DESIGNER',
          },
          designSession: null,
          crmSession: null,
          notice: design.outage
            ? 'Design Studio is temporarily unavailable. You can use Hallway; Design launch may be blocked until it recovers.'
            : undefined,
        });
      }

      return NextResponse.json({
        ok: true,
        portal: 'crm',
        department: 'Sales',
        role: resolvedIdentity?.role || crm.user?.role || 'SALES_EXECUTIVE',
        user: {
          email: crm.user?.email || identifier,
          name: crm.user?.name || crm.user?.username || identifier,
          role: resolvedIdentity?.role || crm.user?.role || 'SALES_EXECUTIVE',
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

    // Failures — role-aware
    if (isDesigner) {
      if (design.outage && !crm.ok) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Design Studio is temporarily unavailable and we could not verify your Hallway access. Please try again shortly.',
          },
          { status: 503 }
        );
      }
      if (design.authFailed || crm.authFailed) {
        return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });
      }
    }

    if (design.outage && crm.outage) {
      return NextResponse.json(
        { ok: false, message: 'HUB services are temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    if (crm.outage && !preferDesign) {
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
    return NextResponse.json({ ok: false, message: 'Login failed. Please try again.' }, { status: 500 });
  }
}
