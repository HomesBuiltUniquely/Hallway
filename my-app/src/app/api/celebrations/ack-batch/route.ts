import { NextResponse } from 'next/server';
import { markCelebrationsSeenBatch, normalizeViewerKey } from '@/lib/celebrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.eventIds) ? body.eventIds : [];
  const aliasList = Array.isArray(body?.viewerKeys) ? body.viewerKeys : [];
  const primary = body?.viewerKey || '';
  const viewers = [primary, ...aliasList].filter(Boolean);
  if (!normalizeViewerKey(String(viewers[0] || ''))) {
    return NextResponse.json({ error: 'viewerKey required' }, { status: 400, headers: corsHeaders(request) });
  }
  await markCelebrationsSeenBatch(ids.map(String), viewers as string[]);
  return NextResponse.json({ success: true }, { headers: corsHeaders(request) });
}