const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function clearInventoryDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete all stock request items and stock requests
    await client.query('DELETE FROM stock_request_items;');
    await client.query('DELETE FROM stock_requests;');
    
    // Delete all stock entries (this will cascade to linked expenses if ON DELETE CASCADE is set)
    await client.query('DELETE FROM stock_entries;');
    
    // Reset stock quantities on all items back to 0, without deleting the items themselves
    // so that POS, Bills, and KOTs remain intact
    await client.query('UPDATE items SET stock_quantity = 0;');
    
    await client.query('COMMIT');
    console.log('Inventory data cleared successfully while preserving POS and Table data.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing inventory data:', error);
  } finally {
    await client.end();
  }
}

clearInventoryDb().catch(console.error);
