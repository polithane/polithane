/**
 * Vercel Serverless Function: Password Reset
 * Self-contained endpoint for /api/auth/forgot-password
 */

import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ========================
// DATABASE HELPER
// ========================
let pool;
function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return pool;
}

async function query(text, params) {
  const db = getDb();
  return db.query(text, params);
}

// ========================
// MAIL HELPER
// ========================
async function sendPasswordResetEmail(email, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  console.log('📧 Sending password reset email:');
  console.log('  - To:', email);
  console.log('  - Token:', resetToken?.substring(0, 10) + '...');
  console.log('  - Reset Link:', resetLink);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Şifre Sıfırlama</h1>
        </div>
        <div class="content">
          <p>Merhaba,</p>
          <p>Polithane hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Şifremi Sıfırla</a>
          </p>
          <p>Veya aşağıdaki linki tarayıcınıza kopyalayın:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
            ${resetLink}
          </p>
          <p><strong>Bu link 1 saat içinde geçerliliğini yitire checkek.</strong></p>
          <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          <p>Saygılarımızla,<br>Polithane Ekibi</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Polithane. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Get mail config from ENV
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@polithane.com';
  const fromName = process.env.BREVO_FROM_NAME || 'Polithane';
  
  if (!apiKey) {
    console.error('❌ BREVO_API_KEY is not set in environment');
    return { success: false, error: 'Mail configuration missing' };
  }
  
  console.log('📤 Sending via Brevo API');
  console.log('  - API Key Present:', !!apiKey);
  console.log('  - From:', fromEmail);
  
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email }],
        subject: '🔐 Şifre Sıfırlama - Polithane',
        htmlContent: html,
      }),
    });
    
    console.log('📨 Brevo API Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Email sent successfully. Message ID:', data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      const errorText = await response.text();
      console.error('❌ Brevo API Error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Mail sending exception:', error);
    return { success: false, error: error.message };
  }
}

// ========================
// MAIN HANDLER
// ========================
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  console.log('\n🔐 === PASSWORD RESET REQUEST (Serverless Function v1.0) ===');
  console.log('📧 Request Body:', req.body);
  
  const { email } = req.body;
  
  if (!email) {
    console.log('❌ No email provided');
    return res.status(400).json({ success: false, error: 'Email gerekli' });
  }
  
  try {
    // Check if user exists
    console.log('🔍 Checking if user exists:', email);
    const userResult = await query(
      'SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('⚠️ User not found, but returning generic success message');
      return res.json({
        success: true,
        message: 'Eğer bu email kayıtlıysa, size şifre sıfırlama linki gönderdik.',
        _debug: {
          version: 'serverless-v1.0',
          timestamp: new Date().toISOString(),
          emailFound: false,
        },
      });
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', user.username);
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    
    console.log('🔑 Generated reset token:', resetToken.substring(0, 10) + '...');
    console.log('⏰ Expires at:', expiresAt.toISOString());
    
    // Save token to database
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [user.id, resetToken, expiresAt]
    );
    
    console.log('✅ Token saved to database');
    
    // Send email
    console.log('📧 Attempting to send password reset email...');
    const mailResult = await sendPasswordResetEmail(email, resetToken);
    
    console.log('📨 Mail sending result:', mailResult);
    
    if (!mailResult.success) {
      console.error('❌ Failed to send email:', mailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Şifre sıfırlama emaili gönderilemedi. Lütfen daha sonra tekrar deneyin.',
        _debug: {
          version: 'serverless-v1.0',
          timestamp: new Date().toISOString(),
          emailFound: true,
          mailError: mailResult.error,
        },
      });
    }
    
    console.log('✅ Password reset email sent successfully');
    console.log('🔐 === END PASSWORD RESET REQUEST ===\n');
    
    return res.json({
      success: true,
      message: 'Şifre sıfırlama linki email adresinize gönderildi.',
      _debug: {
        version: 'serverless-v1.0',
        timestamp: new Date().toISOString(),
        emailFound: true,
        mailSent: true,
        messageId: mailResult.messageId,
      },
    });
    
  } catch (error) {
    console.error('❌ Password reset error:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
      _debug: {
        version: 'serverless-v1.0',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
    });
  }
}
