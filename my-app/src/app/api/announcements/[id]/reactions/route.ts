import { NextResponse } from 'next/server';
import { toggleReaction } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { reactionType, postMetadata } = body;

    const ALLOWED_REACTIONS = [
      'thumbsUp', 'clap', 'heart', 'joy', 'surprised', 'pray',
      'fire', 'party', 'hundred', 'rocket'
    ];
    if (!ALLOWED_REACTIONS.includes(reactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    const reactions = await toggleReaction(id, reactionType, postMetadata);
    if (!reactions) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, reactions });
  } catch (err: any) {
    console.error('Error toggling reaction:', err);
    return NextResponse.json(
      { error: 'Failed to update reaction', details: err.message },
      { status: 500 }
    );
  }
}
