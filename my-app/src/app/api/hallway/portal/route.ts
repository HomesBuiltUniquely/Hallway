import { NextRequest, NextResponse } from 'next/server';
import { resolveHallwayIdentity } from '../../../lib/hallwayPortalResolve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resolve app-switcher portal for an email (used on session hydrate). */
export async function GET(request: NextRequest) {
  const email = String(request.nextUrl.searchParams.get('email') || '').trim();
  const username = String(request.nextUrl.searchParams.get('username') || '').trim();
  const name = String(request.nextUrl.searchParams.get('name') || '').trim();
  const roleHint = String(request.nextUrl.searchParams.get('role') || '').trim();
  if (!email && !username && !name) {
    return NextResponse.json({ message: 'email required' }, { status: 400 });
  }
  const identity = await resolveHallwayIdentity({ email, username, name, roleHint });
  if (!identity) {
    return NextResponse.json({ portal: null }, { status: 200 });
  }
  return NextResponse.json(identity);
}
