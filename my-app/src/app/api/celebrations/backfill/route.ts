import { NextResponse } from 'next/server';
import {
  celebrationBackfillDryRun,
  celebrationBackfillSuppressPreRollout,
} from '@/lib/celebrationBackfill';
import { celebrationSecret } from '@/lib/celebrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const provided = request.headers.get('x-celebration-key') || '';
  if (provided !== celebrationSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const dryRunOnly = url.searchParams.get('execute') !== '1';
  const dry = await celebrationBackfillDryRun();
  const suppress = await celebrationBackfillSuppressPreRollout(dryRunOnly);
  return NextResponse.json({
    dryRun: dryRunOnly,
    ...dry,
    suppressPreRollout: suppress,
  });
}