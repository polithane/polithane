import express from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../index.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { isEmailVerificationEnabled, getEmailConfig } from '../utils/settingsService.js';
import { generateVerificationToken, sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

// ============================================
// REGISTER - Yeni kullanıcı kaydı
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      full_name,
      user_type = 'citizen',
      province,
      party_id
    } = req.body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kullanıcı adı, email, şifre ve tam ad zorunludur.' 
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
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Şifre en az 6 karakter olmalıdır.' 
      });
    }

    // Kullanıcı adı kontrolü (sadece harf, rakam, alt çizgi)
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir.' 
      });
    }

    // Kullanıcı adı zaten var mı?
    const [existingUsername] = await sql`
      SELECT id FROM users WHERE LOWER(username) = LOWER(${username})
    `;
    
    if (existingUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bu kullanıcı adı zaten kullanılıyor.' 
      });
    }

    // Email zaten var mı?
    const [existingEmail] = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
    `;
    
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bu email adresi zaten kullanılıyor.' 
      });
    }

    // Şifreyi hashle
    const password_hash = await bcrypt.hash(password, 10);

    // Email doğrulama sistemi kontrolü (admin panelinden açılıp kapanabilir)
    const emailVerificationEnabled = await isEmailVerificationEnabled();
    
    let emailVerified = !emailVerificationEnabled; // Kapalıysa otomatik verified
    let verificationToken = null;
    let tokenExpires = null;

    // Email doğrulama açıksa token oluştur
    if (emailVerificationEnabled) {
      verificationToken = generateVerificationToken();
      tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
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
        verification_token_expires,
        verified_at
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
        ${tokenExpires},
        ${emailVerified ? new Date() : null}
      )
      RETURNING id, username, email, full_name, user_type, avatar_url, email_verified, created_at
    `;

    // Email doğrulama açıksa email gönder
    if (emailVerificationEnabled && verificationToken) {
      try {
        const emailConfig = await getEmailConfig();
        if (emailConfig.smtpUser && emailConfig.smtpPassword) {
          await sendVerificationEmail(email, username, verificationToken, emailConfig);
          console.log(`✅ Verification email sent to ${email}`);
        } else {
          console.warn('⚠️ Email verification enabled but SMTP not configured');
        }
      } catch (emailError) {
        console.error('⚠️ Email send failed:', emailError);
        // Email hatası kullanıcıyı engellemesin
      }
    }

    // JWT token oluştur
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: emailVerificationEnabled 
        ? 'Kayıt başarılı! Lütfen email adresinizi doğrulayın.' 
        : 'Kayıt başarılı! Hesabınız oluşturuldu.',
      data: {
        user,
        token,
        requiresVerification: emailVerificationEnabled && !emailVerified
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
// LOGIN - Kullanıcı girişi
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kullanıcı adı/email ve şifre zorunludur.' 
      });
    }

    // Kullanıcıyı bul (username veya email ile)
    const [user] = await sql`
      SELECT 
        id, username, email, password_hash, full_name, 
        user_type, avatar_url, cover_url, bio, 
        is_verified, is_admin, follower_count, following_count,
        post_count, polit_score, province, party_id, created_at
      FROM users 
      WHERE LOWER(username) = LOWER(${username}) 
         OR LOWER(email) = LOWER(${username})
    `;

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Kullanıcı adı/email veya şifre hatalı.' 
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Kullanıcı adı/email veya şifre hatalı.' 
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
// GET CURRENT USER - Mevcut kullanıcı bilgisi
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT 
        id, username, email, full_name, 
        user_type, avatar_url, cover_url, bio, 
        is_verified, is_admin, follower_count, following_count,
        post_count, polit_score, province, party_id, created_at
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
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Kullanıcı bilgileri alınırken hata oluştu.' 
    });
  }
});

// ============================================
// LOGOUT - Çıkış (Client-side token silme)
// ============================================
router.post('/logout', authenticateToken, (req, res) => {
  // JWT ile logout server-side'da bir şey yapmamıza gerek yok
  // Client tarafında token silinecek
  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı.'
  });
});

// ============================================
// UPDATE PASSWORD - Şifre değiştirme
// ============================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mevcut şifre ve yeni şifre zorunludur.' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Yeni şifre en az 6 karakter olmalıdır.' 
      });
    }

    // Mevcut şifreyi kontrol et
    const [user] = await sql`
      SELECT password_hash FROM users WHERE id = ${req.user.id}
    `;

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Mevcut şifre hatalı.' 
      });
    }

    // Yeni şifreyi hashle ve güncelle
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}
      WHERE id = ${req.user.id}
    `;

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Şifre değiştirme sırasında hata oluştu.' 
    });
  }
});

export default router;
