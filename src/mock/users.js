// Mock kullanıcı verileri - Güncel Milletvekili Listesi ile uyumlu
import { getProfileImagePath } from '../utils/imagePaths.js';
import { membersOfParliament } from '../data/membersOfParliament.js';
import { CITY_CODES } from '../utils/constants.js';

// Parti isimlerini party_id'ye çeviren mapping
const partyNameToId = {
  'AK Parti': 1,
  'CHP': 2,
  'DEM PARTİ': 3,
  'MHP': 4,
  'İYİ Parti': 5,
  'YENİ YOL': 6,
  'YENİDEN REFAH': 7,
  'HÜDA PAR': 8,
  'TİP': 9,
  'DBP': 10,
  'EMEP': 11,
  'SAADET Partisi': 12,
  'DSP': 13,
  'DP': 14,
  'BAĞIMSIZ': null
};

// Şehir isimlerini kodlara çeviren mapping
const cityNameToCode = Object.entries(CITY_CODES).reduce((acc, [code, name]) => {
  acc[name.toUpperCase()] = code;
  return acc;
}, {});

// Milletvekillerinden kullanıcı oluştur
const mpUsers = membersOfParliament.map((mp, index) => {
  const userId = index + 1;
  const nameParts = mp.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase().replace(/\s+/g, '_')}`;
  const partyId = partyNameToId[mp.party] || null;
  const cityCode = cityNameToCode[mp.city] || null;
  
  return {
    user_id: userId,
    username: username,
    email: `${username}@tbmm.gov.tr`,
    full_name: mp.name,
    profile_image: getProfileImagePath('politician', 'mp', username, userId),
    bio: `${mp.party} Milletvekili - ${mp.city}`,
    user_type: 'politician',
    politician_type: 'mp',
    party_id: partyId,
    city_code: cityCode,
    verification_badge: true,
    polit_score: Math.floor(Math.random() * 50000) + 5000,
    follower_count: Math.floor(Math.random() * 100000) + 10000,
    following_count: Math.floor(Math.random() * 200) + 50,
    post_count: Math.floor(Math.random() * 500) + 50,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
  };
});

// Medya kullanıcıları
const mediaUsers = [
  {
    user_id: mpUsers.length + 1,
    username: 'ayse_medya',
    email: 'ayse@haberturk.com',
    full_name: 'Ayşe Demir',
    profile_image: getProfileImagePath('media', null, 'ayse_medya', mpUsers.length + 1),
    bio: 'Gazeteci - Habertürk',
    user_type: 'media',
    verification_badge: true,
    polit_score: 8900,
    follower_count: 35000,
    following_count: 500,
    post_count: 180,
    created_at: '2023-03-10T00:00:00Z'
  },
  {
    user_id: mpUsers.length + 2,
    username: 'mehmet_gazeteci',
    email: 'mehmet@hurriyet.com.tr',
    full_name: 'Mehmet Yılmaz',
    profile_image: getProfileImagePath('media', null, 'mehmet_gazeteci', mpUsers.length + 2),
    bio: 'Gazeteci - Hürriyet',
    user_type: 'media',
    verification_badge: true,
    polit_score: 12000,
    follower_count: 45000,
    following_count: 600,
    post_count: 250,
    created_at: '2023-05-15T00:00:00Z'
  }
];

// Normal vatandaş kullanıcıları
const normalUsers = [
  {
    user_id: mpUsers.length + mediaUsers.length + 1,
    username: 'ali_vatandas',
    email: 'ali@example.com',
    full_name: 'Ali Vatandaş',
    profile_image: getProfileImagePath('normal', null, 'ali_vatandas', mpUsers.length + mediaUsers.length + 1),
    bio: 'Vatandaş',
    user_type: 'normal',
    verification_badge: false,
    polit_score: 450,
    follower_count: 120,
    following_count: 85,
    post_count: 23,
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    user_id: mpUsers.length + mediaUsers.length + 2,
    username: 'fatma_citizen',
    email: 'fatma@example.com',
    full_name: 'Fatma Şahin',
    profile_image: getProfileImagePath('normal', null, 'fatma_citizen', mpUsers.length + mediaUsers.length + 2),
    bio: 'Vatandaş',
    user_type: 'normal',
    verification_badge: false,
    polit_score: 320,
    follower_count: 85,
    following_count: 120,
    post_count: 12,
    created_at: '2024-05-10T00:00:00Z'
  }
];

// Tüm kullanıcıları birleştir
export const mockUsers = [...mpUsers, ...mediaUsers, ...normalUsers];

// Daha fazla mock kullanıcı için helper
export const generateMockUsers = (count = 40) => {
  const names = ['Ali', 'Mehmet', 'Ayşe', 'Fatma', 'Mustafa', 'Zeynep', 'Ahmet', 'Elif', 'Can', 'Selin'];
  const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Arslan', 'Öztürk', 'Kurt', 'Yıldız', 'Aydın'];
  const cities = ['34', '06', '35', '07', '16', '01', '26', '38', '41', '27'];
  
  const users = [...mockUsers];
  const startId = mockUsers.length + 1;
  
  for (let i = 0; i < count; i++) {
    const userId = startId + i;
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const userType = ['normal', 'normal', 'normal', 'party_member', 'normal'][Math.floor(Math.random() * 5)];
    
    users.push({
      user_id: userId,
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${userId}`,
      email: `${firstName.toLowerCase()}${userId}@example.com`,
      full_name: `${firstName} ${lastName}`,
      profile_image: getProfileImagePath(userType === 'party_member' ? 'party_member' : 'normal', null, `${firstName.toLowerCase()}_${lastName.toLowerCase()}`, userId),
      bio: userType === 'party_member' ? 'Parti Üyesi' : 'Vatandaş',
      user_type: userType,
      party_id: userType === 'party_member' ? Math.floor(Math.random() * 14) + 1 : null,
      city_code: city,
      verification_badge: false,
      polit_score: Math.floor(Math.random() * 2000) + 100,
      follower_count: Math.floor(Math.random() * 500) + 50,
      following_count: Math.floor(Math.random() * 300) + 50,
      post_count: Math.floor(Math.random() * 50) + 5,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return users;
};
