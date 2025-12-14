// Vercel Serverless Function - User lookup by username via Supabase REST API

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase env missing' });

    const { username } = req.query || {};
    if (!username) return res.status(400).json({ error: 'username required' });

    const params = new URLSearchParams();
    params.set(
      'select',
      [
        'id',
        'username',
        'full_name',
        'avatar_url',
        'bio',
        'user_type',
        'politician_type',
        'city_code',
        'is_active',
        'party_id',
        'province',
        'is_verified',
        'polit_score',
        'follower_count',
        'following_count',
        'post_count',
        'party:parties(id,slug,short_name,logo_url,color)',
      ].join(',')
    );
    params.set('username', `eq.${username}`);
    params.set('limit', '1');

    const response = await fetch(`${supabaseUrl}/rest/v1/users?${params.toString()}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Supabase error: ${response.status} ${response.statusText} ${text}`);
    }

    const data = await response.json();
    return res.status(200).json(data?.[0] || null);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

