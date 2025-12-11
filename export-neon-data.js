// Export data from Neon to Supabase
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

// Neon connection
const neonClient = new Client({
  connectionString: 'postgresql://neondb_owner:npg_F9zYkx1BtmKX@ep-crimson-grass-advw0sjv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Supabase connection
const supabase = createClient(
  'https://eldoyqgzxgubkyohvquq.supabase.co',
  'sb_secret_Z0MJzEHIIHAG9hJb5S8CNg_imQGhd98'
);

console.log('🔄 Starting data migration from Neon to Supabase...\n');

async function exportTable(tableName) {
  console.log(`📊 Exporting ${tableName}...`);
  
  try {
    // Get data from Neon
    const result = await neonClient.query(`SELECT * FROM ${tableName}`);
    const data = result.rows;
    
    if (!data || data.length === 0) {
      console.log(`   ℹ️  Table ${tableName} is empty\n`);
      return { success: true, count: 0 };
    }
    
    console.log(`   Found ${data.length} rows`);
    
    // Insert to Supabase
    const { error } = await supabase
      .from(tableName)
      .insert(data);
    
    if (error) {
      console.error(`   ❌ Error importing ${tableName}:`, error.message);
      return { success: false, error };
    }
    
    console.log(`   ✅ Imported ${data.length} rows to Supabase\n`);
    return { success: true, count: data.length };
    
  } catch (err) {
    console.error(`   ❌ Error with ${tableName}:`, err.message);
    return { success: false, error: err };
  }
}

async function main() {
  // Connect to Neon
  console.log('📡 Connecting to Neon...');
  await neonClient.connect();
  console.log('✅ Connected to Neon\n');
  
  const tables = [
    'parties',
    'users',
    'mp_profiles',
    'posts',
    'comments',
    'likes',
    'follows',
    'notifications',
    'messages'
  ];
  
  const results = {};
  
  for (const table of tables) {
    results[table] = await exportTable(table);
  }
  
  // Close Neon connection
  await neonClient.end();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  
  let totalRows = 0;
  let failedTables = 0;
  
  for (const [table, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${table}: ${result.count} rows`);
      totalRows += result.count;
    } else {
      console.log(`❌ ${table}: FAILED`);
      failedTables++;
    }
  }
  
  console.log('='.repeat(50));
  console.log(`Total rows migrated: ${totalRows}`);
  console.log(`Failed tables: ${failedTables}`);
  console.log('='.repeat(50));
  
  if (failedTables === 0 && totalRows > 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else if (totalRows === 0) {
    console.log('\nℹ️  No data to migrate (all tables empty)');
  } else {
    console.log('\n⚠️  Migration completed with errors');
  }
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  neonClient.end();
  process.exit(1);
});
