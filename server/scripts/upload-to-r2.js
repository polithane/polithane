/**
 * =================================================
 * CLOUDFLARE R2 UPLOAD SCRIPT
 * =================================================
 * Fotoğrafları Git'ten R2'ye taşır
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// R2 Configuration (S3-compatible)
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://xxxxx.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'polithane-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxx.r2.dev';

/**
 * Upload a single file to R2
 */
async function uploadFile(localPath, r2Key, contentType = 'image/jpeg') {
  try {
    const fileContent = fs.readFileSync(localPath);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: r2Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await R2.send(command);
    return `${PUBLIC_URL}/${r2Key}`;
  } catch (error) {
    console.error(`❌ Upload failed: ${r2Key}`, error.message);
    throw error;
  }
}

/**
 * Upload politician photos
 */
async function uploadPoliticianPhotos(testMode = false) {
  const photosDir = path.join(__dirname, '../../public/assets/profiles/politicians');
  const files = fs.readdirSync(photosDir);
  
  const limit = testMode ? 10 : files.length;
  console.log(`\n📸 Uploading ${limit} politician photos...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < Math.min(limit, files.length); i++) {
    const file = files[i];
    if (!file.endsWith('.jpg')) continue;
    
    const localPath = path.join(photosDir, file);
    const r2Key = `profiles/politicians/${file}`;
    
    try {
      const url = await uploadFile(localPath, r2Key);
      console.log(`✅ [${i + 1}/${limit}] ${file}`);
      successCount++;
      
      // Rate limit (10 requests/second)
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ [${i + 1}/${limit}] ${file} - ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Politicians: ✅ ${successCount} success, ❌ ${failCount} failed`);
  return { successCount, failCount };
}

/**
 * Upload party logos
 */
async function uploadPartyLogos() {
  const logosDir = path.join(__dirname, '../../public/assets/parties');
  
  if (!fs.existsSync(logosDir)) {
    console.log('⚠️  Party logos directory not found');
    return { successCount: 0, failCount: 0 };
  }
  
  const files = fs.readdirSync(logosDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  console.log(`\n🎨 Uploading ${files.length} party logos...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const localPath = path.join(logosDir, file);
    const r2Key = `parties/${file}`;
    const contentType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    try {
      const url = await uploadFile(localPath, r2Key, contentType);
      console.log(`✅ ${file}`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file} - ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Logos: ✅ ${successCount} success, ❌ ${failCount} failed`);
  return { successCount, failCount };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Cloudflare R2 Upload Started');
  console.log('='.repeat(60));
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
  console.log('='.repeat(60));

  // Check credentials
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    console.error('\n❌ R2 credentials not found!');
    console.error('Please set: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  const testMode = process.argv.includes('--test');
  if (testMode) {
    console.log('\n🧪 TEST MODE: Uploading 10 files only\n');
  }

  const startTime = Date.now();

  try {
    // Upload politicians
    const politiciansResult = await uploadPoliticianPhotos(testMode);
    
    // Upload party logos (only in full mode)
    let logosResult = { successCount: 0, failCount: 0 };
    if (!testMode) {
      logosResult = await uploadPartyLogos();
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPLOAD SUMMARY');
    console.log('='.repeat(60));
    console.log(`Politicians: ${politiciansResult.successCount} ✅ / ${politiciansResult.failCount} ❌`);
    console.log(`Party Logos: ${logosResult.successCount} ✅ / ${logosResult.failCount} ❌`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(60));

    if (politiciansResult.failCount === 0 && logosResult.failCount === 0) {
      console.log('\n🎉 All uploads successful!');
      console.log('\n📝 Next steps:');
      console.log('1. Run: node scripts/update-database-urls.js');
      console.log('2. Test frontend with new URLs');
      console.log('3. Remove local files from git');
    } else {
      console.log('\n⚠️  Some uploads failed. Check errors above.');
      process.exit(1);
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

export { uploadFile, uploadPoliticianPhotos, uploadPartyLogos };
