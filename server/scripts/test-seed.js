import dotenv from 'dotenv';
import { sql } from '../db.js';

dotenv.config();
console.log('🧪 Test seed başlatılıyor...\n');

async function testSeed() {
  try {
    // Add a few parties
    console.log('🏛️  Test partileri ekleniyor...');
    await sql`
      INSERT INTO parties (name, short_name, slug, parliament_seats, color, is_active)
      VALUES 
        ('Adalet ve Kalkınma Partisi', 'AK PARTİ', 'ak-parti', 272, '#F39200', true),
        ('Cumhuriyet Halk Partisi', 'CHP', 'chp', 138, '#ED1C24', true),
        ('Milliyetçi Hareket Partisi', 'MHP', 'mhp', 47, '#C41E3A', true)
    `.catch(e => console.log('   Partiler zaten var'));
    console.log('✅ 3 parti eklendi\n');

    // Get party IDs
    const parties = await sql`SELECT id, slug FROM parties LIMIT 3`;
    console.log('Party IDs:', parties.map(p => `${p.slug}: ${p.id}`).join(', '));

    // Add a few users  
    console.log('\n👥 Test kullanıcıları ekleniyor...');
    const existingUsers = await sql`SELECT id, username FROM users LIMIT 3`;
    let users = existingUsers;
    
    if (existingUsers.length === 0) {
      await sql`
        INSERT INTO users (username, email, password_hash, full_name, user_type, is_verified)
        VALUES
          ('demo_user1', 'demo1@polithane.com', 'dummy_hash_123', 'Demo Kullanıcı 1', 'normal', false),
          ('demo_user2', 'demo2@polithane.com', 'dummy_hash_456', 'Demo Kullanıcı 2', 'normal', false),
          ('demo_politician', 'demo@polithane.com', 'dummy_hash_789', 'Demo Politikacı', 'politician', true)
      `;
      console.log('✅ 3 yeni kullanıcı eklendi\n');
      users = await sql`SELECT id, username FROM users LIMIT 3`;
    } else {
      console.log('✅ Mevcut kullanıcılar kullanılıyor\n');
    }
    console.log('User IDs:', users.map(u => `${u.username}: ${u.id}`).join(', '));

    // Add a few posts
    console.log('\n📝 Test postlar ekleniyor...');
    await sql`
      INSERT INTO posts (user_id, content, content_type, category)
      VALUES
        (${users[0].id}, 'Bu bir test post - Polithane artık veritabanı ile çalışıyor! 🎉', 'text', 'haber'),
        (${users[1].id}, 'İkinci test post - Neon PostgreSQL bağlantısı başarılı!', 'text', 'duyuru'),
        (${users[2].id}, 'Politikacı test post - Siyasi sosyal medya platformu hazır!', 'text', 'gundem')
    `;
    console.log('✅ 3 post eklendi\n');

    // Show final stats
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM parties) as party_count,
        (SELECT COUNT(*) FROM posts) as post_count
    `;
    
    console.log('🎉 Test seed tamamlandı!\n');
    console.log('📊 Veritabanı Durumu:');
    console.log(`   - Kullanıcılar: ${stats[0].user_count}`);
    console.log(`   - Partiler: ${stats[0].party_count}`);
    console.log(`   - Postlar: ${stats[0].post_count}\n`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

testSeed();
