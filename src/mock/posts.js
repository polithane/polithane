// Mock post verileri
import { mockUsers } from './users.js';
import { mockParties } from './parties.js';
import { getPostMediaPath, getHeroImagePath } from '../utils/imagePaths.js';

// Normalize helpers: Supabase gerçek verisini mock formatına yaklaştır
const normalizeParty = (p) => {
  if (!p) return null;
  return {
    ...p,
    party_id: p.party_id ?? p.id,
    party_name: p.party_name ?? p.name,
    party_short_name: p.party_short_name ?? p.short_name,
    party_logo: p.party_logo ?? p.logo_url,
    party_flag: p.party_flag ?? p.flag_url,
    party_color: p.party_color ?? p.color,
    parliament_seats: p.parliament_seats ?? p.parliament_seats ?? 0,
    mp_count: p.mp_count ?? 0,
    organization_count: p.organization_count ?? 0,
    member_count: p.member_count ?? 0
  };
};

const normalizeUser = (u, parties = []) => {
  if (!u) return null;
  const user_id = u.user_id ?? u.id;
  const party_id = u.party_id ?? null;
  const party = party_id ? parties.find((p) => (p.party_id ?? p.id) === party_id) : null;
  return {
    ...u,
    user_id,
    party_id,
    // UI tarafında kullanılan alan isimleri
    verification_badge: u.verification_badge ?? u.is_verified ?? false,
    profile_image: u.profile_image ?? u.avatar_url,
    party
  };
};

