// Kullanıcı tipleri
export const USER_TYPES = {
  VISITOR: 'visitor',
  NORMAL: 'normal',
  POLITICIAN: 'politician',
  EX_POLITICIAN: 'ex_politician',
  MEDIA: 'media',
  PARTY_MEMBER: 'party_member'
};

// İçerik tipleri
export const CONTENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio'
};

// Bildirim tipleri
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MENTION: 'mention',
  SYSTEM: 'system',
  APPROVAL: 'approval'
};

// Medya limitleri (varsayılan)
export const MEDIA_LIMITS = {
  VIDEO_MAX_DURATION: 300, // 5 dakika
  VIDEO_MAX_SIZE: 104857600, // 100 MB
  IMAGE_MAX_SIZE: 5242880, // 5 MB
  AUDIO_MAX_DURATION: 600, // 10 dakika
  AUDIO_MAX_SIZE: 20971520, // 20 MB
  TEXT_MAX_LENGTH: 5000
};

// İzin verilen dosya tipleri
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
  AUDIO: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  DOCUMENT: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password'
  },
  USERS: {
    GET_PROFILE: '/api/users/:id',
    UPDATE_PROFILE: '/api/users/:id',
    FOLLOW: '/api/users/:id/follow',
    UNFOLLOW: '/api/users/:id/unfollow',
    FOLLOWERS: '/api/users/:id/followers',
    FOLLOWING: '/api/users/:id/following'
  },
  POSTS: {
    GET_ALL: '/api/posts',
    GET_ONE: '/api/posts/:id',
    CREATE: '/api/posts',
    UPDATE: '/api/posts/:id',
    DELETE: '/api/posts/:id',
    LIKE: '/api/posts/:id/like',
    DISLIKE: '/api/posts/:id/dislike',
    REPORT: '/api/posts/:id/report'
  },
  COMMENTS: {
    GET_ALL: '/api/posts/:postId/comments',
    CREATE: '/api/posts/:postId/comments',
    UPDATE: '/api/comments/:id',
    DELETE: '/api/comments/:id',
    LIKE: '/api/comments/:id/like',
    DISLIKE: '/api/comments/:id/dislike',
    REPORT: '/api/comments/:id/report'
  },
  PARTIES: {
    GET_ALL: '/api/parties',
    GET_ONE: '/api/parties/:id',
    GET_MPS: '/api/parties/:id/mps',
    GET_ORGANIZATION: '/api/parties/:id/organization'
  },
  AGENDAS: {
    GET_TRENDING: '/api/agendas/trending',
    GET_ONE: '/api/agendas/:slug',
    GET_POSTS: '/api/agendas/:slug/posts'
  },
  MESSAGES: {
    GET_CONVERSATIONS: '/api/messages/conversations',
    GET_THREAD: '/api/messages/:userId',
    SEND: '/api/messages',
    MARK_READ: '/api/messages/:id/read'
  },
  NOTIFICATIONS: {
    GET_ALL: '/api/notifications',
    MARK_READ: '/api/notifications/:id/read',
    MARK_ALL_READ: '/api/notifications/read-all'
  },
  ADMIN: {
    STATS: '/api/admin/stats',
    USERS: '/api/admin/users',
    APPROVALS: '/api/admin/approvals',
    PARTIES: '/api/admin/parties',
    REPORTS: '/api/admin/reports',
    SETTINGS: '/api/admin/settings'
  }
};

// Türkiye şehir kodları
export const CITY_CODES = {
  '01': 'Adana', '02': 'Adıyaman', '03': 'Afyonkarahisar', '04': 'Ağrı',
  '05': 'Amasya', '06': 'Ankara', '07': 'Antalya', '08': 'Artvin',
  '09': 'Aydın', '10': 'Balıkesir', '11': 'Bilecik', '12': 'Bingöl',
  '13': 'Bitlis', '14': 'Bolu', '15': 'Burdur', '16': 'Bursa',
  '17': 'Çanakkale', '18': 'Çankırı', '19': 'Çorum', '20': 'Denizli',
  '21': 'Diyarbakır', '22': 'Edirne', '23': 'Elazığ', '24': 'Erzincan',
  '25': 'Erzurum', '26': 'Eskişehir', '27': 'Gaziantep', '28': 'Giresun',
  '29': 'Gümüşhane', '30': 'Hakkari', '31': 'Hatay', '32': 'Isparta',
  '33': 'Mersin', '34': 'İstanbul', '35': 'İzmir', '36': 'Kars',
  '37': 'Kastamonu', '38': 'Kayseri', '39': 'Kırklareli', '40': 'Kırşehir',
  '41': 'Kocaeli', '42': 'Konya', '43': 'Kütahya', '44': 'Malatya',
  '45': 'Manisa', '46': 'Kahramanmaraş', '47': 'Mardin', '48': 'Muğla',
  '49': 'Muş', '50': 'Nevşehir', '51': 'Niğde', '52': 'Ordu',
  '53': 'Rize', '54': 'Sakarya', '55': 'Samsun', '56': 'Siirt',
  '57': 'Sinop', '58': 'Sivas', '59': 'Tekirdağ', '60': 'Tokat',
  '61': 'Trabzon', '62': 'Tunceli', '63': 'Şanlıurfa', '64': 'Uşak',
  '65': 'Van', '66': 'Yozgat', '67': 'Zonguldak', '68': 'Aksaray',
  '69': 'Bayburt', '70': 'Karaman', '71': 'Kırıkkale', '72': 'Batman',
  '73': 'Şırnak', '74': 'Bartın', '75': 'Ardahan', '76': 'Iğdır',
  '77': 'Yalova', '78': 'Karabük', '79': 'Kilis', '80': 'Osmaniye',
  '81': 'Düzce'
};
