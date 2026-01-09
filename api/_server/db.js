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
    
    // Vercel Serverless: Minimal pool for session mode
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 1, // CRITICAL: Only 1 connection per serverless function instance
      idleTimeoutMillis: 10000, // Close idle connections after 10s
      connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
      allowExitOnIdle: true, // Allow process to exit if pool is idle
    });
    
    // Handle pool errors
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

