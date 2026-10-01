import { NextResponse } from 'next/server';
import { deleteComment } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id, commentId } = await context.params;
    if (!id || !commentId) {
      return NextResponse.json(
        { error: 'Announcement ID and Comment ID are required' },
        { status: 400 }
      );
    }

    const success = await deleteComment(id, commentId);
    if (!success) {
      return NextResponse.json(
        { error: 'Comment not found or failed to delete' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      announcementId: id,
      commentId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to delete comment', details: err?.message },
      { status: 500 }
    );
  }
}
