import sql from '../../_utils/db.js';
import { requireAdmin } from '../../_utils/adminAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth Check
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { 
        page = 1, 
        limit = 50,
        search,
        user_type,
        is_verified 
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (username ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (user_type) {
        whereClause += ` AND user_type = $${paramIndex}`;
        params.push(user_type);
        paramIndex++;
      }

      if (is_verified !== undefined) {
        whereClause += ` AND is_verified = $${paramIndex}`;
        params.push(is_verified === 'true');
        paramIndex++;
      }

      const query = `
        SELECT 
          id, username, full_name, email, user_type, 
          is_verified, is_admin, post_count, follower_count,
          polit_score, created_at, last_login, metadata
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(parseInt(limit), offset);

      const users = await sql(query, params);

      // Count query
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countParams = params.slice(0, -2); // Remove limit/offset
      const [{ count }] = await sql(countQuery, countParams);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(count),
          totalPages: Math.ceil(parseInt(count) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Admin Users API error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
