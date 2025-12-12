/**
 * Test avatar URL accessibility
 */

import fetch from 'node-fetch';
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

async function testAccess() {
  console.log('🧪 Avatar Erişim Testi\n');
  
  // Test 1: Bucket public mi?
  console.log('1️⃣ Bucket durumu kontrol ediliyor...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const avatarsBucket = buckets.find(b => b.name === 'avatars');
  
  if (avatarsBucket) {
    console.log(`   ✅ Bucket bulundu: ${avatarsBucket.name}`);
    console.log(`   Public: ${avatarsBucket.public ? '✅ EVET' : '❌ HAYIR'}`);
  }
  
  // Test 2: Örnek URL erişimi
  console.log('\n2️⃣ Örnek URL test ediliyor...');
  const testUrl = 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/politicians/ALI_BEDRETTIN_KARATAS.jpg';
  
  try {
    const response = await fetch(testUrl);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Size: ${response.headers.get('content-length')} bytes`);
    
    if (response.status === 200) {
      console.log('   ✅ Resim erişilebilir!');
    } else {
      console.log('   ❌ Resme erişilemiyor!');
    }
  } catch (error) {
    console.log(`   ❌ Hata: ${error.message}`);
  }
  
  // Test 3: Bucket policy kontrol
  console.log('\n3️⃣ Bucket policy kontrol ediliyor...');
  const { data: policies, error } = await supabase.storage
    .from('avatars')
    .list('politicians', { limit: 1 });
    
  if (error) {
    console.log(`   ❌ List hatası: ${error.message}`);
  } else {
    console.log(`   ✅ List çalışıyor (${policies.length} dosya)`);
  }
}

testAccess().catch(console.error);
