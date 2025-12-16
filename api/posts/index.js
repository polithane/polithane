// Vercel Serverless Function - Posts API via Supabase REST API (service role)

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
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env missing');
      return res.status(500).json({ error: 'Supabase env missing' });
    }

    const {
      limit = '50',
      offset = '0',
      party_id,
      user_id,
      user_ids,
      agenda_tag,
      order = 'created_at.desc',
    } = req.query || {};

    const params = new URLSearchParams();
    params.set(
      'select',
      [
        'id',
        'user_id',
        'party_id',
        'content',
        'content_type',
        'content_text',
        'media_urls',
        'thumbnail_url',
        'media_duration',
        'category',
        'agenda_tag',
        'polit_score',
        'view_count',
        'like_count',
        'dislike_count',
        'comment_count',
        'share_count',
        'is_featured',
        'is_deleted',
        'created_at',
        'source_url',
        'user:users(id,username,full_name,avatar_url,user_type,politician_type,party_id,province,city_code,is_verified,is_active)',
      ].join(',')
    );

    params.set('limit', String(limit));
    params.set('offset', String(offset));

    // filters
    params.set('is_deleted', 'eq.false');
    if (party_id) params.set('party_id', `eq.${party_id}`);
    if (user_id) params.set('user_id', `eq.${user_id}`);
    if (user_ids) {
      const raw = String(user_ids);
      const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((id) => /^[0-9a-fA-F-]{10,}$/.test(id)); // UUID check
      if (list.length > 0) params.set('user_id', `in.(${list.join(',')})`);
    }
    if (agenda_tag) params.set('agenda_tag', `eq.${agenda_tag}`);

    // ordering
    const [orderCol, orderDir] = String(order).split('.');
    if (orderCol) params.set('order', `${orderCol}.${orderDir === 'asc' ? 'asc' : 'desc'}`);

    const response = await fetch(`${supabaseUrl}/rest/v1/posts?${params.toString()}`, {
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
    
    // Return array directly (Original behavior)
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
