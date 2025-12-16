import { requireAdmin, supabaseRestGet } from '../../_utils/adminAuth.js';

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
      const params = {
          select: 'id,username,full_name,email,user_type,is_verified,is_admin,post_count,follower_count,polit_score,created_at,last_login,metadata',
          order: 'created_at.desc',
          limit: String(limit),
          offset: String(offset)
      };

      if (user_type) params.user_type = `eq.${user_type}`;
      if (is_verified !== undefined) params.is_verified = `eq.${is_verified}`;
      if (search) {
          params.or = `username.ilike.*${search}*,full_name.ilike.*${search}*,email.ilike.*${search}*`;
      }

      const users = await supabaseRestGet('users', params);

      res.json({
        success: true,
        data: users || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0, // Count not supported in helper yet
          totalPages: 1
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
