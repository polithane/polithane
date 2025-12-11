/**
 * CHP Politicians Photos Migration Script
 * 
 * This script migrates 2000+ CHP politician photos from:
 * - Source: public/assets/profiles/politicians/*.jpg
 * - Target: Supabase Storage (avatars bucket)
 * 
 * It also updates the database to point to new URLs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use SERVICE_KEY for admin access

const PHOTOS_DIR = path.join(__dirname, '../../public/assets/profiles/politicians');
const BATCH_SIZE = 10; // Upload 10 photos at a time
const RATE_LIMIT_DELAY = 1000; // 1 second delay between batches

// ============================================
// SUPABASE CLIENT
// ============================================

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Upload a single photo to Supabase Storage
 */
async function uploadPhoto(filename, filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(`politicians/${filename}`, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      return { success: false, filename, error: error.message };
    }
    
    return { success: true, filename, path: data.path };
  } catch (err) {
    return { success: false, filename, error: err.message };
  }
}

/**
 * Upload photos in batches with rate limiting
 */
async function uploadPhotosBatch(files) {
  const results = [];
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`);
    console.log(`   Files: ${i + 1} - ${Math.min(i + BATCH_SIZE, files.length)} of ${files.length}`);
    
    const batchPromises = batch.map(filename => {
      const filePath = path.join(PHOTOS_DIR, filename);
      return uploadPhoto(filename, filePath);
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Log batch results
    const success = batchResults.filter(r => r.success).length;
    const failed = batchResults.filter(r => !r.success).length;
    console.log(`   ✅ Success: ${success} | ❌ Failed: ${failed}`);
    
    // Rate limiting
    if (i + BATCH_SIZE < files.length) {
      console.log(`   ⏳ Waiting ${RATE_LIMIT_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }
  
  return results;
}

/**
 * Update database URLs
 */
