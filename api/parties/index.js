import sql from '../_utils/db.js';

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
    const parties = await sql`
      SELECT id, name, short_name, logo_url, color 
      FROM parties 
      WHERE is_active = true 
      ORDER BY follower_count DESC
    `;
    
    res.json({ success: true, data: parties });
  } catch (error) {
    console.error('Parties API error:', error);
    res.status(500).json({ success: false, error: 'Partiler yüklenemedi.' });
  }
}
