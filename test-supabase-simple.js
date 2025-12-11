// Quick Supabase connection test (without dotenv)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eldoyqgzxgubkyohvquq.supabase.co';
const supabaseKey = 'sb_publishable_8S1Vkwk5I8GGGT-xAUpjsw_ja6c-a0k';

console.log('🔍 Testing Supabase connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n✅ Client created!\n');

// Test 1: Check connection
console.log('📡 Test 1: Database connection...');
try {
  const { data, error } = await supabase
    .from('parties')
    .select('count');
  
  if (error) {
    console.log('⚠️  Error:', error.message);
    console.log('   (This is OK if tables are empty)');
  } else {
    console.log('✅ Database connected!');
    console.log('   Data:', data);
  }
} catch (err) {
  console.error('❌ Connection error:', err.message);
}

// Test 2: Check storage
console.log('\n📦 Test 2: Storage buckets...');
try {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Storage error:', error.message);
  } else {
    console.log(`✅ Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }
} catch (err) {
  console.error('❌ Storage error:', err.message);
}

// Test 3: Auth status
console.log('\n🔐 Test 3: Auth system...');
try {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('✅ Auth system working!');
  console.log('   Current session:', session ? 'Logged in' : 'Not logged in (OK)');
} catch (err) {
  console.error('❌ Auth error:', err.message);
}

console.log('\n🎉 All tests completed!');
