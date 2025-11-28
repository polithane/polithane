import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'xlsx';
import bcrypt from 'bcryptjs';
const { read, utils } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

// Görev tipine göre user_type belirleme
function determineUserType(gorev, gorev2) {
  const gorevLower = (gorev || '').toLowerCase();
  const gorev2Lower = (gorev2 || '').toLowerCase();
  const combined = `${gorevLower} ${gorev2Lower}`.trim();
  
  // Milletvekili kontrolü
  if (combined.includes('milletvekili') || combined.includes('tbmm')) {
    return 'mp';
  }
  
  // Parti görevlisi kontrolü (başkan, yönetim kurulu, vb.)
  if (
    combined.includes('başkan') ||
    combined.includes('genel başkan yardımcısı') ||
    combined.includes('parti meclisi') ||
    combined.includes('mkyk') ||
    combined.includes('yönetim kurulu') ||
    combined.includes('genel sekreter') ||
    combined.includes('il başkan') ||
    combined.includes('ilçe başkan') ||
    combined.includes('belde başkan')
  ) {
    return 'party_official';
  }
  
  // Medya kontrolü
  if (
    combined.includes('gazeteci') ||
    combined.includes('muhabir') ||
    combined.includes('editör') ||
    combined.includes('köşe yazarı')
  ) {
    return 'media';
  }
  
  // Default: parti üyesi
  return 'party_member';
}

// Pozisyon seviyesi belirleme
function determinePositionLevel(gorev) {
  const gorevLower = (gorev || '').toLowerCase();
  
  if (gorevLower.includes('genel başkan') || gorevLower.includes('mkyk')) {
    return 'national';
  }
  if (gorevLower.includes('il başkan') || gorevLower.includes('il belediye')) {
    return 'provincial';
  }
  if (gorevLower.includes('ilçe') || gorevLower.includes('belde')) {
    return 'district';
  }
  
  return 'local';
}

// Resim dosyası kontrolü
function getPhotoPath(resimDosya) {
  if (!resimDosya) return null;
  
  // Resim path'i
  return `/assets/profiles/politicians/${resimDosya}`;
}

async function importProfiles() {
  try {
    console.log('🚀 Profil import işlemi başlatılıyor...\n');
    
    // Excel dosyasını oku
    const excelPath = join(__dirname, '../../chpprofilleri.xlsx');
    const fileBuffer = await readFile(excelPath);
    const workbook = read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(worksheet);
    
    console.log(`📊 Toplam ${data.length} profil bulundu\n`);
    
    // Dummy password hash oluştur (şifre: Polithane2024)
    console.log('🔐 Password hash oluşturuluyor...');
    const dummyPasswordHash = await bcrypt.hash('Polithane2024', 10);
    console.log('✅ Password hash hazır\n');
    
    // CHP parti ID'sini al
    const [chpParty] = await sql`
      SELECT id FROM parties WHERE LOWER(name) LIKE '%chp%' OR LOWER(slug) = 'chp'
    `;
    
    if (!chpParty) {
      console.error('❌ CHP partisi bulunamadı!');
      return;
    }
    
    console.log(`✅ CHP Parti ID: ${chpParty.id}\n`);
    console.log('─'.repeat(80));
    
    let stats = {
      success: 0,
      failed: 0,
      mp: 0,
      party_official: 0,
      party_member: 0,
      media: 0,
      missingPhotos: []
    };
    
    // Her profil için
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const adSoyad = row['Ad Soyad'] || '';
      const il = row['İl'] || '';
      const gorev = row['Görev'] || '';
      const gorev2 = row['Görev 2'] || '';
      const resimDosya = row['Resim Dosya'] || '';
      
      if (!adSoyad) {
        console.log(`⚠️  Satır ${i + 2}: İsim boş, atlanıyor`);
        stats.failed++;
        continue;
      }
      
      try {
        // User type belirle
        const userType = determineUserType(gorev, gorev2);
        stats[userType]++;
        
        // Username oluştur (Türkçe karakterleri İngilizce'ye çevir, küçük harf, boşluk yerine alt çizgi)
        const username = adSoyad.toLowerCase()
          .replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ı/g, 'i')
          .replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        
        // Email oluştur
        const email = `${username}@polithane.com`;
        
        // Resim path
        const avatarUrl = getPhotoPath(resimDosya);
        
        // Kullanıcı oluştur
        const [user] = await sql`
          INSERT INTO users (
            username, 
            full_name,
            email,
            password_hash,
            user_type,
            avatar_url,
            party_id,
            province,
            is_verified
          )
          VALUES (
            ${username},
            ${adSoyad},
            ${email},
            ${dummyPasswordHash},
            ${userType},
            ${avatarUrl},
            ${chpParty.id},
            ${il},
            ${userType === 'mp' ? true : false}
          )
          ON CONFLICT (username) DO UPDATE 
          SET 
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            user_type = EXCLUDED.user_type,
            avatar_url = EXCLUDED.avatar_url,
            party_id = EXCLUDED.party_id,
            province = EXCLUDED.province,
            is_verified = EXCLUDED.is_verified
          RETURNING id
        `;
        
        // Kullanıcı tipine göre profil oluştur
        if (userType === 'mp') {
          // Milletvekili profili
          await sql`
            INSERT INTO mp_profiles (
              user_id,
              election_district,
              parliamentary_group,
              current_term
            )
            VALUES (
              ${user.id},
              ${il},
              ${'CHP Grubu'},
              ${29}
            )
            ON CONFLICT (user_id) DO UPDATE
            SET
              election_district = EXCLUDED.election_district,
              parliamentary_group = EXCLUDED.parliamentary_group
          `;
        } else if (userType === 'party_official') {
          // Parti görevlisi profili
          const positionLevel = determinePositionLevel(gorev);
          
          await sql`
            INSERT INTO party_official_profiles (
              user_id,
              party_id,
              position_title,
              position_level,
              province,
              is_current_position
            )
            VALUES (
              ${user.id},
              ${chpParty.id},
              ${gorev},
              ${positionLevel},
              ${il},
              ${true}
            )
            ON CONFLICT (user_id) DO UPDATE
            SET
              position_title = EXCLUDED.position_title,
              position_level = EXCLUDED.position_level,
              province = EXCLUDED.province
          `;
        } else if (userType === 'party_member') {
          // Parti üyesi profili
          await sql`
            INSERT INTO party_member_profiles (
              user_id,
              party_id,
              is_active_member
            )
            VALUES (
              ${user.id},
              ${chpParty.id},
              ${true}
            )
            ON CONFLICT (user_id) DO UPDATE
            SET
              party_id = EXCLUDED.party_id
          `;
        }
        
        stats.success++;
        
        // Her 100 profilden birinde ilerleme göster
        if ((i + 1) % 100 === 0) {
          console.log(`✓ ${i + 1}/${data.length} profil işlendi...`);
        }
        
      } catch (error) {
        console.error(`❌ Hata (${adSoyad}):`, error.message);
        stats.failed++;
      }
    }
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n🎉 İMPORT TAMAMLANDI!\n');
    console.log('📊 İSTATİSTİKLER:');
    console.log(`   ✅ Başarılı: ${stats.success}`);
    console.log(`   ❌ Başarısız: ${stats.failed}`);
    console.log(`   👨‍⚖️  Milletvekili: ${stats.mp}`);
    console.log(`   🏛️  Parti Görevlisi: ${stats.party_official}`);
    console.log(`   👥 Parti Üyesi: ${stats.party_member}`);
    console.log(`   📰 Medya: ${stats.media}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Import hatası:', error);
    process.exit(1);
  }
}

// Çalıştır
importProfiles();
