// Vercel Serverless Function - Login
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    if (!password || (!username && !email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kullanıcı adı/email ve şifre gereklidir.' 
      });
    }

    // Kullanıcıyı bul
    let query = supabase.from('users').select('*');
    
    if (email) {
      query = query.eq('email', email.toLowerCase());
    } else {
      query = query.eq('username', username.toLowerCase());
    }

    const { data: users, error } = await query.limit(1).single();

    if (error || !users) {
      return res.status(401).json({ 
        success: false, 
        error: 'Kullanıcı adı/email veya şifre hatalı.' 
      });
    }

    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, users.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Kullanıcı adı/email veya şifre hatalı.' 
      });
    }

    // Aktif mi kontrol et
    if (!users.is_active) {
      return res.status(403).json({ 
        success: false, 
        error: 'Hesabınız pasif durumda.' 
      });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        id: users.id, 
        username: users.username,
        email: users.email,
        user_type: users.user_type
      },
      process.env.JWT_SECRET || 'polithane-secret-key-2025',
      { expiresIn: '7d' }
    );

    // Kullanıcı bilgilerini döndür (hassas bilgiler hariç)
    const { password_hash, verification_token, reset_token, ...userData } = users;

    return res.status(200).json({
      success: true,
      message: 'Giriş başarılı!',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Giriş yapılırken bir hata oluştu.' 
    });
  }
}
