import express from 'express';
import { sql } from '../index.js';
import { sendWelcomeEmail } from '../utils/emailService.js';

const router = express.Router();

// ============================================
// VERIFY EMAIL - Email doğrulama
// ============================================
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Doğrulama token\'ı bulunamadı.'
      });
    }

    // Token'ı veritabanında bul
    const [user] = await sql`
      SELECT id, username, email, verification_token_expires, email_verified
      FROM users
      WHERE verification_token = ${token}
    `;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Geçersiz doğrulama linki.'
      });
    }

    // Zaten doğrulanmış mı?
    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email adresi zaten doğrulanmış.',
        alreadyVerified: true
      });
    }

    // Token süresi dolmuş mu?
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({
        success: false,
        error: 'Doğrulama linkinin süresi dolmuş. Lütfen yeni bir link talep edin.',
        expired: true
      });
    }

    // Email'i doğrula
    await sql`
      UPDATE users
      SET 
        email_verified = TRUE,
        verified_at = CURRENT_TIMESTAMP,
        verification_token = NULL,
        verification_token_expires = NULL
      WHERE id = ${user.id}
    `;

    // Hoş geldiniz email'i gönder
    try {
      await sendWelcomeEmail(user.email, user.username);
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('⚠️  Welcome email failed:', emailError);
      // Email hatası kullanıcıya bildirmeyiz
    }

    res.json({
      success: true,
      message: 'Email adresiniz başarıyla doğrulandı! Artık tüm özellikleri kullanabilirsiniz.',
      data: {
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email doğrulama sırasında bir hata oluştu.'
    });
  }
});

// ============================================
// RESEND VERIFICATION - Doğrulama email'ini tekrar gönder
// ============================================
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email adresi gereklidir.'
      });
    }

    // Kullanıcıyı bul
    const [user] = await sql`
      SELECT id, username, email, email_verified
      FROM users
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Bu email adresiyle kayıtlı kullanıcı bulunamadı.'
      });
    }

    // Zaten doğrulanmış mı?
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email adresi zaten doğrulanmış.'
      });
    }

    // Yeni token oluştur
    const { generateVerificationToken, sendVerificationEmail } = await import('../utils/emailService.js');
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Token'ı güncelle
    await sql`
      UPDATE users
      SET 
        verification_token = ${verificationToken},
        verification_token_expires = ${tokenExpires}
      WHERE id = ${user.id}
    `;

    // Email gönder
    await sendVerificationEmail(user.email, verificationToken);

    res.json({
      success: true,
      message: 'Doğrulama email\'i tekrar gönderildi. Lütfen gelen kutunuzu kontrol edin.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email gönderilirken bir hata oluştu.'
    });
  }
});

export default router;
