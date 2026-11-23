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
    const [cols] = await pool.query('DESC booking_token_record');
    console.log('Columns in booking_token_record:');
    console.log(cols.map(c => c.Field).join(', '));

    const [rows] = await pool.query(
      "SELECT * FROM booking_token_record WHERE customer_name LIKE '%Avinash%' OR quote_no LIKE '%78015%'"
    );
    console.log('\nMatching rows count:', rows.length);
    if (rows.length > 0) {
      console.log('Avinash row:', rows[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
})();

