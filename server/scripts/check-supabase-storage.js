/**
 * Check Supabase Storage status
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

async function checkStorage() {
  console.log('🔍 Supabase Storage Durumu Kontrol Ediliyor...\n');
  
  const BUCKET_NAME = 'avatars';
  
  try {
    // List all folders in bucket
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
      });
    
    if (rootError) throw rootError;
    
    console.log('📂 Root klasörler:');
    console.log('='.repeat(70));
    rootFiles.forEach(item => {
      console.log(`  ${item.name}/ ${item.id ? '(folder)' : '(file)'}`);
    });
    
    // Check politicians folder
    console.log('\n📂 politicians/ klasörü:');
    console.log('='.repeat(70));
    const { data: politiciansFiles, error: politiciansError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('politicians', {
        limit: 10000,
      });
    
    if (politiciansError) {
      console.log('  ❌ Erişim hatası:', politiciansError.message);
    } else {
      console.log(`  ✅ ${politiciansFiles.length} dosya bulundu`);
      if (politiciansFiles.length > 0) {
        console.log('  Örnekler:');
        politiciansFiles.slice(0, 5).forEach(f => console.log(`    - ${f.name}`));
      }
    }
    
    // Check profiles/politicians folder
    console.log('\n📂 profiles/politicians/ klasörü:');
    console.log('='.repeat(70));
    const { data: profilesFiles, error: profilesError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('profiles/politicians', {
        limit: 10000,
      });
    
    if (profilesError) {
      console.log('  ❌ Erişim hatası:', profilesError.message);
    } else {
      console.log(`  ✅ ${profilesFiles.length} dosya bulundu`);
      if (profilesFiles.length > 0) {
        console.log('  Örnekler:');
        profilesFiles.slice(0, 5).forEach(f => console.log(`    - ${f.name}`));
      }
    }
    
    // Check profiles folder
    console.log('\n📂 profiles/ klasörü (alt klasörler):');
    console.log('='.repeat(70));
    const { data: profilesRoot, error: profilesRootError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('profiles', {
        limit: 1000,
      });
    
    if (profilesRootError) {
      console.log('  ❌ Erişim hatası:', profilesRootError.message);
    } else {
      console.log(`  ${profilesRoot.length} item bulundu`);
      profilesRoot.forEach(item => {
        console.log(`    - ${item.name}/`);
      });
    }
    
    // Summary
    console.log('\n📊 ÖZET:');
    console.log('='.repeat(70));
    const politiciansCount = politiciansFiles?.length || 0;
    const profilesPoliticiansCount = profilesFiles?.length || 0;
    
    console.log(`politicians/ → ${politiciansCount} dosya`);
    console.log(`profiles/politicians/ → ${profilesPoliticiansCount} dosya`);
    
    if (politiciansCount > 0 && profilesPoliticiansCount > 0) {
      console.log(`\n⚠️  DUPLIKASYON TESPİT EDİLDİ!`);
      console.log(`Toplam ${politiciansCount + profilesPoliticiansCount} dosya var`);
      console.log(`Gerçekte ${Math.max(politiciansCount, profilesPoliticiansCount)} olmalı`);
      console.log(`\nGereksiz alan kullanımı: ~${Math.min(politiciansCount, profilesPoliticiansCount) * 130 / 1024} MB`);
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

checkStorage().catch(console.error);
