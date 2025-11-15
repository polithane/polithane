// Mock kullanıcı verileri
export const mockUsers = [
  {
    user_id: 1,
    username: 'kemal_kilicdaroglu',
    email: 'kemal@chp.org.tr',
    full_name: 'Kemal Kılıçdaroğlu',
    profile_image: '/assets/mock/avatars/kemal.jpg',
    bio: 'CHP Genel Başkanı',
    user_type: 'politician',
    politician_type: 'party_chair',
    party_id: 2,
    verification_badge: true,
    polit_score: 125000,
    follower_count: 2500000,
    following_count: 150,
    post_count: 1250,
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    user_id: 2,
    username: 'recep_tayyip_erdogan',
    email: 'rte@akparti.org.tr',
    full_name: 'Recep Tayyip Erdoğan',
    profile_image: '/assets/mock/avatars/erdogan.jpg',
    bio: 'AK Parti Genel Başkanı, Türkiye Cumhurbaşkanı',
    user_type: 'politician',
    politician_type: 'party_chair',
    party_id: 1,
    verification_badge: true,
    polit_score: 450000,
    follower_count: 5000000,
    following_count: 85,
    post_count: 3200,
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    user_id: 3,
    username: 'devlet_bahceli',
    email: 'dbahceli@mhp.org.tr',
    full_name: 'Devlet Bahçeli',
    profile_image: '/assets/mock/avatars/bahceli.jpg',
    bio: 'MHP Genel Başkanı',
    user_type: 'politician',
    politician_type: 'party_chair',
    party_id: 3,
    verification_badge: true,
    polit_score: 98000,
    follower_count: 1200000,
    following_count: 120,
    post_count: 890,
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    user_id: 4,
    username: 'ozgur_ozel',
    email: 'ozel@chp.org.tr',
    full_name: 'Özgür Özel',
    profile_image: '/assets/mock/avatars/ozel.jpg',
    bio: 'CHP Genel Başkanı',
    user_type: 'politician',
    politician_type: 'party_chair',
    party_id: 2,
    verification_badge: true,
    polit_score: 156000,
    follower_count: 1800000,
    following_count: 200,
    post_count: 1450,
    city_code: '35',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    user_id: 5,
    username: 'ali_vatandas',
    email: 'ali@example.com',
    full_name: 'Ali Vatandaş',
    profile_image: '/assets/mock/avatars/user1.jpg',
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
    user_id: 6,
    username: 'mehmet_mp',
    email: 'mehmet@chp.org.tr',
    full_name: 'Mehmet Yılmaz',
    profile_image: '/assets/mock/avatars/mp1.jpg',
    bio: 'CHP Milletvekili - İstanbul',
    user_type: 'politician',
    politician_type: 'mp',
    party_id: 2,
    city_code: '34',
    verification_badge: true,
    polit_score: 12500,
    follower_count: 45000,
    following_count: 250,
    post_count: 320,
    created_at: '2023-06-01T00:00:00Z'
  },
  {
    user_id: 7,
    username: 'ayse_medya',
    email: 'ayse@haberturk.com',
    full_name: 'Ayşe Demir',
    profile_image: '/assets/mock/avatars/media1.jpg',
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
    user_id: 8,
    username: 'parti_uyesi_ahmet',
    email: 'ahmet@example.com',
    full_name: 'Ahmet Kaya',
    profile_image: '/assets/mock/avatars/user2.jpg',
    bio: 'AK Parti Üyesi',
    user_type: 'party_member',
    party_id: 1,
    verification_badge: false,
    polit_score: 1200,
    follower_count: 450,
    following_count: 320,
    post_count: 45,
    created_at: '2024-02-20T00:00:00Z'
  },
  {
    user_id: 9,
    username: 'eski_vekili',
    email: 'eski@example.com',
    full_name: 'Mustafa Özkan',
    profile_image: '/assets/mock/avatars/ex1.jpg',
    bio: 'Eski Milletvekili',
    user_type: 'ex_politician',
    verification_badge: true,
    polit_score: 5600,
    follower_count: 8500,
    following_count: 120,
    post_count: 95,
    created_at: '2023-08-15T00:00:00Z'
  },
  {
    user_id: 10,
    username: 'fatma_citizen',
    email: 'fatma@example.com',
    full_name: 'Fatma Şahin',
    profile_image: '/assets/mock/avatars/user3.jpg',
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

// Daha fazla mock kullanıcı için helper
export const generateMockUsers = (count = 40) => {
  const names = ['Ali', 'Mehmet', 'Ayşe', 'Fatma', 'Mustafa', 'Zeynep', 'Ahmet', 'Elif', 'Can', 'Selin'];
  const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Arslan', 'Öztürk', 'Kurt', 'Yıldız', 'Aydın'];
  const cities = ['34', '06', '35', '07', '16', '01', '26', '38', '41', '27'];
  
  const users = [...mockUsers];
  
  for (let i = 11; i <= count; i++) {
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const userType = ['normal', 'normal', 'normal', 'party_member', 'normal'][Math.floor(Math.random() * 5)];
    
    users.push({
      user_id: i,
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`,
      email: `${firstName.toLowerCase()}${i}@example.com`,
      full_name: `${firstName} ${lastName}`,
      profile_image: `/assets/mock/avatars/user${i}.jpg`,
      bio: 'Vatandaş',
      user_type: userType,
      party_id: userType === 'party_member' ? Math.floor(Math.random() * 6) + 1 : null,
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
