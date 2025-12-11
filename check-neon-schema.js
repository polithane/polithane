import pg from 'pg';
const { Client } = pg;

const neonClient = new Client({
  connectionString: 'postgresql://neondb_owner:npg_F9zYkx1BtmKX@ep-crimson-grass-advw0sjv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

await neonClient.connect();

// Check parties columns
const parties = await neonClient.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'parties' ORDER BY ordinal_position`);
console.log('PARTIES columns:', parties.rows.map(r => r.column_name).join(', '));

// Check users columns
const users = await neonClient.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
console.log('\nUSERS columns:', users.rows.map(r => r.column_name).join(', '));

// Check posts columns  
const posts = await neonClient.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'posts' ORDER BY ordinal_position`);
console.log('\nPOSTS columns:', posts.rows.map(r => r.column_name).join(', '));

await neonClient.end();
