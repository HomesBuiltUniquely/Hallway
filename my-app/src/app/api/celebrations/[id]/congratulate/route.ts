import { NextResponse } from 'next/server';
import { addComment, ensureHallwaySchema, getPool } from '@/lib/db';
import { markCelebrationSeen, normalizeViewerKey, typeLabel } from '@/lib/celebrations';

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

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request, context: RouteContext) {
  const headers = corsHeaders(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const viewer = normalizeViewerKey(body?.viewerKey);
  const authorName = String(body?.authorName || 'Hub member').trim() || 'Hub member';
  if (!viewer) {
    return NextResponse.json({ error: 'viewerKey is required' }, { status: 400, headers });
  }

  await ensureHallwaySchema();
  const pool = getPool();
  const [rows] = await pool.query<any[]>(
    `SELECT announcement_id, celebration_type, salesperson_name, branch_name, customer_name, quote_amount
     FROM celebration_events WHERE id = ? LIMIT 1`,
    [id]
  );
  const event = rows?.[0];
  if (!event) {
    return NextResponse.json({ error: 'Celebration not found' }, { status: 404, headers });
  }

  const [already] = await pool.query<any[]>(
    `SELECT congratulated_at FROM celebration_receipts WHERE event_id = ? AND viewer_key = ? LIMIT 1`,
    [id, viewer]
  );
  if (!already?.[0]?.congratulated_at) {
    const label = typeLabel(String(event.celebration_type || ''));
    await addComment(
      String(event.announcement_id),
      { content: 'Congratulations', authorName, authorRole: 'Hub' },
      {
        type: 'booking',
        title: `${label} — ${event.salesperson_name}`,
        content: `${event.salesperson_name} booked ${event.customer_name || 'a home'}.`,
        authorName: event.salesperson_name,
        authorTeam: event.branch_name || 'Sales',
        categoryColor: '#10B981',
        department: 'Sales',
      }
    );
  }

  await markCelebrationSeen(id, viewer, true);
  return NextResponse.json({ success: true }, { headers });
}
