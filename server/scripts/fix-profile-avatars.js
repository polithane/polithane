/**
 * =================================================
 * PROFİL FOTOĞRAFLARINI DÜZELT
 * =================================================
 * Türkçe karakter encoding sorununu çöz
 */

import { sql } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Türkçe karakterleri normalize et
const normalizeTurkish = (str) => {
  if (!str) return '';
  
  const turkishMap = {
    'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's',
    'Ğ': 'G', 'ğ': 'g', 'Ü': 'U', 'ü': 'u',
    'Ö': 'O', 'ö': 'o', 'Ç': 'C', 'ç': 'c'
  };
  
  return str.split('').map(char => turkishMap[char] || char).join('');
};

async function fixProfileAvatars() {
  try {
    console.log('🔧 Profil fotoğrafları düzeltiliyor...\n');

    // Tüm CHP profillerini al
    const profiles = await sql`
      SELECT id, username, full_name, avatar_url
      FROM users
      WHERE is_automated = TRUE
      ORDER BY full_name
    `;

    console.log(`📊 Toplam ${profiles.length} profil bulundu\n`);

    // Politicians klasöründeki dosyaları listele
    const politiciansDir = path.join(__dirname, '../../public/assets/profiles/politicians');
    const files = fs.readdirSync(politiciansDir);
    
    console.log(`📁 ${files.length} fotoğraf dosyası bulundu\n`);

    // Dosya ismi mapping'i oluştur (normalize edilmiş -> gerçek dosya adı)
    const fileMap = {};
    files.forEach(file => {
      const normalized = normalizeTurkish(file.replace('.jpg', '').toUpperCase());
      fileMap[normalized] = file;
    });

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundProfiles = [];

    // Her profil için dosya bul ve güncelle
    for (const profile of profiles) {
      const fullNameNormalized = normalizeTurkish(profile.full_name.toUpperCase().replace(/\s+/g, '_'));
      
      // Dosyayı bul
      const matchingFile = fileMap[fullNameNormalized];
      
      if (matchingFile) {
        // URL'i güncelle
        const newAvatarUrl = `/assets/profiles/politicians/${matchingFile}`;
        
        if (profile.avatar_url !== newAvatarUrl) {
          await sql`
            UPDATE users
            SET avatar_url = ${newAvatarUrl}
            WHERE id = ${profile.id}
          `;
          
          console.log(`✅ ${profile.full_name} -> ${matchingFile}`);
          updatedCount++;
        }
      } else {
        console.log(`❌ Fotoğraf bulunamadı: ${profile.full_name} (${fullNameNormalized})`);
        notFoundCount++;
        notFoundProfiles.push(profile.full_name);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ÖZET:');
    console.log(`✅ Güncellenen: ${updatedCount}`);
    console.log(`❌ Bulunamayan: ${notFoundCount}`);
    
    if (notFoundProfiles.length > 0 && notFoundProfiles.length <= 10) {
      console.log('\n❌ Bulunamayan profiller:');
      notFoundProfiles.forEach(name => console.log(`   - ${name}`));
    }
    
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

fixProfileAvatars();
