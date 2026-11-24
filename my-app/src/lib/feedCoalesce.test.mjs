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

function coalesceSimple(items, { scoringFrom, scoringTo, monthKey, weekLabel }) {
  const weekly = items.find((i) => i.registerKind === 'weekly');
  const monthly = items.find((i) => i.registerKind === 'monthly');
  const bookings = items.filter((i) => i.registerKind === 'booking');

  let match = null;
  for (const b of bookings) {
    const name = normalizePersonName(b.author?.name);
    const inr = b.rawBooking?.quoteAmount || 0;
    const ymd = String(b.rawBooking?.bookingDoneDate || '').slice(0, 10);
    const w =
      weekly &&
      name === normalizePersonName(weekly.author?.name) &&
      amountsClose(inr, weekly.rawBooking?.quoteAmount) &&
      ymd >= scoringFrom &&
      ymd <= scoringTo;
    const m =
      monthly &&
      name === normalizePersonName(monthly.author?.name) &&
      amountsClose(inr, monthly.rawBooking?.quoteAmount) &&
      ymd.slice(0, 7) === monthKey;
    if (w && m) {
      match = b;
      break;
    }
  }

  if (!match) return items;

  const badges = [
    `Top of the week · Week of ${weekLabel}`,
    `Leading November`,
  ];
  return items
    .filter((i) => i.registerKind !== 'weekly' && i.registerKind !== 'monthly')
    .map((i) => (i.id === match.id ? { ...i, honorBadges: badges } : i));
}

// Meghana stack — one deal + badges
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
  const out = coalesceSimple(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-11',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'crm-booking-1');
  assert.equal(out[0].honorBadges?.length, 2);
}

// Two deals summing to weekly total — no full coalesce in simple mirror when amounts differ
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
  const out = coalesceSimple(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-11',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 2);
}

// Different monthly winner — no coalesce on second person
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
      author: { name: 'Arjun' },
      rawBooking: { quoteAmount: 2000000 },
    },
  ];
  const out = coalesceSimple(items, {
    scoringFrom: '2026-11-16',
    scoringTo: '2026-11-22',
    monthKey: '2026-11',
    weekLabel: '16–22 Nov',
  });
  assert.equal(out.length, 3);
}

console.log('feedCoalesce.test.mjs: ok');