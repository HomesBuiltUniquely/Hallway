const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
    user: 'admin',
    password: process.env.DB_PASSWORD || 'Hubinterior2019',
    database: 'CRM',
    port: 3306,
  });

  try {
    const [rows] = await pool.query(`
      SELECT id, lead_id, lead_type, customer_name, submitted_by_name, quote_amount, booking_done_date
      FROM booking_token_record
      WHERE LOWER(TRIM(listing_type)) = 'booking'
        AND LOWER(TRIM(COALESCE(booking_status, ''))) NOT IN ('cancelled', 'canceled')
        AND booking_done_date >= '2026-11-01' AND booking_done_date <= '2026-11-30 23:59:59'
    `);
    console.log(`Found ${rows.length} booking records in November:`);
    for (const r of rows) {
      let assignee = null;
      if (r.lead_type && r.lead_id) {
        try {
          const [l] = await pool.query(`SELECT assignee FROM ${r.lead_type} WHERE id = ?`, [r.lead_id]);
          if (l.length > 0) assignee = l[0].assignee;
        } catch {}
      }
      console.log(`- Lead: ${r.customer_name} (ID: ${r.lead_id}, type: ${r.lead_type}) | Quote: ${r.quote_amount} | SubmittedBy: ${r.submitted_by_name} | Actual Assignee: ${assignee}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
})();
