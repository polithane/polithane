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

  // Helper
  async function supabaseRestGet(path, params) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Debug: Check env vars without exposing value
    if (!supabaseUrl || !serviceKey) {
        console.error('Supabase env missing in function scope');
        throw new Error('Supabase credentials missing');
    }
    
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}${qs}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Supabase error: ${response.status} ${response.statusText} ${text}`);
    }
    const data = await response.json();
    return data;
  }

  try {
    const { route } = req.query;
    const endpoint = Array.isArray(route) ? route[0] : route;

    // --- POSTS ---
    if (endpoint === 'posts') {
        const {
          limit = '50',
          offset = '0',
          party_id,
          user_id,
          user_ids,
          agenda_tag,
          order = 'created_at.desc',
        } = req.query || {};

        const params = {
            select: '*,user:users(id,username,full_name,avatar_url,user_type,politician_type,party_id,province,city_code,is_verified,is_active)',
            limit: String(limit),
            offset: String(offset),
            is_deleted: 'eq.false'
        };

        if (order) params.order = order;
        if (party_id) params.party_id = `eq.${party_id}`;
        if (user_id) params.user_id = `eq.${user_id}`;
        if (agenda_tag) params.agenda_tag = `eq.${agenda_tag}`;
        if (user_ids) {
            const raw = String(user_ids);
            const list = raw.split(',').map(s => s.trim()).filter(id => /^[0-9a-fA-F-]{10,}$/.test(id));
            if (list.length > 0) params.user_id = `in.(${list.join(',')})`;
        }

        const data = await supabaseRestGet('posts', params);
        return res.json(Array.isArray(data) ? data : []);
    }

    // --- PARTIES ---
    if (endpoint === 'parties') {
        const data = await supabaseRestGet('parties', {
            select: 'id,name,short_name,logo_url,color,seats',
            is_active: 'eq.true',
            order: 'follower_count.desc'
        });
        return res.json({ success: true, data: data || [] });
    }

    // --- USERS (Search) ---
    if (endpoint === 'users') {
        const { search, limit = 20 } = req.query;
        if (!search || search.length < 3) {
            return res.json({ success: true, data: [] });
        }
        const data = await supabaseRestGet('users', {
            select: 'id,username,full_name,avatar_url,user_type,politician_type,party_id,province',
            or: `username.ilike.*${search}*,full_name.ilike.*${search}*`,
            limit: String(Math.min(parseInt(limit), 50))
        });
        return res.json({ success: true, data: data || [] });
    }

    // Fallback
    return res.status(404).json({ error: 'Endpoint not found', endpoint });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
