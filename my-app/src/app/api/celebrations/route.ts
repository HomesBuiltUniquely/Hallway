import { NextResponse } from 'next/server';
import {
  celebrationSecret,
  createCelebration,
  listUnseenCelebrations,
  normalizeViewerKey,
} from '@/lib/celebrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-celebration-key',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const viewerParam = new URL(request.url).searchParams.get('viewer');
  if (!normalizeViewerKey(viewerParam?.split(',')[0])) {
    return NextResponse.json({ events: [] }, { headers: corsHeaders(request) });
  }
  const events = await listUnseenCelebrations(viewerParam || '', 5);
  return NextResponse.json({ events }, { headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const provided = request.headers.get('x-celebration-key') || '';
  if (provided !== celebrationSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers });
  }
  const result = await createCelebration({
    bookingId: body.bookingId,
    celebrationType: body.celebrationType,
    salespersonName: body.salespersonName,
    branchName: body.branchName,
    customerName: body.customerName,
    quoteAmount: Number(body.quoteAmount),
  });
  return NextResponse.json(result, { status: result.created ? 201 : 200, headers });
}
