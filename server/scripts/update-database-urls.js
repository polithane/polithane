/**
 * =================================================
 * UPDATE DATABASE URLs - R2 Migration
 * =================================================
 * Local path'leri R2 URL'lerine çevir
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxx.r2.dev';

async function updateDatabaseUrls() {
  console.log('🔄 Updating database URLs to R2...\n');

  try {
    // 1. Update politician photos
    console.log('1️⃣ Updating politician avatar URLs...');
    const politiciansResult = await sql`
      UPDATE users
      SET avatar_url = REPLACE(
        avatar_url,
        '/assets/profiles/politicians/',
        ${R2_PUBLIC_URL + '/profiles/politicians/'}
      )
      WHERE avatar_url LIKE '/assets/profiles/politicians/%'
      RETURNING id, username, avatar_url
    `;
    
    console.log(`   ✅ Updated ${politiciansResult.length} politician profiles`);
    
    if (politiciansResult.length > 0 && politiciansResult.length <= 5) {
      console.log('   📝 Sample URLs:');
      politiciansResult.slice(0, 3).forEach(u => {
        console.log(`      ${u.username}: ${u.avatar_url}`);
      });
    }

    // 2. Update party logos (if exists in database)
    console.log('\n2️⃣ Checking party logo URLs...');
    const parties = await sql`
      SELECT id, party_short_name, party_logo
      FROM parties
      WHERE party_logo IS NOT NULL
      AND party_logo != ''
    `;
    
    console.log(`   Found ${parties.length} parties with logos`);

    if (parties.length > 0) {
      let updatedLogos = 0;
      for (const party of parties) {
        if (party.party_logo.startsWith('/assets/parties/')) {
          const newUrl = party.party_logo.replace(
            '/assets/parties/',
            `${R2_PUBLIC_URL}/parties/`
          );
          
          await sql`
            UPDATE parties
            SET party_logo = ${newUrl}
            WHERE id = ${party.id}
          `;
          
          console.log(`   ✅ ${party.party_short_name}: ${newUrl}`);
          updatedLogos++;
        }
      }
      console.log(`   ✅ Updated ${updatedLogos} party logos`);
    }

    // 3. Verification
    console.log('\n3️⃣ Verifying updates...');
    const verification = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE avatar_url LIKE ${R2_PUBLIC_URL + '%'}) as r2_avatars,
        (SELECT COUNT(*) FROM users WHERE avatar_url LIKE '/assets/%') as local_avatars,
        (SELECT COUNT(*) FROM parties WHERE party_logo LIKE ${R2_PUBLIC_URL + '%'}) as r2_logos,
        (SELECT COUNT(*) FROM parties WHERE party_logo LIKE '/assets/%') as local_logos
    `;

    console.log('   📊 Results:');
    console.log(`      R2 Avatars: ${verification[0].r2_avatars}`);
    console.log(`      Local Avatars: ${verification[0].local_avatars}`);
    console.log(`      R2 Logos: ${verification[0].r2_logos}`);
    console.log(`      Local Logos: ${verification[0].local_logos}`);

    if (verification[0].local_avatars === '0' && verification[0].local_logos === '0') {
      console.log('\n✅ All URLs successfully migrated to R2!');
      console.log('\n📝 Next steps:');
      console.log('1. Test frontend: https://polithane.vercel.app');
      console.log('2. If working, remove local files:');
      console.log('   git rm -r public/assets/profiles/politicians/');
      console.log('   git rm -r server/public/assets/');
    } else {
      console.log('\n⚠️  Some URLs still pointing to local paths');
    }

  } catch (error) {
    console.error('\n❌ Database update error:', error);
    process.exit(1);
  }
}

updateDatabaseUrls();
