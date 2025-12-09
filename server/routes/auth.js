import express from 'express';
import bcrypt from 'bcryptjs';
import { sql, forgotPasswordLimiter } from '../index.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { getSetting } from '../utils/settingsService.js';

const router = express.Router();

// ============================================
// REGISTER - Email-based registration
// ============================================
router.post('/register', async (req, res) => {
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
    const [existingEmail] = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
    `;
    
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bu email adresi zaten kayıtlı.' 
      });
    }

    // Username'i email'den otomatik oluştur
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);

    // Şifreyi hashle
    const password_hash = await bcrypt.hash(password, 10);

    // Email verification admin panelden açık mı kontrol et
    const emailVerificationEnabled = (await getSetting('email_verification_enabled')) === 'true';

    let verificationToken = null;
    let tokenExpires = null;
    let emailVerified = false;
    
    if (emailVerificationEnabled) {
      // Email doğrulama token'ı oluştur
      verificationToken = generateVerificationToken();
      tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
      emailVerified = false;
    } else {
      // Email verification kapalı, direkt verified
      emailVerified = true;
    }

    // Kullanıcıyı oluştur
    const [user] = await sql`
      INSERT INTO users (
        username,
        email,
        password_hash,
        full_name,
        user_type,
        province,
        party_id,
        email_verified,
        verification_token,
        verification_token_expires
      )
      VALUES (
        ${username},
        ${email},
        ${password_hash},
        ${full_name},
        ${user_type},
        ${province || null},
        ${party_id || null},
        ${emailVerified},
        ${verificationToken},
        ${tokenExpires}
      )
      RETURNING id, username, email, full_name, user_type, avatar_url, email_verified, created_at
    `;

    // Verification email gönder (async - sadece açıksa)
    if (emailVerificationEnabled) {
      sendVerificationEmail(email, verificationToken)
        .then(() => console.log(`✅ Verification email sent to ${email}`))
        .catch((emailError) => console.error('⚠️ Verification email gönderme hatası:', emailError));
    } else {
      // Email verification kapalıysa welcome email gönder (async)
      sendWelcomeEmail(email, full_name)
        .then(() => console.log(`✅ Welcome email sent to ${email}`))
        .catch((emailError) => console.error('⚠️ Welcome email gönderme hatası:', emailError));
    }

    // JWT token oluştur
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: emailVerificationEnabled 
        ? 'Kayıt başarılı! Email adresinize doğrulama linki gönderildi.'
        : 'Kayıt başarılı! Hoş geldiniz.',
      data: {
        user,
        token,
        requiresEmailVerification: emailVerificationEnabled
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kayıt sırasında bir hata oluştu.' 
    });
  }
});

// ============================================
// LOGIN - Email-based login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email ve şifre zorunludur.' 
      });
    }

    // Kullanıcıyı email ile bul
    const [user] = await sql`
      SELECT 
        id, username, email, password_hash, full_name, 
        user_type, avatar_url, cover_url, bio, 
        is_verified, is_admin, follower_count, following_count,
        post_count, polit_score, province, party_id, email_verified, created_at
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Email veya şifre hatalı.' 
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Email veya şifre hatalı.' 
      });
    }

    // Email verification admin panelden açık mı kontrol et
    const emailVerificationEnabled = (await getSetting('email_verification_enabled')) === 'true';

    // Email verification açıksa ve email doğrulanmamışsa
    if (emailVerificationEnabled && !user.email_verified) {
      return res.status(403).json({ 
        success: false, 
        error: 'Email adresinizi doğrulamanız gerekiyor. Lütfen mailinizi kontrol edin.',
        requiresEmailVerification: true
      });
    }

    // password_hash'i kaldır
    delete user.password_hash;

    // JWT token oluştur
    const token = generateToken(user);

    // Son giriş zamanını güncelle
    await sql`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `;

    res.json({
      success: true,
      message: 'Giriş başarılı!',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Giriş sırasında bir hata oluştu.' 
    });
  }
});

