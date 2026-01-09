/**
 * Vercel Serverless Function: Check Availability
 * Self-contained endpoint for /api/auth/check-availability
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ========================
// DATABASE HELPER
// ========================
let pool;
function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return pool;
}

async function query(text, params) {
  const db = getDb();
  return db.query(text, params);
}

// ========================
// MAIN HANDLER
// ========================
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const { email, username } = req.query;
  
  try {
    if (email) {
      console.log('📧 Checking email availability:', email);
      const result = await query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      const available = result.rows.length === 0;
      console.log('✅ Email availability:', available ? 'Available' : 'Taken');
      return res.json({ available, field: 'email' });
    }
    
    if (username) {
      console.log('👤 Checking username availability:', username);
      const result = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
        [username]
      );
      const available = result.rows.length === 0;
      console.log('✅ Username availability:', available ? 'Available' : 'Taken');
      return res.json({ available, field: 'username' });
    }
    
    return res.status(400).json({ success: false, error: 'Email or username required' });
    
  } catch (error) {
    console.error('❌ Check availability error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
