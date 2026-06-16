import { pool } from './src/db';

async function run() {
  try {
    const res1 = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('inventory_items', 'items', 'stock_requests', 'expenses', 'bills')
    `);
    console.log(res1.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
