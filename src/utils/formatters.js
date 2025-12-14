// Sayı formatlama
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Polit Puan formatlama - Her zaman "P." ile biter (3 P., 150 P., 2,15K P.)
export const formatPolitScore = (num) => {
  if (!num && num !== 0) return '0 P.';
  if (num >= 1000000) {
    // Milyon: 2,5M P.
    return (num / 1000000).toFixed(2).replace('.', ',') + 'M P.';
  }
  if (num >= 1000) {
    // Bin: 2,15K P.
    return (num / 1000).toFixed(2).replace('.', ',') + 'K P.';
  }
  // Normal sayılar: 150 P.
  return num.toString() + ' P.';
};

// Tarih formatlama
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Zaman öncesi (time ago)
export const formatTimeAgo = (date) => {
  try {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const seconds = Math.floor((new Date() - dateObj) / 1000);
    
    if (seconds < 0) return 'Az önce'; // Gelecek tarih
    
    const intervals = {
      yıl: 31536000,
      ay: 2592000,
      hafta: 604800,
      gün: 86400,
      saat: 3600,
      dakika: 60,
      saniye: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit} önce`;
      }
    }
    
    return 'Az önce';
  } catch (error) {
    console.error('formatTimeAgo error:', error);
    return '';
  }
};

// Süre formatlama (saniye -> mm:ss)
export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Metin kısaltma
export const truncate = (text, length) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// URL slug oluşturma
export const slugify = (text) => {
  if (!text) return '';
  const turkishMap = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };
  
  return text
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Dosya boyutu formatlama
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Kaynak URL'den domain çıkarma (ör: https://www.ornek.com/path -> ornek.com)
export const getSourceDomain = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    return (u.hostname || '').replace(/^www\./, '');
  } catch {
    // Geçerli URL değilse basit temizleme dene
    return url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim();
  }
};

// Kısa zaman formatı
export const formatTimeShort = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
