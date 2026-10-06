const mysql = require('mysql2/promise');

async function audit() {
  const conn = await mysql.createConnection({
    host: 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
    port: 3306,
    user: 'admin',
    password: 'Hubinterior2019',
    database: 'CRM'
  });

  console.log('=== 1. ALL BOOKINGS (listing_type = booking) ===');
  const [bRows] = await conn.query(`
    SELECT b.id, b.submitted_by_name, b.customer_name, b.listing_type, b.quote_amount, b.amount_received, b.lead_id, b.lead_type, b.created_at, b.booking_date, b.booking_done_date
    FROM booking_token_record b
    WHERE b.listing_type = 'booking' OR b.quote_amount > 0
    ORDER BY b.created_at DESC
  `);
  console.log(`Found ${bRows.length} bookings:`);
  for (const b of bRows) {
    console.log(`ID: ${b.id} | Rep: ${b.submitted_by_name} | Cust: ${b.customer_name} | Quote: ₹${b.quote_amount} | Type: ${b.listing_type} | Lead: ${b.lead_id} (${b.lead_type}) | Created: ${b.created_at} | BookingDate: ${b.booking_date}`);
  }

  console.log('\n=== 2. HISTORICAL BOOKINGS PER REP (FOR SCENARIO #3 MAIDEN CLOSURE) ===');
  const [repCounts] = await conn.query(`
    SELECT submitted_by_name, COUNT(*) as cnt, SUM(COALESCE(quote_amount, 0)) as total_quote
    FROM booking_token_record
    WHERE listing_type = 'booking' OR quote_amount > 0
    GROUP BY submitted_by_name
    ORDER BY cnt ASC
  `);
  console.log('Bookings count per rep:', repCounts);

  console.log('\n=== 3. LARGE BOOKINGS (SCENARIO #2: >= 15L) ===');
  const large = bRows.filter(b => Number(b.quote_amount) >= 1500000 || Number(b.amount_received) >= 1500000);
  console.log(`Found ${large.length} large bookings (>= 15L):`, large.map(b => ({
    rep: b.submitted_by_name,
    customer: b.customer_name,
    quote: b.quote_amount,
    date: b.created_at
  })));

  console.log('\n=== 4. HAT-TRICK AUDIT (SCENARIO #4: >= 3 bookings on same calendar day) ===');
  // Group by DATE(created_at)
  const byDate = {};
  for (const b of bRows) {
    const d = b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : 'unknown';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(b);
  }
  for (const [d, list] of Object.entries(byDate)) {
    if (list.length >= 3) {
      console.log(`Date: ${d} had ${list.length} bookings:`, list.map(x => `${x.submitted_by_name} (₹${x.quote_amount})`));
    }
  }

  console.log('\n=== 5. SAME-DAY WALK-IN CLOSURES (SCENARIO #10: DATE(lead.created_at) === DATE(booking.created_at)) ===');
  const leadTables = ['mlead', 'glead', 'addlead', 'websitelead', 'ivrlead'];
  for (const tbl of leadTables) {
    const [matches] = await conn.query(`
      SELECT b.id as booking_id, b.submitted_by_name, b.customer_name, b.quote_amount, b.created_at as booking_created,
             l.id as lead_id, l.created_at as lead_created, l.lead_name, l.sub_stage, l.branch_name, l.city, '${tbl}' as source
      FROM booking_token_record b
      JOIN ${tbl} l ON b.lead_id = l.id
      WHERE (b.listing_type = 'booking' OR b.quote_amount > 0)
    `);
    for (const m of matches) {
      const bDate = new Date(m.booking_created).toISOString().split('T')[0];
      const lDate = new Date(m.lead_created).toISOString().split('T')[0];
      const isSameDay = bDate === lDate;
      const isReno = (m.sub_stage || '').toUpperCase().includes('RENOVAT');
      console.log(`Match in ${tbl}: Lead #${m.lead_id} (${m.customer_name}) | Booking: ${bDate}, Lead: ${lDate} | SameDay: ${isSameDay} | SubStage: ${m.sub_stage} (Reno: ${isReno}) | Rep: ${m.submitted_by_name} | Quote: ₹${m.quote_amount}`);
    }
  }

  console.log('\n=== 6. RENOVATION LEADS ACROSS ALL TABLES (SCENARIO #16) ===');
  for (const tbl of leadTables) {
    const [renoList] = await conn.query(`
      SELECT id, lead_name, sub_stage, stage_id, created_at, created_by, budget, branch_name
      FROM ${tbl}
      WHERE LOWER(sub_stage) LIKE '%renovat%' OR LOWER(stage_id) LIKE '%renovat%'
      LIMIT 10
    `);
    if (renoList.length > 0) {
      console.log(`Renovation leads in ${tbl}:`, renoList);
    }
  }

  await conn.end();
}

audit().catch(console.error);
