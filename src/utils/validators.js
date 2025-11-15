// Email validasyonu
export const isValidEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Kullanıcı adı validasyonu
export const isValidUsername = (username) => {
  if (!username) return false;
  const regex = /^[a-zA-Z0-9_.]{3,30}$/;
  return regex.test(username);
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
