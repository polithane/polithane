// Siyasetçi ünvanlarını Türkçe'ye çeviren yardımcı fonksiyonlar

/**
 * Politician type'ı Türkçe ünvana çevirir
 * @param {string} politicianType - Politician tipi (mp, party_chair, etc.)
 * @param {string} cityCode - Şehir kodu (İl/İlçe başkanları için)
 * @returns {string} Türkçe ünvan
 */
export const getPoliticianTitle = (politicianType, cityCode = null, districtName = null) => {
  const titles = {
    'mp': 'Milletvekili',
    'party_chair': 'Genel Başkan',
    'provincial_chair': cityCode ? `${cityCode} İl Başkanı` : 'İl Başkanı',
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
 * @returns {string|null} Ünvan veya null
 */
export const getUserTitle = (user) => {
  if (!user) return null;
  
  if (user.user_type === 'politician' && user.politician_type) {
    return getPoliticianTitle(user.politician_type, user.city_code, user.district_name);
  }
  
  if (user.user_type === 'ex_politician') {
    return 'Eski Siyasetçi';
  }
  
  if (user.user_type === 'media') {
    return 'Medya';
  }
  
  if (user.user_type === 'party_member') {
    return 'Parti Üyesi';
  }
  
  return null; // Vatandaşlar için ünvan yok
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
