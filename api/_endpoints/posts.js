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

  // DEBUG MODE: Return mock data to verify API connectivity
  return res.status(200).json([
    {
      id: 'debug-1',
      user_id: 'debug-user',
      content: 'Sistem Bağlantı Testi - Bu mesajı görüyorsanız API çalışıyor demektir.',
      content_type: 'text',
      category: 'general',
      polit_score: 100,
      view_count: 100,
      like_count: 10,
      comment_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      user: {
        id: 'debug-user',
        username: 'system_admin',
        full_name: 'Sistem Yöneticisi',
        avatar_url: null,
        user_type: 'admin',
        is_verified: true
      }
    }
  ]);
}
