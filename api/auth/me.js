// Vercel Serverless Function - Get Current User
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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
    // Token'ı al
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token bulunamadı.' 
      });
    }

    const token = authHeader.substring(7);

    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'polithane-secret-key-2025');

    // Kullanıcıyı getir
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Kullanıcı bulunamadı.' 
      });
    }

    // Hassas bilgileri çıkar
    const { password_hash, verification_token, reset_token, ...userData } = user;

    return res.status(200).json({
      success: true,
      data: userData
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Geçersiz veya süresi dolmuş token.' 
      });
    }

    console.error('Get user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı bilgileri alınırken hata oluştu.' 
    });
  }
}
