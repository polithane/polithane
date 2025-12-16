import { sql } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkMigrationStatus() {
  console.log('🔍 Migration Durumu Kontrol Ediliyor...\n');
  
  // Database kontrolü
    try {
    
    // Kullanıcı avatar URL'lerini kontrol et
    const result = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN avatar_url LIKE '%supabase%' THEN 1 END) as supabase_migrated,
        COUNT(CASE WHEN avatar_url LIKE '/assets/profiles/%' THEN 1 END) as local_assets,
        COUNT(CASE WHEN avatar_url IS NULL THEN 1 END) as no_avatar
      FROM users
    `;
    
    console.log('📊 Veritabanı Durumu:');
    console.log('=====================');
    console.log(`Toplam kullanıcı: ${result[0].total_users}`);
    console.log(`Supabase'e taşınmış: ${result[0].supabase_migrated}`);
    console.log(`Hala local assets: ${result[0].local_assets}`);
    console.log(`Avatar yok: ${result[0].no_avatar}\n`);
    
    // Örneklerden birkaç URL göster
    const samples = await sql`
      SELECT username, avatar_url 
      FROM users 
      WHERE avatar_url LIKE '/assets/profiles/%' 
      LIMIT 10
    `;
    
    if (samples.length > 0) {
      console.log('📋 Taşınmamış Avatar Örnekleri:');
      console.log('================================');
      samples.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.username}: ${row.avatar_url}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Veritabanı hatası:', error.message);
  }
  
  // Dosya sistemi kontrolü
  const politiciansDir = path.join(__dirname, '../../public/assets/profiles/politicians');
  
  if (fs.existsSync(politiciansDir)) {
    const files = fs.readdirSync(politiciansDir);
    console.log('📂 Local Dosya Durumu:');
    console.log('======================');
    console.log(`Toplam dosya: ${files.length}\n`);
    
    // Türkçe karakter içeren dosyaları tespit et
    const turkishChars = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'Ç', 'Ğ', 'İ', 'Ö', 'Ş', 'Ü'];
    const turkishFiles = files.filter(file => {
      const decoded = Buffer.from(file, 'binary').toString('utf8');
      return turkishChars.some(char => decoded.includes(char));
    });
    
    console.log('🔤 Türkçe Karakter İçeren Dosyalar:');
    console.log('====================================');
    console.log(`Tespit edilen: ${turkishFiles.length}`);
    if (turkishFiles.length > 0) {
      console.log('\nÖrnekler:');
      turkishFiles.slice(0, 10).forEach((file, idx) => {
        console.log(`${idx + 1}. ${file}`);
      });
    }
  }
  
  console.log('\n✅ Kontrol tamamlandı');
}

checkMigrationStatus().catch(console.error);
