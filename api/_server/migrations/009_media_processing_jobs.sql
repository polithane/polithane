-- Media processing pipeline (FFmpeg worker)
-- Safe to run multiple times.

-- UUID helper (Supabase has pgcrypto available; this is idempotent).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Posts: track processing state and preserve originals.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_status TEXT DEFAULT 'ready';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_original_urls JSONB;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_processed_at TIMESTAMP;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_processing_error TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_media_status ON posts(media_status);

-- Job queue for the worker.
-- NOTE: We keep IDs as TEXT (not FK) to stay compatible with both UUID and SERIAL schemas.
CREATE TABLE IF NOT EXISTS media_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id TEXT,

  input_bucket TEXT NOT NULL,
  input_path TEXT NOT NULL,
  input_public_url TEXT,

  output_bucket TEXT NOT NULL DEFAULT 'uploads',
  output_path TEXT,
  output_public_url TEXT,

  thumbnail_bucket TEXT NOT NULL DEFAULT 'uploads',
  thumbnail_path TEXT,
  thumbnail_public_url TEXT,

  status TEXT NOT NULL DEFAULT 'queued', -- queued | processing | done | error
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_jobs_status_created_at ON media_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_jobs_post_id ON media_jobs(post_id);

