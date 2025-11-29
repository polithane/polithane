-- Add email verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Create index for faster verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Update existing users to be verified (for imported CHP profiles)
UPDATE users 
SET email_verified = TRUE, 
    verified_at = CURRENT_TIMESTAMP 
WHERE email LIKE '%@polithane.com';