// Mock posts - user referansları generateMockPosts içinde doldurulacak
export const mockPosts = [
  {
    post_id: 1,
    user_id: 1,
    content_type: 'text',
    content_text: 'Ekonomi konusunda yeni açıklamalarımızı yarın yapacağız. Halkımızın refahı için çalışmaya devam ediyoruz. Şeffaflık ve hesap verebilirlik ilkelerimizden taviz vermeden ilerliyoruz.',
    source_url: 'https://www.sozcu.com.tr/',
    agenda_tag: 'Ekonomi paketi görüşmeleri',
    polit_score: 15420,
    view_count: 125000,
    like_count: 8500,
    dislike_count: 1200,
    comment_count: 450,
    is_featured: true,
    created_at: '2025-11-15T10:30:00Z'
  },
  {
    post_id: 2,
    user_id: 2,
    content_type: 'video',
    content_text: 'Gençlerimizle buluşmamızdan kareler',
    media_url: getPostMediaPath('video', 2, false),
    thumbnail_url: getPostMediaPath('video', 2, true),
    media_duration: 180,
    source_url: 'https://twitter.com/RTErdogan',
    agenda_tag: 'Gençlik istihdam programları',
    polit_score: 42300,
    view_count: 850000,
    like_count: 45000,
    dislike_count: 3200,
    comment_count: 2100,
    is_featured: true,
    created_at: '2025-11-15T09:15:00Z'
  },
  {
    post_id: 3,
    user_id: Math.min(10, mockUsers.length),
    content_type: 'image',
    content_text: 'İstanbul\'da yaptığımız çalışma ziyaretinden görüntüler - 2 FOTO',
    media_url: [
      getPostMediaPath('image', 301),
      getPostMediaPath('image', 302)
    ],
    source_url: 'https://www.cumhuriyet.com.tr/',
    agenda_tag: 'Belediyelere yapılan operasyonlar',
    polit_score: 3200,
    view_count: 15000,
    like_count: 850,
    dislike_count: 45,
    comment_count: 120,
    is_featured: false,
    created_at: '2025-11-14T16:20:00Z'
  },
  {
    post_id: 4,
    user_id: Math.min(15, mockUsers.length),
    content_type: 'image',
    content_text: 'Meclis oturumundan önemli anlar - 4 FOTO',
    media_url: [
      getPostMediaPath('image', 401),
      getPostMediaPath('image', 402),
      getPostMediaPath('image', 403),
      getPostMediaPath('image', 404)
    ],
    agenda_tag: 'Ekonomi paketi görüşmeleri',
    polit_score: 2100,
    view_count: 8500,
    like_count: 320,
    dislike_count: 15,
    comment_count: 45,
    is_featured: false,
    created_at: '2025-11-14T14:10:00Z'
  },
  {
    post_id: 5,
    user_id: mockUsers.length > 0 ? mockUsers[mockUsers.length - 1]?.user_id || 1 : 1,
    content_type: 'image',
    content_text: 'Etkinlik fotoğrafları - 7 FOTO',
    media_url: [
      getPostMediaPath('image', 501),
      getPostMediaPath('image', 502),
      getPostMediaPath('image', 503),
      getPostMediaPath('image', 504),
      getPostMediaPath('image', 505),
      getPostMediaPath('image', 506),
      getPostMediaPath('image', 507)
    ],
    agenda_tag: 'Ekonomi paketi görüşmeleri',
    polit_score: 450,
    view_count: 1200,
    like_count: 85,
    dislike_count: 12,
    comment_count: 23,
    is_featured: false,
    created_at: '2025-11-14T11:30:00Z'
  },
  {
    post_id: 6,
    user_id: Math.min(5, mockUsers.length),
    content_type: 'text',
    content_text: 'Milliyetçi Hareket Partisi olarak ülkemizin güvenliği ve refahı için çalışmaya devam ediyoruz.',
    agenda_tag: 'Belediyelere yapılan operasyonlar',
    polit_score: 8900,
    view_count: 45000,
    like_count: 3200,
    dislike_count: 450,
    comment_count: 280,
    is_featured: true,
    created_at: '2025-11-13T18:45:00Z'
  },
  {
    post_id: 7,
    user_id: Math.min(20, mockUsers.length),
    content_type: 'image',
    content_text: 'Parti etkinliğimizden kareler - 3 FOTO',
    media_url: [
      getPostMediaPath('image', 701),
      getPostMediaPath('image', 702),
      getPostMediaPath('image', 703)
    ],
    agenda_tag: 'Ak Parti - MHP resepsiyon tartışması',
    polit_score: 650,
    view_count: 2500,
    like_count: 180,
    dislike_count: 8,
    comment_count: 35,
    is_featured: false,
    created_at: '2025-11-13T15:20:00Z'
  },
  {
    post_id: 8,
    user_id: Math.min(25, mockUsers.length),
    content_type: 'text',
    content_text: 'Eski bir milletvekili olarak deneyimlerimi paylaşmak istiyorum. Siyaset dünyası hakkında düşüncelerim...',
    agenda_tag: 'Ekrem İmamoğlu iddanamesi',
    polit_score: 1200,
    view_count: 3500,
    like_count: 250,
    dislike_count: 15,
    comment_count: 45,
    is_featured: false,
    created_at: '2025-11-12T20:10:00Z'
  },
  {
    post_id: 9,
    user_id: Math.min(3, mockUsers.length),
    content_type: 'video',
    content_text: 'Genel Başkan olarak yaptığım açıklama',
    media_url: getPostMediaPath('video', 9, false),
    thumbnail_url: getPostMediaPath('video', 9, true),
    media_duration: 240,
    agenda_tag: 'Ak Parti - MHP resepsiyon tartışması',
    polit_score: 18900,
    view_count: 95000,
    like_count: 7200,
    dislike_count: 850,
    comment_count: 520,
    is_featured: true,
    created_at: '2025-11-12T12:00:00Z'
  },
  {
    post_id: 10,
    user_id: Math.min(30, mockUsers.length),
    content_type: 'text',
    content_text: 'Eğitim sistemimiz hakkında görüşlerim var. Çocuklarımızın geleceği için daha iyi bir eğitim sistemi gerekiyor.',
    agenda_tag: 'Eğitim sistemi reformu',
    polit_score: 380,
    view_count: 980,
    like_count: 65,
    dislike_count: 5,
    comment_count: 18,
    is_featured: false,
    created_at: '2025-11-11T09:15:00Z'
  }
];

