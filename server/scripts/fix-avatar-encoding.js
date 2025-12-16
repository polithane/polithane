/**
 * =================================================
 * AVATAR URL'LERİNİ ENCODE ET
 * =================================================
 * Kiril karakterli dosya isimlerini URL-safe yap
 */

import { sql } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixAvatarEncoding() {
  try {
    console.log('🔧 Avatar URL\'leri encode ediliyor...\n');

    // Tüm CHP profillerini al
    const profiles = await sql`
      SELECT id, username, full_name, avatar_url
      FROM users
      WHERE is_automated = TRUE
      AND avatar_url IS NOT NULL
      AND avatar_url != ''
    `;

    console.log(`📊 Toplam ${profiles.length} profil bulundu\n`);

    let updatedCount = 0;

    for (const profile of profiles) {
      // URL'in dosya adı kısmını encode et
      const parts = profile.avatar_url.split('/');
      const filename = parts[parts.length - 1];
      const encodedFilename = encodeURIComponent(filename);
      
      // Eğer encoding değişiklik yaptıysa güncelle
      if (encodedFilename !== filename) {
        const newUrl = parts.slice(0, -1).join('/') + '/' + encodedFilename;
        
        await sql`
          UPDATE users
          SET avatar_url = ${newUrl}
          WHERE id = ${profile.id}
        `;
        
        console.log(`✅ ${profile.full_name}`);
        console.log(`   Eski: ${filename}`);
        console.log(`   Yeni: ${encodedFilename}\n`);
        updatedCount++;
      }
    }

    console.log('='.repeat(60));
    console.log(`✅ Güncellenen profil sayısı: ${updatedCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

fixAvatarEncoding();
