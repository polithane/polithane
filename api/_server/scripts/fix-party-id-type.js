import dotenv from 'dotenv';
import { sql } from '../db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function fixPartyIdType() {
  console.log('🔧 party_id kolonunun tipi düzeltiliyor...\n');

  try {
    // Önce varolan veriyi temizle
    await sql`UPDATE users SET party_id = NULL WHERE party_id IS NOT NULL`;
    console.log('✅ Varolan party_id verileri temizlendi');
    
    // Kolonu sil ve yeniden oluştur
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS party_id`;
    console.log('✅ Eski party_id kolonu silindi');
    
    await sql`ALTER TABLE users ADD COLUMN party_id UUID REFERENCES parties(id)`;
    console.log('✅ Yeni party_id kolonu (UUID) eklendi');
    
    console.log('\n🎉 Tamamlandı!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

fixPartyIdType();
