import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// ES Module path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Neon Database Connection
export const sql = neon(process.env.DATABASE_URL);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Geçersiz dosya tipi!'));
    }
  }
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Import routes
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import messagesRoutes from './routes/messages.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import verificationRoutes from './routes/verification.js';
import settingsRoutes from './routes/settings.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', verificationRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    res.json({ 
      success: true, 
      message: 'Neon bağlantısı başarılı!',
      data: result[0]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// POSTS ENDPOINTS
// ============================================

// Get all posts (with pagination and filters)
app.get('/api/posts', async (req, res) => {
  try {
    const { 
      category = 'all', 
      page = 1, 
      limit = 20,
      user_id,
      party_id 
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        pt.name as party_name,
        pt.logo_url as party_logo,
        pt.color as party_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (category !== 'all') {
      query += ` AND p.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (user_id) {
      query += ` AND p.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (party_id) {
      query += ` AND p.party_id = $${paramIndex}`;
      params.push(party_id);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const posts = await sql(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM posts WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;

    if (category !== 'all') {
      countQuery += ` AND category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (user_id) {
      countQuery += ` AND user_id = $${countParamIndex}`;
      countParams.push(user_id);
      countParamIndex++;
    }

    if (party_id) {
      countQuery += ` AND party_id = $${countParamIndex}`;
      countParams.push(party_id);
    }

    const [{ count }] = await sql(countQuery, countParams);

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

// Get single post by ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [post] = await sql`
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url as user_avatar,
        u.is_verified,
        pt.name as party_name,
        pt.logo_url as party_logo,
        pt.color as party_color
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

// Create new post
app.post('/api/posts', async (req, res) => {
  try {
    const { user_id, party_id, content, category, media_urls } = req.body;

    // Validation
    if (!user_id || !content || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id, content ve category zorunlu' 
      });
    }

    const [post] = await sql`
      INSERT INTO posts (user_id, party_id, content, category, media_urls)
      VALUES (${user_id}, ${party_id || null}, ${content}, ${category}, ${JSON.stringify(media_urls || [])})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Check if post exists and belongs to user
    const [post] = await sql`SELECT user_id FROM posts WHERE id = ${id}`;
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post bulunamadı' });
    }

    if (post.user_id !== user_id) {
      return res.status(403).json({ success: false, error: 'Bu postu silme yetkiniz yok' });
    }

    await sql`DELETE FROM posts WHERE id = ${id}`;

    res.json({ success: true, message: 'Post silindi' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// USERS ENDPOINTS
// ============================================

// Get user profile (with extended profile based on user_type)
app.get('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const [user] = await sql`
      SELECT 
        id, username, full_name, bio, avatar_url, cover_url,
        polit_score, is_verified, follower_count, following_count,
        post_count, user_type, created_at
      FROM users
      WHERE username = ${username}
    `;

    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    // Fetch extended profile based on user_type
    let extendedProfile = null;
    
    switch (user.user_type) {
      case 'mp': // Milletvekili
        const [mpProfile] = await sql`
          SELECT * FROM mp_profiles WHERE user_id = ${user.id}
        `;
        if (mpProfile) {
          // Get parliamentary terms
          const terms = await sql`
            SELECT * FROM mp_parliamentary_terms 
            WHERE mp_profile_id = ${mpProfile.id}
            ORDER BY term_number DESC
          `;
          // Get commissions
          const commissions = await sql`
            SELECT * FROM mp_commissions 
            WHERE mp_profile_id = ${mpProfile.id} AND is_current = true
            ORDER BY created_at DESC
          `;
          extendedProfile = { ...mpProfile, terms, commissions };
        }
        break;
        
      case 'party_official': // Parti görevlisi
        const [partyOfficialProfile] = await sql`
          SELECT * FROM party_official_profiles WHERE user_id = ${user.id}
        `;
        if (partyOfficialProfile) {
          // Get position history
          const positions = await sql`
            SELECT * FROM party_official_positions 
            WHERE party_official_profile_id = ${partyOfficialProfile.id}
            ORDER BY start_date DESC
          `;
          extendedProfile = { ...partyOfficialProfile, positions };
        }
        break;
        
      case 'citizen': // Vatandaş
        const [citizenProfile] = await sql`
          SELECT * FROM citizen_profiles WHERE user_id = ${user.id}
        `;
        extendedProfile = citizenProfile;
        break;
        
      case 'party_member': // Parti üyesi vatandaş
        const [partyMemberProfile] = await sql`
          SELECT * FROM party_member_profiles WHERE user_id = ${user.id}
        `;
        // Also get base citizen profile
        const [baseProfile] = await sql`
          SELECT * FROM citizen_profiles WHERE user_id = ${user.id}
        `;
        extendedProfile = { ...baseProfile, ...partyMemberProfile };
        break;
        
      case 'ex_politician': // Eski siyasetçi
        const [exPoliticianProfile] = await sql`
          SELECT * FROM ex_politician_profiles WHERE user_id = ${user.id}
        `;
        if (exPoliticianProfile) {
          // Get career history
          const career = await sql`
            SELECT * FROM ex_politician_career 
            WHERE ex_politician_profile_id = ${exPoliticianProfile.id}
            ORDER BY start_date DESC
          `;
          extendedProfile = { ...exPoliticianProfile, career };
        }
        break;
        
      case 'media': // Medya mensubu
        const [mediaProfile] = await sql`
          SELECT * FROM media_profiles WHERE user_id = ${user.id}
        `;
        if (mediaProfile) {
          // Get work history
          const workHistory = await sql`
            SELECT * FROM media_work_history 
            WHERE media_profile_id = ${mediaProfile.id}
            ORDER BY start_date DESC
          `;
          // Get publications
          const publications = await sql`
            SELECT * FROM media_publications 
            WHERE media_profile_id = ${mediaProfile.id}
            ORDER BY publication_date DESC
            LIMIT 10
          `;
          extendedProfile = { ...mediaProfile, workHistory, publications };
        }
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

// Get user's posts
app.get('/api/users/:username/posts', async (req, res) => {
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
        u.is_verified
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

// ============================================
// COMMENTS ENDPOINTS
// ============================================

// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await sql`
      SELECT 
        c.*,
        u.username,
        u.full_name,
        u.avatar_url,
        u.is_verified
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

// Create comment
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id, content, parent_id } = req.body;

    if (!user_id || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id ve content zorunlu' 
      });
    }

    const [comment] = await sql`
      INSERT INTO comments (post_id, user_id, content, parent_id)
      VALUES (${postId}, ${user_id}, ${content}, ${parent_id || null})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LIKES ENDPOINTS
// ============================================

// Like a post
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id zorunlu' });
    }

    // Check if already liked
    const [existing] = await sql`
      SELECT id FROM likes WHERE user_id = ${user_id} AND post_id = ${postId}
    `;

    if (existing) {
      // Unlike
      await sql`DELETE FROM likes WHERE user_id = ${user_id} AND post_id = ${postId}`;
      return res.json({ success: true, action: 'unliked' });
    } else {
      // Like
      await sql`INSERT INTO likes (user_id, post_id) VALUES (${user_id}, ${postId})`;
      return res.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PARTIES ENDPOINTS
// ============================================

// Get all parties
app.get('/api/parties', async (req, res) => {
  try {
    const parties = await sql`
      SELECT * FROM parties 
      WHERE is_active = true
      ORDER BY follower_count DESC
    `;

    res.json({ success: true, data: parties });
  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get party by ID
app.get('/api/parties/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [party] = await sql`
      SELECT * FROM parties WHERE id = ${id}
    `;

    if (!party) {
      return res.status(404).json({ success: false, error: 'Parti bulunamadı' });
    }

    res.json({ success: true, data: party });
  } catch (error) {
    console.error('Get party error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PROFILE MANAGEMENT ENDPOINTS
// ============================================

// Create/Update MP Profile
app.post('/api/profiles/mp', async (req, res) => {
  try {
    const { user_id, ...profileData } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id zorunlu' });
    }

    // Check if profile exists
    const [existing] = await sql`SELECT id FROM mp_profiles WHERE user_id = ${user_id}`;
    
    if (existing) {
      // Update
      const keys = Object.keys(profileData);
      const values = Object.values(profileData);
      
      if (keys.length === 0) {
        return res.status(400).json({ success: false, error: 'Güncellenecek alan belirtilmedi' });
      }

      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const query = `UPDATE mp_profiles SET ${setClause} WHERE user_id = $1 RETURNING *`;
      
      const [profile] = await sql(query, [user_id, ...values]);
      res.json({ success: true, data: profile });
    } else {
      // Create
      const [profile] = await sql`
        INSERT INTO mp_profiles (user_id, ${sql(Object.keys(profileData))})
        VALUES (${user_id}, ${sql(Object.values(profileData))})
        RETURNING *
      `;
      res.status(201).json({ success: true, data: profile });
    }
  } catch (error) {
    console.error('MP profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create/Update Citizen Profile
app.post('/api/profiles/citizen', async (req, res) => {
  try {
    const { user_id, ...profileData } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id zorunlu' });
    }

    const [existing] = await sql`SELECT id FROM citizen_profiles WHERE user_id = ${user_id}`;
    
    if (existing) {
      const keys = Object.keys(profileData);
      const values = Object.values(profileData);
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const query = `UPDATE citizen_profiles SET ${setClause} WHERE user_id = $1 RETURNING *`;
      
      const [profile] = await sql(query, [user_id, ...values]);
      res.json({ success: true, data: profile });
    } else {
      const [profile] = await sql`
        INSERT INTO citizen_profiles (user_id, ${sql(Object.keys(profileData))})
        VALUES (${user_id}, ${sql(Object.values(profileData))})
        RETURNING *
      `;
      res.status(201).json({ success: true, data: profile });
    }
  } catch (error) {
    console.error('Citizen profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create/Update Party Official Profile
app.post('/api/profiles/party-official', async (req, res) => {
  try {
    const { user_id, ...profileData } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id zorunlu' });
    }

    const [existing] = await sql`SELECT id FROM party_official_profiles WHERE user_id = ${user_id}`;
    
    if (existing) {
      const keys = Object.keys(profileData);
      const values = Object.values(profileData);
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const query = `UPDATE party_official_profiles SET ${setClause} WHERE user_id = $1 RETURNING *`;
      
      const [profile] = await sql(query, [user_id, ...values]);
      res.json({ success: true, data: profile });
    } else {
      const [profile] = await sql`
        INSERT INTO party_official_profiles (user_id, ${sql(Object.keys(profileData))})
        VALUES (${user_id}, ${sql(Object.values(profileData))})
        RETURNING *
      `;
      res.status(201).json({ success: true, data: profile });
    }
  } catch (error) {
    console.error('Party official profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create/Update Media Profile
app.post('/api/profiles/media', async (req, res) => {
  try {
    const { user_id, ...profileData } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id zorunlu' });
    }

    const [existing] = await sql`SELECT id FROM media_profiles WHERE user_id = ${user_id}`;
    
    if (existing) {
      const keys = Object.keys(profileData);
      const values = Object.values(profileData);
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const query = `UPDATE media_profiles SET ${setClause} WHERE user_id = $1 RETURNING *`;
      
      const [profile] = await sql(query, [user_id, ...values]);
      res.json({ success: true, data: profile });
    } else {
      const [profile] = await sql`
        INSERT INTO media_profiles (user_id, ${sql(Object.keys(profileData))})
        VALUES (${user_id}, ${sql(Object.values(profileData))})
        RETURNING *
      `;
      res.status(201).json({ success: true, data: profile });
    }
  } catch (error) {
    console.error('Media profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TRENDING ENDPOINTS
// ============================================

// Get trending posts
app.get('/api/trending/posts', async (req, res) => {
  try {
    const posts = await sql`
      SELECT * FROM trending_posts
      ORDER BY trending_score DESC
      LIMIT 20
    `;

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trending agendas
app.get('/api/trending/agendas', async (req, res) => {
  try {
    const agendas = await sql`
      SELECT * FROM agendas
      WHERE is_trending = true
      ORDER BY trending_score DESC
      LIMIT 10
    `;

    res.json({ success: true, data: agendas });
  } catch (error) {
    console.error('Get trending agendas error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint bulunamadı' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Sunucu hatası' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
  🚀 Polithane Backend başlatıldı!
  📍 Port: ${PORT}
  🗄️  Database: Neon PostgreSQL (Connected)
  🌍 CORS: ${process.env.FRONTEND_URL}
  ⚡ Environment: ${process.env.NODE_ENV}
  `);
});
