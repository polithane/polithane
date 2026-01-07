import express from 'express';
import { sql } from '../index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================
// DASHBOARD STATS
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM parties) as total_parties,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,
        (SELECT COUNT(*) FROM posts WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_posts_week
    `;

    // User type distribution
    const userTypes = await sql`
      SELECT user_type, COUNT(*) as count 
      FROM users 
      GROUP BY user_type 
      ORDER BY count DESC
    `;

    // Top categories
    const topCategories = await sql`
      SELECT category, COUNT(*) as count 
      FROM posts 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `;

    // Recent activity
    const recentUsers = await sql`
      SELECT id, username, full_name, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    res.json({
      success: true,
      data: {
        stats,
        userTypes,
        topCategories,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users with filters
router.get('/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      search,
      user_type,
      is_verified 
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(username ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (user_type) {
      whereConditions.push(`user_type = $${paramIndex}`);
      params.push(user_type);
      paramIndex++;
    }

    if (is_verified !== undefined) {
      whereConditions.push(`is_verified = $${paramIndex}`);
      params.push(is_verified === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        id, username, full_name, email, user_type, 
        is_verified, is_admin, post_count, follower_count,
        polit_score, created_at, last_login, metadata
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    const users = await sql(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countParams = params.slice(0, -2);
    const [{ count }] = await sql(countQuery, countParams.length > 0 ? countParams : []);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_verified, is_admin, user_type } = req.body;

    const updates = {};
    if (is_verified !== undefined) updates.is_verified = is_verified;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    if (user_type) updates.user_type = user_type;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Güncellenecek alan belirtilmedi' 
      });
    }

    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    
    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
    const [updated] = await sql(query, [userId, ...Object.values(updates)]);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kendi hesabınızı silemezsiniz' 
      });
    }

    await sql`DELETE FROM users WHERE id = ${userId}`;

    res.json({ success: true, message: 'Kullanıcı silindi' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POST MODERATION
// ============================================

// Get all posts with filters
router.get('/posts', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      category,
      user_id 
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`p.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (user_id) {
      whereConditions.push(`p.user_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    const posts = await sql(query, params);

    const countQuery = `SELECT COUNT(*) FROM posts p ${whereClause}`;
    const countParams = params.slice(0, -2);
    const [{ count }] = await sql(countQuery, countParams.length > 0 ? countParams : []);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete post (admin)
router.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    await sql`DELETE FROM posts WHERE id = ${postId}`;

    res.json({ success: true, message: 'Post silindi' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SITE SETTINGS
// ============================================

// Get site settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await sql`
      SELECT * FROM site_settings ORDER BY key
    `;

    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    // If table doesn't exist, return defaults
    res.json({
      success: true,
      data: {
        site_name: 'Polithane',
        site_description: 'Türkiye siyasetinin dijital meydanı',
        maintenance_mode: false
      }
    });
  }
});

// Update site settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await sql`
        INSERT INTO site_settings (key, value)
        VALUES (${key}, ${JSON.stringify(value)})
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value
      `.catch(() => {
        // Table might not exist, that's ok
      });
    }

    res.json({ success: true, message: 'Ayarlar güncellendi' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MAIL SETTINGS (Brevo) + TEST
// ============================================

router.get('/mail/settings', async (req, res) => {
  try {
    const keys = [
      'mail_enabled',
      'mail_provider',
      'mail_sender_email',
      'mail_sender_name',
      'mail_reply_to_email',
      'mail_reply_to_name',
      'email_verification_enabled',
      'mail_brevo_api_key', // read-only (do not return)
    ];

    const rows = await sql`SELECT key, value FROM site_settings WHERE key = ANY(${keys})`;
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const brevoApiKeyConfigured = !!String(process.env.BREVO_API_KEY || map.get('mail_brevo_api_key') || '').trim();

    res.json({
      success: true,
      data: {
        mail_enabled: map.get('mail_enabled') ?? 'true',
        mail_provider: map.get('mail_provider') ?? 'brevo',
        mail_sender_email: map.get('mail_sender_email') ?? '',
        mail_sender_name: map.get('mail_sender_name') ?? 'Polithane',
        mail_reply_to_email: map.get('mail_reply_to_email') ?? '',
        mail_reply_to_name: map.get('mail_reply_to_name') ?? '',
        email_verification_enabled: map.get('email_verification_enabled') ?? 'false',
        brevo_api_key_configured: brevoApiKeyConfigured,
      },
    });
  } catch (error) {
    console.error('Get mail settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/mail/settings', async (req, res) => {
  try {
    const {
      mail_enabled,
      mail_provider,
      mail_sender_email,
      mail_sender_name,
      mail_reply_to_email,
      mail_reply_to_name,
      email_verification_enabled,
      brevo_api_key,
      clear_brevo_api_key,
    } = req.body || {};

    const upserts = {
      ...(mail_enabled !== undefined ? { mail_enabled: String(mail_enabled) } : {}),
      ...(mail_provider ? { mail_provider: String(mail_provider) } : {}),
      ...(mail_sender_email !== undefined ? { mail_sender_email: String(mail_sender_email || '') } : {}),
      ...(mail_sender_name !== undefined ? { mail_sender_name: String(mail_sender_name || '') } : {}),
      ...(mail_reply_to_email !== undefined ? { mail_reply_to_email: String(mail_reply_to_email || '') } : {}),
      ...(mail_reply_to_name !== undefined ? { mail_reply_to_name: String(mail_reply_to_name || '') } : {}),
      ...(email_verification_enabled !== undefined ? { email_verification_enabled: String(email_verification_enabled) } : {}),
    };

    // API key: never return it; only set if explicitly provided
    const apiKeyStr = typeof brevo_api_key === 'string' ? brevo_api_key.trim() : '';
    if (apiKeyStr) {
      upserts.mail_brevo_api_key = apiKeyStr;
    } else if (clear_brevo_api_key === true) {
      upserts.mail_brevo_api_key = '';
    }

    for (const [key, value] of Object.entries(upserts)) {
      await sql`
        INSERT INTO site_settings (key, value)
        VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    }

    res.json({ success: true, message: 'Mail ayarları kaydedildi.' });
  } catch (error) {
    console.error('Update mail settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mail/test', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    const toEmail = String(to || '').trim();
    if (!toEmail || !toEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Geçerli bir alıcı e-posta yazın.' });
    }
    const subj = String(subject || '').trim();
    const textBody = String(text || '').trim();
    const htmlBody = String(html || '').trim();
    if (!subj) return res.status(400).json({ success: false, error: 'Konu boş olamaz.' });
    if (!textBody && !htmlBody) return res.status(400).json({ success: false, error: 'Mesaj boş olamaz.' });

    const { sendEmail } = await import('../utils/mailer/index.js');
    const r = await sendEmail({
      to: [{ email: toEmail }],
      subject: subj,
      text: textBody || undefined,
      html: htmlBody || undefined,
      tags: ['admin-test'],
    });
    res.json(r?.success ? r : { success: false, error: r?.error || 'E-posta gönderilemedi.' });
  } catch (error) {
    console.error('Send test mail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// EMAIL TEMPLATES (admin_email_templates)
// ============================================

const EMAIL_TEMPLATES_SCHEMA_SQL = `
create extension if not exists pgcrypto;
create table if not exists public.admin_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other',
  subject text not null default '',
  content_html text not null default '',
  is_active boolean not null default true,
  usage_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_admin_email_templates_type on public.admin_email_templates(type);
`;

router.get('/email-templates', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM admin_email_templates ORDER BY updated_at DESC, created_at DESC`;
    res.json({ success: true, data: rows });
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('does not exist')) {
      return res.json({ success: false, schemaMissing: true, requiredSql: EMAIL_TEMPLATES_SCHEMA_SQL, error: 'DB tablosu eksik: admin_email_templates' });
    }
    console.error('Get email templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/email-templates', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const type = String(req.body?.type || 'other').trim() || 'other';
    const subject = String(req.body?.subject || '').trim();
    const content_html = String(req.body?.content_html || '').trim();
    const is_active = req.body?.is_active !== false;
    if (!name) return res.status(400).json({ success: false, error: 'Şablon adı zorunludur.' });

    const [row] = await sql`
      INSERT INTO admin_email_templates (name, type, subject, content_html, is_active, updated_at)
      VALUES (${name}, ${type}, ${subject}, ${content_html}, ${is_active}, now())
      RETURNING *
    `;
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('does not exist')) {
      return res.json({ success: false, schemaMissing: true, requiredSql: EMAIL_TEMPLATES_SCHEMA_SQL, error: 'DB tablosu eksik: admin_email_templates' });
    }
    console.error('Create email template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/email-templates/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const patch = req.body || {};
    const name = patch.name !== undefined ? String(patch.name || '').trim() : undefined;
    const type = patch.type !== undefined ? String(patch.type || 'other').trim() : undefined;
    const subject = patch.subject !== undefined ? String(patch.subject || '').trim() : undefined;
    const content_html = patch.content_html !== undefined ? String(patch.content_html || '').trim() : undefined;
    const is_active = patch.is_active !== undefined ? patch.is_active !== false : undefined;

    const [row] = await sql`
      UPDATE admin_email_templates
      SET
        name = COALESCE(${name}, name),
        type = COALESCE(${type}, type),
        subject = COALESCE(${subject}, subject),
        content_html = COALESCE(${content_html}, content_html),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = now()
      WHERE id = ${id}::uuid
      RETURNING *
    `;
    if (!row) return res.status(404).json({ success: false, error: 'Şablon bulunamadı.' });
    res.json({ success: true, data: row });
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('does not exist')) {
      return res.json({ success: false, schemaMissing: true, requiredSql: EMAIL_TEMPLATES_SCHEMA_SQL, error: 'DB tablosu eksik: admin_email_templates' });
    }
    console.error('Update email template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/email-templates/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await sql`DELETE FROM admin_email_templates WHERE id = ${id}::uuid`;
    res.json({ success: true });
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('does not exist')) {
      return res.json({ success: false, schemaMissing: true, requiredSql: EMAIL_TEMPLATES_SCHEMA_SQL, error: 'DB tablosu eksik: admin_email_templates' });
    }
    console.error('Delete email template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
