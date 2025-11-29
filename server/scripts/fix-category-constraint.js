import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function fixCategoryConstraint() {
  console.log('🔧 Fixing category constraint...');
  
  try {
    // Drop old constraint
    await sql`
      ALTER TABLE posts 
      DROP CONSTRAINT IF EXISTS posts_category_check
    `;
    console.log('✅ Dropped old constraint');
    
    // Add new constraint with all categories
    await sql`
      ALTER TABLE posts
      ADD CONSTRAINT posts_category_check 
      CHECK (category IN ('general', 'politics', 'economy', 'sports', 'technology', 'health', 'education', 'culture', 'environment', 'other'))
    `;
    console.log('✅ Added new constraint');
    
    console.log('🎉 Category constraint fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCategoryConstraint();
