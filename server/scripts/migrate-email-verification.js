import { sql } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('🚀 Starting email verification migration...');
  
  try {
    // Add email_verified column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
    `;
    console.log('✅ Added email_verified column');
    
    // Add verification_token column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)
    `;
    console.log('✅ Added verification_token column');
    
    // Add verification_token_expires column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP
    `;
    console.log('✅ Added verification_token_expires column');
    
    // Add verified_at column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
    `;
    console.log('✅ Added verified_at column');
    
    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)
    `;
    console.log('✅ Created verification_token index');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)
    `;
    console.log('✅ Created email_verified index');
    
    // Update existing users to be verified
    const result = await sql`
      UPDATE users 
      SET email_verified = TRUE, 
          verified_at = CURRENT_TIMESTAMP 
      WHERE email LIKE '%@polithane.com'
      RETURNING id
    `;
    console.log(`✅ Updated ${result.length} existing users as verified`);
    
    console.log('🎉 Email verification migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigration();
