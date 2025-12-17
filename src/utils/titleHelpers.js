// Siyasetçi ünvanlarını Türkçe'ye çeviren yardımcı fonksiyonlar

/**
 * Politician type'ı Türkçe ünvana çevirir
 * @param {string} politicianType - Politician tipi (mp, party_chair, etc.)
 * @param {string} cityCode - Şehir kodu (İl/İlçe başkanları için)
 * @param {boolean} short - Kısa versiyon mu?
 * @returns {string} Türkçe ünvan
 */
export const getPoliticianTitle = (politicianType, cityCode = null, districtName = null, short = false) => {
  if (short) {
    // Kısa versiyonlar - İçerik kartlarında kullanılacak
    const shortTitles = {
      'mp': 'Milletvekili',
      'party_chair': 'Genel Başkan',
      'provincial_chair': 'İl Başkanı',
      'district_chair': 'İlçe Başkanı',
      'metropolitan_mayor': 'Büyükşehir Bld. Bşk.',
      'district_mayor': districtName ? `${districtName} Bld. Bşk.` : 'İlçe Bld. Bşk.',
      'myk_member': 'MYK Üyesi',
      'vice_chair': 'G. Başkan Yard.',
      'other': 'Parti Yöneticisi'
    };
    return shortTitles[politicianType] || 'Siyasetçi';
  }
  
  // Normal versiyonlar
  const titles = {
    'mp': 'Milletvekili',
    'party_chair': 'Genel Başkan',
    'provincial_chair': 'İl Başkanı',
    'district_chair': 'İlçe Başkanı',
    'metropolitan_mayor': 'Büyükşehir Belediye Başkanı',
    'district_mayor': districtName ? `${districtName} Belediye Başkanı` : 'İlçe Belediye Başkanı',
    'myk_member': 'MYK Üyesi',
    'vice_chair': 'Genel Başkan Yardımcısı',
    'other': 'Parti Yöneticisi'
  };
  
  return titles[politicianType] || 'Siyasetçi';
};

/**
 * Kullanıcı tipine göre tam ünvan döndürür
 * @param {object} user - Kullanıcı objesi
 * @param {boolean} short - Kısa versiyon mu?
 * @returns {string|null} Ünvan veya null
 */
export const getUserTitle = (user, short = false) => {
  if (!user) return null;
  
  if (user.user_type === 'politician' && user.politician_type) {
    return getPoliticianTitle(user.politician_type, user.city_code, user.district_name, short);
  }

  // Party officials can also have politician_type roles (provincial/district chair, mayors, etc.)
  if (user.user_type === 'party_official' && user.politician_type) {
    return getPoliticianTitle(user.politician_type, user.city_code, user.district_name, short);
  }
  
  if (user.user_type === 'ex_politician') {
    return 'Deneyimli Siyasetçi';
  }
  
  if (user.user_type === 'media') {
    return 'Medya';
  }
  
  if (user.user_type === 'party_member') {
    return 'Parti Üyesi';
  }
  
  if (user.user_type === 'normal') {
    // Vatandaşlar için: Parti üyesi ise "Parti Üyesi", değilse "Üye"
    return user.party_id ? 'Parti Üyesi' : 'Üye';
  }
  
  return null;
};

/**
 * UI doğrulama rozeti kuralı:
 * - Vatandaş/normal/parti üyesi gibi standart hesaplarda rozet gösterme.
 * - Rozet sadece admin onayı sonrası (is_verified=true) ve normal üye olmayan tiplerde görünür.
 */
export const isUiVerifiedUser = (user) => {
  if (!user) return false;
  const raw = !!(user.is_verified ?? user.verification_badge);
  if (!raw) return false;
  const ut = String(user.user_type || '').trim();
  if (!ut) return false;
  if (ut === 'citizen' || ut === 'normal' || ut === 'party_member') return false;
  return true;
};

/**
 * Kısa ünvan - Sadece temel bilgi
 * @param {string} politicianType - Politician tipi
 * @returns {string} Kısa ünvan
 */
export const getShortTitle = (politicianType) => {
  const shortTitles = {
    'mp': 'MV',
    'party_chair': 'GB',
    'provincial_chair': 'İB',
    'district_chair': 'İçB',
    'metropolitan_mayor': 'BŞB',
    'district_mayor': 'BB',
    'myk_member': 'MYK',
    'vice_chair': 'GBY',
    'other': 'PY'
  };
  
  return shortTitles[politicianType] || '';
};
