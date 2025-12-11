/**
 * Migrate all images to Supabase Storage
 * 1. Party logos
 * 2. Politician photos (2000+)
 * 3. Update database URLs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  'https://eldoyqgzxgubkyohvquq.supabase.co',
  'sb_secret_Z0MJzEHIIHAG9hJb5S8CNg_imQGhd98'
);

// ============================================
// 1. UPLOAD PARTY LOGOS
// ============================================

async function uploadPartyLogos() {
  console.log('📦 Uploading party logos...\n');
  
  const logosDir = path.join(__dirname, 'public/assets/parties/logos');
  
  try {
    const files = await fs.readdir(logosDir);
    const logoFiles = files.filter(f => f.endsWith('.png'));
    
    console.log(`Found ${logoFiles.length} party logos`);
    
    let success = 0;
    for (const filename of logoFiles) {
      const filePath = path.join(logosDir, filename);
      const fileBuffer = await fs.readFile(filePath);
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(`party-logos/${filename}`, fileBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error(`   ❌ ${filename}:`, error.message);
      } else {
        console.log(`   ✅ ${filename}`);
        success++;
      }
    }
    
    console.log(`\n✅ Uploaded ${success}/${logoFiles.length} party logos\n`);
    return success;
  } catch (err) {
    console.error('❌ Error uploading party logos:', err.message);
    return 0;
  }
}

// ============================================
// 2. UPLOAD DEFAULT AVATAR ICON
// ============================================

async function uploadDefaultAvatar() {
  console.log('🖼️  Uploading default avatar icon...\n');
  
  const iconPath = path.join(__dirname, 'public/ikon.png');
  
  try {
    const fileBuffer = await fs.readFile(iconPath);
    
    const { error } = await supabase.storage
      .from('avatars')
      .upload('default/ikon.png', fileBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('   ❌ Error:', error.message);
      return false;
    }
    
    console.log('   ✅ Default avatar uploaded\n');
    return true;
  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return false;
  }
}

// ============================================
// 3. UPLOAD POLITICIAN PHOTOS
// ============================================

async function uploadPoliticianPhotos() {
  console.log('📸 Uploading politician photos...\n');
  
  const photosDir = path.join(__dirname, 'public/assets/profiles/politicians');
  
  try {
    const files = await fs.readdir(photosDir);
    const jpgFiles = files.filter(f => f.endsWith('.jpg'));
    
    console.log(`Found ${jpgFiles.length} politician photos`);
    console.log('This will take ~10-20 minutes...\n');
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < jpgFiles.length; i++) {
      const filename = jpgFiles[i];
      const filePath = path.join(photosDir, filename);
      
      try {
        const fileBuffer = await fs.readFile(filePath);
        
        const { error } = await supabase.storage
          .from('avatars')
          .upload(`politicians/${filename}`, fileBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });
        
        if (error) {
          console.error(`   ❌ ${filename}:`, error.message);
          failed++;
        } else {
          success++;
          
          // Progress report every 100 files
          if (success % 100 === 0) {
            console.log(`   ✓ Progress: ${success}/${jpgFiles.length} (${Math.round(success/jpgFiles.length*100)}%)`);
          }
        }
        
        // Rate limiting: 10 uploads per second
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (err) {
        console.error(`   ❌ ${filename}:`, err.message);
        failed++;
      }
    }
    
    console.log(`\n✅ Uploaded ${success}/${jpgFiles.length} politician photos`);
    console.log(`❌ Failed: ${failed}\n`);
    return success;
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    return 0;
  }
}

// ============================================
// 4. UPDATE DATABASE URLs
// ============================================

async function updateDatabaseUrls() {
  console.log('🔄 Updating database URLs...\n');
  
  const baseUrl = 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars';
  
  // Update party logos in parties table
  console.log('📊 Updating party logos...');
  const { data: parties } = await supabase
    .from('parties')
    .select('id, logo_url, slug');
  
  if (parties && parties.length > 0) {
    for (const party of parties) {
      if (party.logo_url && party.logo_url.includes('/assets/parties/logos/')) {
        const filename = party.logo_url.split('/').pop();
        const newUrl = `${baseUrl}/party-logos/${filename}`;
        
        await supabase
          .from('parties')
          .update({ logo_url: newUrl })
          .eq('id', party.id);
        
        console.log(`   ✅ Updated ${party.slug}`);
      }
    }
  }
  
  // Update user avatars
  console.log('\n📊 Updating user avatars...');
  const { data: users } = await supabase
    .from('users')
    .select('id, username, avatar_url');
  
  let updated = 0;
  
  if (users && users.length > 0) {
    for (const user of users) {
      let newUrl = null;
      
      if (user.avatar_url && user.avatar_url.includes('/assets/profiles/politicians/')) {
        // Has politician photo
        const filename = user.avatar_url.split('/').pop();
        newUrl = `${baseUrl}/politicians/${filename}`;
      } else if (!user.avatar_url || user.avatar_url === '') {
        // No avatar - use default
        newUrl = `${baseUrl}/default/ikon.png`;
      } else if (user.avatar_url.startsWith('/uploads/')) {
        // User uploaded avatar (will be migrated later)
        continue;
      } else {
        // Already has proper URL
        continue;
      }
      
      if (newUrl) {
        await supabase
          .from('users')
          .update({ avatar_url: newUrl })
          .eq('id', user.id);
        
        updated++;
        if (updated % 100 === 0) {
          console.log(`   ✓ Progress: ${updated}/${users.length}`);
        }
      }
    }
  }
  
  console.log(`\n✅ Updated ${updated} user avatars\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🚀 Starting Image Migration to Supabase Storage\n');
  console.log('='.repeat(50));
  
  // Step 1: Upload party logos
  const logosCount = await uploadPartyLogos();
  
  // Step 2: Upload default avatar
  await uploadDefaultAvatar();
  
  // Step 3: Upload politician photos (this takes time!)
  const photosCount = await uploadPoliticianPhotos();
  
  // Step 4: Update database URLs
  await updateDatabaseUrls();
  
  console.log('='.repeat(50));
  console.log('📊 MIGRATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Party logos: ${logosCount}`);
  console.log(`✅ Politician photos: ${photosCount}`);
  console.log(`✅ Database updated`);
  console.log('='.repeat(50));
  console.log('\n🎉 All images migrated to Supabase Storage!');
  console.log('\nNext: Test your site and delete local images from git\n');
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
