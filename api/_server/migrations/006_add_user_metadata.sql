-- Add metadata column to users table for dynamic user info
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for better querying inside metadata if needed
CREATE INDEX IF NOT EXISTS idx_users_metadata ON users USING gin(metadata);
