import { mockUsers } from './users.js';

// Takip durumları
export const mockFollows = [
  // CurrentUser'ın takip ettikleri
  { follower_id: 'currentUser', following_id: 1, status: 'accepted', created_at: '2025-11-01T10:00:00Z' },
  { follower_id: 'currentUser', following_id: 2, status: 'accepted', created_at: '2025-11-02T10:00:00Z' },
  { follower_id: 'currentUser', following_id: 3, status: 'accepted', created_at: '2025-11-03T10:00:00Z' },
  { follower_id: 'currentUser', following_id: 5, status: 'accepted', created_at: '2025-11-05T10:00:00Z' },
  { follower_id: 'currentUser', following_id: 10, status: 'pending', created_at: '2025-11-15T10:00:00Z' }, // Bekleyen istek
  
  // CurrentUser'ı takip edenler
  { follower_id: 1, following_id: 'currentUser', status: 'accepted', created_at: '2025-11-01T11:00:00Z' },
  { follower_id: 2, following_id: 'currentUser', status: 'accepted', created_at: '2025-11-02T11:00:00Z' },
  { follower_id: 4, following_id: 'currentUser', status: 'accepted', created_at: '2025-11-04T11:00:00Z' },
  { follower_id: 6, following_id: 'currentUser', status: 'accepted', created_at: '2025-11-06T11:00:00Z' },
  { follower_id: 15, following_id: 'currentUser', status: 'pending', created_at: '2025-11-18T11:00:00Z' }, // Gelen takip isteği
  { follower_id: 20, following_id: 'currentUser', status: 'pending', created_at: '2025-11-19T11:00:00Z' }, // Gelen takip isteği
];

// Engellenen kullanıcılar
export const mockBlockedUsers = [
  { blocker_id: 'currentUser', blocked_id: 25, created_at: '2025-10-15T10:00:00Z' },
  { blocker_id: 'currentUser', blocked_id: 30, created_at: '2025-10-20T10:00:00Z' }
];

// Kullanıcı profil ayarları
export const mockProfileSettings = {
  user_id: 'currentUser',
  is_private: false, // false = herkese açık, true = özel hesap (takip isteği gerekir)
  show_followers: true,
  show_following: true,
  allow_tags: true,
  allow_mentions: true
};

// Takip istatistikleri
export const getFollowStats = (userId) => {
  const followers = mockFollows.filter(f => f.following_id === userId && f.status === 'accepted');
  const following = mockFollows.filter(f => f.follower_id === userId && f.status === 'accepted');
  const pendingRequests = mockFollows.filter(f => f.following_id === userId && f.status === 'pending');
  
  return {
    followers_count: followers.length,
    following_count: following.length,
    pending_requests_count: pendingRequests.length
  };
};

// Takip durumu kontrol
export const getFollowStatus = (currentUserId, targetUserId) => {
  const follow = mockFollows.find(
    f => f.follower_id === currentUserId && f.following_id === targetUserId
  );
  
  if (!follow) return 'not_following'; // Takip etmiyor
  if (follow.status === 'pending') return 'pending'; // İstek gönderildi
  if (follow.status === 'accepted') return 'following'; // Takip ediyor
  
  return 'not_following';
};

// Engelleme durumu kontrol
export const isBlocked = (currentUserId, targetUserId) => {
  return mockBlockedUsers.some(
    b => (b.blocker_id === currentUserId && b.blocked_id === targetUserId) ||
         (b.blocker_id === targetUserId && b.blocked_id === currentUserId)
  );
};

// Takipçi listesi
export const getFollowers = (userId) => {
  return mockFollows
    .filter(f => f.following_id === userId && f.status === 'accepted')
    .map(f => {
      const user = mockUsers.find(u => u.user_id === f.follower_id);
      return {
        ...user,
        followed_at: f.created_at
      };
    })
    .filter(u => u); // null değerleri filtrele
};

// Takip edilenler listesi
export const getFollowing = (userId) => {
  return mockFollows
    .filter(f => f.follower_id === userId && f.status === 'accepted')
    .map(f => {
      const user = mockUsers.find(u => u.user_id === f.following_id);
      return {
        ...user,
        followed_at: f.created_at
      };
    })
    .filter(u => u);
};

// Takip istekleri
export const getFollowRequests = (userId) => {
  return mockFollows
    .filter(f => f.following_id === userId && f.status === 'pending')
    .map(f => {
      const user = mockUsers.find(u => u.user_id === f.follower_id);
      return {
        ...user,
        request_date: f.created_at
      };
    })
    .filter(u => u);
};
