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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { search, limit = 20 } = req.query;

    if (!search || search.length < 3) {
        return res.json({ success: true, data: [] });
    }

    const users = await supabaseRestGet('users', {
        select: 'id,username,full_name,avatar_url,user_type,politician_type,party_id,province',
        or: `username.ilike.*${search}*,full_name.ilike.*${search}*`,
        limit: String(Math.min(parseInt(limit), 50))
    });

    res.json({ success: true, data: users || [] });
  } catch (error) {
    console.error('Users Search API error:', error);
    res.status(500).json({ success: false, error: 'Arama sırasında hata oluştu.' });
  }
}
