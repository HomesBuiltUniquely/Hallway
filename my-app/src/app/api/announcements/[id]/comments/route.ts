import { NextResponse } from 'next/server';
import { addComment } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { content, authorName, authorHandle, authorAvatar, authorRole, postMetadata } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    const result = await addComment(id, {
      content: content.trim(),
      authorName,
      authorHandle,
      authorAvatar,
      authorRole
    }, postMetadata);

    return NextResponse.json({
      success: true,
      comment: result.comment,
      announcement: result.announcement
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error adding comment to announcement:', err);
    return NextResponse.json(
      { error: 'Failed to add comment', details: err.message },
      { status: 500 }
    );
  }
}
