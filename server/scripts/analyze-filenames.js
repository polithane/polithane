/**
 * Analyze Cyrillic characters in filenames and create proper mapping
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

// Cyrillic characters we've found
const cyrillicChars = ['Ш', 'Щ', 'Ъ', 'Ю', 'ж', 'А', 'О'];

async function analyzeFilenames() {
  console.log('🔍 Analyzing filename encoding...\n');
  
  const photosDir = path.join(__dirname, '../../public/assets/profiles/politicians');
  const files = fs.readdirSync(photosDir);
  
  // Find files with Cyrillic characters
  const cyrillicFiles = files.filter(file => 
    cyrillicChars.some(char => file.includes(char))
  );
  
  console.log(`📊 Total files: ${files.length}`);
  console.log(`📊 Files with Cyrillic: ${cyrillicFiles.length}\n`);
  
  // Show some examples
  console.log('📋 Example filenames with Cyrillic:');
  console.log('=' .repeat(70));
  cyrillicFiles.slice(0, 20).forEach((file, idx) => {
    console.log(`${idx + 1}. ${file}`);
  });
  
  // Count each Cyrillic character
  console.log('\n📊 Cyrillic character frequency:');
  console.log('='.repeat(70));
  const charCount = {};
  cyrillicFiles.forEach(file => {
    cyrillicChars.forEach(char => {
      if (file.includes(char)) {
        charCount[char] = (charCount[char] || 0) + 1;
      }
    });
  });
  
  Object.entries(charCount).forEach(([char, count]) => {
    const hex = Buffer.from(char, 'utf8').toString('hex');
    console.log(`${char} (0x${hex}): ${count} occurrences`);
  });
  
  // Try to match with database usernames
  console.log('\n🔗 Attempting to match with database usernames...');
  console.log('='.repeat(70));
  
  try {
    const users = await sql`
      SELECT username, avatar_url 
      FROM users 
      WHERE avatar_url LIKE '/assets/profiles/politicians/%'
      LIMIT 20
    `;
    
    console.log('Sample database entries:');
    users.forEach((user, idx) => {
      const filename = user.avatar_url.split('/').pop();
      console.log(`${idx + 1}. ${user.username}`);
      console.log(`   File: ${filename}\n`);
    });
    
  } catch (error) {
    console.error('Failed to query database:', error.message);
  }
  
  // Suggest mapping based on common Turkish names
  console.log('\n💡 Suggested Cyrillic → Turkish mapping:');
  console.log('='.repeat(70));
  
  const suggestions = {
    'Ш': 'İ (Capital I with dot)',
    'Щ': 'Ö or İ (context dependent)', 
    'Ъ': 'Ü',
    'Ю': 'Ş',
    'ж': 'Ğ',
    'А': 'Ç (Cyrillic A)',
    'О': 'Ö (Cyrillic O)',
  };
  
  Object.entries(suggestions).forEach(([cyrillic, turkish]) => {
    const hex = Buffer.from(cyrillic, 'utf8').toString('hex');
    console.log(`${cyrillic} (0x${hex}) → ${turkish}`);
  });
  
  console.log('\n✅ Analysis complete!');
}

analyzeFilenames().catch(console.error);
