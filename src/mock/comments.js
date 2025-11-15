// Mock yorum verileri
import { mockUsers } from './users.js';
import { mockPosts } from './posts.js';

export const mockComments = [
  {
    comment_id: 1,
    post_id: 1,
    user_id: 5,
    user: mockUsers[4],
    comment_text: 'Ekonomi konusunda somut adımlar görmek istiyoruz. Umarım bu sefer farklı olur.',
    polit_score: 156,
    like_count: 45,
    dislike_count: 8,
    is_edited: false,
    created_at: '2025-11-15T10:45:00Z'
  },
  {
    comment_id: 2,
    post_id: 1,
    user_id: 6,
    user: mockUsers[5],
    comment_text: 'Sayın Genel Başkan, bu konuda daha detaylı bilgi verebilir misiniz?',
    polit_score: 320,
    like_count: 120,
    dislike_count: 15,
    is_edited: false,
    created_at: '2025-11-15T11:00:00Z'
  },
  {
    comment_id: 3,
    post_id: 2,
    user_id: 8,
    user: mockUsers[7],
    comment_text: 'Gençlerimiz için güzel bir etkinlik olmuş. Teşekkürler.',
    polit_score: 85,
    like_count: 25,
    dislike_count: 3,
    is_edited: false,
    created_at: '2025-11-15T09:30:00Z'
  },
  {
    comment_id: 4,
    post_id: 3,
    user_id: 10,
    user: mockUsers[9],
    comment_text: 'İstanbul için güzel çalışmalar. Devamını bekliyoruz.',
    polit_score: 95,
    like_count: 30,
    dislike_count: 2,
    is_edited: false,
    created_at: '2025-11-14T17:00:00Z'
  },
  {
    comment_id: 5,
    post_id: 5,
    user_id: 6,
    user: mockUsers[5],
    comment_text: 'Haklısınız, şeffaflık çok önemli. Vatandaşlar olarak bilgiye erişim hakkımız var.',
    polit_score: 180,
    like_count: 55,
    dislike_count: 5,
    is_edited: false,
    created_at: '2025-11-14T12:00:00Z'
  }
];

// Daha fazla yorum için helper
export const generateMockComments = (count = 50, users = mockUsers, posts = mockPosts) => {
  const sampleComments = [
    'Çok güzel bir paylaşım olmuş.',
    'Katılıyorum, bu konuda daha fazla çalışma yapılmalı.',
    'Teşekkürler, bilgilendirme için.',
    'Umarım bu konuda somut adımlar atılır.',
    'Güzel bir açıklama olmuş.',
    'Bu konuda daha fazla detay bekliyoruz.',
    'Haklısınız, bu önemli bir konu.',
    'Destekliyorum, devamını bekliyoruz.'
  ];
  
  const comments = [...mockComments];
  
  for (let i = 6; i <= count; i++) {
    const post = posts[Math.floor(Math.random() * posts.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const text = sampleComments[Math.floor(Math.random() * sampleComments.length)];
    
    comments.push({
      comment_id: i,
      post_id: post.post_id,
      user_id: user.user_id,
      user: user,
      comment_text: text,
      polit_score: Math.floor(Math.random() * 500) + 10,
      like_count: Math.floor(Math.random() * 200) + 5,
      dislike_count: Math.floor(Math.random() * 50) + 1,
      is_edited: Math.random() > 0.9,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return comments;
};
