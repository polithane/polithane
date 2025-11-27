-- Polithane Database Schema
-- Version: 1.0.0
-- Description: Initial database structure

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  cover_url VARCHAR(500),
  
  -- User Type & Classification
  user_type VARCHAR(20) NOT NULL DEFAULT 'normal', 
  -- Options: politician, ex_politician, media, party_member, normal
  politician_type VARCHAR(50),
  -- Options: mp, party_chair, provincial_chair, district_chair, 
  --          metropolitan_mayor, district_mayor, myk_member, vice_chair, other
  
  -- Location & Party
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  city_code CHAR(2),
  district_name VARCHAR(100),
  
  -- Status & Verification
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Counts & Scores
  polit_score BIGINT DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT check_user_type CHECK (user_type IN ('politician', 'ex_politician', 'media', 'party_member', 'normal'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_party_id ON users(party_id);
CREATE INDEX idx_users_polit_score ON users(polit_score DESC);

-- ============================================
-- PARTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  
  -- Branding
  logo_url VARCHAR(500),
  flag_url VARCHAR(500),
  color VARCHAR(7), -- Hex color
  
  -- Parliament & Organization
  parliament_seats INTEGER DEFAULT 0,
  mp_count INTEGER DEFAULT 0,
  metropolitan_mayor_count INTEGER DEFAULT 0,
  district_mayor_count INTEGER DEFAULT 0,
  organization_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  
  -- Stats
  polit_score BIGINT DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  foundation_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parties_slug ON parties(slug);
CREATE INDEX idx_parties_parliament_seats ON parties(parliament_seats DESC);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  
  -- Content
  content_type VARCHAR(10) NOT NULL DEFAULT 'text',
  -- Options: text, image, video, audio
  content_text TEXT,
  media_urls JSONB, -- Array of media URLs
  thumbnail_url VARCHAR(500),
  media_duration INTEGER, -- For video/audio (seconds)
  
  -- Classification
  category VARCHAR(20) NOT NULL DEFAULT 'general',
  -- Options: mps, organization, citizens, experience, media
  agenda_tag VARCHAR(200),
  
  -- Engagement Metrics
  polit_score BIGINT DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Status
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_content_type CHECK (content_type IN ('text', 'image', 'video', 'audio'))
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_party_id ON posts(party_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_polit_score ON posts(polit_score DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_agenda_tag ON posts(agenda_tag);
CREATE INDEX idx_posts_is_featured ON posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_posts_is_trending ON posts(is_trending) WHERE is_trending = TRUE;

-- Full-text search index (Turkish)
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('turkish', content_text));

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  -- Engagement
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Status
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Either post_id or comment_id must be set, not both
  CONSTRAINT check_like_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  
  -- Unique constraint: one like per user per target
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Can't follow yourself
  CONSTRAINT check_no_self_follow CHECK (follower_id != following_id),
  
  -- Unique follow relationship
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================
-- AGENDAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agendas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  
  -- Stats
  post_count INTEGER DEFAULT 0,
  total_polit_score BIGINT DEFAULT 0,
  trending_score INTEGER DEFAULT 0,
  
  -- Status
  is_trending BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agendas_slug ON agendas(slug);
CREATE INDEX idx_agendas_trending_score ON agendas(trending_score DESC);
CREATE INDEX idx_agendas_is_trending ON agendas(is_trending) WHERE is_trending = TRUE;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(20) NOT NULL,
  -- Options: like, comment, follow, mention, reply
  
  -- References
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- POLIT SCORE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS polit_score_history (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  action_type VARCHAR(20) NOT NULL,
  -- Options: view, like, comment, share
  
  actor_user_type VARCHAR(20) NOT NULL,
  -- Actor's user type at the time of action
  
  score_added INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_score_history_post_id ON polit_score_history(post_id);
CREATE INDEX idx_score_history_actor_id ON polit_score_history(actor_id);
CREATE INDEX idx_score_history_created_at ON polit_score_history(created_at DESC);

-- ============================================
-- TRENDING POSTS VIEW
-- ============================================
CREATE OR REPLACE VIEW trending_posts AS
SELECT 
  p.*,
  u.username,
  u.full_name,
  u.avatar_url as user_avatar,
  u.is_verified,
  pt.name as party_name,
  pt.logo_url as party_logo,
  pt.color as party_color,
  -- Trending score calculation (last 24 hours weighted)
  (
    (p.like_count * 5) + 
    (p.comment_count * 10) + 
    (p.share_count * 20) +
    (p.view_count * 0.1) +
    (CASE WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 1000 ELSE 0 END)
  )::INTEGER as trending_score
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN parties pt ON p.party_id = pt.id
WHERE p.is_deleted = FALSE
ORDER BY trending_score DESC;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update user post_count when post created/deleted
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET post_count = post_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_post_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_user_post_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_parties_updated_at
BEFORE UPDATE ON parties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETED
-- ============================================

-- Schema migration completed successfully!
