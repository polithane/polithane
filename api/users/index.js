// Vercel Serverless Function - Users API via Supabase REST API

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { limit = 50, offset = 0, party_id, search, id, username, province, is_active, user_type, order } = req.query;
      
      // Supabase REST API kullan
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase env missing' });
      }

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
          'is_active',
          'is_automated',
          'party_id',
          'province',
          'city_code',
          'district_name',
          'is_verified',
          'polit_score',
          'follower_count',
          'following_count',
          'post_count',
          'party:parties(id,slug,short_name,logo_url,color)',
        ].join(',')
      );
      // If fetching a single row
      if (id || username) {
        if (id) params.set('id', `eq.${id}`);
        if (username) params.set('username', `eq.${username}`);
        params.set('limit', '1');
      } else {
        // default ordering
        const ord = String(order || 'polit_score.desc');
        const [orderCol, orderDir] = ord.split('.');
        params.set('order', `${orderCol || 'polit_score'}.${orderDir === 'asc' ? 'asc' : 'desc'}`);
        params.set('limit', String(limit));
        params.set('offset', String(offset));
      }
      if (party_id) params.set('party_id', `eq.${party_id}`);
      // Province names are not consistently cased in DB (often stored as 'ANTALYA' etc).
      // Use case-insensitive match so city pages reliably return results.
      if (province) params.set('province', `ilike.${province}`);
      if (is_active !== undefined) params.set('is_active', `eq.${String(is_active) === 'true' ? 'true' : 'false'}`);
      if (user_type) {
        const raw = String(user_type);
        const list = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (list.length === 1) params.set('user_type', `eq.${list[0]}`);
        else params.set('user_type', `in.(${list.join(',')})`);
      }
      if (search) {
        // PostgREST or filter
        params.set('or', `(username.ilike.*${search}*,full_name.ilike.*${search}*)`);
      }
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?${params.toString()}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return res
          .status(response.status)
          .json({ error: `Supabase error: ${response.status} ${response.statusText} ${text}` });
      }

      const data = await response.json();
      if (id || username) return res.status(200).json(data?.[0] || null);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
