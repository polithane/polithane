import dotenv from 'dotenv';
import { sql } from '../db.js';

dotenv.config();
console.log('🌱 Full seed başlatılıyor - Gerçekçi test verileri ekleniyor...\n');

async function fullSeed() {
  try {
    // 1. TÜM PARTİLERİ EKLE
    console.log('🏛️  15 parti ekleniyor...');
    const partyData = [
      ['Adalet ve Kalkınma Partisi', 'AK PARTİ', 'ak-parti', 272, '#F39200'],
      ['Cumhuriyet Halk Partisi', 'CHP', 'chp', 138, '#ED1C24'],
      ['Halkların Eşitlik ve Demokrasi Partisi', 'DEM Parti', 'dem-parti', 56, '#8B008B'],
      ['Milliyetçi Hareket Partisi', 'MHP', 'mhp', 47, '#C41E3A'],
      ['İYİ Parti', 'İYİ PARTİ', 'iyi-parti', 38, '#0969A3'],
      ['Yeniden Refah Partisi', 'YRP', 'yrp', 5, '#006633'],
      ['Türkiye İşçi Partisi', 'TİP', 'tip', 4, '#E30A17'],
      ['Saadet Partisi', 'SP', 'sp', 0, '#006400'],
      ['Demokrat Parti', 'DP', 'dp', 0, '#FF4500'],
      ['Vatan Partisi', 'VP', 'vp', 0, '#C41E3A'],
      ['Zafer Partisi', 'ZP', 'zp', 0, '#00205B'],
      ['Büyük Birlik Partisi', 'BBP', 'bbp', 0, '#C00000'],
      ['Memleket Partisi', 'MP', 'mp', 0, '#0047AB'],
      ['Anavatan Partisi', 'ANAP', 'anap', 0, '#FFA500'],
      ['Gelecek Partisi', 'GP', 'gp', 0, '#0066CC']
    ];

    for (const [name, short, slug, seats, color] of partyData) {
      await sql`
        INSERT INTO parties (name, short_name, slug, parliament_seats, color, is_active)
        VALUES (${name}, ${short}, ${slug}, ${seats}, ${color}, true)
      `.catch(e => {
        // Ignore duplicate errors
        if (!e.message.includes('duplicate')) {
          throw e;
        }
      });
    }
    console.log('✅ 15 parti eklendi\n');

    // Get parties
    const parties = await sql`SELECT id, name, short_name FROM parties ORDER BY parliament_seats DESC LIMIT 15`;
    console.log(`   Partiler: ${parties.map(p => p.short_name).join(', ')}`);

    // 2. KULLANICILAR EKLE (50 kullanıcı - çeşitli tipler)
    console.log('\n👥 50 kullanıcı ekleniyor...');
    
    const userTypes = [
      { type: 'politician', count: 20, verified: true, prefix: 'siyasetci' },
      { type: 'media', count: 10, verified: true, prefix: 'medya' },
      { type: 'normal', count: 20, verified: false, prefix: 'vatandas' }
    ];

    let userCount = 0;
    for (const { type, count, verified, prefix } of userTypes) {
      for (let i = 1; i <= count; i++) {
        userCount++;
        const partyId = type === 'politician' ? parties[Math.floor(Math.random() * 8)].id : null;
        const username = prefix + '_' + i;
        const email = prefix + i + '@polithane.com';
        const fullName = prefix.charAt(0).toUpperCase() + prefix.slice(1) + ' ' + i;
        
        await sql`
          INSERT INTO users (username, email, password_hash, full_name, user_type, is_verified, party_id, avatar_url)
          VALUES (
            ${username}, 
            ${email}, 
            ${'dummy_hash_' + i},
            ${fullName},
            ${type},
            ${verified},
            ${partyId}::uuid,
            '/assets/profiles/default/avatar.png'
          )
        `.catch(e => {
          // Ignore duplicate username errors
          if (!e.message.includes('duplicate') && !e.message.includes('unique')) {
            console.log('User insert error:', e.message);
          }
        });
      }
    }
    console.log(`✅ ${userCount} kullanıcı eklendi\n`);

    // Get users
    const users = await sql`SELECT id, username, user_type, party_id FROM users ORDER BY created_at DESC LIMIT 50`;
    console.log(`   Kullanıcılar: ${users.length} adet`);

    // 3. POSTLAR EKLE (100 post - çeşitli kategoriler)
    console.log('\n📝 100 post ekleniyor...');
    
    const categories = ['haber', 'duyuru', 'gundem', 'tartisma', 'soru', 'anket'];
    const contentTemplates = [
      'Ekonomi politikalarımız hakkında önemli açıklamalar yapıldı.',
      'Eğitim sisteminde yeni düzenlemeler gündemde.',
      'Dış politika konusunda kritik gelişmeler yaşanıyor.',
      'Sağlık hizmetlerinde iyileştirmeler planlanıyor.',
      'Tarım sektörü için destek paketi açıklandı.',
      'Gençlik istihdamı konusunda yeni projeler devreye giriyor.',
      'Kadın hakları konusunda önemli adımlar atılıyor.',
      'Çevre koruma politikaları güçlendiriliyor.',
      'Yerel yönetimler için yeni düzenlemeler yapılıyor.',
      'Enerji politikası konusunda stratejik kararlar alındı.',
      'Vergi reformu çalışmaları tamamlanıyor.',
      'Adalet sisteminde köklü değişiklikler planlanıyor.',
      'Ulaşım altyapısı projeleri hızlandırılıyor.',
      'Sosyal yardımlar artırılıyor.',
      'İklim değişikliği ile mücadele stratejisi belirlendi.'
    ];

    let postCount = 0;
    for (let i = 0; i < 100; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const content = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];
      const politScore = Math.floor(Math.random() * 50000);
      const viewCount = Math.floor(Math.random() * 100000);
      const likeCount = Math.floor(Math.random() * 5000);
      
      await sql`
        INSERT INTO posts (user_id, party_id, content, content_type, category, polit_score, view_count)
        VALUES (
          ${user.id},
          ${user.party_id},
          ${content + ' #post' + (i+1)},
          'text',
          ${category},
          ${politScore},
          ${viewCount}
        )
      `;
      
      // Add some likes
      if (likeCount > 0) {
        const postId = (await sql`SELECT id FROM posts ORDER BY created_at DESC LIMIT 1`)[0].id;
        for (let j = 0; j < Math.min(likeCount / 100, 10); j++) {
          const randomUser = users[Math.floor(Math.random() * users.length)];
          await sql`
            INSERT INTO likes (user_id, post_id)
            VALUES (${randomUser.id}, ${postId})
            ON CONFLICT (user_id, post_id) DO NOTHING
          `;
        }
      }
      
      postCount++;
    }
    console.log(`✅ ${postCount} post eklendi\n`);

    // 4. GÜNDEMLER EKLE
    console.log('\n📰 10 gündem ekleniyor...');
    const agendaTopics = [
      { title: 'Ekonomi Paketi', slug: 'ekonomi-paketi', desc: 'Yeni ekonomi paketi görüşmeleri' },
      { title: 'Eğitim Reformu', slug: 'egitim-reformu', desc: 'Eğitim sisteminde köklü değişiklikler' },
      { title: 'Sağlık Hizmetleri', slug: 'saglik-hizmetleri', desc: 'Sağlık sisteminde iyileştirmeler' },
      { title: 'Dış Politika', slug: 'dis-politika', desc: 'Uluslararası ilişkilerde gelişmeler' },
      { title: 'Çevre Koruma', slug: 'cevre-koruma', desc: 'Çevre politikaları ve iklim değişikliği' },
      { title: 'Yerel Seçimler', slug: 'yerel-secimler', desc: 'Yaklaşan yerel seçim hazırlıkları' },
      { title: 'Adalet Reformu', slug: 'adalet-reformu', desc: 'Yargı sisteminde değişiklikler' },
      { title: 'Tarım Politikaları', slug: 'tarim-politikalari', desc: 'Çiftçi destekleri ve tarım' },
      { title: 'Enerji Stratejisi', slug: 'enerji-stratejisi', desc: 'Yenilenebilir enerji yatırımları' },
      { title: 'Gençlik İstihdamı', slug: 'genclik-istihdami', desc: 'Genç istihdamı için projeler' }
    ];

    for (const agenda of agendaTopics) {
      await sql`
        INSERT INTO agendas (title, slug, description, is_trending)
        VALUES (${agenda.title}, ${agenda.slug}, ${agenda.desc}, true)
      `.catch(e => {
        // Ignore duplicate errors
        if (!e.message.includes('duplicate')) {
          throw e;
        }
      });
    }
    console.log('✅ 10 gündem eklendi\n');

    // 5. FOLLOW İLİŞKİLERİ EKLE
    console.log('\n🔗 Takip ilişkileri ekleniyor...');
    let followCount = 0;
    for (let i = 0; i < 200; i++) {
      const follower = users[Math.floor(Math.random() * users.length)];
      const followed = users[Math.floor(Math.random() * users.length)];
      
      if (follower.id !== followed.id) {
        await sql`
          INSERT INTO follows (follower_id, followed_id, followed_type)
          VALUES (${follower.id}, ${followed.id}, 'user')
          ON CONFLICT (follower_id, followed_id, followed_type) DO NOTHING
        `;
        followCount++;
      }
    }
    console.log(`✅ ${followCount} takip ilişkisi eklendi\n`);

    // 6. YORUMLAR EKLE
    console.log('\n💬 Yorumlar ekleniyor...');
    const posts = await sql`SELECT id FROM posts LIMIT 50`;
    const commentTemplates = [
      'Çok doğru bir yaklaşım!',
      'Bu konuda daha fazla çalışma yapılmalı.',
      'Katılıyorum, önemli bir adım.',
      'Detaylı bilgi verebilir misiniz?',
      'Harika bir gelişme!',
      'Bu konuda endişelerim var.',
      'Tebrik ederim!',
      'Daha fazla açıklama bekliyoruz.'
    ];

    let commentCount = 0;
    for (const post of posts) {
      const numComments = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numComments; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const comment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
        
        await sql`
          INSERT INTO comments (post_id, user_id, content)
          VALUES (${post.id}, ${user.id}, ${comment})
        `;
        commentCount++;
      }
    }
    console.log(`✅ ${commentCount} yorum eklendi\n`);

    // İSTATİSTİKLER
    console.log('\n📊 SEED İSTATİSTİKLERİ:');
    console.log('='.repeat(50));
    
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM parties) as party_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM posts) as post_count,
        (SELECT COUNT(*) FROM agendas) as agenda_count,
        (SELECT COUNT(*) FROM follows) as follow_count,
        (SELECT COUNT(*) FROM comments) as comment_count,
        (SELECT COUNT(*) FROM likes) as like_count
    `;

    console.log(`✅ Partiler: ${stats[0].party_count}`);
    console.log(`✅ Kullanıcılar: ${stats[0].user_count}`);
    console.log(`✅ Postlar: ${stats[0].post_count}`);
    console.log(`✅ Gündemler: ${stats[0].agenda_count}`);
    console.log(`✅ Takipler: ${stats[0].follow_count}`);
    console.log(`✅ Yorumlar: ${stats[0].comment_count}`);
    console.log(`✅ Beğeniler: ${stats[0].like_count}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Full seed tamamlandı! Veritabanı gerçekçi verilerle dolu.\n');

  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
}

fullSeed();
