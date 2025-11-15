// Mock post verileri
import { mockUsers } from './users.js';
import { mockParties } from './parties.js';

export const mockPosts = [
  {
    post_id: 1,
    user_id: 1,
    user: mockUsers[0],
    content_type: 'text',
    content_text: 'Ekonomi konusunda yeni açıklamalarımızı yarın yapacağız. Halkımızın refahı için çalışmaya devam ediyoruz. Şeffaflık ve hesap verebilirlik ilkelerimizden taviz vermeden ilerliyoruz.',
    agenda_tag: 'ekonomi',
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
    media_url: '/assets/mock/videos/video1.mp4',
    thumbnail_url: '/assets/mock/thumbnails/video1-thumb.jpg',
    media_duration: 180,
    agenda_tag: 'gençlik',
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
    media_url: '/assets/mock/images/post1.jpg',
    agenda_tag: 'yerel yönetim',
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
    agenda_tag: 'ekonomi',
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
    agenda_tag: 'ekonomi',
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
    agenda_tag: 'güvenlik',
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
    media_url: '/assets/mock/images/post2.jpg',
    agenda_tag: 'parti faaliyetleri',
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
    agenda_tag: 'deneyim',
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
    media_url: '/assets/mock/videos/video2.mp4',
    thumbnail_url: '/assets/mock/thumbnails/video2-thumb.jpg',
    media_duration: 240,
    agenda_tag: 'siyaset',
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
    agenda_tag: 'eğitim',
    polit_score: 380,
    view_count: 980,
    like_count: 65,
    dislike_count: 5,
    comment_count: 18,
    is_featured: false,
    created_at: '2025-11-11T09:15:00Z'
  }
];

// Daha fazla post için helper
export const generateMockPosts = (count = 90, users = mockUsers) => {
  const contentTypes = ['text', 'image', 'video', 'audio'];
  const agendas = ['ekonomi', 'eğitim', 'sağlık', 'güvenlik', 'çevre', 'teknoloji', 'kültür', 'spor', 'turizm', 'tarım'];
  const sampleTexts = [
    'Bugün önemli bir açıklama yapacağız.',
    'Halkımızla birlikte çalışmaya devam ediyoruz.',
    'Yeni projelerimiz hakkında bilgi paylaşımı.',
    'Etkinliklerimizden görüntüler.',
    'Görüş ve önerilerinizi bekliyoruz.'
  ];
  
  const posts = [...mockPosts];
  
  for (let i = 11; i <= count; i++) {
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const agenda = agendas[Math.floor(Math.random() * agendas.length)];
    const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    
    const post = {
      post_id: i,
      user_id: user.user_id,
      user: user,
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
      post.media_url = `/assets/mock/images/post${i}.jpg`;
    } else if (contentType === 'video') {
      post.media_url = `/assets/mock/videos/video${i}.mp4`;
      post.thumbnail_url = `/assets/mock/thumbnails/video${i}-thumb.jpg`;
      post.media_duration = Math.floor(Math.random() * 300) + 60;
    } else if (contentType === 'audio') {
      post.media_url = `/assets/mock/audio/audio${i}.mp3`;
      post.media_duration = Math.floor(Math.random() * 600) + 120;
    }
    
    posts.push(post);
  }
  
  return posts;
};
