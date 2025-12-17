// Resim path helper fonksiyonları

/**
 * Profil resmi path'i oluşturur
 * @param {string} userType - Kullanıcı tipi (politician, normal, media, party_member, ex_politician)
 * @param {string} politicianType - Siyasetçi tipi (mp, party_chair, provincial_chair, etc.)
 * @param {string} username - Kullanıcı adı
 * @param {number} userId - Kullanıcı ID
 * @returns {string} Resim path'i
 */
export const getProfileImagePath = (userType, politicianType = null, username = null, userId = null) => {
  const basePath = '/assets/profiles';
  
  if (userType === 'politician') {
    const politicianFolderMap = {
      'party_chair': 'party_chairs',
      'mp': 'mps',
      'provincial_chair': 'provincial_chairs',
      'district_chair': 'district_chairs',
      'myk_member': 'myk_members',
      'vice_chair': 'vice_chairs',
      'other': 'others'
    };
    
    const folder = politicianFolderMap[politicianType] || 'others';
    const fileName = username 
      ? `${username}.jpg` 
      : userId 
        ? `user_${userId}.jpg` 
        : 'default.jpg';
    
    return `${basePath}/politicians/${folder}/${fileName}`;
  }
  
  if (userType === 'normal') {
    const fileName = username 
      ? `${username}.jpg` 
      : userId 
        ? `user_${userId}.jpg` 
        : 'default.jpg';
    return `${basePath}/citizens/${fileName}`;
  }
  
  if (userType === 'media') {
    const fileName = username 
      ? `${username}.jpg` 
      : userId 
        ? `user_${userId}.jpg` 
        : 'default.jpg';
    return `${basePath}/media/${fileName}`;
  }
  
  if (userType === 'party_member') {
    const fileName = username 
      ? `${username}.jpg` 
      : userId 
        ? `user_${userId}.jpg` 
        : 'default.jpg';
    return `${basePath}/party_members/${fileName}`;
  }
  
  if (userType === 'ex_politician') {
    const fileName = username 
      ? `${username}.jpg` 
      : userId 
        ? `user_${userId}.jpg` 
        : 'default.jpg';
    return `${basePath}/ex_politicians/${fileName}`;
  }
  
  // Varsayılan
  return '/assets/default/avatar.png';
};

/**
 * Parti logosu path'i oluşturur
 * @param {string} partyShortName - Parti kısa adı (AK PARTİ, CHP, etc.)
 * @param {number} partyId - Parti ID
 * @returns {string} Logo path'i
 */
export const getPartyLogoPath = (partyShortName = null, partyId = null) => {
  if (!partyShortName && !partyId) {
    return '/assets/default/party_logo.png';
  }
  
  // Parti kısa adı mapping (dosya isimleriyle tam eşleşme)
  const partyFileMap = {
    'AK PARTİ': 'ak_parti',
    'CHP': 'chp',
    'DEM Parti': 'dem_parti',
    'MHP': 'mhp',
    'İYİ PARTİ': 'iyi_parti',
    'YENİ YOL': 'yeni_yol',
    'YRP': 'yrp',
    'HÜRDAVA': 'hurdava',
    'TİP': 'tip',
    'DBP': 'dbp',
    'EMEP': 'emep',
    'SAADET': 'saadet',
    'DSP': 'dsp',
    'DP': 'dp',
    'BAĞIMSIZ': 'bagimsiz'
  };
  
  const fileName = partyShortName && partyFileMap[partyShortName]
    ? partyFileMap[partyShortName] + '.png'
    : `party_${partyId}.png`;
  
  return `/assets/parties/logos/${fileName}`;
};

/**
 * Parti bayrağı path'i oluşturur
 * @param {string} partyShortName - Parti kısa adı
 * @param {number} partyId - Parti ID
 * @returns {string} Bayrak path'i
 */
export const getPartyFlagPath = (partyShortName = null, partyId = null) => {
  if (!partyShortName && !partyId) {
    return '/assets/default/party_flag.png';
  }
  
  const fileName = partyShortName 
    ? partyShortName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_flag.png'
    : `party_${partyId}_flag.png`;
  
  return `/assets/parties/flags/${fileName}`;
};

