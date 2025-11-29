import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

// Türk isimleri
const turkishNames = {
  first: ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Ali', 'Veli', 'Zeynep', 'Elif', 'Hasan', 'Hüseyin', 'Emine', 'Hatice', 'Mustafa', 'Osman', 'İbrahim', 'Yusuf', 'Meryem', 'Ramazan', 'Abdullah', 'Ömer', 'Emir', 'Yağmur', 'Asya', 'Ece', 'Deniz', 'Burak', 'Cem', 'Can', 'Selin', 'Defne'],
  last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Erdoğan', 'Güneş', 'Korkmaz', 'Aksoy', 'Taş', 'Bulut', 'Güler', 'Aktaş', 'Güven']
};

// Medya kuruluşları
const mediaOrganizations = [
  'CNN Türk', 'NTV', 'Haber Global', 'Habertürk', 'TRT Haber', 'A Haber', 'Show TV', 
  'Fox TV', 'Kanal D', 'TV8', 'Sözcü', 'Cumhuriyet', 'Hürriyet', 'Milliyet', 'Sabah',
  'Anadolu Ajansı', 'DHA', 'Bloomberg HT', 'TGRT Haber', 'Ulusal Kanal', 'Türkiye Gazetesi',
  'Star TV', 'ATV', 'Kanal 7', 'TV5', 'Flash TV', 'Ülke TV', 'Tele 1', 'KRT', 'Halk TV'
];

// Şehirler
const cities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 
  'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Samsun', 'Trabzon', 'Malatya'
];

// Random şifre oluştur
const generatePassword = () => {
  return 'Polithane2024!'; // Tüm otomatik profiller için standart şifre
};

// Random bio oluştur
const generateBio = (type, organization = null) => {
  const bios = {
    media: [
      `${organization} muhabiri. Türkiye gündemini yakından takip ediyorum.`,
      `${organization} haber editörü. Güncel siyasi gelişmeleri analiz ediyorum.`,
      `${organization} köşe yazarı. Siyaset ve ekonomi üzerine yazıyorum.`,
      `${organization} televizyon yorumcusu. Gündemi takip edin.`,
      `${organization} gazetecisi. Doğru haber için burdayım.`
    ],
    citizen: [
      'Aktif vatandaş. Ülke geleceği için sesimi yükseltiyorum.',
      'Demokratik hakları savunan bir birey. Herkese eşit mesafe.',
      'Türkiye\'nin geleceği için duyarlı bir vatandaş.',
      'Siyaseti takip eden, fikir üreten bir yurttaş.',
      'Demokrasi ve adalet için mücadele eden vatandaş.'
    ],
    retired: [
      'Eski milletvekili. Artık gözlemci olarak devam ediyorum.',
      'Emekli siyasetçi. Deneyimlerimi paylaşıyorum.',
      'Siyasetten emekli oldum ama takipten değil.',
      'Eski belediye başkanı. Şimdi sadece izliyorum.',
      'Siyasi geçmişi olan, artık gözlemci bir vatandaş.'
    ]
  };
  
  const options = bios[type];
  return options[Math.floor(Math.random() * options.length)];
};

// Profil oluştur
async function createProfile(type, index) {
  const firstName = turkishNames.first[Math.floor(Math.random() * turkishNames.first.length)];
  const lastName = turkishNames.last[Math.floor(Math.random() * turkishNames.last.length)];
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${type}_${index}`;
  const email = `${username}@polithane-auto.com`;
  const hashedPassword = await bcrypt.hash(generatePassword(), 10);
  
  let bio, userType, city;
  
  if (type === 'media') {
    const org = mediaOrganizations[Math.floor(Math.random() * mediaOrganizations.length)];
    bio = generateBio('media', org);
    userType = 'media';
    city = cities[Math.floor(Math.random() * cities.length)];
  } else if (type === 'citizen') {
    bio = generateBio('citizen');
    userType = 'citizen';
    city = cities[Math.floor(Math.random() * cities.length)];
  } else if (type === 'retired') {
    bio = generateBio('retired');
    userType = 'former_politician';
    city = cities[Math.floor(Math.random() * cities.length)];
  }
  
  return {
    username,
    email,
    password_hash: hashedPassword,
    full_name: `${firstName} ${lastName}`,
    bio,
    user_type: userType,
    profile_image: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&size=200`,
    is_verified: false,
    is_email_verified: true,
    is_automated: true,
    polit_score: Math.floor(Math.random() * 5000) + 100,
    post_count: 0,
    location: city,
    created_at: new Date()
  };
}

// Postlar için içerik şablonları
const postTemplates = {
  text: [
    'Bugünkü mecliste yaşanan gelişmeler dikkat çekiciydi. Sizce ne düşünüyorsunuz?',
    'Ekonomide son dönemde yaşanan değişimler hepimizi ilgilendiriyor.',
    'Yerel yönetimlerin başarılı projelerini takip etmek önemli.',
    'Demokrasi sadece seçim günü değil, her gün yaşanmalı.',
    'Gençlerin siyasete ilgisi artıyor, bu çok önemli.',
    'Eğitim politikalarında reform şart, bunu görmezden gelemeyiz.'
  ],
  image: [
    'Bugünkü toplantıdan bir kare',
    'Yerel halkla bir araya geldik',
    'Basın toplantısından görüntüler',
    'Önemli bir ziyaret gerçekleştirdik',
    'Projelerimizi anlattık'
  ],
  video: [
    'Önemli açıklamalar yaptık, izlemeyi unutmayın',
    'Canlı yayında sorularınızı yanıtladık',
    'Röportajımızdan kesitler',
    'Toplantıdan önemli anlar',
    'Halka hesap vermenin önemini vurguluyoruz'
  ],
  audio: [
    'Radyo programından kesitler',
    'Podcast\'imizin yeni bölümü',
    'Önemli konuşmadan ses kaydı',
    'Analizlerimizi dinleyin',
    'Röportajdan ses kaydı'
  ]
};

