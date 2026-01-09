/**
 * Update avatar URLs from local to Supabase
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const BASE_URL = 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars';

// Cyrillic → ASCII mapping (same as migration script)
const CHAR_MAP = {
  'Ш': 'I', 'Щ': 'O', 'Ъ': 'U', 'Ю': 'S', 'ж': 'C', 'А': 'C', 'О': 'O',
  'ш': 'i', 'щ': 'o', 'ъ': 'u', 'ю': 's', 'а': 'c', 'о': 'o',
  'İ': 'I', 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C',
  'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c',
};

function toAsciiSafe(text) {
  let result = text;
  for (const [char, ascii] of Object.entries(CHAR_MAP)) {
    result = result.split(char).join(ascii);
  }
  return result;
}

async function updateUrls() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🔄 Avatar URL\'leri Güncelleniyor...\n');
    
    // Get users with local avatar URLs
    const result = await pool.query(`
      SELECT id, username, avatar_url
      FROM users
      WHERE avatar_url LIKE '/assets/profiles/politicians/%'
      ORDER BY id
    `);
    
    console.log(`📊 ${result.rows.length} kullanıcının URL'i güncellenecek\n`);
    
    if (result.rows.length === 0) {
      console.log('✅ Tüm URL\'ler zaten güncel!');
      return;
    }
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const user of result.rows) {
      // Extract filename from old URL
      const oldUrl = user.avatar_url;
      const filename = oldUrl.split('/').pop();
      
      // Convert to ASCII-safe
      const asciiFilename = toAsciiSafe(filename);
      
      // New Supabase URL
      const newUrl = `${BASE_URL}/politicians/${asciiFilename}`;
      
      // Update database
      await pool.query(`
        UPDATE users
        SET avatar_url = $1
        WHERE id = $2
      `, [newUrl, user.id]);
      
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`   ✅ ${updatedCount}/${result.rows.length} güncellendi...`);
      }
    }
    
    console.log(`\n✅ Güncelleme tamamlandı!`);
    console.log(`   Başarılı: ${updatedCount}`);
    console.log(`   Toplam: ${result.rows.length}`);
    
    // Verify
    const { rows: verifyRows } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN avatar_url LIKE '%supabase%' THEN 1 END) as supabase_count,
        COUNT(CASE WHEN avatar_url LIKE '/assets/%' THEN 1 END) as local_count
      FROM users
      WHERE avatar_url IS NOT NULL
    `);
    
    console.log(`\n📊 Doğrulama:`);
    console.log(`   Toplam avatar: ${verifyRows[0].total}`);
    console.log(`   Supabase: ${verifyRows[0].supabase_count}`);
    console.log(`   Local: ${verifyRows[0].local_count}`);
    
    if (verifyRows[0].local_count === '0') {
      console.log('\n🎉 Tüm URL\'ler Supabase\'e taşındı!');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

updateUrls();
