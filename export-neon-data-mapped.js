// Export data from Neon to Supabase with column mapping
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

console.log('🔄 Starting MAPPED data migration from Neon to Supabase...\n');

async function exportParties() {
  console.log(`📊 Exporting parties...`);
  
  try {
    const result = await neonClient.query(`
      SELECT 
        id, name, short_name, slug, description,
        logo_url, flag_url, color,
        parliament_seats, mp_count, polit_score,
        follower_count, post_count,
        is_active, founded_date as foundation_date,
        created_at, updated_at
      FROM parties
    `);
    
    if (result.rows.length === 0) {
      console.log(`   ℹ️  No data\n`);
      return { success: true, count: 0 };
    }
    
    console.log(`   Found ${result.rows.length} rows`);
    
    const { error } = await supabase.from('parties').insert(result.rows);
    
    if (error) {
      console.error(`   ❌ Error:`, error.message);
      return { success: false, error };
    }
    
    console.log(`   ✅ Imported ${result.rows.length} rows\n`);
    return { success: true, count: result.rows.length };
    
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return { success: false, error: err };
  }
}

async function exportUsers() {
  console.log(`📊 Exporting users...`);
  
  try {
    const result = await neonClient.query(`
      SELECT 
        id, username, email, password_hash, full_name, bio,
        avatar_url, cover_url, user_type, party_id, province,
        is_verified, is_active, email_verified,
        polit_score, follower_count, following_count, post_count,
        created_at, updated_at
      FROM users
    `);
    
    if (result.rows.length === 0) {
      console.log(`   ℹ️  No data\n`);
      return { success: true, count: 0 };
    }
    
    console.log(`   Found ${result.rows.length} rows`);
    
    // Batch insert (100 at a time)
    let imported = 0;
    for (let i = 0; i < result.rows.length; i += 100) {
      const batch = result.rows.slice(i, i + 100);
      const { error } = await supabase.from('users').insert(batch);
      
      if (error) {
        console.error(`   ❌ Batch ${i / 100 + 1} error:`, error.message);
      } else {
        imported += batch.length;
        console.log(`   ✓ Batch ${i / 100 + 1}: ${batch.length} rows`);
      }
    }
    
    console.log(`   ✅ Imported ${imported}/${result.rows.length} rows\n`);
    return { success: true, count: imported };
    
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return { success: false, error: err };
  }
}

async function exportPosts() {
  console.log(`📊 Exporting posts...`);
  
  try {
    const result = await neonClient.query(`
      SELECT 
        id, user_id, party_id, content, category, media_urls,
        polit_score, view_count, like_count, comment_count, share_count,
        is_featured, is_deleted,
        created_at, updated_at
      FROM posts
    `);
    
    if (result.rows.length === 0) {
      console.log(`   ℹ️  No data\n`);
      return { success: true, count: 0 };
    }
    
    console.log(`   Found ${result.rows.length} rows`);
    
    const { error } = await supabase.from('posts').insert(result.rows);
    
    if (error) {
      console.error(`   ❌ Error:`, error.message);
      return { success: false, error };
    }
    
    console.log(`   ✅ Imported ${result.rows.length} rows\n`);
    return { success: true, count: result.rows.length };
    
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return { success: false, error: err };
  }
}

async function exportLikes() {
  console.log(`📊 Exporting likes...`);
  
  try {
    const result = await neonClient.query(`
      SELECT id, post_id, user_id, created_at
      FROM likes
    `);
    
    if (result.rows.length === 0) {
      console.log(`   ℹ️  No data\n`);
      return { success: true, count: 0 };
    }
    
    console.log(`   Found ${result.rows.length} rows`);
    
    const { error } = await supabase.from('likes').insert(result.rows);
    
    if (error) {
      console.error(`   ❌ Error:`, error.message);
      return { success: false, error };
    }
    
    console.log(`   ✅ Imported ${result.rows.length} rows\n`);
    return { success: true, count: result.rows.length };
    
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return { success: false, error: err };
  }
}

async function main() {
  console.log('📡 Connecting to Neon...');
  await neonClient.connect();
  console.log('✅ Connected\n');
  
  const results = {
    parties: await exportParties(),
    users: await exportUsers(),
    posts: await exportPosts(),
    likes: await exportLikes()
  };
  
  await neonClient.end();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  
  let totalRows = 0;
  for (const [table, result] of Object.entries(results)) {
    console.log(`${result.success ? '✅' : '❌'} ${table}: ${result.count} rows`);
    totalRows += result.count;
  }
  
  console.log('='.repeat(50));
  console.log(`Total: ${totalRows} rows`);
  console.log('='.repeat(50));
  
  if (totalRows > 0) {
    console.log('\n🎉 Migration completed successfully!');
  }
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  neonClient.end();
  process.exit(1);
});
