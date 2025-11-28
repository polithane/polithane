import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

/**
 * Email ve şifre formatı oluşturma
 * Format: [ad_4char][soyad_4char]polit2026
 * - Küçük harf
 * - Türkçe karakterler korunur (ğüşıöç)
 * - 4 karakterden kısa ise "_" ile doldurulur
 */
function generateCredentials(fullName) {
  // İsmi parçala
  const nameParts = fullName.trim().split(/\s+/);
  
  let firstName = '';
  let lastName = '';
  
  if (nameParts.length === 1) {
    // Sadece tek kelime varsa
    firstName = nameParts[0];
    lastName = '';
  } else if (nameParts.length === 2) {
    // İki kelime: Ad Soyad
    firstName = nameParts[0];
    lastName = nameParts[1];
  } else {
    // Üç veya daha fazla kelime: İlk kelime ad, son kelime soyad
    firstName = nameParts[0];
    lastName = nameParts[nameParts.length - 1];
  }
  
  // Küçük harfe çevir (Türkçe karakterler korunur)
  firstName = firstName.toLowerCase();
  lastName = lastName.toLowerCase();
  
  // İlk 4 karakteri al ve gerekirse "_" ile doldur
  const firstPart = firstName.substring(0, 4).padEnd(4, '_');
  const lastPart = lastName.substring(0, 4).padEnd(4, '_');
  
  // Format oluştur
  const credential = `${firstPart}${lastPart}polit2026`;
  const email = `${credential}@polithane.com`;
  
  return { email, password: credential };
}

async function updateAllUsers() {
  try {
    console.log('🔄 Tüm kullanıcıların email ve şifreleri güncelleniyor...\n');
    console.log('═'.repeat(70));
    
    // Tüm kullanıcıları al
    const users = await sql`
      SELECT id, full_name, username 
      FROM users 
      WHERE party_id IS NOT NULL
      ORDER BY full_name
    `;
    
    console.log(`\n📊 Toplam ${users.length} kullanıcı bulundu\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Test örnekleri
    const testCases = [
      { name: 'Yusuf Albayrak', expected: 'yusualbapolit2026' },
      { name: 'Şehri Şensoy', expected: 'sehrsenspolit2026' },
      { name: 'ALİ Rıza Mirmahmutoğlu', expected: 'ali_mirmpolit2026' },
      { name: 'Gül Ak', expected: 'gul_ak__polit2026' },
      { name: 'ÇİĞDEM TOKER', expected: 'cigdtokepolit2026' }
    ];
    
    console.log('🧪 Test örnekleri kontrol ediliyor:\n');
    for (const test of testCases) {
      const { email, password } = generateCredentials(test.name);
      const match = password === test.expected ? '✅' : '❌';
      console.log(`${match} ${test.name}`);
      console.log(`   Beklenen: ${test.expected}`);
      console.log(`   Oluşan:   ${password}`);
      console.log(`   Email:    ${email}\n`);
    }
    
    console.log('═'.repeat(70));
    console.log('\n💾 Kullanıcılar güncelleniyor...\n');
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        // Email ve şifre oluştur
        const { email, password } = generateCredentials(user.full_name);
        
        // Şifreyi hashle
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Kullanıcıyı güncelle
        await sql`
          UPDATE users 
          SET 
            email = ${email},
            password_hash = ${passwordHash}
          WHERE id = ${user.id}
        `;
        
        successCount++;
        
        // Her 100 kullanıcıda bir ilerleme göster
        if ((i + 1) % 100 === 0) {
          console.log(`✓ ${i + 1}/${users.length} kullanıcı güncellendi...`);
        }
        
      } catch (error) {
        console.error(`❌ Hata (${user.full_name}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n🎉 GÜNCELLEME TAMAMLANDI!\n');
    console.log('📊 İSTATİSTİKLER:');
    console.log(`   ✅ Başarılı: ${successCount}`);
    console.log(`   ❌ Hatalı: ${errorCount}`);
    console.log('');
    
    // Örnek kullanıcıları göster
    const sampleUsers = await sql`
      SELECT full_name, email, username 
      FROM users 
      WHERE party_id IS NOT NULL 
      LIMIT 10
    `;
    
    console.log('📝 Örnek Kullanıcılar:');
    sampleUsers.forEach(u => {
      const { password } = generateCredentials(u.full_name);
      console.log(`   ${u.full_name}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Şifre: ${password}\n`);
    });
    
  } catch (error) {
    console.error('❌ Güncelleme hatası:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { generateCredentials };

// Çalıştır
updateAllUsers();
