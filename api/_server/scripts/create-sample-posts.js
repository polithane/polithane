import { sql } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const samplePosts = [
  {
    content: 'Türkiye\'nin geleceği için birlikte çalışmaya devam edeceğiz. Halkımızın sorunlarını dinlemek ve çözüm üretmek en büyük sorumluluğumuz.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Bugün mecliste önemli bir yasa tasarısı görüşüldü. Vatandaşlarımızın yaşam kalitesini artıracak düzenlemeler üzerinde çalışıyoruz.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Seçim bölgemde vatandaşlarımızla bir araya geldim. Sorunları dinledik, çözüm önerilerimizi paylaştık. Milletin sesi olmak için buradayız!',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Eğitim sistemimizin iyileştirilmesi için kapsamlı bir çalışma başlattık. Geleceğimiz olan çocuklarımız için en iyi eğitimi sağlamalıyız.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Sağlık politikalarımız halkın yararına olmaya devam edecek. Herkes kaliteli sağlık hizmetine erişebilmeli.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Ekonomik büyüme ve istihdam konularında önemli adımlar atıyoruz. İşsizlik oranlarını düşürmek önceliklerimiz arasında.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Yerel yönetimler olarak vatandaşlarımıza daha iyi hizmet sunmak için çalışıyoruz. Şeffaflık ve hesap verebilirlik ilkelerimizdir.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Adalet sisteminin güçlendirilmesi için gereken tüm tedbirleri alacağız. Hukuk devleti ilkesi vazgeçilmezimizdir.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Çevre koruma politikalarımız gelecek nesillere yaşanabilir bir dünya bırakmak için hayati önem taşıyor.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Kadın hakları ve toplumsal cinsiyet eşitliği konusunda mücadelemiz kararlılıkla sürüyor. Eşit haklar, eşit fırsatlar!',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Gençlerimizin ülke yönetimine katılımını artırmak için yeni projeler geliştiriyoruz. Gelecek onların!',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Tarım politikalarımız çiftçilerimizi desteklemeye ve gıda güvenliğimizi sağlamaya odaklanıyor.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Ulaşım ve altyapı yatırımlarımız ile şehirlerimizi daha yaşanabilir hale getiriyoruz.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Kültür ve sanat etkinliklerine verdiğimiz destekle toplumsal gelişime katkı sağlıyoruz.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Dış politikada barış ve işbirliğinden yanayız. Komşularımızla iyi ilişkiler önceliğimiz.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Teknoloji ve inovasyon yatırımlarıyla ülkemizi geleceğe taşıyoruz. Dijital dönüşüm kaçınılmaz!',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Sosyal güvenlik sistemimizi güçlendirerek tüm vatandaşlarımızın güvenceli bir yaşam sürmesini sağlayacağız.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Engelli vatandaşlarımızın toplumsal yaşama tam katılımı için gerekli düzenlemeleri yapıyoruz.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Göç politikalarımız insani değerlere ve uluslararası normlara uygun şekilde yürütülmektedir.',
    category: 'general',
    content_type: 'text'
  },
  {
    content: 'Enerji bağımsızlığı için yenilenebilir enerji kaynaklarına yatırım yapıyoruz. Temiz enerji geleceğimizdir!',
    category: 'general',
    content_type: 'text'
  }
];

async function createSamplePosts() {
  console.log('🚀 Creating sample posts...');
  
  try {
    // Get random users from database
    const users = await sql`
      SELECT id 
      FROM users 
      WHERE user_type IN ('politician', 'party_official', 'media', 'ex_politician')
      ORDER BY RANDOM()
      LIMIT 50
    `;
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
    console.log(`✅ Found ${users.length} users`);
    
    // Extend samplePosts to 50 by cycling through
    const extendedPosts = [];
    while (extendedPosts.length < 50) {
      extendedPosts.push(...samplePosts.slice(0, Math.min(samplePosts.length, 50 - extendedPosts.length)));
    }
    
    // Create posts
    for (let i = 0; i < extendedPosts.length && i < users.length; i++) {
      const post = extendedPosts[i];
      const user = users[i];
      
      await sql`
        INSERT INTO posts (
          user_id,
          content,
          category,
          content_type,
          view_count,
          like_count,
          comment_count
        )
        VALUES (
          ${user.id},
          ${post.content},
          ${post.category},
          ${post.content_type},
          ${Math.floor(Math.random() * 1000) + 100},
          ${Math.floor(Math.random() * 50) + 5},
          ${Math.floor(Math.random() * 20)}
        )
      `;
      
      console.log(`✅ Created post ${i + 1}/${extendedPosts.length}`);
    }
    
    console.log('🎉 Sample posts created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample posts:', error);
    process.exit(1);
  }
}

createSamplePosts();
