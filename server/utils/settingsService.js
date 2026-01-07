import { sql } from '../index.js';

// Cache for settings to avoid DB calls on every request
let settingsCache = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

export const getSettings = async (category = null) => {
  // Check cache
  const now = Date.now();
  if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return settingsCache;
  }

  // Fetch from database
  const settings = await sql`SELECT key, value FROM site_settings`;

  settingsCache = settings.reduce((acc, s) => {
    acc[s.key] = { value: s.value };
    return acc;
  }, {});
  cacheTimestamp = now;

  return settingsCache;
};

export const getSetting = async (key) => {
  const settings = await getSettings();
  return settings[key]?.value || null;
};

export const updateSetting = async (key, value) => {
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (${key}, ${String(value)}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
  `;
  
  // Clear cache
  settingsCache = {};
  cacheTimestamp = 0;
};

export const updateSettings = async (settingsObj) => {
  for (const [key, value] of Object.entries(settingsObj)) {
    await updateSetting(key, value);
  }
};

// (Not: eski SMTP alanları artık kullanılmıyor; Brevo ayarları mailSettings.js içinde yönetiliyor.)
