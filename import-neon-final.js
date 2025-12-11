// Final import from Neon to Supabase
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const neonClient = new Client({
  connectionString: 'postgresql://neondb_owner:npg_F9zYkx1BtmKX@ep-crimson-grass-advw0sjv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const supabase = createClient(
  'https://eldoyqgzxgubkyohvquq.supabase.co',
  'sb_secret_Z0MJzEHIIHAG9hJb5S8CNg_imQGhd98'
);

console.log('🔄 Final data migration from Neon to Supabase...\n');

async function clearTable(tableName) {
  const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error && !error.message.includes('no rows')) {
    console.error(`   Warning clearing ${tableName}:`, error.message);
  }
}

async function importParties() {
  console.log('📊 Importing parties...');
  
  await clearTable('parties');
  
  const result = await neonClient.query(`
    SELECT 
      id, name, short_name, slug, description,
      logo_url, flag_url, color,
      parliament_seats, mp_count, polit_score,
      follower_count, post_count, is_active,
      founded_date as foundation_date,
      created_at, updated_at
    FROM parties
  `);
  
  if (result.rows.length === 0) {
    console.log('   ℹ️  No data\n');
    return 0;
  }
  
  const { error } = await supabase.from('parties').insert(result.rows);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return 0;
  }
  
  console.log(`   ✅ Imported ${result.rows.length} rows\n`);
  return result.rows.length;
}

async function importUsers() {
  console.log('📊 Importing users...');
  
  await clearTable('users');
  
  // Get valid user_types first
  const validTypes = ['mp', 'party_official', 'citizen', 'party_member', 'ex_politician', 'media'];
  
  const result = await neonClient.query(`
    SELECT 
      id, username, email, password_hash, full_name, bio,
      avatar_url, cover_url, 
      CASE 
        WHEN user_type IN ('politician', 'normal') THEN 'citizen'
        WHEN user_type NOT IN ('mp', 'party_official', 'citizen', 'party_member', 'ex_politician', 'media') THEN 'citizen'
        ELSE user_type 
      END as user_type,
      party_id, province,
      is_verified, is_active, email_verified,
      polit_score, follower_count, following_count, post_count,
      created_at, updated_at
    FROM users
  `);
  
  if (result.rows.length === 0) {
    console.log('   ℹ️  No data\n');
    return 0;
  }
  
  console.log(`   Found ${result.rows.length} rows`);
  
  let imported = 0;
  for (let i = 0; i < result.rows.length; i += 50) {
    const batch = result.rows.slice(i, i + 50);
    const { error } = await supabase.from('users').insert(batch);
    
    if (error) {
      console.error(`   ❌ Batch ${i / 50 + 1} error:`, error.message);
    } else {
      imported += batch.length;
      if (i % 500 === 0) {
        console.log(`   ✓ Progress: ${imported}/${result.rows.length}`);
      }
    }
  }
  
  console.log(`   ✅ Imported ${imported}/${result.rows.length} rows\n`);
  return imported;
}

async function importPosts() {
  console.log('📊 Importing posts...');
  
  await clearTable('posts');
  
  const result = await neonClient.query(`
    SELECT 
      id, user_id, party_id, content, media_urls,
      CASE 
        WHEN category NOT IN ('mps', 'organization', 'citizens', 'experience', 'media', 'general') THEN 'general'
        ELSE category 
      END as category,
      polit_score, view_count, like_count, comment_count, share_count,
      is_featured, is_deleted,
      created_at, updated_at
    FROM posts
  `);
  
  if (result.rows.length === 0) {
    console.log('   ℹ️  No data\n');
    return 0;
  }
  
  const { error } = await supabase.from('posts').insert(result.rows);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return 0;
  }
  
  console.log(`   ✅ Imported ${result.rows.length} rows\n`);
  return result.rows.length;
}

async function importLikes() {
  console.log('📊 Importing likes...');
  
  await clearTable('likes');
  
  const result = await neonClient.query(`
    SELECT id, post_id, user_id, created_at
    FROM likes
  `);
  
  if (result.rows.length === 0) {
    console.log('   ℹ️  No data\n');
    return 0;
  }
  
  const { error } = await supabase.from('likes').insert(result.rows);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    return 0;
  }
  
  console.log(`   ✅ Imported ${result.rows.length} rows\n`);
  return result.rows.length;
}

async function main() {
  console.log('📡 Connecting to Neon...');
  await neonClient.connect();
  console.log('✅ Connected\n');
  
  const counts = {
    parties: await importParties(),
    users: await importUsers(),
    posts: await importPosts(),
    likes: await importLikes()
  };
  
  await neonClient.end();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`${count > 0 ? '✅' : '⚠️ '} ${table}: ${count} rows`);
  });
  
  console.log('='.repeat(50));
  console.log(`Total: ${total} rows`);
  console.log('='.repeat(50));
  
  if (total > 0) {
    console.log('\n🎉 Migration completed successfully!');
  }
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  neonClient.end();
  process.exit(1);
});
