-- Migration: Add password reset columns to users table
-- Date: 2026-01-09
-- Purpose: Enable password reset functionality

-- Add password_reset_token column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token TEXT;

-- Add password_reset_expires column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token 
ON users(password_reset_token) 
WHERE password_reset_token IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Migration 011: Password reset columns added successfully';
END $$;
