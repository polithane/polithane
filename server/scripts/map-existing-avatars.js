/**
 * =================================================
 * MEVCUT FOTOGRAF DOSYALARINI EŞLEŞTIR
 * =================================================
 * Dosyaları olduğu gibi kullan, isim eşleştirmesi yap
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = neon(process.env.DATABASE_URL);

// Basit string similarity (Levenshtein distance)
const similarity = (s1, s2) => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const levenshtein = (s1, s2) => {
  const matrix = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
};

// İsmi normalize et (sadece harfler ve boşluk)
const normalizeForMatching = (str) => {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Sadece harf, rakam, boşluk
    .replace(/\s+/g, '_')
    .trim();
};

async function mapExistingAvatars() {
  try {
    console.log('🔗 Fotoğrafları eşleştiriyorum...\n');

    // Tüm CHP profillerini al
    const profiles = await sql`
      SELECT id, username, full_name
      FROM users
      WHERE is_automated = TRUE
      ORDER BY full_name
    `;

    console.log(`📊 Toplam ${profiles.length} profil bulundu\n`);

    // Politicians klasöründeki dosyaları listele
    const politiciansDir = path.join(__dirname, '../../public/assets/profiles/politicians');
    const allFiles = fs.readdirSync(politiciansDir);
    const files = allFiles.filter(f => f.endsWith('.jpg'));
    
    console.log(`📁 ${files.length} fotoğraf dosyası bulundu\n`);

    // Dosya isimlerini normalize et (eşleştirme için)
    const fileMapping = files.map(file => {
      const nameWithoutExt = file.replace('.jpg', '');
      const normalized = normalizeForMatching(nameWithoutExt);
      return {
        original: file,
        normalized: normalized
      };
    });

    let updatedCount = 0;
    let matchedCount = 0;
    let notFoundCount = 0;

    // Her profil için en uygun dosyayı bul
    for (const profile of profiles) {
      const profileNormalized = normalizeForMatching(profile.full_name);
      
      // En yüksek benzerliğe sahip dosyayı bul
      let bestMatch = null;
      let bestScore = 0;
      
      for (const fileInfo of fileMapping) {
        const score = similarity(profileNormalized, fileInfo.normalized);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = fileInfo;
        }
      }
      
      // Eşik değeri: 0.7 (70% benzerlik)
      if (bestMatch && bestScore >= 0.7) {
        const newAvatarUrl = `/assets/profiles/politicians/${bestMatch.original}`;
        
        await sql`
          UPDATE users
          SET avatar_url = ${newAvatarUrl}
          WHERE id = ${profile.id}
        `;
        
        if (bestScore < 0.95) {
          console.log(`⚠️  ${profile.full_name} → ${bestMatch.original} (${(bestScore * 100).toFixed(0)}%)`);
        } else {
          console.log(`✅ ${profile.full_name} → ${bestMatch.original}`);
        }
        
        matchedCount++;
        updatedCount++;
      } else {
        console.log(`❌ Eşleşme bulunamadı: ${profile.full_name} (en iyi: ${(bestScore * 100).toFixed(0)}%)`);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ÖZET:');
    console.log(`✅ Eşleştirilen: ${matchedCount}`);
    console.log(`🔄 Güncellenen: ${updatedCount}`);
    console.log(`❌ Bulunamayan: ${notFoundCount}`);
    console.log(`📈 Başarı oranı: ${((matchedCount / profiles.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

mapExistingAvatars();
