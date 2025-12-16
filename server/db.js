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
    pool = new Pool({
      connectionString,
      // Supabase uses SSL in production; allow local without SSL.
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX || 10),
    });
  }
  return pool;
}

/**
 * sql helper compatible with the previous "neon" usage:
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

