import dotenv from 'dotenv';
import { sql } from '../db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function fixUsersTable() {
  console.log('🔧 Users tablosuna eksik kolonlar ekleniyor...\n');

  try {
    // Province kolonu ekle
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS province VARCHAR(100)`;
    console.log('✅ province kolonu eklendi');
    
    // Party_id kolonu ekle
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS party_id UUID`;
    console.log('✅ party_id kolonu eklendi');
    
    // User_type kolonu kontrol et
    const [result] = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'user_type'
    `;
    
    if (!result) {
      await sql`ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'citizen'`;
      console.log('✅ user_type kolonu eklendi');
    } else {
      console.log('✅ user_type kolonu zaten var');
    }
    
    console.log('\n🎉 Tüm eksik kolonlar eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

fixUsersTable();
