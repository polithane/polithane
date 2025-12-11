import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

async function checkUrls() {
  console.log('🔍 Veritabanı URL Kontrolü...\n');
  
  try {
    // Sample URLs
    const samples = await sql`
      SELECT avatar_url 
      FROM users 
      WHERE avatar_url LIKE '%supabase%'
      LIMIT 10
    `;
    
    console.log('📋 Supabase URL Örnekleri:');
    console.log('='.repeat(70));
    samples.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.avatar_url}`);
    });
    
    // Count by path
    const pathCounts = await sql`
      SELECT 
        CASE 
          WHEN avatar_url LIKE '%/politicians/%' THEN 'politicians/'
          WHEN avatar_url LIKE '%/profiles/politicians/%' THEN 'profiles/politicians/'
          WHEN avatar_url LIKE '%supabase%' THEN 'other supabase'
          ELSE 'local'
        END as path_type,
        COUNT(*) as count
      FROM users
      WHERE avatar_url IS NOT NULL
      GROUP BY path_type
    `;
    
    console.log('\n📊 URL Dağılımı:');
    console.log('='.repeat(70));
    pathCounts.forEach(row => {
      console.log(`${row.path_type}: ${row.count} kullanıcı`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

checkUrls().catch(console.error);