async function updateDatabaseUrls() {
  console.log('\n🔄 Updating database URLs...');
  
  // Get all users with politician photos
  const { data: users, error } = await supabase
    .from('users')
    .select('id, avatar_url')
    .like('avatar_url', '%/assets/profiles/politicians/%');
  
  if (error) {
    console.error('❌ Query failed:', error.message);
    return { success: 0, failed: 0 };
  }
  
  if (!users || users.length === 0) {
    console.log('ℹ️  No users found with politician photos');
    return { success: 0, failed: 0 };
  }
  
  console.log(`📝 Found ${users.length} users to update`);
  
  let success = 0;
  let failed = 0;
  
  for (const user of users) {
    // Extract filename from old URL
    // Example: /assets/profiles/politicians/ahmet-yildirim.jpg → ahmet-yildirim.jpg
    const filename = user.avatar_url.split('/').pop();
    
    // New Supabase Storage URL
    const newUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/politicians/${filename}`;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: newUrl })
      .eq('id', user.id);
    
    if (updateError) {
      console.error(`   ❌ Failed: User ${user.id} - ${updateError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Updated: User ${user.id} - ${filename}`);
      success++;
    }
  }
  
  return { success, failed };
}

/**
 * Verify migration
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  // List files in Supabase Storage
  const { data: files, error } = await supabase.storage
    .from('avatars')
    .list('politicians', {
      limit: 10000,
      sortBy: { column: 'name', order: 'asc' }
    });
  
  if (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
  
  console.log(`✅ Total files in Supabase Storage: ${files.length}`);
  
  // Check database
  const { count, error: countError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .like('avatar_url', `%${SUPABASE_URL}/storage/v1/object/public/avatars/politicians/%`);
  
  if (countError) {
    console.error('❌ Database verification failed:', countError.message);
    return false;
  }
  
  console.log(`✅ Total users with updated URLs: ${count}`);
  
  return true;
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================

async function main() {
  console.log('🚀 Starting CHP Politicians Photos Migration\n');
  console.log('Configuration:');
  console.log(`  - Supabase URL: ${SUPABASE_URL}`);
  console.log(`  - Photos Directory: ${PHOTOS_DIR}`);
  console.log(`  - Batch Size: ${BATCH_SIZE}`);
  console.log(`  - Rate Limit: ${RATE_LIMIT_DELAY}ms\n`);
  
  // Step 1: Check if photos directory exists
  try {
    await fs.access(PHOTOS_DIR);
  } catch (err) {
    console.error(`❌ Photos directory not found: ${PHOTOS_DIR}`);
    process.exit(1);
  }
  
  // Step 2: Get all .jpg files
  console.log('📂 Scanning photos directory...');
  const allFiles = await fs.readdir(PHOTOS_DIR);
  const jpgFiles = allFiles.filter(f => f.toLowerCase().endsWith('.jpg'));
  
  console.log(`📸 Found ${jpgFiles.length} photos to migrate\n`);
  
  if (jpgFiles.length === 0) {
    console.log('ℹ️  No photos to migrate. Exiting.');
    return;
  }
  
  // Step 3: Upload photos
  console.log('📤 Starting upload...');
  const startTime = Date.now();
  
  const uploadResults = await uploadPhotosBatch(jpgFiles);
  
  const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Step 4: Summary
  const successCount = uploadResults.filter(r => r.success).length;
  const failedCount = uploadResults.filter(r => !r.success).length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful:  ${successCount}/${jpgFiles.length}`);
  console.log(`❌ Failed:      ${failedCount}/${jpgFiles.length}`);
  console.log(`⏱️  Time:        ${uploadTime}s`);
  console.log(`📈 Speed:       ${(jpgFiles.length / uploadTime).toFixed(2)} photos/sec`);
  
  // Log failed uploads
  if (failedCount > 0) {
    console.log('\n❌ Failed uploads:');
    uploadResults
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.filename}: ${r.error}`));
  }
  
  // Step 5: Update database URLs
  const { success: dbSuccess, failed: dbFailed } = await updateDatabaseUrls();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DATABASE UPDATE SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful:  ${dbSuccess}`);
  console.log(`❌ Failed:      ${dbFailed}`);
  
  // Step 6: Verify migration
  await verifyMigration();
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('🎉 MIGRATION COMPLETED!');
  console.log('='.repeat(50));
  
  if (failedCount === 0 && dbFailed === 0) {
    console.log('✅ All photos migrated successfully!');
    console.log('✅ All database URLs updated!');
    console.log('\nNext steps:');
    console.log('1. Verify photos on frontend');
    console.log('2. Test a few user profiles');
    console.log('3. Delete local photos from git (after confirmation)');
  } else {
    console.log('⚠️  Migration completed with errors!');
    console.log(`   - ${failedCount} photos failed to upload`);
    console.log(`   - ${dbFailed} database updates failed`);
    console.log('\nRecommendation: Review errors and retry failed uploads');
  }
  
  console.log('');
}

// ============================================
// ROLLBACK FUNCTION
// ============================================

async function rollback() {
  console.log('⏮️  Starting rollback...\n');
  
  // Restore old URLs
  const { data: users, error } = await supabase
    .from('users')
    .select('id, avatar_url')
    .like('avatar_url', `%${SUPABASE_URL}/storage/v1/object/public/avatars/politicians/%`);
  
  if (error) {
    console.error('❌ Rollback query failed:', error.message);
    return;
  }
  
  console.log(`Found ${users.length} users to rollback`);
  
  for (const user of users) {
    const filename = user.avatar_url.split('/').pop();
    const oldUrl = `/assets/profiles/politicians/${filename}`;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: oldUrl })
      .eq('id', user.id);
    
    if (updateError) {
      console.error(`❌ Rollback failed for user ${user.id}:`, updateError.message);
    } else {
      console.log(`✅ Rolled back user ${user.id}`);
    }
  }
  
  console.log('\n✅ Rollback completed!');
}

// ============================================
// CLI
// ============================================

const command = process.argv[2];

if (command === 'rollback') {
  rollback().catch(console.error);
} else {
  main().catch(err => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
  });
}
