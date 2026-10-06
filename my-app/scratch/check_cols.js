const mysql = require('mysql2/promise');

async function checkCols() {
  const conn = await mysql.createConnection({
    host: 'database-1.cl002gu0o5ft.ap-south-2.rds.amazonaws.com',
    port: 3306,
    user: 'admin',
    password: 'Hubinterior2019',
    database: 'CRM'
  });

  const [cols] = await conn.query('DESCRIBE booking_token_record');
  console.log('Columns in booking_token_record:', cols.map(c => c.Field));
  await conn.end();
}

checkCols().catch(console.error);
