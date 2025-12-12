/**
 * Clean duplicate images from Supabase Storage
 * Keep: politicians/ (2024 files)
 * Delete: profiles/politicians/ (1886 files - duplicate)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanDuplicates() {
  console.log('🧹 Duplike Resimler Temizleniyor...\n');
  
  const BUCKET = 'avatars';
  
  try {
    // List files in profiles/politicians/
    console.log('📂 profiles/politicians/ klasörü kontrol ediliyor...');
    const { data: dupFiles, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('profiles/politicians', { limit: 10000 });
    
    if (listError) throw listError;
    
    console.log(`   ⚠️  ${dupFiles.length} duplike dosya bulundu\n`);
    
    if (dupFiles.length === 0) {
      console.log('✅ Temizlenecek dosya yok!');
      return;
    }
    
    // Confirm deletion
    console.log('⚠️  DİKKAT: Bu dosyalar silinecek:');
    console.log(`   Klasör: profiles/politicians/`);
    console.log(`   Dosya sayısı: ${dupFiles.length}`);
    console.log(`   Alan kazancı: ~${(dupFiles.length * 130 / 1024).toFixed(2)} MB\n`);
    
    // Delete all files in profiles/politicians/
    const filePaths = dupFiles.map(f => `profiles/politicians/${f.name}`);
    
    console.log('🗑️  Silme işlemi başlıyor...');
    
    // Delete in batches of 100
    let deletedCount = 0;
    for (let i = 0; i < filePaths.length; i += 100) {
      const batch = filePaths.slice(i, i + 100);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove(batch);
      
      if (deleteError) {
        console.error(`   ❌ Batch ${Math.floor(i/100) + 1} hatası:`, deleteError.message);
      } else {
        deletedCount += batch.length;
        console.log(`   ✅ ${deletedCount}/${filePaths.length} dosya silindi...`);
      }
    }
    
    console.log('\n✅ Temizlik tamamlandı!');
    console.log(`   Silinen: ${deletedCount} dosya`);
    console.log(`   Kazanılan alan: ~${(deletedCount * 130 / 1024).toFixed(2)} MB`);
    
    // Verify
    const { data: remaining } = await supabase.storage
      .from(BUCKET)
      .list('profiles/politicians', { limit: 10 });
    
    if (remaining && remaining.length > 0) {
      console.log(`\n⚠️  Hala ${remaining.length} dosya kalmış olabilir`);
    } else {
      console.log('\n🎉 profiles/politicians/ klasörü tamamen temizlendi!');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

cleanDuplicates();
