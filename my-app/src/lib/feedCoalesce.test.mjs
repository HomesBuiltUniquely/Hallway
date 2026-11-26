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
      ymd >= scoringFrom &&
      ymd <= scoringTo
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
    const score = (f) => (f.weekly ? 2 : 0) + (f.monthly ? 1 : 0);
    if (score(flags) > score(best.flags)) best = { item, flags };
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