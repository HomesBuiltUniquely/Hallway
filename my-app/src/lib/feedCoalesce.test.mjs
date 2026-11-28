/**
 * Feed coalesce mirrors — run: npm run test:feed-coalesce
 */
import assert from 'node:assert/strict';

function normalizePersonName(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function amountsClose(a, b) {
  return Math.abs(a - b) <= 1 && a > 0 && b > 0;
}

function istYmd(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function weeklyHonorEligible(item, bookingYmd, mondayYmd, sundayYmd) {
  if (!bookingYmd || bookingYmd < mondayYmd || bookingYmd > sundayYmd) return false;
  if (!item.createdAt) return true;
  const hallwayYmd = istYmd(item.createdAt);
  return hallwayYmd >= mondayYmd;
}

function honorRank(item, flags, weeklyInr, monthlyInr) {
  const inr = item.rawBooking?.quoteAmount || 0;
  const ymd = String(item.rawBooking?.bookingDoneDate || '').slice(0, 10);
  let rank = 0;
  if (flags.weekly) rank += 10_000;
  if (flags.monthly) rank += 1_000;
  if (flags.weekly && amountsClose(inr, weeklyInr)) rank += 500;
  if (flags.monthly && amountsClose(inr, monthlyInr)) rank += 200;
  if (flags.weekly) rank += inr;
  if (ymd) rank += new Date(`${ymd}T12:00:00+05:30`).getTime() / 1e9;
  return rank;
}

function coalesceMirror(items, { scoringFrom, scoringTo, monthKey, weekLabel }) {
  const weekly = items.find((i) => i.registerKind === 'weekly');
  const monthly = items.find((i) => i.registerKind === 'monthly');
  const weeklyName = weekly ? normalizePersonName(weekly.author?.name) : '';
  const monthlyName = monthly ? normalizePersonName(monthly.author?.name) : '';
  const weeklyInr = weekly?.rawBooking?.quoteAmount || 0;
  const monthlyInr = monthly?.rawBooking?.quoteAmount || 0;

  let best = null;
  for (const item of items) {
    if (item.registerKind !== 'booking') continue;
    const name = normalizePersonName(item.author?.name);
    const inr = item.rawBooking?.quoteAmount || 0;
    const ymd = String(item.rawBooking?.bookingDoneDate || '').slice(0, 10);
    if (!ymd) continue;

    const flags = { weekly: false, monthly: false };
    if (
      weekly &&
      weeklyName &&
      name === weeklyName &&
      amountsClose(inr, weeklyInr) &&
      weeklyHonorEligible(item, ymd, scoringFrom, scoringTo)
    ) {
      flags.weekly = true;
    }
    if (
      monthly &&
      monthlyName &&
      name === monthlyName &&
      amountsClose(inr, monthlyInr) &&
      ymd.slice(0, 7) === monthKey
    ) {
      flags.monthly = true;
    }
    if (!flags.weekly && !flags.monthly) continue;

    if (!best) {
      best = { item, flags };
      continue;
    }
  if (honorRank(item, flags, weeklyInr, monthlyInr) > honorRank(best.item, best.flags, weeklyInr, monthlyInr)) {
      best = { item, flags };
    }
  }

  if (!best) return items;

  const badges = [];
  if (best.flags.weekly) badges.push(`Top of the week · Week of ${weekLabel}`);
  if (best.flags.monthly) badges.push(`Leading November`);

  const suppressed = new Set();
  if (best.flags.weekly && weekly?.id) suppressed.add(weekly.id);
  if (best.flags.monthly && monthly?.id) suppressed.add(monthly.id);

  return items
    .filter((i) => !suppressed.has(i.id))
    .map((i) =>
      i.id === best.item.id ? { ...i, honorBadges: badges } : i
    );
}

// Full stack — one deal + both badges
{
  const items = [
    {
      id: 'crm-booking-1',
      registerKind: 'booking',
      createdAt: '2026-11-22T10:00:00+05:30',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047, bookingDoneDate: '2026-11-22' },
    },
    {
      id: 'crm-weekly-top-2026-11-16',
      registerKind: 'weekly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047 },
    },
    {
      id: 'crm-monthly-top-2026-11',
      registerKind: 'monthly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047 },
    },
  ];
  const out = coalesceMirror(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-11',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'crm-booking-1');
  assert.equal(out[0].honorBadges?.length, 2);
}

// Weekly-only match (no monthly) — suppress weekly, keep monthly card
{
  const items = [
    {
      id: 'crm-booking-1',
      registerKind: 'booking',
      createdAt: '2026-11-22T10:00:00+05:30',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047, bookingDoneDate: '2026-11-22' },
    },
    {
      id: 'crm-weekly-top-2026-11-16',
      registerKind: 'weekly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047 },
    },
    {
      id: 'crm-monthly-top-2026-10',
      registerKind: 'monthly',
      author: { name: 'Arjun' },
      rawBooking: { quoteAmount: 2000000 },
    },
  ];
  const out = coalesceMirror(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-10',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 2);
  assert.equal(out.some((i) => i.id === 'crm-booking-1'), true);
  assert.equal(out.some((i) => i.id === 'crm-monthly-top-2026-10'), true);
  assert.equal(out.find((i) => i.id === 'crm-booking-1').honorBadges?.length, 1);
}

// Nov 1 same amount as weekly winner — outside scoring week → no weekly badge
{
  const items = [
    {
      id: 'crm-booking-nov1',
      registerKind: 'booking',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047, bookingDoneDate: '2026-11-01' },
    },
    {
      id: 'crm-weekly-top-2026-11-16',
      registerKind: 'weekly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047 },
    },
  ];
  const out = coalesceMirror(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-10',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 2);
  assert.equal(out.find((i) => i.id === 'crm-booking-nov1')?.honorBadges?.length || 0, 0);
}

// Hallway first-seen before scoring week — no weekly badge on booking; weekly card stays
{
  const items = [
    {
      id: 'crm-booking-meghana',
      registerKind: 'booking',
      createdAt: '2026-11-01T07:38:06.000Z',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047, bookingDoneDate: '2026-11-22' },
    },
    {
      id: 'crm-weekly-top-2026-11-16',
      registerKind: 'weekly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047 },
    },
  ];
  const out = coalesceMirror(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-11',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 2);
  assert.equal(out.find((i) => i.id === 'crm-booking-meghana')?.honorBadges?.length || 0, 0);
  assert.equal(out.some((i) => i.id === 'crm-weekly-top-2026-11-16'), true);
}

// Nov 22 in-week deal preferred over Nov 1 same amount when both present
{
  const items = [
    {
      id: 'crm-booking-nov1',
      registerKind: 'booking',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047, bookingDoneDate: '2026-11-01' },
    },
    {
      id: 'crm-booking-nov22',
      registerKind: 'booking',
      createdAt: '2026-11-22T12:00:00+05:30',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047, bookingDoneDate: '2026-11-22' },
    },
    {
      id: 'crm-weekly-top-2026-11-16',
      registerKind: 'weekly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1462047 },
    },
  ];
  const out = coalesceMirror(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-10',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 2);
  assert.equal(out.find((i) => i.id === 'crm-booking-nov22')?.honorBadges?.length, 1);
  assert.equal(out.find((i) => i.id === 'crm-booking-nov1')?.honorBadges?.length || 0, 0);
}

// Amount mismatch — no coalesce
{
  const items = [
    {
      id: 'crm-booking-a',
      registerKind: 'booking',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 800000, bookingDoneDate: '2026-11-20' },
    },
    {
      id: 'crm-weekly-top-2026-11-16',
      registerKind: 'weekly',
      author: { name: 'Meghana' },
      rawBooking: { quoteAmount: 1500000 },
    },
  ];
  const out = coalesceMirror(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-11',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 2);
}

console.log('feedCoalesce.test.mjs: ok');