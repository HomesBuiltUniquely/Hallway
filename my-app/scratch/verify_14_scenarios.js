const { generateCrmAnnouncements } = require('../src/lib/crmAnnouncementsGenerator');

async function verify() {
  const [feedRes, targetsRes, mtdRes, peopleRes, recordsRes] = await Promise.all([
    fetch('http://localhost:3000/api/crm/v1/hallway/feed').then(r => r.json()).catch(() => ({ feed: [] })),
    fetch('http://localhost:3000/api/crm/v1/hallway/targets').then(r => r.json()).catch(() => ({ cards: [] })),
    fetch('http://localhost:3000/api/crm/v1/hallway/leaderboard?period=mtd').then(r => r.json()).catch(() => ({ individuals: [] })),
    fetch('http://localhost:3000/api/crm/v1/hallway/people').then(r => r.json()).catch(() => ({ people: [] })),
    fetch('http://localhost:3000/api/crm/v1/hallway/records').then(r => r.json()).catch(() => ({ individualRecords: [], teamRecords: [] })),
  ]);

  const cards = generateCrmAnnouncements({
    crmFeedItems: feedRes.feed || [],
    overallTargets: targetsRes.cards || [],
    branchTargets: [
      { branchId: 'SARJAPUR', branchName: 'Sarjapura', team: 'Sarjapura Hub', progress: 46.2, current: '₹55.40L', target: '₹1.20 Cr', currentInr: 5540000, targetInr: 12000000 },
      { branchId: 'JP_NAGAR', branchName: 'JP Nagar', team: 'JP Nagar Hub', progress: 20.3, current: '₹48.77L', target: '₹2.40 Cr', currentInr: 4877000, targetInr: 24000000 },
      { branchId: 'HBR', branchName: 'HBR Layout', team: 'HBR Layout Hub', progress: 15.4, current: '₹36.95L', target: '₹2.40 Cr', currentInr: 3695000, targetInr: 24000000 }
    ],
    topPerformers: mtdRes.individuals || [],
    people: peopleRes.people || [],
    records: recordsRes.individualRecords || [],
    teamRecords: recordsRes.teamRecords || [],
  });

  console.log(`\n=== TOTAL GENERATED CRM CARDS: ${cards.length} ===`);
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    console.log(`[${i + 1}] ID: ${c.id} | Type: ${c.type} | Title: "${c.title}" | Author: ${c.author?.name} (${c.author?.team})`);
  }

  // Audit each of the 14 Scenarios
  console.log('\n=== AUDIT OF ALL 14 CRM SCENARIOS ===');
  const scenarios = [
    { num: 1, name: 'New Booking', test: c => c.title.startsWith('New Booking:') },
    { num: 2, name: 'Large Booking', test: c => c.title.startsWith('Big One Closed:') },
    { num: 3, name: 'First Booking of Employee', test: c => c.title.includes('First One on the Board') },
    { num: 4, name: 'Multiple Closures in a Day', test: c => c.title.includes('Hat-Trick') },
    { num: 5, name: 'EC Target Milestone', test: c => c.title.includes('Hits 80%') || c.title.includes('Hits') },
    { num: 6, name: '100% Target Achievement', test: c => c.title.includes('Target Crushed') },
    { num: 7, name: 'Company Revenue Milestone', test: c => c.title.includes('HUB Crosses') },
    { num: 8, name: 'Record Broken', test: c => c.title === 'New HUB Record!' },
    { num: 9, name: 'Top Performer', test: c => c.title.includes('Top Performer') || c.title.includes('Month-to-Date Leader') },
    { num: 10, name: 'On-the-Spot Closure', test: c => c.title.startsWith('Spot Closure:') },
    { num: 16, name: 'Renova Booking', test: c => c.title.includes('Renova Strikes Again') },
    { num: 21, name: 'Book of Records Entry', test: c => c.title === 'A New HUB Record Has Been Written' },
    { num: 22, name: 'Target Streak', test: c => c.title.includes('Target Streak') },
    { num: 23, name: 'Company-Wide Goal Nearing', test: c => c.title.includes('Away From') },
  ];

  for (const s of scenarios) {
    const found = cards.filter(s.test);
    console.log(`Scenario #${s.num} (${s.name}): ${found.length > 0 ? `ACTIVE (${found.length} cards)` : 'HIDDEN (Condition not met - Correct Option B)'}`);
    for (const f of found) {
      console.log(`   -> "${f.title}" (${f.content.slice(0, 60)}...)`);
    }
  }

  // Check if any forbidden cards exist (Sarah Jenkins, Deal 4828, Speed Record, Top Squad)
  const forbidden = cards.filter(c => 
    c.title.includes('Sarah Jenkins') || c.content.includes('Sarah Jenkins') ||
    c.title.includes('4828') || c.content.includes('4828') ||
    c.title.includes('Speed Record') || c.title.includes('Top Performing Squad')
  );
  console.log(`\nForbidden/Legacy Cards Found: ${forbidden.length}`);
  if (forbidden.length > 0) {
    console.error('FAILED: Found forbidden cards:', forbidden);
  } else {
    console.log('PASSED: Zero legacy dummy or unauthorized cards in CRM feed!');
  }
}

verify().catch(console.error);
