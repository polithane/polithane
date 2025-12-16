import { neon } from '@neondatabase/serverless';

// Try to find the connection string
// Vercel Postgres uses POSTGRES_URL
// Supabase/Neon usually uses DATABASE_URL
const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('CRITICAL ERROR: No database connection string found in environment variables (DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL).');
}

const sql = connectionString ? neon(connectionString) : async () => {
  throw new Error('Database connection string is missing. Please configure DATABASE_URL in Vercel settings.');
};

export default sql;
