import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DESIGN_MODULE_BASE_URL = (
  process.env.DESIGN_MODULE_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '');

/** Confirm a Design Module session before opening Hallway home from the app switcher. */
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${DESIGN_MODULE_BASE_URL}/api/auth/me`, {
      headers: { Authorization: authorization },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: 'Unauthorized' }, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Design Module is unreachable.' }, { status: 502 });
  }
}
