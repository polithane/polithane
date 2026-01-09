-- Fast/Story compatibility for older schemas
-- Safe to run multiple times.

-- POSTS: ensure Fast flag + modern fields exist
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;

-- Some older schemas used `content` only; the current app prefers `content_text` + `content_type`.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(10) DEFAULT 'text';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS content_text TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_duration INTEGER;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS agenda_tag VARCHAR(200);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS dislike_count INTEGER DEFAULT 0;

-- Indexes for Fast (24h) queries + feeds
CREATE INDEX IF NOT EXISTS idx_posts_is_trending ON posts(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_agenda_tag ON posts(agenda_tag);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