/**
 * Post resmi path'i oluşturur
 * @param {string} contentType - İçerik tipi (image, video, audio)
 * @param {number} postId - Post ID
 * @param {boolean} isThumbnail - Thumbnail mı?
 * @returns {string} Resim path'i
 */
export const getPostMediaPath = (contentType, postId, isThumbnail = false) => {
  const basePath = '/assets/posts';
  
  if (contentType === 'image') {
    return `${basePath}/images/post_${postId}.jpg`;
  }
  
  if (contentType === 'video') {
    if (isThumbnail) {
      return `${basePath}/thumbnails/post_${postId}_thumb.jpg`;
    }
    return `${basePath}/videos/post_${postId}.mp4`;
  }
  
  if (contentType === 'audio') {
    return `${basePath}/audio/post_${postId}.mp3`;
  }
  
  return '/assets/default/post_image.jpg';
};

/**
 * Hero slider resmi path'i oluşturur
 * @param {number} index - Slider index
 * @returns {string} Hero resmi path'i
 */
export const getHeroImagePath = (index) => {
  return `/assets/hero/hero_${index + 1}.jpg`;
};

/**
 * Gündem resmi path'i oluşturur
 * @param {string} agendaSlug - Gündem slug'ı
 * @returns {string} Gündem resmi path'i
 */
export const getAgendaImagePath = (agendaSlug) => {
  return `/assets/agendas/${agendaSlug}.jpg`;
};

/**
 * Placeholder resim URL'i (geliştirme için)
 * @param {string} type - Resim tipi (avatar, post, hero)
 * @param {number} id - ID
 * @returns {string} Placeholder URL
 */
export const getPlaceholderImage = (type = 'avatar', id = 1) => {
  const safeId = Number.isFinite(Number(id)) ? Number(id) : 1;
  const colors = ['#009fd6', '#111827', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6'];
  const bg = colors[Math.abs(safeId) % colors.length];

  const svg = (() => {
    if (type === 'hero') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${bg}" stop-opacity="0.25"/>
              <stop offset="1" stop-color="${bg}" stop-opacity="0.10"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="300" fill="url(#g)"/>
          <circle cx="1020" cy="120" r="120" fill="${bg}" opacity="0.12"/>
          <circle cx="220" cy="210" r="160" fill="${bg}" opacity="0.10"/>
          <text x="60" y="170" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#111827" opacity="0.70">
            Yükleniyor…
          </text>
        </svg>
      `;
    }

    if (type === 'post') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
          <rect width="800" height="600" fill="#f3f4f6"/>
          <rect x="40" y="40" width="720" height="520" rx="32" fill="white" stroke="#e5e7eb"/>
          <circle cx="120" cy="120" r="36" fill="${bg}" opacity="0.25"/>
          <rect x="180" y="92" width="220" height="20" rx="10" fill="#e5e7eb"/>
          <rect x="180" y="124" width="160" height="16" rx="8" fill="#f3f4f6"/>
          <rect x="100" y="200" width="600" height="260" rx="24" fill="${bg}" opacity="0.10"/>
          <path d="M260 400l90-90 80 80 90-90 120 120H260z" fill="${bg}" opacity="0.22"/>
          <circle cx="540" cy="292" r="28" fill="${bg}" opacity="0.25"/>
          <text x="100" y="520" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#111827" opacity="0.55">
            Medya bulunamadı
          </text>
        </svg>
      `;
    }

    // avatar
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${bg}" stop-opacity="0.30"/>
            <stop offset="1" stop-color="${bg}" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect width="150" height="150" rx="32" fill="url(#g)"/>
        <circle cx="75" cy="62" r="26" fill="${bg}" opacity="0.28"/>
        <path d="M28 136c10-28 32-42 47-42s37 14 47 42" fill="${bg}" opacity="0.20"/>
      </svg>
    `;
  })();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
};
