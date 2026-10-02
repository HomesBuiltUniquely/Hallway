import { NextResponse } from 'next/server';
import { getAnnouncements, createAnnouncement } from '@/lib/db';
import { canCreateAnnouncement } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAnnouncements();
    return NextResponse.json(list);
  } catch (err: any) {
    console.error('Error fetching announcements from DB:', err);
    return NextResponse.json(
      { error: 'Failed to fetch announcements from database', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, type, categoryColor, department, author, quotaProgress } = body;

    // RBAC: Verify author has authority to create announcements or performer spotlights
    if (author && !canCreateAnnouncement(author)) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators and department leads have authorization to broadcast announcements.' },
        { status: 403 }
      );
    }

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const created = await createAnnouncement({
      title: title.trim(),
      content: content.trim(),
      type: type || 'announcement',
      categoryColor,
      department: department || 'Sales',
      author,
      quotaProgress: quotaProgress || null
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('Error creating announcement in DB:', err);
    return NextResponse.json(
      { error: 'Failed to store announcement in database', details: err.message },
      { status: 500 }
    );
  }
}
