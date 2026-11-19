import { NextResponse } from 'next/server';
import { resolveHallwayIdentity } from '../../../../lib/hallwayPortalResolve';
import { isDesignRole } from '../../../../lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function stripSlash(url: string) {
  return url.replace(/\/$/, '');
}

/** Prefer server env; fall back so Vercel misconfig still hits the known Design API host. */
const DESIGN_MODULE_BASE_URLS = Array.from(
  new Set(
    [
      process.env.DESIGN_MODULE_BASE_URL,
      process.env.DESIGN_API_URL,
      process.env.DESIGN_MODULE_FRONTEND_URL,
      'https://api.hubinterior.com',
      'https://design.hubinterior.com',
    ]
      .filter(Boolean)
      .map((u) => stripSlash(String(u)))
  )
);

const CRM_BASE = stripSlash(
  process.env.CRM_API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_CRM_API_URL ||
    'https://hows.hubinterior.com'
);

/** Vercel → Design can be slower than local; 4.5s was aborting healthy Design API. */
const DESIGN_AUTH_TIMEOUT_MS = 12000;
const CRM_AUTH_TIMEOUT_MS = 8000;
const IDENTITY_TIMEOUT_MS = 8000;

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
  baseUrl?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function isSalesFamilyRole(role?: string | null): boolean {
  const r = String(role || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return r.includes('PRESALES') || r.includes('SALES') || r === 'CRM_ADMIN' || r === 'SALES_ADMIN';
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

async function tryDesignLoginOnce(baseUrl: string, email: string, password: string): Promise<AuthAttempt> {
  try {
    const local = email.includes('@') ? email.split('@')[0] : email;
    const emailValue = email.includes('@') ? email : `${email}@hubinterior.com`;
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: emailValue, username: local, password }),
      signal: AbortSignal.timeout(DESIGN_AUTH_TIMEOUT_MS),
      cache: 'no-store',
    });
    const data = asRecord(await res.json().catch(() => null));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        outage: res.status >= 500 || res.status === 404,
        authFailed: res.status === 401,
        baseUrl,
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
        baseUrl,
        message: 'Design Studio returned an incomplete login response.',
      };
    }
    return {
      ok: true,
      status: 200,
      outage: false,
      authFailed: false,
      baseUrl,
      sessionId,
      user: {
        email: typeof user.email === 'string' ? user.email : email,
        name: typeof user.name === 'string' ? user.name : undefined,
        role: typeof user.role === 'string' ? user.role : 'DESIGNER',
        id: (user.id as number | string | undefined) ?? undefined,
      },
    };
  } catch (err) {
    console.warn('[hallway/login] Design auth unreachable', {
      baseUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      status: 503,
      outage: true,
      authFailed: false,
      baseUrl,
      message: 'Design Studio is temporarily unavailable.',
    };
  }
}

async function tryDesignLogin(email: string, password: string): Promise<AuthAttempt> {
  let last: AuthAttempt = {
    ok: false,
    status: 503,
    outage: true,
    authFailed: false,
    message: 'Design Studio is temporarily unavailable.',
  };
  for (const base of DESIGN_MODULE_BASE_URLS) {
    last = await tryDesignLoginOnce(base, email, password);
    if (last.ok || last.authFailed) return last;
  }
  return last;
}

async function tryCrmLoginOnce(username: string, password: string, email?: string): Promise<AuthAttempt> {
  try {
    const res = await fetch(`${CRM_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        ...(email ? { email } : {}),
      }),
      signal: AbortSignal.timeout(CRM_AUTH_TIMEOUT_MS),
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
        : { username },
    };
  } catch (err) {
    console.warn('[hallway/login] CRM auth unreachable', {
      base: CRM_BASE,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      status: 503,
      outage: true,
      authFailed: false,
      message: 'CRM is temporarily unavailable.',
    };
  }
}

async function tryCrmLogin(identifier: string, password: string): Promise<AuthAttempt> {
  const email = identifier.includes('@') ? identifier : '';
  const local = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  const first = await tryCrmLoginOnce(identifier, password, email || undefined);
  if (first.ok || first.outage) return first;
  if (local && local !== identifier) {
    const second = await tryCrmLoginOnce(local, password, email || undefined);
    if (second.ok || second.outage) return second;
    if (second.authFailed) return second;
  }
  return first;
}

/**
 * Unified Hallway login — identity-first.
 * Sales/Presales never wait on Design. Designers get Design first, Hub admit if Design is down.
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

    const preferCrm =
      identity?.portal === 'crm' || isSalesFamilyRole(identity?.role);
    const preferDesign =
      !preferCrm &&
      (identity?.portal === 'design' || isDesignRole(identity?.role));

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

    const designEmail = identifier.includes('@') ? identifier : emailGuess || identifier;

    if (preferCrm) {
      // Sales / Presales — CRM only. Never call Design (avoids false Design 503).
      crm = await tryCrmLogin(identifier, password);
    } else if (preferDesign) {
      // Design + Hub in parallel so a Design outage does not block Hallway if Hub still auth's.
      const [designResult, crmResult] = await Promise.all([
        tryDesignLogin(designEmail, password),
        tryCrmLogin(identifier, password),
      ]);
      design = designResult;
      crm = crmResult;
    } else {
      const [crmResult, designResult] = await Promise.all([
        tryCrmLogin(identifier, password),
        tryDesignLogin(designEmail, password),
      ]);
      crm = crmResult;
      design = designResult;
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
      (preferDesign ||
        resolvedIdentity?.portal === 'design' ||
        isDesignRole(design.user?.role) ||
        isDesignRole(crm.user?.role) ||
        isDesignRole(resolvedIdentity?.role)) &&
      !isSalesFamilyRole(resolvedIdentity?.role) &&
      !isSalesFamilyRole(crm.user?.role);

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

    if (crm.ok && crm.token) {
      if (isDesigner) {
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
            ? 'Design Studio is temporarily unreachable from Hallway. You are signed into Hallway; open Design Studio directly if needed.'
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

    // Failures
    if (preferCrm || isSalesFamilyRole(resolvedIdentity?.role)) {
      if (crm.outage) {
        return NextResponse.json(
          { ok: false, message: 'CRM is temporarily unavailable. Please try again shortly.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, message: 'Invalid username or password' }, { status: 401 });
    }

    if (isDesigner || preferDesign) {
      if (design.outage && !crm.ok) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Design Studio is temporarily unavailable and we could not verify your Hallway access. Sign in at https://design.hubinterior.com/login, then retry Hallway — or try again shortly.',
            designBaseTried: DESIGN_MODULE_BASE_URLS,
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
    return NextResponse.json({ ok: false, message: 'Login failed. Please try again.' }, { status: 500 });
  }
}
