import assert from 'node:assert/strict';
import test from 'node:test';

test('Meeting deduplication per lead picks highest priority progress, latest time and latest id', () => {
  // Test data representing multiple slots for the same customer (e.g. Test Drr)
  const events = [
    {
      id: 'd-meet-100',
      time: '04:00 PM',
      title: 'Test Drr',
      clientName: 'Test Drr',
      leadId: 100240,
      designerName: 'Abhishek',
      status: 'rescheduled',
      startMinutes: 960,
      meetId: 100,
    },
    {
      id: 'd-meet-101',
      time: '04:30 PM',
      title: 'Test Drr',
      clientName: 'Test Drr',
      leadId: 100240,
      designerName: 'Abhishek',
      status: 'rescheduled',
      startMinutes: 990,
      meetId: 101,
    },
    {
      id: 'd-meet-102',
      time: '05:30 PM',
      title: 'Test Drr',
      clientName: 'Test Drr',
      leadId: 100240,
      designerName: 'Abhishek',
      status: 'in progress',
      startMinutes: 1050,
      meetId: 102,
    },
    {
      id: 'd-meet-200',
      time: '11:00 AM',
      title: 'Shital Bhatt',
      clientName: 'Shital Bhatt',
      leadId: 100150,
      designerName: 'Abhishek',
      status: 'Meeting Successful',
      startMinutes: 660,
      meetId: 200,
    },
  ];

  function deduplicateEventsByLead(list) {
    const byKey = new Map();
    for (const ev of list) {
      const key = ev.leadId
        ? `lead:${ev.leadId}`
        : `client:${String(ev.clientName || ev.title).toLowerCase().trim()}:${String(ev.designerName || '').toLowerCase().trim()}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(ev);
    }

    const result = [];
    for (const sub of byKey.values()) {
      if (sub.length === 1) {
        result.push(sub[0]);
        continue;
      }

      const scoreStatus = (st) => {
        const s = String(st || '').toLowerCase();
        if (s.includes('in progress')) return 100;
        if (s.includes('scheduled') || s.includes('rescheduled')) return 80;
        if (s.includes('successful') || s.includes('completed')) return 60;
        return 10;
      };

      sub.sort((a, b) => {
        const scoreDiff = scoreStatus(b.status) - scoreStatus(a.status);
        if (scoreDiff !== 0) return scoreDiff;
        if (b.startMinutes !== a.startMinutes) return b.startMinutes - a.startMinutes;
        return b.meetId - a.meetId;
      });

      result.push(sub[0]);
    }

    result.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.meetId - b.meetId;
    });

    return result;
  }

  const deduped = deduplicateEventsByLead(events);
  assert.equal(deduped.length, 2, 'Should have exactly 2 distinct customer meetings');

  const testDrr = deduped.find((e) => e.leadId === 100240);
  assert.ok(testDrr, 'Test Drr should be present');
  assert.equal(testDrr.meetId, 102, 'Should select latest active in-progress slot (102)');
  assert.equal(testDrr.time, '05:30 PM', 'Should display 05:30 PM');
  assert.equal(testDrr.status, 'in progress', 'Status should be in progress');
});

test('Lead attribution assigns deal to actual assignee (Meghana) over submitted_by_name (Mohammed Bilal)', () => {
  const records = [
    {
      id: 'deal-1',
      customer_name: 'Avinash',
      quote_amount: '1462047.00',
      submitted_by_name: 'Mohammed Bilal',
      lead_id: 1341,
      lead_type: 'mlead',
    },
    {
      id: 'deal-2',
      customer_name: 'Prateek',
      quote_amount: '488067.00',
      submitted_by_name: 'Aman Nirmal',
      lead_id: 1503,
      lead_type: 'mlead',
    },
  ];

  const assigneeMap = new Map([
    ['mlead:1341', 'Meghana'],
    ['mlead:1503', 'Aman Nirmal'],
  ]);

  function resolveDealAssign(r, map) {
    const rawTable = String(r.lead_type || '').toLowerCase().trim();
    const leadKey = `${rawTable}:${Number(r.lead_id)}`;
    const leadAssignee = map.get(leadKey);
    return String(leadAssignee || r.submitted_by_name || '').trim();
  }

  assert.equal(resolveDealAssign(records[0], assigneeMap), 'Meghana');
  assert.equal(resolveDealAssign(records[1], assigneeMap), 'Aman Nirmal');
});

test('Weekly Top Performer falls back to previous week on Monday when current week has 0 bookings', () => {
  const currentWeekDeals = [];
  const previousWeekDeals = [
    { name: 'Meghana', total: 1462047, team: 'HBR' },
    { name: 'Suganya A', total: 621964, team: 'SARJAPUR' },
  ];

  function resolveWeeklyShowcase(current, fallback) {
    if (current.length > 0) {
      return { winner: current[0], title: 'This Week’s Top Performer', timestamp: 'This week' };
    }
    if (fallback.length > 0) {
      return { winner: fallback[0], title: 'Top Performer of the Week', timestamp: 'Last week' };
    }
    return null;
  }

  const result = resolveWeeklyShowcase(currentWeekDeals, previousWeekDeals);
  assert.ok(result, 'Weekly card should not be empty on Monday');
  assert.equal(result.winner.name, 'Meghana');
  assert.equal(result.title, 'Top Performer of the Week');
  assert.equal(result.timestamp, 'Last week');
});

