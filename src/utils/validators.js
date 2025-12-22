// E-posta validasyonu
export const isValidEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Kullanıcı adı validasyonu
export const isValidUsername = (username) => {
  if (!username) return false;
  // Sadece ascii küçük harf, rakam ve alt çizgi. Max 20.
  const regex = /^[a-z0-9_]{3,20}$/;
  return regex.test(username);
};

// Username normalize (Türkçe karakter -> ascii, boşluk/punktuasyon -> _, max 20)
export const normalizeUsername = (value) => {
  if (!value) return '';
  const turkishMap = {
    ç: 'c', Ç: 'c',
    ğ: 'g', Ğ: 'g',
    ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o',
    ş: 's', Ş: 's',
    ü: 'u', Ü: 'u',
  };

  let out = value
    .trim()
    .split('')
    .map((ch) => turkishMap[ch] ?? ch)
    .join('')
    .toLowerCase();

  // @ prefix çıkar
  out = out.replace(/^@+/, '');
  // boşluk ve tireyi underscore yap
  out = out.replace(/[\s-]+/g, '_');
  // izin verilmeyen karakterleri at
  out = out.replace(/[^a-z0-9_]/g, '');
  // tekrar eden _ sadeleştir
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  // max 20
  out = out.slice(0, 20);
  // en az 3 karakter
  if (out.length > 0 && out.length < 3) {
    out = (out + '___').slice(0, 3);
  }
  // harf ile başlamıyorsa başına u ekle
  if (out && !/^[a-z]/.test(out)) out = `u${out}`.slice(0, 20);
  return out;
};

// Şifre validasyonu
export const isValidPassword = (password) => {
  if (!password) return false;
  // En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// Telefon validasyonu (Türkiye)
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  const regex = /^05\d{9}$/;
  return regex.test(cleaned);
};

// Dosya tipi validasyonu
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !allowedTypes) return false;
  return allowedTypes.includes(file.type);
};

// Dosya boyutu validasyonu
export const isValidFileSize = (file, maxSizeInMB) => {
  if (!file || !maxSizeInMB) return false;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// Video süre validasyonu
export const isValidVideoDuration = (duration, maxDuration) => {
  if (!duration || !maxDuration) return false;
  return duration <= maxDuration;
};
