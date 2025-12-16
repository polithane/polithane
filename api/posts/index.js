import { supabaseRestGet } from '../_utils/adminAuth.js';

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
        select: [
            'id', 'user_id', 'party_id', 'content', 'content_type', 'content_text',
            'media_urls', 'thumbnail_url', 'media_duration', 'category', 'agenda_tag',
            'polit_score', 'view_count', 'like_count', 'dislike_count', 'comment_count',
            'share_count', 'is_featured', 'is_deleted', 'created_at', 'source_url',
            'user:users(id,username,full_name,avatar_url,user_type,politician_type,party_id,province,city_code,is_verified,is_active)'
        ].join(','),
        limit: String(limit),
        offset: String(offset),
        is_deleted: 'eq.false'
    };

    // Ordering logic
    // Frontend sends "created_at.desc"
    // Supabase expects "created_at.desc" as value for "order" key
    if (order) {
        params.order = order;
    }

    // Filters
    if (party_id) params.party_id = `eq.${party_id}`;
    if (user_id) params.user_id = `eq.${user_id}`;
    if (agenda_tag) params.agenda_tag = `eq.${agenda_tag}`;
    if (user_ids) {
        const raw = String(user_ids);
        const list = raw.split(',').map(s => s.trim()).filter(id => /^[0-9a-fA-F-]{10,}$/.test(id));
        if (list.length > 0) {
            // Overwrite single user_id filter if list exists
            params.user_id = `in.(${list.join(',')})`;
        }
    }

    const data = await supabaseRestGet('posts', params);
    
    // Return data directly (Array expected by frontend)
    res.status(200).json(Array.isArray(data) ? data : []);

  } catch (error) {
    console.error('Posts API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
