// Vercel Serverless Function - Get User by Username
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        parties:party_id (name, logo_url, color)
      `)
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Kullanıcı bulunamadı.' 
      });
    }

    // Remove sensitive data
    const { password_hash, verification_token, reset_token, ...userData } = user;

    return res.status(200).json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Bir hata oluştu.' 
    });
  }
}
