import { NextResponse } from 'next/server';
import { getActiveCampaign, upsertActiveCampaign } from '@/lib/db';
import { isAdmin } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Company-wide active campaign — readable by every Hallway member. */
export async function GET() {
  try {
    const campaign = await getActiveCampaign();
    return NextResponse.json(campaign);
  } catch (err: any) {
    console.error('Error fetching active campaign:', err);
    return NextResponse.json(
      { error: 'Failed to fetch active campaign', details: err?.message },
      { status: 500 }
    );
  }
}

/** Only admins may create/update the company campaign. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const actor = body?.actor || body?.author || null;
    if (!isAdmin(actor)) {
      return NextResponse.json(
        { error: 'Forbidden: only administrators can edit the active campaign.' },
        { status: 403 }
      );
    }

    if (!body?.title || !String(body.title).trim()) {
      return NextResponse.json({ error: 'Campaign title is required' }, { status: 400 });
    }

    const campaign = await upsertActiveCampaign({
      id: body.id,
      title: body.title,
      branchName: body.branchName,
      description: body.description,
      voucherCode: body.voucherCode,
      discountPercent: body.discountPercent,
      targetDate: body.targetDate,
      isActive: body.isActive !== false,
    });

    return NextResponse.json({ success: true, campaign });
  } catch (err: any) {
    console.error('Error updating active campaign:', err);
    return NextResponse.json(
      { error: 'Failed to update active campaign', details: err?.message },
      { status: 500 }
    );
  }
}
