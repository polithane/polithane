// Vercel Serverless Function - Users API
import pg from 'pg';
const Pool = pg.default?.Pool || pg.Pool;

// Database connection
const getPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getPool();

  try {
    if (req.method === 'GET') {
      // Get all users with pagination
      const { limit = 50, offset = 0 } = req.query;
      
      const result = await pool.query(`
        SELECT 
          id, username, full_name, avatar_url, bio, 
          user_type, party_id, province, is_verified,
          polit_score, follower_count, following_count, post_count
        FROM users
        ORDER BY polit_score DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit), parseInt(offset)]);

      return res.status(200).json(result.rows);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
}
