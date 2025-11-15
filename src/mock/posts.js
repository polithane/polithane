// Mock post verileri
import { mockUsers } from './users.js';
import { mockParties } from './parties.js';
import { getPostMediaPath, getHeroImagePath } from '../utils/imagePaths.js';

export const mockPosts = [
  {
    post_id: 1,
    user_id: 1,
    user: mockUsers[0],
    content_type: 'text',
    content_text: 'Ekonomi konusunda yeni açıklamalarımızı yarın yapacağız. Halkımızın refahı için çalışmaya devam ediyoruz. Şeffaflık ve hesap verebilirlik ilkelerimizden taviz vermeden ilerliyoruz.',
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
    user: mockUsers[1],
    content_type: 'video',
    content_text: 'Gençlerimizle buluşmamızdan kareler',
    media_url: getPostMediaPath('video', 2, false),
    thumbnail_url: getPostMediaPath('video', 2, true),
    media_duration: 180,
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
    user_id: 6,
    user: mockUsers[5],
    content_type: 'image',
    content_text: 'İstanbul\'da yaptığımız çalışma ziyaretinden görüntüler',
    media_url: getPostMediaPath('image', 3),
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
    user_id: 7,
    user: mockUsers[6],
    content_type: 'text',
    content_text: 'Bugün Meclis\'te önemli bir oturum gerçekleşti. Ekonomi paketi görüşmeleri devam ediyor.',
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
    user_id: 5,
    user: mockUsers[4],
    content_type: 'text',
    content_text: 'Vatandaş olarak görüşlerimi paylaşmak istiyorum. Ekonomi konusunda daha fazla şeffaflık bekliyoruz.',
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
    user_id: 3,
    user: mockUsers[2],
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
    user_id: 8,
    user: mockUsers[7],
    content_type: 'image',
    content_text: 'Parti etkinliğimizden kareler',
    media_url: 'https://picsum.photos/800/600?random=7',
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
    user_id: 9,
    user: mockUsers[8],
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
    user_id: 4,
    user: mockUsers[3],
    content_type: 'video',
    content_text: 'Genel Başkan olarak yaptığım açıklama',
    media_url: 'https://picsum.photos/800/600?random=9',
    thumbnail_url: 'https://picsum.photos/800/600?random=9',
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
    user_id: 10,
    user: mockUsers[9],
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
    const user = users.find(u => u.user_id === post.user_id) || users[0];
    return {
      ...post,
      user: {
        ...user,
        party: user.party_id ? parties.find(p => p.party_id === user.party_id) : null
      }
    };
  });
  
  const posts = [...initialPosts];
  
  for (let i = 11; i <= count; i++) {
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    // Teşkilat üyelerini de dahil et
    const availableUsers = users.filter(u => 
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
      : users[Math.floor(Math.random() * users.length)];
    const agenda = agendas[Math.floor(Math.random() * agendas.length)];
    const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    
    const post = {
      post_id: i,
      user_id: user.user_id,
      user: {
        ...user,
        party: user.party_id ? parties.find(p => p.party_id === user.party_id) : null
      },
      content_type: contentType,
      content_text: text,
      agenda_tag: agenda,
      polit_score: Math.floor(Math.random() * 5000) + 100,
      view_count: Math.floor(Math.random() * 50000) + 100,
      like_count: Math.floor(Math.random() * 5000) + 10,
      dislike_count: Math.floor(Math.random() * 500) + 1,
      comment_count: Math.floor(Math.random() * 500) + 5,
      is_featured: Math.random() > 0.8,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    if (contentType === 'image') {
      post.media_url = getPostMediaPath('image', i);
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

// Her kategori için 20 örnek post oluştur
export const getCategoryPosts = (category, allPosts = []) => {
  // Eğer allPosts boşsa, generateMockPosts çağır
  if (!allPosts || allPosts.length === 0) {
    allPosts = generateMockPosts(200);
  }
  const categoryMap = {
    'mps': (p) => p.user?.user_type === 'politician' && p.user?.politician_type === 'mp',
    'organization': (p) => {
      // Teşkilat: politician ama mp veya party_chair değil
      return p.user?.user_type === 'politician' && 
             p.user?.politician_type !== 'mp' && 
             p.user?.politician_type !== 'party_chair' &&
             (p.user?.politician_type === 'provincial_chair' ||
              p.user?.politician_type === 'district_chair' ||
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
  
  const filtered = allPosts.filter(filter);
  
  // Eğer teşkilat için yeterli post yoksa, generateMockPosts'ta teşkilat üyeleri oluştur
  if (category === 'organization' && filtered.length < 20) {
    // Teşkilat üyeleri için ekstra postlar oluştur
    const orgTypes = ['provincial_chair', 'district_chair', 'myk_member', 'vice_chair', 'other'];
    const orgUsers = allPosts
      .map(p => p.user)
      .filter(u => u?.user_type === 'politician' && orgTypes.includes(u?.politician_type))
      .filter((v, i, a) => a.findIndex(u => u.user_id === v.user_id) === i);
    
    // Eğer yeterli teşkilat üyesi yoksa, mock users'dan oluştur
    const needed = 20 - filtered.length;
    for (let i = 0; i < needed; i++) {
      const orgType = orgTypes[Math.floor(Math.random() * orgTypes.length)];
      const partyId = Math.floor(Math.random() * 6) + 1;
      const newPost = {
        post_id: 1000 + i,
        user_id: 100 + i,
        user: {
          user_id: 100 + i,
          username: `org_user_${i}`,
          full_name: `Teşkilat Üyesi ${i + 1}`,
          user_type: 'politician',
          politician_type: orgType,
          party_id: partyId,
          verification_badge: true,
          profile_image: `https://i.pravatar.cc/150?img=${100 + i}`
        },
        content_type: ['text', 'image', 'video'][Math.floor(Math.random() * 3)],
        content_text: 'Teşkilat çalışmalarımız devam ediyor.',
        agenda_tag: ['ekonomi', 'eğitim', 'sağlık'][Math.floor(Math.random() * 3)],
        polit_score: Math.floor(Math.random() * 5000) + 500,
        view_count: Math.floor(Math.random() * 10000) + 100,
        like_count: Math.floor(Math.random() * 500) + 10,
        dislike_count: Math.floor(Math.random() * 50) + 1,
        comment_count: Math.floor(Math.random() * 100) + 5,
        is_featured: false,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      if (newPost.content_type === 'image') {
        newPost.media_url = getPostMediaPath('image', 1000 + i);
      } else if (newPost.content_type === 'video') {
        newPost.media_url = getPostMediaPath('video', 1000 + i, false);
        newPost.thumbnail_url = getPostMediaPath('video', 1000 + i, true);
        newPost.media_duration = Math.floor(Math.random() * 300) + 60;
      }
      
      filtered.push(newPost);
    }
  }
  
  return filtered.slice(0, 20);
};