// Daha fazla post için helper - her kategori için 20 örnek oluştur
export const generateMockPosts = (count = 90, users = mockUsers, parties = mockParties) => {
  const normalizedParties = (parties || []).map(normalizeParty).filter(Boolean);
  const normalizedUsers = (users || []).map((u) => normalizeUser(u, normalizedParties)).filter(Boolean);

  const contentTypes = ['text', 'image', 'video', 'audio'];
  const agendas = [
    'Kumpir yiyip ölen turistler',
    '2026 Emekli Zam Oranı',
    'Ekrem İmamoğlu iddanamesi',
    'Ak Parti - MHP resepsiyon tartışması',
    'Belediyelere yapılan operasyonlar',
    'Ekonomi paketi görüşmeleri',
    'Eğitim sistemi reformu',
    'Dış politika açıklamaları',
    'Sağlık sistemi iyileştirmeleri',
    'Gençlik istihdam programları'
  ];
  const sampleTexts = [
    'Bugün önemli bir açıklama yapacağız.',
    'Halkımızla birlikte çalışmaya devam ediyoruz.',
    'Yeni projelerimiz hakkında bilgi paylaşımı.',
    'Etkinliklerimizden görüntüler.',
    'Görüş ve önerilerinizi bekliyoruz.',
    'Ülkemizin geleceği için çalışıyoruz.',
    'Şeffaflık ve hesap verebilirlik ilkelerimizden taviz vermiyoruz.',
    'Gençlerimizle buluşmalarımız devam ediyor.',
    'Yerel yönetimlerle işbirliği içindeyiz.',
    'Vatandaşlarımızın sorunlarını çözmek için çalışıyoruz.'
  ];
  
  // İlk 10 post'u mockPosts'tan al ve user referanslarını doldur
  const initialPosts = mockPosts.map(post => {
    // user_id'yi doğru şekilde bul
    let user = normalizedUsers.find(u => u.user_id === post.user_id);
    // Eğer bulunamazsa, geçerli bir user seç
    if (!user) {
      // Milletvekili kullanıcılarından birini seç
      const mpUsers = normalizedUsers.filter(u => u.user_type === 'politician' && u.politician_type === 'mp');
      user = mpUsers.length > 0 ? mpUsers[Math.floor(Math.random() * mpUsers.length)] : users[0] || null;
    }
    if (!user) {
      // Fallback: boş bir user objesi
      return {
        ...post,
        user: null
      };
    }
    return {
      ...post,
      user: {
        ...user,
        party: user.party_id ? normalizedParties.find(p => p.party_id === user.party_id) : null
      }
    };
  });
  
  const posts = [...initialPosts];
  
  for (let i = 11; i <= count; i++) {
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    // Teşkilat üyelerini de dahil et
    const availableUsers = normalizedUsers.filter(u => 
      u.user_type === 'politician' && 
      (u.politician_type === 'provincial_chair' ||
       u.politician_type === 'district_chair' ||
       u.politician_type === 'myk_member' ||
       u.politician_type === 'vice_chair' ||
       u.politician_type === 'other' ||
       u.politician_type === 'mp' ||
       u.politician_type === 'party_chair') ||
      u.user_type === 'normal' ||
      u.user_type === 'ex_politician' ||
      u.user_type === 'media'
    );
    const user = availableUsers.length > 0 
      ? availableUsers[Math.floor(Math.random() * availableUsers.length)]
      : normalizedUsers[Math.floor(Math.random() * normalizedUsers.length)];
    const agenda = agendas[Math.floor(Math.random() * agendas.length)];
    const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    
    // Kullanıcı tipine göre Polit Puan aralığı belirleme
    let politScoreRange = { min: 100, max: 5000 };
    if (user.user_type === 'politician') {
      if (user.politician_type === 'mp') {
        politScoreRange = { min: 5000, max: 50000 }; // Milletvekilleri: 5K-50K
      } else if (user.politician_type === 'party_chair') {
        politScoreRange = { min: 30000, max: 100000 }; // Parti liderleri: 30K-100K
      } else {
        politScoreRange = { min: 2000, max: 15000 }; // Teşkilat: 2K-15K
      }
    } else if (user.user_type === 'ex_politician') {
      politScoreRange = { min: 8000, max: 40000 }; // Eski siyasetçiler: 8K-40K
    } else if (user.user_type === 'media') {
      politScoreRange = { min: 5000, max: 25000 }; // Medya: 5K-25K
    } else {
      politScoreRange = { min: 100, max: 3000 }; // Vatandaşlar: 100-3K
    }
    
    const post = {
      post_id: i,
      user_id: user.user_id,
      user: {
        ...user,
        party: user.party_id ? normalizedParties.find(p => p.party_id === user.party_id) : null
      },
      content_type: contentType,
      content_text: text,
      agenda_tag: agenda,
      polit_score: Math.floor(Math.random() * (politScoreRange.max - politScoreRange.min)) + politScoreRange.min,
      view_count: Math.floor(Math.random() * 50000) + 100,
      like_count: Math.floor(Math.random() * 5000) + 10,
      dislike_count: Math.floor(Math.random() * 500) + 1,
      comment_count: Math.floor(Math.random() * 500) + 5,
      is_featured: Math.random() > 0.8,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    if (contentType === 'image') {
      // Rastgele 1-6 resim arası
      const imageCount = Math.floor(Math.random() * 6) + 1;
      if (imageCount === 1) {
        post.media_url = getPostMediaPath('image', i);
      } else {
        post.media_url = Array.from({ length: imageCount }, (_, idx) => getPostMediaPath('image', Number(`${i}${idx}`)));
      }
    } else if (contentType === 'video') {
      post.media_url = getPostMediaPath('video', i, false);
      post.thumbnail_url = getPostMediaPath('video', i, true);
      post.media_duration = Math.floor(Math.random() * 300) + 60;
    } else if (contentType === 'audio') {
      post.media_url = getPostMediaPath('audio', i);
      post.media_duration = Math.floor(Math.random() * 600) + 120;
    }
    
    posts.push(post);
  }
  
  return posts;
};

// Her kategori için 10 örnek post oluştur (3 video, 3 resim, 2 yazı, 2 ses)
// Not: Ana sayfayı erken dönemde dengeli doldurmak için sabit dağılım kullanır.
export const getCategoryPosts = (category, allPosts = []) => {
  // Eğer allPosts boşsa, generateMockPosts çağır
  if (!allPosts || allPosts.length === 0) {
    allPosts = generateMockPosts(400);
  }

  const DESIRED_TOTAL = 10;
  const desiredByType = {
    video: 3,
    image: 3,
    text: 2,
    audio: 2
  };

  const typeOrder = ['video', 'image', 'text', 'audio'];

  const createSyntheticPost = ({ baseUser, content_type, post_id }) => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();

    const post = {
      post_id,
      user_id: baseUser?.user_id || baseUser?.id || post_id, // fallback
      user: baseUser || null,
      content_type,
      content_text: '',
      agenda_tag: 'Gündem',
      polit_score: Math.floor(Math.random() * 9000) + 500,
      view_count: Math.floor(Math.random() * 50000) + 100,
      like_count: Math.floor(Math.random() * 5000) + 10,
      dislike_count: Math.floor(Math.random() * 500) + 1,
      comment_count: Math.floor(Math.random() * 500) + 5,
      is_featured: false,
      created_at: createdAt
    };

    if (content_type === 'text') {
      post.content_text = 'Kamuoyuyla paylaşmak isterim: gündeme dair kısa değerlendirmem.';
      return post;
    }

    if (content_type === 'image') {
      post.media_url = getPostMediaPath('image', post_id);
      post.content_text = 'Paylaşımımızdan kareler';
      return post;
    }

    if (content_type === 'video') {
      post.media_url = getPostMediaPath('video', post_id, false);
      post.thumbnail_url = getPostMediaPath('video', post_id, true);
      post.media_duration = Math.floor(Math.random() * 120) + 30;
      post.content_text = 'Kısa video açıklaması';
      return post;
    }

    // audio
    post.media_url = getPostMediaPath('audio', post_id);
    post.media_duration = Math.floor(Math.random() * 180) + 30;
    post.content_text = 'Kısa ses kaydı açıklaması';
    return post;
  };
  const categoryMap = {
    'mps': (p) => p.user?.user_type === 'politician' && p.user?.politician_type === 'mp',
    'organization': (p) => {
      // Teşkilat: politician ama mp veya party_chair değil (belediye başkanları dahil)
      return p.user?.user_type === 'politician' && 
             p.user?.politician_type !== 'mp' && 
             p.user?.politician_type !== 'party_chair' &&
             (p.user?.politician_type === 'provincial_chair' ||
              p.user?.politician_type === 'district_chair' ||
              p.user?.politician_type === 'metropolitan_mayor' ||
              p.user?.politician_type === 'district_mayor' ||
              p.user?.politician_type === 'myk_member' ||
              p.user?.politician_type === 'vice_chair' ||
              p.user?.politician_type === 'other');
    },
    'citizens': (p) => p.user?.user_type === 'normal',
    'experience': (p) => p.user?.user_type === 'ex_politician',
    'media': (p) => p.user?.user_type === 'media'
  };
  
  const filter = categoryMap[category];
  if (!filter) return [];
  
  // Filtreleme ve POLİT PUANA GÖRE SIRALAMA (Büyükten küçüğe)
  const filtered = allPosts
    .filter(filter)
    .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

  // 10'luk sabit dağılım: 3 video, 3 resim, 2 yazı, 2 ses
  const selected = [];
  const usedIds = new Set();

  for (const t of typeOrder) {
    const need = desiredByType[t] || 0;
    if (need <= 0) continue;
    const candidates = filtered.filter((p) => p.content_type === t && !usedIds.has(p.post_id));
    candidates.slice(0, need).forEach((p) => {
      usedIds.add(p.post_id);
      selected.push(p);
    });
  }

  // Eksik kalırsa kalanlardan doldur
  if (selected.length < DESIRED_TOTAL) {
    filtered
      .filter((p) => !usedIds.has(p.post_id))
      .slice(0, DESIRED_TOTAL - selected.length)
      .forEach((p) => {
        usedIds.add(p.post_id);
        selected.push(p);
      });
  }

  // Hala eksikse (nadir): sentetik post üret
  if (selected.length < DESIRED_TOTAL) {
    // Bu kategoriye uygun bir user bul
    const baseUser = filtered.find((p) => p.user)?.user || null;
    let syntheticUser = baseUser;

    if (!syntheticUser) {
      // minimal user fallback (kategori şartlarını sağlayacak)
      const base = {
        user_id: 900000 + Math.floor(Math.random() * 10000),
        username: `auto_${category}_${Date.now().toString().slice(-4)}`,
        full_name: `Otomatik Profil (${category})`,
        verification_badge: true,
        avatar_url: getProfileImagePath('normal', null, null, 900000 + Math.floor(Math.random() * 10000)),
        profile_image: getProfileImagePath('normal', null, null, 900000 + Math.floor(Math.random() * 10000))
      };
      if (category === 'mps') {
        syntheticUser = { ...base, user_type: 'politician', politician_type: 'mp' };
      } else if (category === 'organization') {
        syntheticUser = { ...base, user_type: 'politician', politician_type: 'provincial_chair' };
      } else if (category === 'experience') {
        syntheticUser = { ...base, user_type: 'ex_politician' };
      } else if (category === 'media') {
        syntheticUser = { ...base, user_type: 'media' };
      } else {
        syntheticUser = { ...base, user_type: 'normal' };
      }
    }

    const nextIdBase = 800000 + Math.floor(Math.random() * 10000);
    while (selected.length < DESIRED_TOTAL) {
      // Önce dağılımdaki açıkları tamamla
      const counts = selected.reduce((acc, p) => {
        acc[p.content_type] = (acc[p.content_type] || 0) + 1;
        return acc;
      }, {});

      const missingType = typeOrder.find((t) => (counts[t] || 0) < (desiredByType[t] || 0)) || 'text';
      const post_id = nextIdBase + selected.length;
      const sp = createSyntheticPost({ baseUser: syntheticUser, content_type: missingType, post_id });
      selected.push(sp);
    }
  }

  // Dizilim: önce polit_score önceliği, ama dağılımı bozmayacak şekilde hafif karıştır
  return selected.slice(0, DESIRED_TOTAL);
};
