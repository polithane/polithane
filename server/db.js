import pg from 'pg';
import dotenv from 'dotenv';

// Ensure env is loaded for scripts as well.
dotenv.config();

const { Pool } = pg;

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    
    // Check if running in Vercel/serverless
    const isServerless = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
    
    // For serverless: Use Supabase Transaction mode (?pgbouncer=true)
    // This allows higher connection limits without MaxClientsInSessionMode error
    const finalConnectionString = isServerless && !connectionString.includes('pgbouncer')
      ? (connectionString.includes('?') 
          ? `${connectionString}&pgbouncer=true` 
          : `${connectionString}?pgbouncer=true`)
      : connectionString;
    
    pool = new Pool({
      connectionString: finalConnectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });
  }
  return pool;
}

/**
 * sql helper:
 * - Tagged template: sql`SELECT * FROM users WHERE id = ${id}`
 * - Direct query: sql('SELECT ... WHERE x = $1', [value])
 */
export async function sql(first, ...rest) {
  const p = getPool();

  // Tagged template usage
  if (Array.isArray(first) && Object.prototype.hasOwnProperty.call(first, 'raw')) {
    const strings = first;
    const values = rest;
    let text = '';
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) text += `$${i + 1}`;
    }
    const result = await p.query(text, values);
    return result.rows;
  }

  // Direct query usage: sql(text, params)
  const text = first;
  const params = rest[0] || [];
  const result = await p.query(text, params);
  return result.rows;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

