const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function clearDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('Database cleared.');
  await client.end();
}

clearDb().catch(console.error);
