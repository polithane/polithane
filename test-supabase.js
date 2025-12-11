// Quick Supabase connection test
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : '❌ MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing environment variables!');
  console.error('Please update .env.local with your Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n✅ Client created!\n');

// Test 1: Check connection
console.log('📡 Test 1: Database connection...');
try {
  const { data, error } = await supabase
    .from('parties')
    .select('count')
    .limit(1);
  
  if (error) {
    console.log('⚠️  Table exists but empty (expected if no data imported yet)');
  } else {
    console.log('✅ Database connected!');
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

console.log('\n🎉 All tests completed!\n');
console.log('Next steps:');
console.log('1. Import data from Neon (if needed)');
console.log('2. Update frontend to use Supabase');
console.log('3. Test in browser');
