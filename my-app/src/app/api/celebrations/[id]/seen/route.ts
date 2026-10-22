import { NextResponse } from 'next/server';
import { markCelebrationSeen, normalizeViewerKey } from '@/lib/celebrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-celebration-key',
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const viewer = normalizeViewerKey(body?.viewerKey || new URL(request.url).searchParams.get('viewer'));
  if (!viewer) {
    return NextResponse.json({ error: 'viewerKey is required' }, { status: 400, headers: corsHeaders(request) });
  }
  await markCelebrationSeen(id, viewer, Boolean(body?.congratulated));
  return NextResponse.json({ success: true }, { headers: corsHeaders(request) });
}
