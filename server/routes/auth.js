import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { getSetting } from '../utils/settingsService.js';
import { recordFailedLogin, clearFailedLoginAttempts, getRealIP } from '../utils/securityService.js';
import { sql } from '../index.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// Forgot Password Rate Limiter
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3, 
  message: 'Çok fazla şifre sıfırlama isteği gönderdiniz. 15 dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// CHECK AVAILABILITY
// ============================================
router.get('/check-availability', async (req, res) => {
  try {
    const { email } = req.query;
    const result = { emailAvailable: true };

    if (email) {
      const [existingEmail] = await sql`
        SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
      `;
      if (existingEmail) result.emailAvailable = false;
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ success: false, error: 'Kontrol sırasında hata oluştu.' });
  }
});

// ============================================
// REGISTER
// ============================================
router.post('/register', upload.single('document'), async (req, res) => {
  try {
    const { 
      email, 
      password, 
      full_name,
      user_type = 'citizen',
      province,
      district,
      party_id,
      politician_type,
      is_claim,
      claim_user_id
    } = req.body;

    let metadata = {};
    if (req.body.metadata) {
        try {
            metadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
        } catch (e) {
            console.error('Metadata parse error', e);
        }
    }

    if (req.file) {
        metadata.document_path = `/uploads/${req.file.filename}`;
        metadata.document_original_name = req.file.originalname;
    }

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Email, şifre ve tam ad zorunludur.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Geçersiz email formatı.' });
    }

    // Password rules (align with production /api)
    const pw = String(password || '');
    if (pw.length < 8) {
      return res.status(400).json({ success: false, error: 'Şifre en az 8 karakter olmalıdır.' });
    }
    if (pw.length > 50) {
      return res.status(400).json({ success: false, error: 'Şifre en fazla 50 karakter olabilir.' });
    }
    if (!/[a-zA-Z]/.test(pw)) {
      return res.status(400).json({ success: false, error: 'Şifre en az 1 harf içermelidir.' });
    }
    if (!/[0-9]/.test(pw)) {
      return res.status(400).json({ success: false, error: 'Şifre en az 1 rakam içermelidir.' });
    }

    const [existingEmail] = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email})`;
    if (existingEmail) {
      return res.status(400).json({ success: false, error: 'Bu email adresi zaten kayıtlı.' });
    }

    // Auto Username Generation
    const normalizeUsername = (value) => {
      if (!value) return '';
      const turkishMap = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
      let out = value.trim().split('').map((ch) => turkishMap[ch] ?? ch).join('').toLowerCase();
      out = out.replace(/^@+/, '').replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
      out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
      // Pad to minimum 5 chars with underscores (e.g. ali__ / ay___)
      if (out && out.length < 5) out = (out + '_____').slice(0, 5);
      if (out && !/^[a-z]/.test(out)) out = `u${out}`.slice(0, 20);
      return out;
    };

    const base = email.split('@')[0];
    let username = normalizeUsername(base);
    
    const exists = async (u) => {
      const [row] = await sql`SELECT id FROM users WHERE username = ${u} LIMIT 1`;
      return !!row;
    };

    if (await exists(username)) {
      const baseTrimmed = username.slice(0, 20);
      let ok = false;
      for (let i = 0; i < 50; i++) {
        const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
        const candidate = `${baseTrimmed.slice(0, Math.max(0, 20 - (suffix.length + 1)))}_${suffix}`.slice(0, 20);
        if (!(await exists(candidate))) {
          username = candidate;
          ok = true;
          break;
        }
      }
      if (!ok) username = `user_${Date.now().toString().slice(-8)}`;
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const emailVerificationEnabled = user_type !== 'citizen';
    let isActive = true;
    let isVerified = user_type === 'citizen';
    let verificationToken = null;
    let tokenExpires = null;
    let emailVerified = true;

    const metadataJson = JSON.stringify(metadata);

    const [user] = await sql`
      INSERT INTO users (
        username, email, password_hash, full_name, user_type,
        province, district_name, party_id, politician_type, metadata,
        is_verified, is_active, email_verified, verification_token, verification_token_expires
      ) VALUES (
        ${username}, ${email}, ${password_hash}, ${full_name}, ${user_type},
        ${province || null}, ${district || null}, ${party_id || null}, ${politician_type || null},
        ${metadataJson}::jsonb, ${isVerified}, ${isActive}, ${emailVerified},
        ${verificationToken}, ${tokenExpires}
      )
      RETURNING id, username, email, full_name, user_type, avatar_url, email_verified, created_at
    `;

    if (is_claim === 'true' && claim_user_id) {
       await sql`
         UPDATE users 
         SET metadata = jsonb_set(metadata, '{claim_request}', ${JSON.stringify({ target_user_id: claim_user_id, status: 'pending' })})
         WHERE id = ${user.id}
       `;
    }

    // System Notification (Welcome)
    await sql`
      INSERT INTO notifications (user_id, type, content, is_read)
      VALUES (${user.id}, 'system', 'Aramıza hoş geldiniz! Profilinizi düzenleyerek eksik bilgilerinizi tamamlayabilir ve kullanıcı adınızı belirleyebilirsiniz.', false)
    `.catch(err => console.error('Notification create error:', err));

    if (user_type === 'citizen') {
      sendWelcomeEmail(email, full_name).catch(console.error);
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: user_type === 'citizen' ? 'Kayıt başarılı! Hoş geldiniz.' : 'Başvurunuz alınmıştır. En kısa sürede incelenip tarafınıza dönüş yapılacaktır.',
      data: { user, token, requiresApproval: user_type !== 'citizen' }
    });

  } catch (error) {
    console.error('Register error:', error);
    if (error.message.includes('column "metadata"')) {
        return res.status(500).json({ success: false, error: 'Veritabanı şema hatası (metadata eksik).' });
    }
    res.status(500).json({ success: false, error: 'Kayıt sırasında bir hata oluştu: ' + error.message });
  }
});

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginValue = (identifier || email || '').trim();

    if (!loginValue || !password) {
      return res.status(400).json({ success: false, error: 'Email ve şifre zorunludur.' });
    }

    const isEmail = loginValue.includes('@');
    const [user] = await sql`
      SELECT * FROM users 
      WHERE ${isEmail ? sql`LOWER(email) = LOWER(${loginValue})` : sql`username = ${loginValue}`}
    `;

    const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
    
    if (!user || !validPassword) {
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const failResult = await recordFailedLogin(loginValue, ipAddress, userAgent);
      
      if (failResult.blocked) {
        return res.status(429).json({ success: false, error: `Çok fazla başarısız deneme. IP adresiniz 15 dakika engellenmiştir.` });
      }
      return res.status(401).json({ success: false, error: 'Email/kullanıcı adı veya şifre hatalı.', remainingAttempts: Math.max(0, 5 - failResult.attempts) });
    }

    const emailVerificationEnabled = (await getSetting('email_verification_enabled')) === 'true';
    if (emailVerificationEnabled && !user.email_verified) {
      return res.status(403).json({ success: false, error: 'Email adresinizi doğrulamanız gerekiyor.', requiresEmailVerification: true });
    }

    delete user.password_hash;
    const token = generateToken(user);

    await sql`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ${user.id}`;

    res.json({ success: true, message: 'Giriş başarılı!', data: { user, token } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Giriş sırasında bir hata oluştu.' });
  }
});

// ============================================
// LOGOUT
// ============================================
router.post('/logout', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Çıkış başarılı!' });
});

// ============================================
// ME
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [user] = await sql`SELECT * FROM users WHERE id = ${req.user.id}`;
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Kullanıcı bilgisi alınamadı.' });
  }
});

// ============================================
// PASSWORD & EMAIL OPERATIONS
// ============================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Geçersiz şifre bilgileri.' });
    }

    const [user] = await sql`SELECT password_hash FROM users WHERE id = ${req.user.id}`;
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Mevcut şifre hatalı.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${req.user.id}`;
    res.json({ success: true, message: 'Şifreniz güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Hata oluştu.' });
  }
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email gerekli.' });

    const [user] = await sql`SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER(${email})`;
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });

    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 3600000);
    await sql`UPDATE users SET password_reset_token = ${token}, password_reset_expires = ${expires} WHERE id = ${user.id}`;

    sendPasswordResetEmail(email, token).catch(console.error);
    res.json({ success: true, message: 'Şifre sıfırlama linki gönderildi.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Hata oluştu.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) return res.status(400).json({ success: false, error: 'Geçersiz bilgi.' });

    const [user] = await sql`SELECT id FROM users WHERE password_reset_token = ${token} AND password_reset_expires > NOW()`;
    if (!user) return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş link.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${hash}, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ${user.id}`;
    res.json({ success: true, message: 'Şifreniz sıfırlandı.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Hata oluştu.' });
  }
});

router.post('/verify-email', async (req, res) => {
    // Implement verification logic similar to previous code if needed
    res.json({ success: true, message: 'Email doğrulama.' });
});

export default router;
