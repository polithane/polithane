import express from 'express';
import { sql } from '../index.js';
import { upload } from '../utils/upload.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user profile by username
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const [user] = await sql`
      SELECT 
        id, username, full_name, bio, avatar_url, cover_url,
        polit_score, is_verified, follower_count, following_count,
        post_count, user_type, province, created_at
      FROM users
      WHERE username = ${username}
    `;

    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    // Check if current user follows this user
    if (req.user) {
      const [follow] = await sql`
        SELECT id FROM follows 
        WHERE follower_id = ${req.user.id} AND following_id = ${user.id}
      `;
      user.is_following = !!follow;
    } else {
      user.is_following = false;
    }

    // Get extended profile based on user_type
    let extendedProfile = null;
    
    switch (user.user_type) {
      case 'mp':
        const [mpProfile] = await sql`
          SELECT * FROM mp_profiles WHERE user_id = ${user.id}
        `;
        extendedProfile = mpProfile;
        break;
        
      case 'party_official':
        const [partyOfficialProfile] = await sql`
          SELECT * FROM party_official_profiles WHERE user_id = ${user.id}
        `;
        extendedProfile = partyOfficialProfile;
        break;
        
      case 'citizen':
        const [citizenProfile] = await sql`
          SELECT * FROM citizen_profiles WHERE user_id = ${user.id}
        `;
        extendedProfile = citizenProfile;
        break;
        
      case 'party_member':
        const [partyMemberProfile] = await sql`
          SELECT * FROM party_member_profiles WHERE user_id = ${user.id}
        `;
        extendedProfile = partyMemberProfile;
        break;
    }

    res.json({ 
      success: true, 
      data: {
        ...user,
        extendedProfile
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const user_id = req.user.id;
    const { full_name, bio, province } = req.body;
    
    let updateData = {};
    
    if (full_name) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;
    if (province) updateData.province = province;
    
    if (req.file) {
      updateData.avatar_url = `/uploads/${req.file.filename}`;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Güncellenecek alan belirtilmedi' 
      });
    }

    const setClause = Object.keys(updateData)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    
    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
    const [updated] = await sql(query, [user_id, ...Object.values(updateData)]);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Follow/Unfollow user
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId: following_id } = req.params;
    const follower_id = req.user.id;

    if (follower_id === following_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Kendinizi takip edemezsiniz' 
      });
    }

    // Check if already following
    const [existing] = await sql`
      SELECT id FROM follows 
      WHERE follower_id = ${follower_id} AND following_id = ${following_id}
    `;

    if (existing) {
      // Unfollow
      await sql`
        DELETE FROM follows 
        WHERE follower_id = ${follower_id} AND following_id = ${following_id}
      `;
      
      // Update counts
      await sql`
        UPDATE users SET following_count = GREATEST(following_count - 1, 0) 
        WHERE id = ${follower_id}
      `;
      await sql`
        UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) 
        WHERE id = ${following_id}
      `;
      
      return res.json({ success: true, action: 'unfollowed', is_following: false });
    } else {
      // Follow
      await sql`
        INSERT INTO follows (follower_id, following_id)
        VALUES (${follower_id}, ${following_id})
      `;
      
      // Update counts
      await sql`
        UPDATE users SET following_count = following_count + 1 
        WHERE id = ${follower_id}
      `;
      await sql`
        UPDATE users SET follower_count = follower_count + 1 
        WHERE id = ${following_id}
      `;
      
      // Create notification
      await sql`
        INSERT INTO notifications (user_id, type, content, related_id)
        VALUES (${following_id}, 'follow', 'Sizi takip etmeye başladı', ${follower_id})
      `.catch(console.error);
      
      return res.json({ success: true, action: 'followed', is_following: true });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's posts
router.get('/:username/posts', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await sql`
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE u.username = ${username}
      ORDER BY p.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's followers
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await sql`
      SELECT 
        u.id, u.username, u.full_name, u.avatar_url, u.is_verified
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ${userId}
      ORDER BY f.created_at DESC
    `;

    res.json({ success: true, data: followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's following
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;

    const following = await sql`
      SELECT 
        u.id, u.username, u.full_name, u.avatar_url, u.is_verified
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ${userId}
      ORDER BY f.created_at DESC
    `;

    res.json({ success: true, data: following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
