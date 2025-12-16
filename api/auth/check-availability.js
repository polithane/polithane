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
    const { email } = req.query;
    const result = { emailAvailable: true };

    if (email && email.includes('@')) {
      const [existingEmail] = await sql`
        SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
      `;
      if (existingEmail) result.emailAvailable = false;
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ success: false, error: 'Kontrol sırasında hata oluştu.' });
  }
}