// Random post içeriği oluştur
function generatePostContent(type) {
  const templates = postTemplates[type];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Her profil için postlar oluştur
async function createPostsForUser(userId, username, count = 5) {
  const postTypes = ['text', 'image', 'video', 'audio'];
  const posts = [];
  
  for (let i = 0; i < count; i++) {
    const postType = postTypes[Math.floor(Math.random() * postTypes.length)];
    const content = generatePostContent(postType);
    
    let mediaUrl = null;
    let mediaType = null;
    
    if (postType === 'image') {
      mediaUrl = `https://picsum.photos/seed/${userId}-${i}/800/600`;
      mediaType = 'image';
    } else if (postType === 'video') {
      mediaUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`;
      mediaType = 'video';
    } else if (postType === 'audio') {
      mediaUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 16) + 1}.mp3`;
      mediaType = 'audio';
    }
    
    const post = {
      user_id: userId,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      category: ['politics', 'economy', 'society', 'education'][Math.floor(Math.random() * 4)],
      visibility: 'public',
      likes_count: Math.floor(Math.random() * 500),
      comments_count: Math.floor(Math.random() * 50),
      shares_count: Math.floor(Math.random() * 100),
      views_count: Math.floor(Math.random() * 2000),
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Son 30 gün içinde
    };
    
    posts.push(post);
  }
  
  return posts;
}

// Ana fonksiyon
async function seedDiverseProfiles() {
  try {
    console.log('🚀 Creating diverse profiles and posts...\n');
    
    let totalUsers = 0;
    let totalPosts = 0;
    
    // MEDYA PROFİLLERİ
    console.log('📰 Creating 30 media profiles...');
    for (let i = 1; i <= 30; i++) {
      const profile = await createProfile('media', i);
      
      const [user] = await sql`
        INSERT INTO users ${sql(profile)}
        ON CONFLICT (username) DO UPDATE SET
          is_automated = true,
          bio = ${profile.bio}
        RETURNING id, username
      `;
      
      if (user) {
        totalUsers++;
        
        // Her medya profili için 3-7 post oluştur
        const postCount = Math.floor(Math.random() * 5) + 3;
        const posts = await createPostsForUser(user.id, user.username, postCount);
        
        for (const post of posts) {
          await sql`INSERT INTO posts ${sql(post)}`;
          totalPosts++;
        }
        
        await sql`UPDATE users SET post_count = ${postCount} WHERE id = ${user.id}`;
        
        if (i % 10 === 0) console.log(`   ✓ ${i}/30 medya profili oluşturuldu`);
      }
    }
    
    // VATANDAŞ PROFİLLERİ
    console.log('\n👥 Creating 30 citizen profiles...');
    for (let i = 1; i <= 30; i++) {
      const profile = await createProfile('citizen', i);
      
      const [user] = await sql`
        INSERT INTO users ${sql(profile)}
        ON CONFLICT (username) DO UPDATE SET
          is_automated = true,
          bio = ${profile.bio}
        RETURNING id, username
      `;
      
      if (user) {
        totalUsers++;
        
        // Her vatandaş profili için 2-5 post oluştur
        const postCount = Math.floor(Math.random() * 4) + 2;
        const posts = await createPostsForUser(user.id, user.username, postCount);
        
        for (const post of posts) {
          await sql`INSERT INTO posts ${sql(post)}`;
          totalPosts++;
        }
        
        await sql`UPDATE users SET post_count = ${postCount} WHERE id = ${user.id}`;
        
        if (i % 10 === 0) console.log(`   ✓ ${i}/30 vatandaş profili oluşturuldu`);
      }
    }
    
    // ESKİ SİYASETÇİ PROFİLLERİ
    console.log('\n🎓 Creating 30 retired politician profiles...');
    for (let i = 1; i <= 30; i++) {
      const profile = await createProfile('retired', i);
      
      const [user] = await sql`
        INSERT INTO users ${sql(profile)}
        ON CONFLICT (username) DO UPDATE SET
          is_automated = true,
          bio = ${profile.bio}
        RETURNING id, username
      `;
      
      if (user) {
        totalUsers++;
        
        // Her eski siyasetçi profili için 3-6 post oluştur
        const postCount = Math.floor(Math.random() * 4) + 3;
        const posts = await createPostsForUser(user.id, user.username, postCount);
        
        for (const post of posts) {
          await sql`INSERT INTO posts ${sql(post)}`;
          totalPosts++;
        }
        
        await sql`UPDATE users SET post_count = ${postCount} WHERE id = ${user.id}`;
        
        if (i % 10 === 0) console.log(`   ✓ ${i}/30 eski siyasetçi profili oluşturuldu`);
      }
    }
    
    console.log('\n✅ BAŞARILI!');
    console.log(`   📊 Toplam ${totalUsers} profil oluşturuldu`);
    console.log(`   📝 Toplam ${totalPosts} post oluşturuldu`);
    console.log(`   🎯 Tüm profiller is_automated=true olarak işaretlendi`);
    console.log('\n💡 Tüm otomatik profiller için şifre: Polithane2024!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
    console.error('Error details:', error.message);
  }
}

seedDiverseProfiles();
