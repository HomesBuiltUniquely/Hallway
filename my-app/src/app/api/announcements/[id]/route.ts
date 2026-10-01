import { NextResponse } from 'next/server';
import { getAnnouncementById, deleteAnnouncement } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const post = await getAnnouncementById(id);
    if (!post) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch announcement', details: err?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const success = await deleteAnnouncement(id);
    if (!success) {
      return NextResponse.json({ error: 'Announcement not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Announcement deleted successfully', id });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to delete announcement', details: err?.message },
      { status: 500 }
    );
  }
}
