import { sql } from '../db.js';

let cache = null;
let cacheAt = 0;
const CACHE_MS = 30_000;

async function readSetting(key) {
  const [row] = await sql`SELECT value FROM site_settings WHERE key = ${key} LIMIT 1`;
  return row?.value ?? null;
}

async function readSettings(keys) {
  const rows = await sql`SELECT key, value FROM site_settings WHERE key = ANY(${keys})`;
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((k) => [k, m.get(k) ?? null]));
}

function envStr(name) {
  const v = String(process.env[name] || '').trim();
  return v ? v : null;
}

function asBool(v, fallback = false) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return fallback;
}

export async function getMailRuntimeConfig({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < CACHE_MS) return cache;

  // Env always wins (production best practice)
  const provider = (envStr('MAIL_PROVIDER') || 'brevo').toLowerCase();
  const envEnabled = envStr('MAIL_ENABLED');

  const keys = [
    'mail_enabled',
    'mail_provider',
    'mail_sender_email',
    'mail_sender_name',
    'mail_reply_to_email',
    'mail_reply_to_name',
    'mail_brevo_api_key',
    // Backward compat (old names used across UI)
    'email_from_address',
    'email_from_name',
  ];
  const db = await readSettings(keys).catch(() => ({}));

  const enabled = envEnabled != null ? asBool(envEnabled, true) : asBool(db.mail_enabled, true);
  const dbProvider = String(db.mail_provider || '').trim().toLowerCase();

  // Support both old (BREVO_*) and new (MAIL_*) environment variable names
  const senderEmail =
    envStr('MAIL_SENDER_EMAIL') ||
    envStr('BREVO_FROM_EMAIL') || // Backward compatibility
    (db.mail_sender_email ? String(db.mail_sender_email).trim() : null) ||
    (db.email_from_address ? String(db.email_from_address).trim() : null) ||
    null;
  const senderName =
    envStr('MAIL_SENDER_NAME') ||
    envStr('BREVO_FROM_NAME') || // Backward compatibility
    (db.mail_sender_name ? String(db.mail_sender_name).trim() : null) ||
    (db.email_from_name ? String(db.email_from_name).trim() : null) ||
    'Polithane';
  const replyToEmail =
    envStr('MAIL_REPLY_TO_EMAIL') || (db.mail_reply_to_email ? String(db.mail_reply_to_email).trim() : null) || null;
  const replyToName =
    envStr('MAIL_REPLY_TO_NAME') || (db.mail_reply_to_name ? String(db.mail_reply_to_name).trim() : null) || null;

  const brevoApiKey = envStr('BREVO_API_KEY') || (db.mail_brevo_api_key ? String(db.mail_brevo_api_key).trim() : null);

  cache = {
    enabled,
    provider: (envStr('MAIL_PROVIDER') || dbProvider || provider || 'brevo').toLowerCase(),
    senderEmail,
    senderName,
    replyToEmail,
    replyToName,
    brevoApiKey,
  };
  cacheAt = now;
  return cache;
}

export async function getEmailVerificationEnabled() {
  const envV = envStr('EMAIL_VERIFICATION_ENABLED');
  if (envV != null) return asBool(envV, false);
  const v = await readSetting('email_verification_enabled').catch(() => null);
  return asBool(v, false);
}