// ============================================
// LOGOUT
// ============================================
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Çıkış başarılı!'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Çıkış sırasında bir hata oluştu.' 
    });
  }
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT 
        id, username, email, full_name, 
        user_type, avatar_url, cover_url, bio, 
        is_verified, is_admin, follower_count, following_count,
        post_count, polit_score, province, party_id, email_verified, created_at
      FROM users 
      WHERE id = ${req.user.id}
    `;

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Kullanıcı bulunamadı.' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı bilgisi alınamadı.' 
    });
  }
});

// ============================================
// VERIFY EMAIL
// ============================================
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Doğrulama token\'ı gerekli.'
      });
    }

    // Token ile kullanıcıyı bul
    const [user] = await sql`
      SELECT id, email, full_name, verification_token_expires, email_verified
      FROM users
      WHERE verification_token = ${token}
    `;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz doğrulama token\'ı.'
      });
    }

    // Token süresi dolmuş mu?
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({
        success: false,
        error: 'Doğrulama token\'ının süresi dolmuş. Lütfen yeni bir doğrulama emaili isteyin.'
      });
    }

    // Email zaten doğrulanmış mı?
    if (user.email_verified) {
      return res.json({
        success: true,
        message: 'Email adresi zaten doğrulanmış.'
      });
    }

    // Email'i doğrula
    await sql`
      UPDATE users
      SET email_verified = true,
          verified_at = CURRENT_TIMESTAMP,
          verification_token = NULL,
          verification_token_expires = NULL
      WHERE id = ${user.id}
    `;

    // Welcome email gönder
    try {
      await sendWelcomeEmail(user.email, user.full_name);
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('⚠️ Welcome email gönderme hatası:', emailError);
    }

    res.json({
      success: true,
      message: 'Email adresiniz başarıyla doğrulandı!'
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
// CHANGE PASSWORD
// ============================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut ve yeni şifre gerekli.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Yeni şifre en az 8 karakter olmalıdır.'
      });
    }

    // Kullanıcıyı bul
    const [user] = await sql`
      SELECT id, password_hash
      FROM users
      WHERE id = ${req.user.id}
    `;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı.'
      });
    }

    // Mevcut şifre doğru mu?
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Mevcut şifre hatalı.'
      });
    }

    // Yeni şifreyi hashle
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash}
      WHERE id = ${req.user.id}
    `;

    res.json({
      success: true,
      message: 'Şifreniz başarıyla değiştirildi.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Şifre değiştirme sırasında bir hata oluştu.'
    });
  }
});

// ============================================
// FORGOT PASSWORD - Şifremi Unuttum
// ============================================
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email adresi gerekli.'
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

    // Kullanıcıyı bul
    const [user] = await sql`
      SELECT id, email, full_name
      FROM users
      WHERE LOWER(email) = LOWER(${email})
    `;

    // Email kayıtlı değilse hata döndür
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Bu email adresiyle kayıtlı bir kullanıcı bulunamadı.'
      });
    }

    // Reset token oluştur
    const resetToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    // Token'ı database'e kaydet
    await sql`
      UPDATE users
      SET password_reset_token = ${resetToken},
          password_reset_expires = ${tokenExpires}
      WHERE id = ${user.id}
    `;

    // Password reset email gönder (async - response'u bloklamıyor)
    sendPasswordResetEmail(email, resetToken)
      .then(() => {
        console.log(`✅ Password reset email sent to ${email}`);
      })
      .catch((emailError) => {
        console.error('⚠️ Password reset email gönderme hatası:', emailError);
        console.error('Email Error Details:', emailError.message);
        console.error('🔴 SMTP CONNECTION TIMEOUT - Railway Gmail SMTP portlarını blokluyor olabilir!');
      });

    // Response'u hemen döndür (email gönderilmesini bekleme)
    res.json({
      success: true,
      message: 'Şifre sıfırlama linki email adresinize gönderildi.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Şifre sıfırlama sırasında bir hata oluştu.'
    });
  }
});

// ============================================
// RESET PASSWORD - Şifre Sıfırlama
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token ve yeni şifre gerekli.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Şifre en az 8 karakter olmalıdır.'
      });
    }

    // Token ile kullanıcıyı bul
    const [user] = await sql`
      SELECT id, email, password_reset_expires
      FROM users
      WHERE password_reset_token = ${token}
    `;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veya süresi dolmuş token.'
      });
    }

    // Token süresi dolmuş mu?
    if (new Date() > new Date(user.password_reset_expires)) {
      return res.status(400).json({
        success: false,
        error: 'Şifre sıfırlama linkinin süresi dolmuş. Lütfen yeni bir link isteyin.'
      });
    }

    // Yeni şifreyi hashle
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle ve token'ı sil
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ${user.id}
    `;

    res.json({
      success: true,
      message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Şifre sıfırlama sırasında bir hata oluştu.'
    });
  }
});

export default router;
