import { requireAuth, supabaseRestGet } from '../_utils/adminAuth.js';

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    const rows = await supabaseRestGet('users', {
      select: [
        'id',
        'username',
        'email',
        'full_name',
        'avatar_url',
        'bio',
        'user_type',
        'politician_type',
        'party_id',
        'province',
        'city_code',
        'district_name',
        'is_verified',
        'is_active',
        'is_admin',
      ].join(','),
      id: `eq.${auth.user.id}`,
      limit: '1',
    }).catch(() => []);
    const user = Array.isArray(rows) ? rows[0] : rows;
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        roles: auth.user.roles || (user.is_admin ? ['admin'] : []),
        permissions: auth.user.permissions || (user.is_admin ? ['*'] : []),
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Auth me error:', e);
    return res.status(500).json({ success: false, error: 'User info error' });
  }
}

