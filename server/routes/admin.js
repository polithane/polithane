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
        polit_score, created_at, last_login
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

export default router;
