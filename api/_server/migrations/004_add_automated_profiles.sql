-- Migration: Add is_automated field to users table
-- This field marks profiles that are automatically created and managed by AI

-- Add is_automated column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false;

-- Set all existing profiles to automated (true)
UPDATE users SET is_automated = true;

-- Add comment
COMMENT ON COLUMN users.is_automated IS 'Indicates if this profile is automatically created and managed by AI/system';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_automated ON users(is_automated);
