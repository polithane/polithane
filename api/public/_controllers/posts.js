// Vercel Serverless Function - Posts Controller

// INLINE HELPER (Avoid import issues across directories in Vercel)
async function supabaseRestGet(path, params) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase env missing');
  
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}${qs}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase error: ${res.status} ${res.statusText} ${text}`);
  }
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

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

  try {
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
    res.status(200).json(Array.isArray(data) ? data : []);

  } catch (error) {
    console.error('Posts API Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
