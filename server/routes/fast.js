import express from 'express';
import { sql } from '../index.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// GET PUBLIC FAST (Unauthenticated)
// ============================================
router.get('/public', async (req, res) => {
  try {
    const { limit = 24 } = req.query;

    const query = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        u.user_type,
        pt.name as party_name,
        pt.logo_url as party_logo,
        pt.color as party_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        false as is_liked
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE p.is_trending = true
      ORDER BY u.polit_score DESC, p.created_at DESC
      LIMIT $1
    `;

    const fasts = await sql(query, [parseInt(limit)]);

    res.json({
      success: true,
      data: fasts
    });
  } catch (error) {
    console.error('Get public fast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET AUTHENTICATED FAST (Personalized)
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 24 } = req.query;
    const userId = req.user.id;

    const query = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        u.user_type,
        pt.name as party_name,
        pt.logo_url as party_logo,
        pt.color as party_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = $2) as is_liked
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE p.is_trending = true
      ORDER BY 
        CASE 
          WHEN p.user_id = $2 THEN 0
          WHEN EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = p.user_id) THEN 1
          ELSE 2
        END,
        u.polit_score DESC,
        p.created_at DESC
      LIMIT $1
    `;

    const fasts = await sql(query, [parseInt(limit), userId]);

    res.json({
      success: true,
      data: fasts
    });
  } catch (error) {
    console.error('Get authenticated fast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET USER'S FAST (Profile fast stream)
// ============================================
router.get('/user/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 50 } = req.query;

    // Get user by username
    const [user] = await sql`SELECT id FROM users WHERE username = ${username}`;
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    const query = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        u.user_type,
        pt.name as party_name,
        pt.logo_url as party_logo,
        pt.color as party_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        ${req.user ? `(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = '${req.user.id}') as is_liked` : 'false as is_liked'}
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE p.is_trending = true AND p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `;

    const fasts = await sql(query, [user.id, parseInt(limit)]);

    res.json({
      success: true,
      data: fasts
    });
  } catch (error) {
    console.error('Get user fast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DELETE FAST
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';

    // Check if fast exists
    const [fast] = await sql`SELECT user_id FROM posts WHERE id = ${id} AND is_trending = true`;
    
    if (!fast) {
      return res.status(404).json({ success: false, error: 'Fast bulunamadı' });
    }

    // Check permission (owner or admin)
    if (fast.user_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Bu fast\'i silme yetkiniz yok' });
    }

    await sql`DELETE FROM posts WHERE id = ${id}`;

    res.json({ success: true, message: 'Fast silindi' });
  } catch (error) {
    console.error('Delete fast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
