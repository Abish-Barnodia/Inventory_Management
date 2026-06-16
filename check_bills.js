const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_WV4cUHvqyt0D@ep-weathered-wind-amhn6akr-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require',
});
async function check() {
  const bills = await pool.query("SELECT count(*) FROM bills");
  const orders = await pool.query("SELECT count(*) FROM orders");
  const kots = await pool.query("SELECT count(*) FROM kots");
  const revenue_ledger = await pool.query("SELECT count(*) FROM revenue_ledger");
  console.log({
    bills: bills.rows[0].count,
    orders: orders.rows[0].count,
    kots: kots.rows[0].count,
    revenue_ledger: revenue_ledger.rows[0].count,
  });
  pool.end();
}
check().catch(console.error);
