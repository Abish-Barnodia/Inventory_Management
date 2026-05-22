const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/restro' });
pool.query("UPDATE tables SET status = 'free' WHERE table_number = '1'").then(() => {
  console.log('Table 1 freed');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
