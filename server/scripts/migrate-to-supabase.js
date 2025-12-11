/**
 * ================================================
 * SUPABASE IMAGE MIGRATION SCRIPT
 * ================================================
 * Türkçe karakterli dosyaları Supabase'e taşır
 * 
 * Problem: Dosya adlarında Cyrillic karakterler var (Ш, Щ, Ъ, Ю, ж, А)
 * Çözüm: Türkçe karakterlere çevirip (I, İ, Ü, Ş, Ğ, Ç) Supabase'e yükle
 */

import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Database client
const sql = neon(process.env.DATABASE_URL);

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'avatars';

/**
 * Cyrillic → ASCII character mapping
 * 
 * Step 1: Convert Cyrillic to Turkish (İ, Ö, Ü, Ş, Ğ, Ç)
 * Step 2: Convert Turkish to ASCII (I, O, U, S, G, C) for Supabase compatibility
 * 
 * Supabase Storage doesn't support Turkish characters in filenames,
 * so we need to use ASCII-safe characters.
 */
const CYRILLIC_TO_ASCII = {
  // Cyrillic → ASCII (direct mapping)
  'Ш': 'I',  // İ → I
  'Щ': 'O',  // Ö → O  
  'Ъ': 'U',  // Ü → U
  'Ю': 'S',  // Ş → S
  'ж': 'C',  // Ğ → G (but often appears as C in names)
  'А': 'C',  // Ç → C
  'О': 'O',  // Ö → O
  // Lowercase
  'ш': 'i',
  'щ': 'o',
  'ъ': 'u',
  'ю': 's',
  'а': 'c',
  'о': 'o',
  // Turkish → ASCII (for any Turkish chars that slip through)
  'İ': 'I',
  'Ş': 'S',
  'Ğ': 'G',
  'Ü': 'U',
  'Ö': 'O',
  'Ç': 'C',
  'ı': 'i',
  'ş': 's',
  'ğ': 'g',
  'ü': 'u',
  'ö': 'o',
  'ç': 'c',
};

/**
 * Convert Cyrillic/Turkish filename to ASCII-safe version
 */
function toAsciiSafe(filename) {
  let result = filename;
  
  for (const [char, ascii] of Object.entries(CYRILLIC_TO_ASCII)) {
    result = result.split(char).join(ascii);
  }
  
  return result;
}

/**
 * Create or check Supabase bucket
 */
async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${BUCKET_NAME}`);
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (error) {
        console.error('❌ Bucket creation failed:', error.message);
        throw error;
      }
      console.log('✅ Bucket created successfully');
    } else {
      console.log(`✅ Bucket exists: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error('❌ Bucket check failed:', error.message);
    throw error;
  }
}

/**
 * Upload a single file to Supabase Storage
 */
async function uploadFile(localPath, originalFilename) {
  try {
    // Convert to ASCII-safe filename
    const asciiFilename = toAsciiSafe(originalFilename);
    
    // Read file
    const fileBuffer = fs.readFileSync(localPath);
    
    // Upload to Supabase (profiles/politicians subfolder)
    const storagePath = `profiles/politicians/${asciiFilename}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 year
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    return {
      success: true,
      originalFilename,
      asciiFilename,
      publicUrl: urlData.publicUrl,
      storagePath
    };
    
  } catch (error) {
    return {
      success: false,
      originalFilename,
      error: error.message
    };
  }
}

/**
 * Update database with new Supabase URLs
 */
async function updateDatabaseUrls(migrations) {
  console.log('\n📝 Updating database URLs...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    if (!migration.success) continue;
    
    try {
      // Find user by old filename pattern
      const oldUrl = `/assets/profiles/politicians/${migration.originalFilename}`;
      
      await sql`
        UPDATE users 
        SET avatar_url = ${migration.publicUrl}
        WHERE avatar_url = ${oldUrl}
      `;
      
      successCount++;
      
      if (successCount % 100 === 0) {
        console.log(`   Updated ${successCount} URLs...`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to update URL for ${migration.originalFilename}`);
      failCount++;
    }
  }
  
  console.log(`✅ Database update complete: ${successCount} success, ${failCount} failed`);
  return { successCount, failCount };
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Supabase Image Migration Started');
  console.log('='.repeat(70));
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'configured'}`);
  console.log('='.repeat(70));
  
  // Check credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Supabase credentials not found!');
    console.error('Please set in server/.env:');
    console.error('  SUPABASE_URL=https://your-project.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
  }
  
  const testMode = process.argv.includes('--test');
  const limit = testMode ? 10 : Infinity;
  
  if (testMode) {
    console.log('\n🧪 TEST MODE: Processing first 10 files only\n');
  }
  
  const startTime = Date.now();
  
  try {
    // Ensure bucket exists
    await ensureBucketExists();
    
    // Get all politician images
    const photosDir = path.join(__dirname, '../../public/assets/profiles/politicians');
    const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.jpg'));
    
    console.log(`\n📸 Found ${files.length} images`);
    console.log(`📤 Uploading ${Math.min(limit, files.length)} images...\n`);
    
    const migrations = [];
    let successCount = 0;
    let failCount = 0;
    
    // Upload files
    for (let i = 0; i < Math.min(limit, files.length); i++) {
      const filename = files[i];
      const localPath = path.join(photosDir, filename);
      
      const result = await uploadFile(localPath, filename);
      migrations.push(result);
      
      if (result.success) {
        successCount++;
        if (result.originalFilename !== result.asciiFilename) {
          console.log(`✅ [${i + 1}/${Math.min(limit, files.length)}] ${result.originalFilename} → ${result.asciiFilename}`);
        } else {
          console.log(`✅ [${i + 1}/${Math.min(limit, files.length)}] ${result.originalFilename}`);
        }
      } else {
        failCount++;
        console.error(`❌ [${i + 1}/${Math.min(limit, files.length)}] ${result.originalFilename} - ${result.error}`);
      }
      
      // Rate limiting (avoid hitting Supabase limits)
      if (i % 50 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n📊 Upload Summary: ${successCount} ✅ / ${failCount} ❌`);
    
    // Update database URLs (only if not test mode)
    if (!testMode && successCount > 0) {
      const dbResult = await updateDatabaseUrls(migrations.filter(m => m.success));
      console.log(`\n📊 Database Summary: ${dbResult.successCount} URLs updated`);
    } else if (testMode) {
      console.log('\n⚠️  Skipping database update (test mode)');
    }
    
    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(70));
    console.log('🎉 MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📤 Uploaded: ${successCount} files`);
    console.log(`❌ Failed: ${failCount} files`);
    if (!testMode) {
      console.log(`📝 Database: ${successCount} URLs updated`);
    }
    console.log('='.repeat(70));
    
    if (failCount > 0) {
      console.log('\n⚠️  Some files failed to upload. Check errors above.');
    }
    
    if (!testMode && successCount > 0) {
      console.log('\n✅ Next steps:');
      console.log('1. Test frontend to verify images load correctly');
      console.log('2. Remove local files from git (optional)');
    } else if (testMode) {
      console.log('\n✅ Test successful! Run without --test to migrate all files:');
      console.log('   node scripts/migrate-to-supabase.js');
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { uploadFile, updateDatabaseUrls, toAsciiSafe };
