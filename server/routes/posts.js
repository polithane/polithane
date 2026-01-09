import express from 'express';
import { sql } from '../index.js';
import { upload } from '../utils/upload.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// GET ALL POSTS - Pagination & filters
// ============================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      category = 'all', 
      page = 1, 
      limit = 20,
      user_id,
      party_id 
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (category !== 'all') {
      whereConditions.push(`p.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (user_id) {
      whereConditions.push(`p.user_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    }

    if (party_id) {
      whereConditions.push(`p.party_id = $${paramIndex}`);
      params.push(party_id);
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
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    const posts = await sql(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM posts p ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
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

// ============================================
// GET SINGLE POST
// ============================================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [post] = await sql`
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
        ${req.user ? sql`(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ${req.user.id})` : sql`false`} as is_liked
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE p.id = ${id}
    `;

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post bulunamadı' });
    }

    // Increment view count (async, don't wait)
    sql`UPDATE posts SET view_count = view_count + 1 WHERE id = ${id}`.catch(console.error);

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CREATE POST
// ============================================
router.post('/', authenticateToken, upload.array('media', 5), async (req, res) => {
  try {
    const { content, category = 'gundem', party_id } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        error: 'İçerik zorunludur.' 
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        error: 'İçerik çok uzun (max 5000 karakter).' 
      });
    }

    // Process uploaded files
    const media_urls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const [post] = await sql`
      INSERT INTO posts (user_id, party_id, content, category, media_urls)
      VALUES (
        ${user_id}, 
        ${party_id || null}, 
        ${content}, 
        ${category}, 
        ${JSON.stringify(media_urls)}
      )
      RETURNING *
    `;

    // Update user post count
    await sql`
      UPDATE users 
      SET post_count = post_count + 1 
      WHERE id = ${user_id}
    `;

    // Fetch complete post data
    const [completePost] = await sql`
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        pt.name as party_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE p.id = ${post.id}
    `;

    res.status(201).json({ 
      success: true, 
      message: 'Post başarıyla oluşturuldu',
      data: completePost 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// UPDATE POST
// ============================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, category } = req.body;
    const user_id = req.user.id;

    // Check if post exists and belongs to user
    const [post] = await sql`SELECT user_id FROM posts WHERE id = ${id}`;
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post bulunamadı' });
    }

    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    if (post.user_id !== user_id && !isAdmin) {
      console.log('❌ Edit rejected: user_id:', user_id, 'post.user_id:', post.user_id, 'is_admin:', req.user.is_admin);
      return res.status(403).json({ success: false, error: 'Bu postu düzenleme yetkiniz yok' });
    }

    const [updated] = await sql`
      UPDATE posts 
      SET 
        content = COALESCE(${content}, content),
        category = COALESCE(${category}, category),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DELETE POST
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if post exists and belongs to user
    const [post] = await sql`SELECT user_id FROM posts WHERE id = ${id}`;
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post bulunamadı' });
    }

    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    if (post.user_id !== user_id && !isAdmin) {
      console.log('❌ Delete rejected: user_id:', user_id, 'post.user_id:', post.user_id, 'is_admin:', req.user.is_admin);
      return res.status(403).json({ success: false, error: 'Bu postu silme yetkiniz yok' });
    }
    console.log('✅ Delete allowed: user_id:', user_id, 'post.user_id:', post.user_id, 'is_admin:', isAdmin);

    await sql`DELETE FROM posts WHERE id = ${id}`;

    // Update user post count
    await sql`
      UPDATE users 
      SET post_count = GREATEST(post_count - 1, 0)
      WHERE id = ${post.user_id}
    `;

    res.json({ success: true, message: 'Post silindi' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LIKE/UNLIKE POST
// ============================================
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const user_id = req.user.id;

    // Check if already liked
    const [existing] = await sql`
      SELECT id FROM likes WHERE user_id = ${user_id} AND post_id = ${postId}
    `;

    if (existing) {
      // Unlike
      await sql`DELETE FROM likes WHERE user_id = ${user_id} AND post_id = ${postId}`;
      return res.json({ success: true, action: 'unliked', liked: false });
    } else {
      // Like
      await sql`INSERT INTO likes (user_id, post_id) VALUES (${user_id}, ${postId})`;
      
      // Create notification for post owner
      const [post] = await sql`SELECT user_id FROM posts WHERE id = ${postId}`;
      if (post && post.user_id !== user_id) {
        await sql`
          INSERT INTO notifications (user_id, type, content, related_id)
          VALUES (${post.user_id}, 'like', 'Gönderinizi beğendi', ${postId})
        `.catch(console.error);
      }
      
      return res.json({ success: true, action: 'liked', liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET POST COMMENTS
// ============================================
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { id: postId } = req.params;

    const comments = await sql`
      SELECT 
        c.*,
        u.username,
        u.full_name,
        u.avatar_url,
        u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = c.id) as like_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at DESC
    `;

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CREATE COMMENT
// ============================================
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { content, parent_id } = req.body;
    const user_id = req.user.id;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Yorum içeriği zorunludur' 
      });
    }

    const [comment] = await sql`
      INSERT INTO comments (post_id, user_id, content, parent_id)
      VALUES (${postId}, ${user_id}, ${content}, ${parent_id || null})
      RETURNING *
    `;

    // Create notification for post owner
    const [post] = await sql`SELECT user_id FROM posts WHERE id = ${postId}`;
    if (post && post.user_id !== user_id) {
      await sql`
        INSERT INTO notifications (user_id, type, content, related_id)
        VALUES (${post.user_id}, 'comment', 'Gönderinize yorum yaptı', ${postId})
      `.catch(console.error);
    }

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
