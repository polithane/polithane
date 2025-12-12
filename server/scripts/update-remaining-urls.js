/**
 * Update remaining avatar URLs (Turkish characters)
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

// Turkish → ASCII
const TURKISH_TO_ASCII = {
  'İ': 'I', 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C',
  'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c',
};

function turkishToAscii(text) {
  let result = text;
  for (const [turkish, ascii] of Object.entries(TURKISH_TO_ASCII)) {
    result = result.split(turkish).join(ascii);
  }
  return result;
}

async function updateRemaining() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🔄 Kalan URL\'ler güncelleniyor...\n');
    
    // Get remaining local URLs
    const result = await pool.query(`
      SELECT id, username, avatar_url
      FROM users
      WHERE avatar_url LIKE '/assets/%'
    `);
    
    console.log(`📊 ${result.rows.length} URL güncellenecek\n`);
    
    let updated = 0;
    
    for (const user of result.rows) {
      const oldUrl = user.avatar_url;
      const filename = oldUrl.split('/').pop();
      const asciiFilename = turkishToAscii(filename);
      const newUrl = `${BASE_URL}/politicians/${asciiFilename}`;
      
      await pool.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [newUrl, user.id]);
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`   ✅ ${updated}/${result.rows.length}`);
      }
    }
    
    console.log(`\n✅ ${updated} URL güncellendi!\n`);
    
    // Final check
    const { rows } = await pool.query(`
      SELECT 
        COUNT(CASE WHEN avatar_url LIKE '%supabase%' THEN 1 END) as supabase,
        COUNT(CASE WHEN avatar_url LIKE '/assets/%' THEN 1 END) as local
      FROM users WHERE avatar_url IS NOT NULL
    `);
    
    console.log('📊 Son Durum:');
    console.log(`   Supabase: ${rows[0].supabase}`);
    console.log(`   Local: ${rows[0].local}`);
    
    if (rows[0].local === '0') {
      console.log('\n🎉 TÜM URL\'LER SUPABASE\'E TAŞINDI!');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

updateRemaining();
