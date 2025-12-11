-- ============================================
-- POLITHANE SUPABASE DATABASE SCHEMA
-- Version: 1.0.0
-- Date: 2024-12-11
-- Source: Migrated from Neon PostgreSQL
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

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
  color VARCHAR(7), -- Hex color (#FF0000)
  
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
  
  -- Timestamps (TIMESTAMPTZ for timezone support)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parties_slug ON parties(slug);
CREATE INDEX IF NOT EXISTS idx_parties_parliament_seats ON parties(parliament_seats DESC);
CREATE INDEX IF NOT EXISTS idx_parties_is_active ON parties(is_active) WHERE is_active = TRUE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  
  -- Supabase Auth integration (will be added later)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core info
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Will be NULL after Supabase Auth migration
  full_name VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  cover_url VARCHAR(500),
  
  -- User Type & Classification
  user_type VARCHAR(20) NOT NULL DEFAULT 'citizen',
  -- Options: mp, party_official, citizen, party_member, ex_politician, media
  
  -- Location & Party
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  province VARCHAR(100),
  
  -- Status & Verification
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Counts & Scores
  polit_score BIGINT DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_user_type CHECK (
    user_type IN ('mp', 'party_official', 'citizen', 'party_member', 'ex_politician', 'media')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_party_id ON users(party_id);
CREATE INDEX IF NOT EXISTS idx_users_polit_score ON users(polit_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE is_verified = TRUE;

-- Full-text search index (Turkish)
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(
  to_tsvector('turkish', coalesce(full_name, '') || ' ' || coalesce(username, '') || ' ' || coalesce(bio, ''))
);

-- ============================================
-- MP PROFILES (Milletvekili)
-- ============================================
CREATE TABLE IF NOT EXISTS mp_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Parliament info
  current_term INTEGER,
  total_terms INTEGER DEFAULT 1,
  first_elected_year INTEGER,
  
  -- Position
  province VARCHAR(100),
  is_active_mp BOOLEAN DEFAULT TRUE,
  
  -- Parliamentary work
  commission_memberships TEXT[], -- Array of commission names
  laws_proposed INTEGER DEFAULT 0,
  laws_passed INTEGER DEFAULT 0,
  parliamentary_questions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_profiles_user_id ON mp_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_profiles_province ON mp_profiles(province);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  
  -- Content
  content TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'general',
  -- Options: mps, organization, citizens, experience, media, general
  media_urls JSONB, -- Array of media URLs
  
  -- Engagement Metrics
  polit_score BIGINT DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Status
  is_deleted BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_category CHECK (
    category IN ('mps', 'organization', 'citizens', 'experience', 'media', 'general')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_party_id ON posts(party_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_polit_score ON posts(polit_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted) WHERE is_deleted = FALSE;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_posts_content_search ON posts USING gin(
  to_tsvector('turkish', coalesce(content, ''))
);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  
  is_deleted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, post_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_no_self_follow CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

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
  
  -- Content
  title VARCHAR(255),
  message TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- MESSAGES TABLE (Direct Messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted_by_sender BOOLEAN DEFAULT FALSE,
  is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PARTIES
-- ============================================

-- Anyone can view active parties
CREATE POLICY "Parties are viewable by everyone"
  ON parties FOR SELECT
  USING (is_active = TRUE);

-- Only authenticated users can view all parties (including inactive)
CREATE POLICY "Authenticated users can view all parties"
  ON parties FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- RLS POLICIES - USERS
-- ============================================

-- Anyone can view active user profiles
CREATE POLICY "User profiles are publicly viewable"
  ON users FOR SELECT
  USING (is_active = TRUE);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (
    auth.uid() = auth_user_id
    OR (auth.uid()::text IS NOT NULL AND id::text = (SELECT id::text FROM users WHERE auth_user_id = auth.uid()))
  );

-- ============================================
-- RLS POLICIES - POSTS
-- ============================================

-- Anyone can view non-deleted posts
CREATE POLICY "Posts are publicly viewable"
  ON posts FOR SELECT
  USING (is_deleted = FALSE);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can delete their own posts (soft delete)
CREATE POLICY "Users can delete own posts"
  ON posts FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- RLS POLICIES - COMMENTS
-- ============================================

-- Anyone can view non-deleted comments
CREATE POLICY "Comments are publicly viewable"
  ON comments FOR SELECT
  USING (is_deleted = FALSE);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- RLS POLICIES - LIKES
-- ============================================

-- Anyone can view likes (for counts)
CREATE POLICY "Likes are publicly viewable"
  ON likes FOR SELECT
  USING (true);

-- Authenticated users can create/delete their own likes
CREATE POLICY "Users can manage own likes"
  ON likes FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- RLS POLICIES - FOLLOWS
-- ============================================

-- Anyone can view follows (for counts and lists)
CREATE POLICY "Follows are publicly viewable"
  ON follows FOR SELECT
  USING (true);

-- Authenticated users can create/delete their own follows
CREATE POLICY "Users can manage own follows"
  ON follows FOR ALL
  USING (
    follower_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    follower_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - MESSAGES
-- ============================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Authenticated users can send messages
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete messages"
  ON messages FOR UPDATE
  USING (
    sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update post_count when post created/deleted
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
    UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = FALSE THEN
    UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_post_count
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_user_post_count();

-- Update like_count when like added/removed
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Update comment_count when comment added/removed
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = FALSE THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- Update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_parties_updated_at
BEFORE UPDATE ON parties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- REALTIME SETUP
-- ============================================

-- Enable realtime for important tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- COMPLETED ✅
-- ============================================

-- Schema migration completed!
-- Next steps:
-- 1. Import data from Neon
-- 2. Setup Storage buckets
-- 3. Configure Auth
-- 4. Update frontend
