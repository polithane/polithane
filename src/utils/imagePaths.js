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
  if (type === 'avatar') {
    return `https://i.pravatar.cc/150?img=${id}`;
  }
  if (type === 'post') {
    return `https://picsum.photos/800/600?random=${id}`;
  }
  if (type === 'hero') {
    return `https://picsum.photos/1200/300?random=${id}`;
  }
  return `https://picsum.photos/400/400?random=${id}`;
};
