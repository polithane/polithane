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
    
    // For Vercel serverless: Use minimal pool to avoid MaxClientsInSessionMode
    // Consider upgrading to Supabase Pro for Transaction pooling mode
    const isProduction = process.env.NODE_ENV === 'production';
    
    pool = new Pool({
      connectionString,
      ssl: isProduction ? { rejectUnauthorized: false } : undefined,
      max: 2, // Minimal pool for serverless (was 10, caused MaxClients error)
      idleTimeoutMillis: 10000, // Close idle connections quickly
      connectionTimeoutMillis: 5000,
    });
    
    pool.on('error', (err) => {
      console.error('💥 Unexpected pool error:', err);
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

