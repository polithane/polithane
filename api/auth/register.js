// Vercel Serverless Function - Register
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
    const { 
      email, 
      password, 
      full_name,
      user_type = 'citizen',
      province,
      party_id
    } = req.body;

    // Validation
    if (!email || !password || !full_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, şifre ve tam ad zorunludur.' 
      });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Geçersiz email formatı.' 
      });
    }

    // Şifre uzunluğu kontrolü
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Şifre en az 8 karakter olmalıdır.' 
      });
    }

    // Email zaten kayıtlı mı?
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bu email adresi zaten kayıtlı.' 
      });
    }

    // Username'i email'den otomatik oluştur
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);

    // Şifreyi hashle
    const password_hash = await bcrypt.hash(password, 10);

    // Kullanıcıyı oluştur
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        email: email.toLowerCase(),
        password_hash,
        full_name,
        user_type,
        province: province || null,
        party_id: party_id || null,
        email_verified: true, // Şimdilik direkt verified
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Kayıt sırasında bir hata oluştu.' 
      });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        user_type: user.user_type
      },
      process.env.JWT_SECRET || 'polithane-secret-key-2025',
      { expiresIn: '7d' }
    );

    // Hassas bilgileri çıkar
    const { password_hash: _, verification_token, reset_token, ...userData } = user;

    return res.status(201).json({
      success: true,
      message: 'Kayıt başarılı! Hoş geldiniz.',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Kayıt sırasında bir hata oluştu.' 
    });
  }
}
