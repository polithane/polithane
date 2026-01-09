import { sql } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  try {
    console.log('🚀 Starting is_automated migration...');
    
    // Execute migration commands one by one
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false
    `;
    
    console.log('✅ is_automated column added');
    
    await sql`
      UPDATE users SET is_automated = true WHERE is_automated IS NULL OR is_automated = false
    `;
    
    console.log('✅ All users marked as automated');
    
    // Verify
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_automated'
    `;
    
    if (result.length > 0) {
      console.log('✅ Verification successful:', result[0]);
    }
    
    // Check how many users are marked as automated
    const count = await sql`
      SELECT COUNT(*) as automated_count
      FROM users
      WHERE is_automated = true
    `;
    
    console.log(`✅ ${count[0]?.automated_count || 0} profiles marked as automated`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
  }
}

runMigration();
