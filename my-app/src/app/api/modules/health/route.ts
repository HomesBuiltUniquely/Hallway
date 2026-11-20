import { NextRequest, NextResponse } from 'next/server';
import {
  LOGIN_CRM_UNAVAILABLE,
  LOGIN_DESIGN_UNAVAILABLE,
} from '../../../../lib/hallwayAuthMessages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function stripSlash(url: string) {
  return url.replace(/\/$/, '');
}

function crmOrigin() {
  const configured = stripSlash(
    process.env.NEXT_PUBLIC_CRM_FRONTEND_URL || process.env.NEXT_PUBLIC_CRM_DASHBOARD_URL || ''
  );
  if (configured && !/hows\.hubinterior\.com/i.test(configured)) return configured;
  return '';
}

function designOrigin() {
  return stripSlash(
    process.env.NEXT_PUBLIC_DESIGN_MODULE_FRONTEND_URL || 'https://design.hubinterior.com'
  );
}

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(2800),
      headers: { Accept: 'text/html,application/json' },
    });
    // Any HTTP response means the host is up (401/302 still = reachable).
    return res.status > 0 && res.status < 600;
  } catch {
    return false;
  }
}

/**
 * Lightweight reachability check for app-switcher modules.
 * Design/CRM down → Hallway must not open blank shells.
 */
export async function GET(request: NextRequest) {
  const target = (request.nextUrl.searchParams.get('target') || '').toLowerCase();
  if (target !== 'crm' && target !== 'design') {
    return NextResponse.json({ ok: false, message: 'target must be crm or design' }, { status: 400 });
  }

  if (target === 'crm') {
    const origin = crmOrigin();
    if (!origin) {
      return NextResponse.json(
        { ok: false, target, message: 'CRM frontend is not configured.' },
        { status: 503 }
      );
    }
    const ok = await probe(origin);
    return NextResponse.json(
      {
        ok,
        target,
        message: ok ? undefined : LOGIN_CRM_UNAVAILABLE,
      },
      { status: ok ? 200 : 503 }
    );
  }

  const origin = designOrigin();
  const ok = await probe(origin);
  return NextResponse.json(
    {
      ok,
      target,
      message: ok ? undefined : LOGIN_DESIGN_UNAVAILABLE,
    },
    { status: ok ? 200 : 503 }
  );
}
