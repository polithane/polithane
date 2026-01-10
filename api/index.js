import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Vercel Monolith API - Last Updated: Now
// --- CONFIG & HELPERS ---
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-insecure-secret');

function getJwtSecret() {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is missing in production environment');
  return JWT_SECRET;
}

function setCors(res) {
  // NOTE:
  // - We use Authorization: Bearer <token> (not cookies), so credentials are not required.
  // - Keep CORS strict to reduce cross-origin attack surface.
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization, x-admin-bootstrap-token'
  );
}

function isProd() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function getCorsAllowedOrigins() {
  const out = new Set();
  const add = (v) => {
    const s = String(v || '').trim();
    if (!s) return;
    out.add(s.replace(/\/+$/, ''));
  };
  add(process.env.PUBLIC_APP_URL);
  add(process.env.APP_URL);
  // Local dev
  add('http://localhost:5173');
  add('http://localhost:5000');
  add('http://127.0.0.1:5173');
  add('http://127.0.0.1:5000');
  return out;
}

function resolveCorsOrigin(req) {
  const origin = String(req?.headers?.origin || '').trim().replace(/\/+$/, '');
  if (!origin) return null;
  const allow = getCorsAllowedOrigins();
  return allow.has(origin) ? origin : null;
}

function setCorsOrigin(req, res) {
  const allowed = resolveCorsOrigin(req);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
  }
}

function setSecurityHeaders(req, res) {
  // Basic protection headers (safe for JSON responses)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('X-Frame-Options', 'DENY');
  // CSP for API responses: deny everything by default.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

  // HSTS only in production (assumes HTTPS at the edge)
  if (isProd()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

function signJwt(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

function getClientIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Best-effort rate limiting for serverless runtime (memory scoped per instance).
const _rate = new Map();
function rateLimit(key, { windowMs, max }) {
  const now = Date.now();
  const cur = _rate.get(key) || { ts: now, count: 0 };
  if (now - cur.ts > windowMs) {
    _rate.set(key, { ts: now, count: 1 });
    return { ok: true, remaining: max - 1 };
  }
  if (cur.count >= max) return { ok: false, remaining: 0 };
  cur.count += 1;
  _rate.set(key, cur);
  return { ok: true, remaining: max - cur.count };
}

function getBearerToken(req) {
  const raw = req.headers?.authorization || req.headers?.Authorization;
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const m = String(value).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function verifyJwtFromRequest(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

async function ensureEmailVerifiedForWrite(req, res, auth) {
  // Returns true if the request is allowed to perform interactions (like/comment/follow/post/message).
  // When email verification is enabled, unverified users can browse but cannot interact.
  const a = auth && auth.id ? auth : verifyJwtFromRequest(req);
  if (!a?.id) return false;

  // cache per-request
  if (req && req._polithaneEmailWriteGate && typeof req._polithaneEmailWriteGate === 'object') {
    return req._polithaneEmailWriteGate.allowed === true;
  }

  const settingsMap = await getSiteSettingsMapCached().catch(() => ({}));
  const envEmailGate = String(process.env.EMAIL_VERIFICATION_ENABLED || '').trim();
  const emailVerificationRequired =
    envEmailGate ? envEmailGate === 'true' : String(settingsMap?.email_verification_enabled || 'false').trim() === 'true';
  const verificationChannel = String(settingsMap?.verification_channel || 'email').trim().toLowerCase() || 'email';

  if (!emailVerificationRequired) {
    if (req) req._polithaneEmailWriteGate = { allowed: true };
    return true;
  }
  if (verificationChannel === 'sms') {
    // keep parity with login: if SMS selected but not configured, disallow interactions explicitly
    if (req) req._polithaneEmailWriteGate = { allowed: false };
    res.status(503).json({
      success: false,
      error: 'SMS doğrulama aktif ancak SMS provider yapılandırılmadı.',
      code: 'SMS_NOT_CONFIGURED',
    });
    return false;
  }

  const rows = await supabaseRestGet('users', { select: 'id,email_verified,metadata,is_active', id: `eq.${a.id}`, limit: '1' }).catch(() => []);
  const u = rows?.[0] || null;
  const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
  const verified = u?.email_verified === true || meta?.email_verified === true;
  const allowed = verified === true;
  if (req) req._polithaneEmailWriteGate = { allowed };
  if (!allowed) {
    // Ensure they have the right notification
    try {
      await supabaseInsertNotifications([
        {
          user_id: a.id,
          actor_id: null,
          type: 'email_verification_required',
          title: 'E-posta adresinizi aktif edin',
          message: 'Etkileşim için e-posta doğrulaması gerekli. Gelen kutusu yanında spam/junk klasörünü de kontrol edin.',
          is_read: false,
        },
      ]).catch(() => null);
    } catch {
      // ignore
    }
    res.status(403).json({
      success: false,
      error: 'Etkileşim için e-posta adresinizi doğrulamanız gerekiyor.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return false;
  }
  return true;
}

function isSafeId(value) {
  const s = String(value || '').trim();
  // Accept numeric IDs or UUIDv4+ (common Supabase patterns).
  return /^(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(s);
}

function validatePasswordForAuth(password) {
  const p = String(password || '');
  if (p.length < 8) return 'Şifre en az 8 karakter olmalı.';
  if (p.length > 50) return 'Şifre en fazla 50 karakter olabilir.';
  if (!/[a-zA-Z]/.test(p)) return 'Şifre en az 1 harf içermeli.';
  if (!/[0-9]/.test(p)) return 'Şifre en az 1 rakam içermeli.';
  return null;
}

function normalizeUsernameCandidate(raw) {
  // allow: a-z 0-9 _
  const base = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .slice(0, 20);
  if (!base) return '';
  // Pad to minimum 5 chars with underscores (e.g. ali__ / ay___)
  if (base.length >= 5) return base;
  return (base + '_____').slice(0, 5);
}

const RESERVED_USERNAMES = new Set([
  // Reserved for route/security reasons (do not allow users to register/claim these).
  'adminyonetim',
]);

function isReservedUsername(u) {
  const s = String(u || '').trim().toLowerCase();
  return RESERVED_USERNAMES.has(s);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getSupabaseKeys() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  // IMPORTANT:
  // In production we must use the service role key on the backend.
  // Otherwise admin tables with RLS can silently return empty arrays (anon key) and the UI looks "broken but no error".
  if (isProd() && !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  const key = serviceKey || anonKey;
  if (!supabaseUrl || !key) throw new Error('Supabase env missing');
  return { supabaseUrl, key };
}

function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return key;
}

async function supabaseRestGet(path, params) {
  const { supabaseUrl, key } = getSupabaseKeys();
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}${qs}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`Supabase Error: ${text}`); }
  return await res.json();
}

function isMissingColumnError(e, columnName) {
  const msgRaw = String(e?.message || e || '');
  const msg = msgRaw.toLowerCase();
  const col = String(columnName || '').trim().toLowerCase();
  if (!msg) return false;
  // Common Postgres error shape:
  // ERROR: 42703: column "xxx" does not exist
  if (msg.includes('column') && msg.includes('does not exist')) {
    if (!col) return true;
    return msg.includes(`"${col}"`) || msg.includes(` ${col} `) || msg.includes(col);
  }
  // PostgREST can also return "unknown column" or similar wording
  if (msg.includes('unknown') && msg.includes('column')) {
    if (!col) return true;
    return msg.includes(col);
  }
  return false;
}

async function supabaseRestGetWithOrderFallback(path, baseParams, orderCandidates) {
  const params = baseParams && typeof baseParams === 'object' ? { ...baseParams } : {};
  const orders = Array.isArray(orderCandidates) ? orderCandidates.filter(Boolean) : [];
  for (const ord of orders) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await supabaseRestGet(path, { ...params, order: ord });
    } catch (e) {
      // If the requested order column doesn't exist in this env/schema, retry with next.
      if (isMissingColumnError(e)) continue;
      throw e;
    }
  }
  // Last resort: no ordering.
  const { order: _ignored, ...rest } = params;
  return await supabaseRestGet(path, rest);
}

function isAllowedAvatarUrl(u) {
  try {
    const url = new URL(String(u || ''));
    if (url.protocol !== 'https:') return false;
    // Only allow our own Supabase Storage public avatars bucket
    if (!/\.supabase\.co$/i.test(url.hostname)) return false;
    const p = url.pathname || '';
    return p.includes('/storage/v1/object/public/avatars/');
  } catch {
    return false;
  }
}

async function proxyAvatar(req, res) {
  const u = String(req.query?.u || '').trim();
  if (!u || !isAllowedAvatarUrl(u)) {
    // Always return a valid image (avoid console spam)
    res.statusCode = 302;
    res.setHeader('Location', '/favicon.ico');
    return res.end();
  }

  try {
    const r = await fetch(u, { method: 'GET' });
    if (!r.ok) {
      res.statusCode = 302;
      res.setHeader('Location', '/favicon.ico');
      return res.end();
    }
    const ct = r.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    // Cache a bit to reduce repeated hits
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = Buffer.from(await r.arrayBuffer());
    res.statusCode = 200;
    return res.end(buf);
  } catch {
    res.statusCode = 302;
    res.setHeader('Location', '/favicon.ico');
    return res.end();
  }
}

async function supabaseStorageRequest(method, path, body) {
  const { supabaseUrl } = getSupabaseKeys();
  const key = getSupabaseServiceRoleKey();
  const res = await fetch(`${supabaseUrl}/storage/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const ct = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  const payload = ct.includes('application/json') ? (() => { try { return JSON.parse(text || '{}'); } catch { return {}; } })() : {};
  if (!res.ok) {
    throw new Error(payload?.message ? `Supabase Storage Error: ${payload.message}` : `Supabase Storage Error: ${text}`);
  }
  return payload;
}

async function supabaseStorageUploadObject(bucket, objectPath, buffer, contentType) {
  const { supabaseUrl } = getSupabaseKeys();
  const key = getSupabaseServiceRoleKey();
  const safePath = String(objectPath || '').replace(/^\/+/, '');
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${safePath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Return Turkish explanation for common RLS message
    if (text.toLowerCase().includes('row-level security')) {
      throw new Error('Yükleme engellendi: Depolama (Storage) izinleri kısıtlı. Sistem yöneticisi bucket izinlerini veya servis anahtarını kontrol etmeli.');
    }
    throw new Error(`Depolama hatası: ${text}`);
  }
  await res.arrayBuffer().catch(() => null);
  return true;
}

async function supabaseStorageDeleteObject(bucket, objectPath) {
  const { supabaseUrl } = getSupabaseKeys();
  const key = getSupabaseServiceRoleKey();
  const safePath = String(objectPath || '').replace(/^\/+/, '');
  if (!bucket || !safePath) return false;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${safePath}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    await res.text().catch(() => '');
    return false;
  }
  await res.arrayBuffer().catch(() => null);
  return true;
}

function parseSupabasePublicObjectUrl(u) {
  try {
    const url = new URL(String(u || ''));
    const p = url.pathname || '';
    const marker = '/storage/v1/object/public/';
    if (!p.includes(marker)) return null;
    const after = p.split(marker)[1] || '';
    const parts = after.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const bucket = parts[0];
    const objectPath = parts.slice(1).join('/');
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

async function supabaseRestRequest(method, path, params, body, extraHeaders = {}) {
  const { supabaseUrl, key } = getSupabaseKeys();
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}${qs}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Error: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await res.json();
  return null;
}

async function supabaseRestInsert(path, body) {
  return await supabaseRestRequest('POST', path, null, body);
}

async function supabaseRestPatch(path, params, body) {
  return await supabaseRestRequest('PATCH', path, params, body);
}

async function supabaseRestDelete(path, params, extraHeaders = {}) {
  return await supabaseRestRequest('DELETE', path, params, undefined, extraHeaders);
}

// Notifications table schema differs between environments (some don't have title/message).
// This helper tries inserting as-is, then falls back to minimal columns if needed.
async function supabaseInsertNotifications(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  // Global safety: never notify the actor about their own action.
  // This prevents logic bugs where user_id/actor_id get mixed up in any endpoint.
  const filtered = arr.filter((r) => {
    if (!r || typeof r !== 'object') return false;
    const uid = r.user_id != null ? String(r.user_id) : '';
    const aid = r.actor_id != null ? String(r.actor_id) : '';
    if (uid && aid && uid === aid) return false;
    return true;
  });
  if (filtered.length === 0) return [];
  try {
    return await supabaseRestInsert('notifications', filtered);
  } catch (e) {
    const msg = String(e?.message || '');
    const lower = msg.toLowerCase();
    if (lower.includes('title') || lower.includes('message')) {
      const stripped = (filtered || []).map((r) => {
        if (!r || typeof r !== 'object') return r;
        // eslint-disable-next-line no-unused-vars
        const { title, message, ...rest } = r;
        return rest;
      });
      return await supabaseRestInsert('notifications', stripped);
    }
    throw e;
  }
}

// --- CONTROLLERS ---

async function getPosts(req, res) {
    const { limit = '50', offset = '0', party_id, user_id, user_ids, category, agenda_tag, is_trending, order = 'created_at.desc' } = req.query;
    const auth = verifyJwtFromRequest(req);
    // Best-effort user block filtering:
    // - Hide posts from users I blocked
    // - Hide posts from users who blocked me (using embedded user.metadata when available)
    let myBlockedSet = new Set();
    try {
      if (auth?.id) {
        const meRows = await supabaseRestGet('users', { select: 'metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
        const meta = meRows?.[0]?.metadata && typeof meRows[0].metadata === 'object' ? meRows[0].metadata : {};
        myBlockedSet = new Set(parseUserIdsFromMetadata(meta).map(String));
      }
    } catch {
      myBlockedSet = new Set();
    }
    const params = {
        // Keep selects schema-agnostic: embed with *
        select: '*,user:users(*),party:parties(*)',
        limit: String(limit),
        offset: String(offset),
        is_deleted: 'eq.false',
    };
    // IMPORTANT:
    // Fast content (is_trending=true) is displayed in the Fast/Stories surfaces, not in regular feeds.
    // Otherwise cross-publishing Polit→Fast looks like a duplicated post in the normal feed.
    if (String(is_trending || '') === 'true' || String(is_trending || '') === 'false') {
      params.is_trending = `eq.${String(is_trending)}`;
    } else {
      params.is_trending = 'eq.false';
    }
    if (order) params.order = order;
    if (party_id) params.party_id = `eq.${party_id}`;
    if (user_id) params.user_id = `eq.${user_id}`;
    if (category) params.category = `eq.${category}`;
    if (agenda_tag !== undefined) {
      const raw = String(agenda_tag || '').trim();
      // Support special values for agenda filtering:
      // - "__null__" / "null" / "none": agenda_tag IS NULL (gündem dışı)
      // - otherwise: exact match
      if (!raw || raw === '__null__' || raw === 'null' || raw === 'none') {
        params.agenda_tag = 'is.null';
      } else if (raw === '__notnull__') {
        params.agenda_tag = 'not.is.null';
      } else {
        params.agenda_tag = `eq.${raw}`;
      }
    }
    if (user_ids) {
        const raw = String(user_ids);
        const list = raw
          .split(',')
          .map((s) => s.trim())
          .filter((id) => /^\d+$/.test(id) || /^[0-9a-fA-F-]{8,}$/.test(id));
        if (list.length > 0) params.user_id = `in.(${list.join(',')})`;
    }
    const data = await supabaseRestGet('posts', params);
    const rows = Array.isArray(data) ? data : [];
    // Hide posts belonging to inactive users for everyone except the owner/admin.
    const filtered = rows.filter((p) => {
      const owner = p?.user;
      if (auth?.id && owner?.id) {
        // If I blocked them -> hide.
        if (myBlockedSet.has(String(owner.id))) return false;
        // If they blocked me -> hide (best-effort; requires metadata to be selected).
        const theirMeta = owner?.metadata && typeof owner.metadata === 'object' ? owner.metadata : {};
        const theirBlocked = Array.isArray(theirMeta.blocked_user_ids) ? theirMeta.blocked_user_ids.map(String) : [];
        if (theirBlocked.includes(String(auth.id))) return false;
      }
      if (!owner) return true;
      if (owner.is_active === false) {
        if (auth?.is_admin) return true;
        if (auth?.id && String(auth.id) === String(owner.id)) return true;
        return false;
      }
      return true;
    });
    res.json(filtered);
}

async function getPostById(req, res, id) {
    const auth = verifyJwtFromRequest(req);
    const rows = await supabaseRestGet('posts', {
        select: '*,user:users(*),party:parties(*)',
        id: `eq.${id}`,
        limit: '1'
    });
    const post = rows?.[0];
    if (!post) return res.status(404).json({ success: false, error: 'Post bulunamadı' });
    // Block filtering (best-effort)
    if (auth?.id) {
      try {
        const ownerId = post?.user?.id ?? post?.user_id ?? null;
        if (ownerId) {
          const blocked = await isBlockedBetween(auth.id, ownerId);
          if (blocked && !auth?.is_admin && String(auth.id) !== String(ownerId)) {
            return res.status(404).json({ success: false, error: 'Post bulunamadı' });
          }
        }
      } catch {
        // ignore
      }
    }
    // If the owner is inactive (e.g. deletion confirmed), hide the post for everyone except the owner/admin.
    if (post?.user?.is_active === false) {
      const ownerId = post?.user?.id ?? post?.user_id;
      const isOwner = auth?.id && ownerId && String(auth.id) === String(ownerId);
      if (!isOwner && !auth?.is_admin) {
        return res.status(404).json({ success: false, error: 'Post bulunamadı' });
      }
    }

    // View tracking (best-effort): increment view_count on detail fetch.
    // IMPORTANT: Never fail the request if RLS/env prevents updates.
    try {
      const cur = Number(post?.view_count || 0);
      const next = cur + 1;
      // If update succeeds, prefer returning the updated value so UI reflects it immediately.
      const updated = await supabaseRestPatch('posts', { id: `eq.${id}` }, { view_count: next }).catch(() => null);
      if (Array.isArray(updated) && updated[0] && updated[0].view_count !== undefined) {
        post.view_count = updated[0].view_count;
      } else {
        // If Supabase doesn't return representation (or schema differs), at least reflect the expected next count.
        post.view_count = next;
      }
    } catch {
      // ignore
    }
    res.json({ success: true, data: post });
}

function getPolitUserType(user) {
  if (!user) return 'visitor';
  const ut = String(user?.user_type || '').trim();
  const pt = String(user?.politician_type || '').trim();
  if (ut === 'politician' && pt === 'mp') return 'mp';
  if (ut === 'mp') return 'mp';
  if (ut === 'politician') return 'politician';
  if (ut === 'media') return 'media';
  if (ut === 'party_member') return 'party_member';
  const verified = user?.is_verified === true || user?.verification_badge === true;
  if (verified) return 'verified_member';
  return 'unverified_member';
}

function isSamePartyUser(a, b) {
  const pa = a?.party_id;
  const pb = b?.party_id;
  if (!pa || !pb) return false;
  return String(pa) === String(pb);
}

function isRivalPartyUser(a, b) {
  const pa = a?.party_id;
  const pb = b?.party_id;
  if (!pa || !pb) return false;
  return String(pa) !== String(pb);
}

function likeScoreRule(liker, owner) {
  const likerType = getPolitUserType(liker);
  const ownerType = getPolitUserType(owner);

  if (likerType === 'unverified_member') return { rule: 'unverified_member_like', unitScore: 3, label: 'Üye (onaysız) beğeni' };
  if (likerType === 'verified_member') return { rule: 'verified_member_like', unitScore: 6, label: 'Üye (onaylı) beğeni' };

  if (isSamePartyUser(liker, owner)) return { rule: 'same_party_like', unitScore: 4, label: 'Aynı parti beğeni' };
  if (isRivalPartyUser(liker, owner) && likerType === 'party_member') return { rule: 'rival_party_like', unitScore: 15, label: 'Rakip parti üye beğeni' };

  if (likerType === 'mp' && ownerType === 'verified_member') return { rule: 'mp_to_citizen_like', unitScore: 20, label: 'Milletvekili → üye beğeni' };
  if (likerType === 'mp' && ownerType === 'politician' && isSamePartyUser(liker, owner)) {
    return { rule: 'mp_to_same_politician_like', unitScore: 15, label: 'Milletvekili → aynı siyasi beğeni' };
  }
  if (likerType === 'mp' && ownerType === 'mp') return { rule: 'mp_to_mp_like', unitScore: 5, label: 'Milletvekili → milletvekili beğeni' };
  if (likerType === 'mp' && ownerType === 'politician' && isRivalPartyUser(liker, owner)) {
    return { rule: 'mp_to_rival_politician_like', unitScore: 40, label: 'Milletvekili → rakip siyasi beğeni' };
  }
  if (likerType === 'mp' && ownerType === 'mp' && isRivalPartyUser(liker, owner)) {
    return { rule: 'mp_to_rival_mp_like', unitScore: 30, label: 'Milletvekili → rakip milletvekili beğeni' };
  }
  return { rule: 'verified_member_like', unitScore: 6, label: 'Varsayılan beğeni' };
}

function commentScoreRule(commenter, owner) {
  const commenterType = getPolitUserType(commenter);
  const ownerType = getPolitUserType(owner);

  if (commenterType === 'unverified_member') return { rule: 'unverified_member_comment', unitScore: 6, label: 'Üye (onaysız) yorum' };
  if (commenterType === 'verified_member') return { rule: 'verified_member_comment', unitScore: 24, label: 'Üye (onaylı) yorum' };

  if (isSamePartyUser(commenter, owner)) return { rule: 'same_party_comment', unitScore: 8, label: 'Aynı parti yorum' };
  if (isRivalPartyUser(commenter, owner) && commenterType === 'party_member') {
    return { rule: 'rival_party_comment', unitScore: 30, label: 'Rakip parti üye yorum' };
  }

  if (commenterType === 'mp' && ownerType === 'verified_member') return { rule: 'mp_to_citizen_comment', unitScore: 50, label: 'Milletvekili → üye yorum' };
  if (commenterType === 'mp' && ownerType === 'politician' && isSamePartyUser(commenter, owner)) {
    return { rule: 'mp_to_same_politician_comment', unitScore: 30, label: 'Milletvekili → aynı siyasi yorum' };
  }
  if (commenterType === 'mp' && ownerType === 'mp') return { rule: 'mp_to_mp_comment', unitScore: 10, label: 'Milletvekili → milletvekili yorum' };
  if (commenterType === 'mp' && ownerType === 'politician' && isRivalPartyUser(commenter, owner)) {
    return { rule: 'mp_to_rival_politician_comment', unitScore: 80, label: 'Milletvekili → rakip siyasi yorum' };
  }
  if (commenterType === 'mp' && ownerType === 'mp' && isRivalPartyUser(commenter, owner)) {
    return { rule: 'mp_to_rival_mp_comment', unitScore: 60, label: 'Milletvekili → rakip milletvekili yorum' };
  }
  return { rule: 'verified_member_comment', unitScore: 24, label: 'Varsayılan yorum' };
}

async function getPostPolitScoreBreakdown(req, res, postId) {
  const id = String(postId || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz paylaşım.' });

  const postRows = await supabaseRestGet('posts', { select: 'id,user_id,view_count,like_count,comment_count,polit_score', id: `eq.${id}`, limit: '1' }).catch(() => []);
  const post = postRows?.[0] || null;
  if (!post?.id || !post?.user_id) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });

  const ownerRows = await supabaseRestGet('users', { select: 'id,user_type,politician_type,party_id,is_verified', id: `eq.${post.user_id}`, limit: '1' }).catch(() => []);
  const owner = ownerRows?.[0] || null;

  const MAX = 2000;
  let truncated = false;

  // Likes
  const likeRows = await supabaseRestGet('likes', { select: 'user_id', post_id: `eq.${id}`, limit: String(MAX + 1) }).catch(() => []);
  const likesList = Array.isArray(likeRows) ? likeRows : [];
  const likesTrim = likesList.slice(0, MAX);
  if (likesList.length > MAX) truncated = true;
  const likerIds = Array.from(new Set(likesTrim.map((r) => String(r?.user_id || '').trim()).filter(Boolean)));

  // Comments (approved only)
  const commentRows = await supabaseRestGet('comments', { select: 'user_id,is_deleted', post_id: `eq.${id}`, is_deleted: 'eq.false', limit: String(MAX + 1) }).catch(() => []);
  const commentList = Array.isArray(commentRows) ? commentRows : [];
  const commentTrim = commentList.slice(0, MAX);
  if (commentList.length > MAX) truncated = true;
  const commenterIds = Array.from(new Set(commentTrim.map((r) => String(r?.user_id || '').trim()).filter(Boolean)));

  // Fetch involved users (chunked)
  const ids = Array.from(new Set([...likerIds, ...commenterIds]));
  const userMap = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    // eslint-disable-next-line no-await-in-loop
    const rows = await supabaseRestGet('users', { select: 'id,user_type,politician_type,party_id,is_verified', id: `in.(${chunk.join(',')})`, limit: String(chunk.length) }).catch(() => []);
    for (const u of rows || []) {
      const uid = String(u?.id || '').trim();
      if (uid) userMap.set(uid, u);
    }
  }

  const sumByRule = (items, ruleFn) => {
    const m = new Map(); // rule -> {rule,label,unitScore,count,totalScore}
    for (const it of items) {
      const uid = String(it?.user_id || '').trim();
      if (!uid) continue;
      const u = userMap.get(uid) || null;
      const r = ruleFn(u, owner);
      const key = r.rule;
      if (!m.has(key)) m.set(key, { rule: key, label: r.label, unitScore: r.unitScore, count: 0, totalScore: 0 });
      const cur = m.get(key);
      cur.count += 1;
      cur.totalScore += Number(r.unitScore || 0) || 0;
    }
    const arr = Array.from(m.values());
    arr.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const totalScore = arr.reduce((acc, x) => acc + (Number(x.totalScore || 0) || 0), 0);
    return { byRule: arr, totalScore };
  };

  const likes = sumByRule(likesTrim, likeScoreRule);
  const comments = sumByRule(commentTrim, commentScoreRule);

  return res.json({
    success: true,
    data: {
      postId: String(post.id),
      truncated,
      totalScore: (Number(likes.totalScore || 0) || 0) + (Number(comments.totalScore || 0) || 0),
      views: {
        count: Number(post.view_count || 0) || 0,
        score: null,
        note: 'Görüntüleme kırılımı (kim izledi) DB’de tutulmadığı için hesaplanamaz.',
      },
      likes: {
        count: Number(post.like_count || 0) || 0,
        ...likes,
      },
      comments: {
        count: Number(post.comment_count || 0) || 0,
        ...comments,
      },
    },
  });
}

async function getPostComments(req, res, postId) {
    // If authenticated, allow returning the user's own "pending" comments as well.
    // We currently model "pending moderation" as is_deleted=true to hide from others.
    const auth = verifyJwtFromRequest(req);
    const params = {
      select: '*,user:users(*)',
      post_id: `eq.${postId}`,
      order: 'created_at.desc',
    };
    if (auth?.id) {
      params.or = `(is_deleted.eq.false,user_id.eq.${auth.id})`;
    } else {
      params.is_deleted = 'eq.false';
    }
    const raw = await supabaseRestGet('comments', params).catch(() => []);
    let rows = Array.isArray(raw) ? raw : [];

    // Hide comments from blocked users (best-effort)
    if (auth?.id && rows.length > 0) {
      try {
        const meRows = await supabaseRestGet('users', { select: 'metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
        const meta = meRows?.[0]?.metadata && typeof meRows[0].metadata === 'object' ? meRows[0].metadata : {};
        const myBlocked = new Set(parseUserIdsFromMetadata(meta).map(String));
        rows = rows.filter((c) => {
          const uid = String(c?.user_id ?? c?.user?.id ?? '');
          if (uid && myBlocked.has(uid)) return false;
          const u = c?.user;
          const theirMeta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
          const theirBlocked = Array.isArray(theirMeta.blocked_user_ids) ? theirMeta.blocked_user_ids.map(String) : [];
          if (theirBlocked.includes(String(auth.id))) return false;
          return true;
        });
      } catch {
        // ignore
      }
    }

    // Add per-user "liked_by_me" for comment hearts so UI can render empty/full state.
    if (auth?.id && rows.length > 0) {
      const ids = rows
        .map((c) => c?.id ?? c?.comment_id ?? null)
        .filter(Boolean)
        .map((x) => String(x));

      if (ids.length > 0) {
        let supportsCommentId = true;
        try {
          // Probe likes.comment_id support
          await supabaseRestGet('likes', { select: 'id', comment_id: `eq.${ids[0]}`, user_id: `eq.${auth.id}`, limit: '1' });
        } catch (e) {
          const msg = String(e?.message || '');
          if (msg.includes('comment_id')) supportsCommentId = false;
        }

        let likedSet = new Set();
        if (supportsCommentId) {
          const inList = ids.join(',');
          const likes = await supabaseRestGet('likes', {
            select: 'comment_id',
            user_id: `eq.${auth.id}`,
            comment_id: `in.(${inList})`,
            limit: String(Math.min(2000, ids.length)),
          }).catch(() => []);
          (Array.isArray(likes) ? likes : []).forEach((l) => {
            if (l?.comment_id != null) likedSet.add(String(l.comment_id));
          });
        } else {
          const meRows = await supabaseRestGet('users', { select: 'metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
          const meta = meRows?.[0]?.metadata && typeof meRows[0].metadata === 'object' ? meRows[0].metadata : {};
          const liked = Array.isArray(meta.liked_comment_ids) ? meta.liked_comment_ids.map(String) : [];
          likedSet = new Set(liked);
        }

        rows = rows.map((c) => {
          const cid = String(c?.id ?? c?.comment_id ?? '');
          return { ...c, liked_by_me: likedSet.has(cid) };
        });
      }
    }

    res.json({ success: true, data: rows || [] });
}

function analyzeCommentContent(input) {
  const text = String(input || '').trim();
  if (!text) return { ok: false, error: 'Yorum boş olamaz.' };

  const lower = text.toLocaleLowerCase('tr-TR');

  const normalizeCore = (s) => {
    // Normalize Turkish + common obfuscations/leetspeak.
    let x = String(s || '').toLocaleLowerCase('tr-TR');
    x = x
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u');
    // Leetspeak-ish replacements
    x = x
      .replace(/0/g, 'o')
      .replace(/[1!|]/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/9/g, 'g');
    return x;
  };

  const collapseRepeats = (s) => String(s || '').replace(/(.)\1+/g, '$1');

  const normalizeForProfanity = (s) => {
    // Compact form: remove separators entirely (catches s.i.k / s i k / etc)
    let x = normalizeCore(s);
    x = x.replace(/[^a-z0-9]+/g, '');
    x = collapseRepeats(x);
    return x;
  };

  const normalizeTokensForProfanity = (s) => {
    // Token form: keep word-ish boundaries to avoid false positives like "şikayet" -> "sikayet"
    let x = normalizeCore(s);
    x = x.replace(/[^a-z0-9]+/g, ' ');
    const parts = x.split(/\s+/g).map((t) => collapseRepeats(t)).filter(Boolean);
    return parts;
  };

  const norm = normalizeForProfanity(lower);
  const tokens = normalizeTokensForProfanity(lower);

  // Basic threat heuristics (profanity/harassment/links/code).
  const reasons = [];
  if (/(https?:\/\/|www\.)/i.test(text)) reasons.push('link');
  if (/<\s*script|\bon\w+\s*=|javascript:/i.test(text)) reasons.push('zararlı_kod');
  if (/\b(select|union|drop|insert|update|delete)\b/i.test(text)) reasons.push('sql');
  // Profanity filter (stronger, with false-positive guards for Turkish words like "şikayet"/"sıkıntı")
  const hardRoots = [
    // common insults (longer roots here can be matched as substrings safely)
    'orospu',
    'kahpe',
    'yarrak',
    'ibne',
    'pezevenk',
    'yavsak',
    'pust',
    'gerizekal',
    'dangalak',
    'haysiyetsiz',
    'namussuz',
    'serefsiz',
    // common sexual profanity roots (obfuscated spacing caught via `norm`)
    'amcik',
    'aminakoy',
    'aminakoyim',
    'amkoy',
    'amkoyim',
    'amnakoy',
    'amnakoyim',
    'ananikoy',
    'ananisiker',
    'anansiker',
    'gavat',
    'gotver',
  ];
  // Short/ambiguous roots: handled with explicit logic to reduce false positives
  const shortExact = new Set(['amk', 'aq']);
  const softExact = new Set(['mal', 'aptal', 'salak', 'malsin', 'gerizekali', 'dangalak', 'salaksin', 'aptalsin']);
  const sikExcludes = [
    // "şikayet"/"sıkıntı" and derivatives should NOT trigger
    'sikayet',
    'sikayetci',
    'sikayetler',
    'sikint',
    'sikinti',
    'sikintili',
    'sikintilar',
    'sikintisiz',
  ];
  const isSikFamily = (t) => {
    const tok = String(t || '');
    if (!tok) return false;
    if (sikExcludes.some((x) => tok.startsWith(x))) return false;
    // catch siktir / sikmek / sikim / sikecem / etc.
    return /^(sik|siktir|sikim|siker|sikey|sikme|sikin|sikini|sikiyor|sikiyo|sikicem|sikcem|siktig)/.test(tok);
  };

  const ocExcludes = ['ocak', 'ocagi', 'ocakta', 'ocaklar', 'ocaktan'];
  const isOcInsult = (t) => {
    const tok = String(t || '');
    if (!tok) return false;
    if (ocExcludes.some((x) => tok.startsWith(x))) return false;
    // normalized oç family (oc, ocun, oclar, ocug..., etc.) but keep strict to avoid "ocak"
    if (tok === 'oc') return true;
    if (tok.startsWith('oc') && tok.length <= 5) return true;
    return false;
  };

  const picExcludes = ['picasso', 'picass', 'picnic', 'picture', 'pickup', 'picking', 'pickle'];
  const isPicFamily = (t) => {
    const tok = String(t || '');
    if (!tok) return false;
    if (picExcludes.some((x) => tok.startsWith(x))) return false;
    // "piç" family (pic, piclik, picler...) – allow short suffixes
    if (tok === 'pic') return true;
    if (tok.startsWith('pic') && tok.length <= 7) return true;
    return false;
  };

  const gotExcludes = ['gotik', 'gotikler', 'gotikce'];
  const isGotFamily = (t) => {
    const tok = String(t || '');
    if (!tok) return false;
    if (gotExcludes.some((x) => tok.startsWith(x))) return false;
    // normalized göt family
    if (tok === 'got') return true;
    if (tok.startsWith('got') && tok.length <= 7) return true;
    return false;
  };

  const tokenProfane =
    tokens.some((t) => {
      const tok = String(t || '');
      if (!tok) return false;
      if (isSikFamily(tok)) return true;
      if (shortExact.has(tok)) return true;
      if (isOcInsult(tok)) return true;
      if (isPicFamily(tok)) return true;
      if (isGotFamily(tok)) return true;
      if (softExact.has(tok)) return true;
      // allow substring match for longer roots (>=4) within the token (covers basic obfuscations)
      for (const r of hardRoots) {
        if (!r) continue;
        // only match longer roots as substrings to avoid false positives ("picasso" etc.)
        if (r.length < 4) continue;
        if (tok.includes(r)) return true;
      }
      return false;
    }) ||
    // Compact scan for split/obfuscated versions across separators
    hardRoots.some((r) => r && r.length >= 4 && norm.includes(r)) ||
    // Compact scan for short exacts in collapsed text (e.g. "a m k")
    Array.from(shortExact).some((r) => r && norm.includes(r)) ||
    isSikFamily(norm);

  if (tokenProfane) reasons.push('hakaret');
  if (/(?:\b(öl|öldür|vur|kes|tehdit)\b)/i.test(lower)) reasons.push('tehdit');

  const flagged = reasons.length > 0;
  return { ok: true, text, flagged, reasons };
}

async function notifyAdminsAboutComment(req, { type, commentId, postId, actorId, title, message }) {
  const admins = await supabaseRestGet('users', { select: 'id', is_admin: 'eq.true', limit: '50' }).catch(() => []);
  const targets = (admins || []).map((a) => a.id).filter(Boolean);
  if (!targets.length) return;
  const rows = targets.map((uid) => ({
    user_id: uid,
    actor_id: actorId || null,
    type: String(type || 'system').slice(0, 20),
    post_id: postId || null,
    comment_id: commentId || null,
    is_read: false,
  }));
  await supabaseInsertNotifications(rows).catch(() => null);
  // Email admins (best-effort)
  try {
    await Promise.all(targets.map((uid) => sendNotificationEmail(req, { userId: uid, type: 'system', actorId, postId }).catch(() => null)));
  } catch {
    // ignore
  }
}

function extractMentionUsernames(text) {
  const t = String(text || '');
  if (!t || t.length < 2) return [];
  const out = new Set();
  const re = /@([a-z0-9._-]{4,20})/gi;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(t))) {
    const u = String(m[1] || '').trim().toLowerCase();
    if (!u) continue;
    // Keep compatibility with our username checks (min 5 chars).
    if (u.length < 5 || u.length > 15) continue;
    out.add(u);
    if (out.size >= 5) break;
  }
  return Array.from(out);
}

async function notifyMentions(req, { text, actorId, postId = null, commentId = null, excludeUserIds = [] }) {
  try {
    const actor = String(actorId || '').trim();
    if (!actor) return;
    const usernames = extractMentionUsernames(text);
    if (!usernames.length) return;

    const exclude = new Set((excludeUserIds || []).map((x) => String(x)).filter(Boolean));
    exclude.add(actor);

    // PostgREST "in.(...)" doesn't like quotes for non-uuid; usernames are safe here.
    const inList = usernames.join(',');
    const users = await supabaseRestGet('users', {
      select: 'id,username,is_active',
      username: `in.(${inList})`,
      is_active: 'eq.true',
      limit: String(Math.min(10, usernames.length)),
    }).catch(() => []);

    const targets = (Array.isArray(users) ? users : [])
      .filter((u) => u?.id && !exclude.has(String(u.id)))
      .slice(0, 5);
    if (!targets.length) return;

    const rows = [];
    for (const u of targets) {
      const uid = String(u.id);
      // Respect blocks (best-effort)
      try {
        // eslint-disable-next-line no-await-in-loop
        const blocked = await isBlockedBetween(actor, uid).catch(() => false);
        if (blocked) continue;
      } catch {
        // ignore
      }
      rows.push({
        user_id: uid,
        actor_id: actor,
        type: 'mention',
        post_id: postId || null,
        comment_id: commentId || null,
        title: 'Bahsedilme',
        message: 'Sizi bir içerikte etiketledi.',
        is_read: false,
      });
    }

    if (!rows.length) return;
    await supabaseInsertNotifications(rows).catch(() => null);
    // Email (best-effort)
    for (const r of rows) {
      // eslint-disable-next-line no-await-in-loop
      await sendNotificationEmail(req, { userId: r.user_id, type: 'mention', actorId: actor, postId: postId || null }).catch(() => null);
    }
  } catch {
    // ignore (best-effort)
  }
}

async function addPostComment(req, res, postId) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!(await ensureEmailVerifiedForWrite(req, res, auth))) return;
    const ip = getClientIp(req);
    const rl = rateLimit(`comment:${auth.id}:${ip}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) {
      return res.status(429).json({ success: false, error: 'Çok fazla yorum denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });
    }
    const body = await readJsonBody(req);
    const raw = String(body?.content || '').trim();
    if (!raw) return res.status(400).json({ success: false, error: 'Yorum boş olamaz.' });
    if (raw.length > 300) return res.status(400).json({ success: false, error: 'Yorum en fazla 300 karakter olabilir.' });
    const analyzed = analyzeCommentContent(raw);
    if (!analyzed.ok) return res.status(400).json({ success: false, error: analyzed.error });
    const content = analyzed.text;
    const parent_id = body.parent_id || null;

    // Load post owner (also used for notifications later) + block enforcement
    const postRows = await supabaseRestGet('posts', { select: 'id,user_id,is_deleted', id: `eq.${postId}`, limit: '1' }).catch(() => []);
    const ownerId = postRows?.[0]?.user_id ?? null;
    if (!ownerId) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });
    if (postRows?.[0]?.is_deleted === true) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });
    const blocked = await isBlockedBetween(auth.id, ownerId).catch(() => false);
    if (blocked) return res.status(403).json({ success: false, error: 'Bu kullanıcıyla etkileşemezsiniz (engelleme mevcut).' });

    // Max 3 comments per user per post
    const existing = await supabaseRestGet('comments', {
      select: 'id',
      post_id: `eq.${postId}`,
      user_id: `eq.${auth.id}`,
      limit: '4',
      order: 'created_at.desc',
    }).catch(() => []);
    if (Array.isArray(existing) && existing.length >= 3) {
      return res.status(400).json({ success: false, error: 'Bu gönderiye en fazla 3 yorum yazabilirsiniz.' });
    }

    // If flagged by filter: save as "pending" (hidden for others) and notify admins
    const pending = analyzed.flagged;
    const inserted = await supabaseRestInsert('comments', [{
        post_id: postId,
        user_id: auth.id,
        content,
        parent_id,
        is_deleted: pending ? true : false,
    }]);
    const row = inserted?.[0] || null;

    // Notify post owner (no self-notify). We notify even if pending, so owner knows something happened.
    try {
      if (ownerId && String(ownerId) !== String(auth.id)) {
        await supabaseInsertNotifications([
          {
            user_id: ownerId,
            actor_id: auth.id,
            type: 'comment',
            post_id: postId,
            comment_id: row?.id || null,
            is_read: false,
          },
        ]).catch(() => null);
        sendNotificationEmail(req, { userId: ownerId, type: 'comment', actorId: auth.id, postId }).catch(() => null);
      }
    } catch {
      // best-effort
    }

    // Mention notifications in comment body (best-effort)
    if (row?.id) {
      notifyMentions(req, { text: content, actorId: auth.id, postId, commentId: row.id, excludeUserIds: [ownerId] }).catch(() => null);
    }

    if (pending && row?.id) {
      await notifyAdminsAboutComment(req, {
        type: 'comment_review',
        commentId: row.id,
        postId,
        actorId: auth.id,
        title: 'Yorum inceleme kuyruğu',
        message:
          'Bu yorum güvenlik filtresine takıldı. Admin panelinden inceleyip onaylayabilirsiniz.',
      });
    }
    res.status(201).json({
      success: true,
      data: row,
      pending_review: pending,
      message: pending
        ? 'Yorumunuz güvenlik kontrolü nedeniyle incelemeye alındı. Onaylanana kadar diğer kullanıcılara gösterilmez.'
        : undefined,
    });
}

async function updateComment(req, res, commentId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const body = await readJsonBody(req);
  const raw = String(body?.content || '').trim();
  if (!raw) return res.status(400).json({ success: false, error: 'Yorum boş olamaz.' });
  if (raw.length > 300) return res.status(400).json({ success: false, error: 'Yorum en fazla 300 karakter olabilir.' });
  const analyzed = analyzeCommentContent(raw);
  if (!analyzed.ok) return res.status(400).json({ success: false, error: analyzed.error });

  const rows = await supabaseRestGet('comments', { select: '*', id: `eq.${commentId}`, limit: '1' }).catch(() => []);
  const c = rows?.[0];
  if (!c) return res.status(404).json({ success: false, error: 'Yorum bulunamadı.' });
  if (String(c.user_id) !== String(auth.id)) return res.status(403).json({ success: false, error: 'Bu yorumu düzenleyemezsiniz.' });

  const createdAt = new Date(c.created_at || c.createdAt || 0);
  if (!Number.isFinite(createdAt.getTime())) return res.status(400).json({ success: false, error: 'Yorum tarihi okunamadı.' });
  const tenMin = 10 * 60 * 1000;
  if (Date.now() - createdAt.getTime() > tenMin) {
    return res.status(400).json({ success: false, error: 'Yorum düzenleme süresi doldu (10 dakika).' });
  }

  const pending = analyzed.flagged;
  const updated = await supabaseRestPatch(
    'comments',
    { id: `eq.${commentId}`, user_id: `eq.${auth.id}` },
    { content: analyzed.text, updated_at: new Date().toISOString(), is_deleted: pending ? true : false }
  ).catch(() => []);
  const row = updated?.[0] || null;
  if (pending && row?.id) {
    await notifyAdminsAboutComment(req, {
      type: 'comment_review',
      commentId: row.id,
      postId: row.post_id,
      actorId: auth.id,
      title: 'Yorum inceleme (düzenleme)',
      message: 'Düzenlenen yorum güvenlik filtresine takıldı. İnceleyip onaylayabilirsiniz.',
    });
  }
  return res.json({
    success: true,
    data: row,
    pending_review: pending,
    message: pending
      ? 'Yorumunuz güvenlik kontrolü nedeniyle incelemeye alındı. Onaylanana kadar diğer kullanıcılara gösterilmez.'
      : undefined,
  });
}

async function reportComment(req, res, commentId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const body = await readJsonBody(req);
  const reason = String(body?.reason || '').trim();
  const details = String(body?.details || '').trim();
  if (!reason) return res.status(400).json({ success: false, error: 'Şikayet nedeni seçmelisiniz.' });
  if (details.length > 200) return res.status(400).json({ success: false, error: 'Şikayet notu en fazla 200 karakter olabilir.' });
  // Security filter for report notes (prevent code/SQL payloads)
  if (details) {
    const analyzed = analyzeCommentContent(details);
    if (analyzed?.flagged && (analyzed.reasons || []).some((r) => r === 'zararlı_kod' || r === 'sql')) {
      return res.status(400).json({ success: false, error: 'Şikayet notu güvenlik filtresine takıldı. Lütfen metni sadeleştirip tekrar deneyin.' });
    }
  }

  // Load comment for context (best effort)
  const rows = await supabaseRestGet('comments', { select: '*', id: `eq.${commentId}`, limit: '1' }).catch(() => []);
  const c = rows?.[0] || null;
  const postId = c?.post_id || null;

  await notifyAdminsAboutComment(req, {
    type: 'comment_report',
    commentId,
    postId,
    actorId: auth.id,
    title: 'Yorum şikayeti',
    message: `Neden: ${reason}${details ? `\nNot: ${details}` : ''}`,
  });

  return res.json({
    success: true,
    message: 'Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.',
  });
}

async function reportPost(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const body = await readJsonBody(req);
  const reason = String(body?.reason || '').trim();
  const details = String(body?.details || '').trim();
  if (!reason) return res.status(400).json({ success: false, error: 'Şikayet nedeni seçmelisiniz.' });
  if (details.length > 200) return res.status(400).json({ success: false, error: 'Şikayet notu en fazla 200 karakter olabilir.' });
  // Security filter for report notes (prevent code/SQL payloads)
  if (details) {
    const analyzed = analyzeCommentContent(details);
    if (analyzed?.flagged && (analyzed.reasons || []).some((r) => r === 'zararlı_kod' || r === 'sql')) {
      return res.status(400).json({ success: false, error: 'Şikayet notu güvenlik filtresine takıldı. Lütfen metni sadeleştirip tekrar deneyin.' });
    }
  }

  await notifyAdminsAboutComment(req, {
    type: 'post_report',
    commentId: null,
    postId,
    actorId: auth.id,
    title: 'Gönderi şikayeti',
    message: `Neden: ${reason}${details ? `\nNot: ${details}` : ''}`,
  });

  return res.json({
    success: true,
    message: 'Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.',
  });
}

async function reportUser(req, res, userId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const tid = String(userId || '').trim();
  if (!isSafeId(tid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  if (String(tid) === String(auth.id)) return res.status(400).json({ success: false, error: 'Kendinizi şikayet edemezsiniz.' });

  const body = await readJsonBody(req);
  const reason = String(body?.reason || '').trim();
  const details = String(body?.details || '').trim();
  if (!reason) return res.status(400).json({ success: false, error: 'Şikayet nedeni seçmelisiniz.' });
  if (details.length > 200) return res.status(400).json({ success: false, error: 'Şikayet notu en fazla 200 karakter olabilir.' });
  if (details) {
    const analyzed = analyzeCommentContent(details);
    if (analyzed?.flagged && (analyzed.reasons || []).some((r) => r === 'zararlı_kod' || r === 'sql')) {
      return res.status(400).json({ success: false, error: 'Şikayet notu güvenlik filtresine takıldı. Lütfen metni sadeleştirip tekrar deneyin.' });
    }
  }

  // Best-effort user context
  let username = '';
  let fullName = '';
  try {
    const rows = await supabaseRestGet('users', { select: 'id,username,full_name', id: `eq.${tid}`, limit: '1' }).catch(() => []);
    const u = rows?.[0] || null;
    username = String(u?.username || '').trim();
    fullName = String(u?.full_name || '').trim();
  } catch {
    // ignore
  }

  await notifyAdminsAboutComment(req, {
    type: 'user_report',
    commentId: null,
    postId: null,
    actorId: auth.id,
    title: 'Kullanıcı şikayeti',
    message: `Kullanıcı: ${tid}${username ? ` (@${username})` : ''}${fullName ? `\nAd: ${fullName}` : ''}\nNeden: ${reason}${
      details ? `\nNot: ${details}` : ''
    }`,
  }).catch(() => null);

  return res.json({
    success: true,
    message: 'Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.',
  });
}

async function trackPostShare(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!(await ensureEmailVerifiedForWrite(req, res, auth))) return;

  // Block checks (either direction) between sharer and post owner
  try {
    const rows = await supabaseRestGet('posts', { select: 'id,user_id,is_deleted', id: `eq.${postId}`, limit: '1' }).catch(() => []);
    const p = rows?.[0] || null;
    if (!p || p.is_deleted === true) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });
    const ownerId = p.user_id || null;
    if (ownerId) {
      const blocked = await isBlockedBetween(auth.id, ownerId).catch(() => false);
      if (blocked) return res.status(403).json({ success: false, error: 'Bu kullanıcıyla etkileşemezsiniz (engelleme mevcut).' });
    }
  } catch {
    // ignore
  }

  // Best-effort increment share_count
  try {
    const rows = await supabaseRestGet('posts', { select: 'id,user_id,share_count', id: `eq.${postId}`, limit: '1' }).catch(() => []);
    const p = rows?.[0] || null;
    if (p) {
      const next = Math.max(0, Number(p.share_count || 0) + 1);
      await supabaseRestPatch('posts', { id: `eq.${postId}` }, { share_count: next }).catch(() => null);

      // notify owner
      const ownerId = p.user_id || null;
      if (ownerId && String(ownerId) !== String(auth.id)) {
        await supabaseInsertNotifications([
          {
            user_id: ownerId,
            actor_id: auth.id,
            type: 'share',
            post_id: postId,
            is_read: false,
          },
        ]).catch(() => null);
        sendNotificationEmail(req, { userId: ownerId, type: 'share', actorId: auth.id, postId }).catch(() => null);
      }
    }
  } catch {
    // noop
  }
  return res.json({ success: true });
}

async function toggleCommentLike(req, res, commentId) {
  try {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const cid = String(commentId || '').trim();
    if (!isSafeId(cid)) return res.status(400).json({ success: false, error: 'Geçersiz yorum.' });

    // Try to use likes table with comment_id if available
    let supportsCommentId = true;
    try {
      await supabaseRestGet('likes', { select: 'id', comment_id: `eq.${cid}`, user_id: `eq.${auth.id}`, limit: '1' });
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('comment_id')) supportsCommentId = false;
    }

    const commentRows = await supabaseRestGet('comments', { select: '*', id: `eq.${cid}`, limit: '1' }).catch(() => []);
    const c = commentRows?.[0];
    if (!c) return res.status(404).json({ success: false, error: 'Yorum bulunamadı.' });

    // Block checks (either direction) between liker and comment author
    try {
      const blocked = await isBlockedBetween(auth.id, c.user_id);
      if (blocked) return res.status(403).json({ success: false, error: 'Bu kullanıcıyla etkileşemezsiniz (engelleme mevcut).' });
    } catch {
      // ignore
    }

    if (supportsCommentId) {
      try {
        const existing = await supabaseRestGet('likes', { select: 'id', comment_id: `eq.${cid}`, user_id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
        if (existing && existing.length > 0) {
          await supabaseRestDelete('likes', { comment_id: `eq.${cid}`, user_id: `eq.${auth.id}` }).catch(() => null);
          const next = Math.max(0, Number(c.like_count || 0) - 1);
          await supabaseRestPatch('comments', { id: `eq.${cid}` }, { like_count: next }).catch(() => null);
          return res.json({ success: true, action: 'unliked', like_count: next });
        }
        await supabaseRestInsert('likes', [{ comment_id: cid, user_id: auth.id }]).catch(() => {
          // Insert can fail due to schema constraints (e.g. post_id NOT NULL) even if comment_id exists.
          throw new Error('LIKES_SCHEMA_UNSUPPORTED');
        });
        const next = Number(c.like_count || 0) + 1;
        await supabaseRestPatch('comments', { id: `eq.${cid}` }, { like_count: next }).catch(() => null);

        // Notify comment owner (no self-notify)
        try {
          const ownerId = c?.user_id != null ? String(c.user_id) : '';
          const postId = c?.post_id != null ? String(c.post_id) : null;
          if (ownerId && String(ownerId) !== String(auth.id)) {
            await supabaseInsertNotifications([
              {
                user_id: ownerId,
                actor_id: auth.id,
                type: 'comment_like',
                post_id: postId,
                comment_id: cid,
                is_read: false,
              },
            ]).catch(() => null);
            sendNotificationEmail(req, { userId: ownerId, type: 'comment_like', actorId: auth.id, postId }).catch(() => null);
          }
        } catch {
          // ignore
        }
        return res.json({ success: true, action: 'liked', like_count: next });
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('comment_id') || msg.includes('post_id') || msg.includes('LIKES_SCHEMA_UNSUPPORTED')) {
          supportsCommentId = false;
        } else {
          // If anything unexpected happens, fallback instead of 500.
          supportsCommentId = false;
        }
      }
    }

    // Fallback: track liked comment ids in user.metadata (requires users.metadata)
    const users = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
    const me = users?.[0] || null;
    const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};
    const liked = Array.isArray(meta.liked_comment_ids) ? meta.liked_comment_ids.map(String) : [];
    const has = liked.includes(String(cid));
    const nextLiked = has ? liked.filter((x) => x !== String(cid)) : [String(cid), ...liked].slice(0, 5000);
    const nextCount = Math.max(0, Number(c.like_count || 0) + (has ? -1 : 1));

    await safeUserPatch(auth.id, { metadata: { ...meta, liked_comment_ids: nextLiked } }).catch(() => null);
    await supabaseRestPatch('comments', { id: `eq.${cid}` }, { like_count: nextCount }).catch(() => null);

    // Notify comment owner (fallback schema path) (no self-notify)
    if (!has) {
      try {
        const ownerId = c?.user_id != null ? String(c.user_id) : '';
        const postId = c?.post_id != null ? String(c.post_id) : null;
        if (ownerId && String(ownerId) !== String(auth.id)) {
          await supabaseInsertNotifications([
            {
              user_id: ownerId,
              actor_id: auth.id,
              type: 'comment_like',
              post_id: postId,
              comment_id: cid,
              is_read: false,
            },
          ]).catch(() => null);
          sendNotificationEmail(req, { userId: ownerId, type: 'comment_like', actorId: auth.id, postId }).catch(() => null);
        }
      } catch {
        // ignore
      }
    }
    return res.json({ success: true, action: has ? 'unliked' : 'liked', like_count: nextCount });
  } catch (e) {
    // Prevent Vercel from returning a non-JSON 500 (so client doesn't show generic "Sunucu hatası").
    return res.status(500).json({ success: false, error: 'Beğeni işlemi şu an yapılamıyor. Lütfen tekrar deneyin.' });
  }
}

async function adminListPendingComments(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { limit = 50, offset = 0 } = req.query || {};
  const rows = await supabaseRestGet('comments', {
    select: '*,user:users(*),post:posts(*)',
    is_deleted: 'eq.true',
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  }).catch(() => []);
  return res.json({ success: true, data: rows || [] });
}

async function adminApproveComment(req, res, commentId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const updated = await supabaseRestPatch('comments', { id: `eq.${commentId}` }, { is_deleted: false }).catch(() => []);
  return res.json({ success: true, data: updated?.[0] || null });
}

async function adminGetComments(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { limit = 100, offset = 0, status = 'all' } = req.query || {};
  const lim = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 100));
  const off = Math.max(0, parseInt(String(offset), 10) || 0);
  const st = String(status || 'all').trim();

  const params = {
    select: 'id,content,created_at,updated_at,is_deleted,like_count,post_id,user_id,user:users(id,username,full_name,avatar_url),post:posts(id,content,created_at)',
    order: 'created_at.desc',
    limit: String(lim),
    offset: String(off),
  };
  if (st === 'approved') params.is_deleted = 'eq.false';
  if (st === 'pending') params.is_deleted = 'eq.true';
  const rows = await supabaseRestGet('comments', params).catch(() => []);
  return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
}

async function adminDeleteComment(req, res, commentId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const cid = String(commentId || '').trim();
  if (!isSafeId(cid)) return res.status(400).json({ success: false, error: 'Geçersiz yorum.' });
  const updated = await supabaseRestPatch(
    'comments',
    { id: `eq.${cid}` },
    { is_deleted: true, content: '[Silindi]', updated_at: new Date().toISOString() }
  ).catch(() => []);
  return res.json({ success: true, data: updated?.[0] || null });
}

async function adminStorageList(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const requestedBucket = String(req.query?.bucket || 'uploads').trim() || 'uploads';
  const prefix = String(req.query?.prefix || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || 100), 10) || 100));
  const offset = Math.max(0, parseInt(String(req.query?.offset || 0), 10) || 0);

  try {
    const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: 'Storage listesi alınamadı: sunucu depolama anahtarı eksik (SUPABASE_SERVICE_ROLE_KEY).',
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Supabase Storage list() is NOT recursive.
    // Our app stores media under e.g. posts/<userId>/<file>, messages/<userId>/<file>, avatars/<userId>/<file>.
    // So a shallow list of `posts` returns only folder placeholders (looks like "empty").
    const listOne = async (bucketName, pfx, lim, off) => {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(pfx, { limit: lim, offset: off, sortBy: { column: 'updated_at', order: 'desc' } });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    };

    const resolveBucket = async () => {
      const envBucket = String(process.env.SUPABASE_BUCKET_NAME || '').trim();
      const candidates = Array.from(
        new Set(
          [
            requestedBucket,
            envBucket,
            'uploads',
            'polithane-images',
            'polithane_images',
            'media',
            'public',
            'avatars',
          ].filter(Boolean)
        )
      );

      // Best-effort: try each bucket with a tiny list call.
      for (const b of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await listOne(b, prefix, 1, 0);
          return b;
        } catch {
          // continue
        }
      }
      // Fall back to requested bucket (preserves current behavior)
      return requestedBucket;
    };

    const bucket = await resolveBucket();

    const isFolderLike = (it) => {
      if (!it || !it.name) return false;
      // In Supabase Storage, real objects typically have an `id`.
      if (it.id) return false;
      // Folder placeholders generally have null metadata and no mimetype/size.
      const meta = it?.metadata;
      const hasMeta = meta && typeof meta === 'object';
      const mt = hasMeta ? String(meta?.mimetype || '').trim() : '';
      const sz = hasMeta ? Number(meta?.size || 0) : 0;
      return !mt && !(Number.isFinite(sz) && sz > 0);
    };

    const toRow = (it, pfx) => {
      const path = pfx ? `${pfx}/${it.name}` : it.name;
      const pub = supabase.storage.from(bucket).getPublicUrl(path)?.data?.publicUrl || '';
      const size = Number(it?.metadata?.size || 0) || 0;
      const mimetype = String(it?.metadata?.mimetype || '').trim();
      return {
        id: it.id || null,
        name: it.name,
        path,
        bucket,
        public_url: pub,
        created_at: it.created_at || null,
        updated_at: it.updated_at || null,
        size,
        mimetype,
      };
    };

    // Depth-2 recursive listing (enough for our storage layout):
    // - prefix '' -> root folders (posts/messages/avatars/...)
    // - prefix 'posts' -> userId subfolders -> files
    // - prefix 'posts/<userId>' -> files
    const first = await listOne(bucket, prefix, Math.max(limit, 100), offset);
    const firstFiles = first.filter((it) => it && it.name && !it.name.endsWith('/') && !isFolderLike(it));
    const firstFolders = first.filter((it) => it && it.name && !it.name.endsWith('/') && isFolderLike(it));

    let rows = firstFiles.map((it) => toRow(it, prefix));

    // If we didn't find files, try deeper.
    // - When prefix is empty: root -> posts -> <userId> -> <file> (2 levels down)
    // - When prefix is "posts": posts -> <userId> -> <file> (1 more level down)
    if (rows.length < limit && firstFolders.length > 0) {
      const walkOneLevel = async (basePrefix, folderItems) => {
        for (const f of folderItems) {
          const childPrefix = basePrefix ? `${basePrefix}/${f.name}` : f.name;
          // eslint-disable-next-line no-await-in-loop
          const child = await listOne(bucket, childPrefix, Math.max(limit, 100), 0).catch(() => []);
          const childFiles = (child || []).filter((it) => it && it.name && !it.name.endsWith('/') && !isFolderLike(it));
          const childFolders = (child || []).filter((it) => it && it.name && !it.name.endsWith('/') && isFolderLike(it));
          for (const it of childFiles) {
            rows.push(toRow(it, childPrefix));
            if (rows.length >= limit) return;
          }
          // If we are at root (basePrefix === '' and childPrefix is like 'posts'),
          // we need one more level (posts/<userId>/file).
          if (!basePrefix && childFolders.length > 0) {
            for (const ff of childFolders) {
              const grandPrefix = `${childPrefix}/${ff.name}`;
              // eslint-disable-next-line no-await-in-loop
              const grand = await listOne(bucket, grandPrefix, Math.max(limit, 100), 0).catch(() => []);
              const grandFiles = (grand || []).filter((it) => it && it.name && !it.name.endsWith('/') && !isFolderLike(it));
              for (const it of grandFiles) {
                rows.push(toRow(it, grandPrefix));
                if (rows.length >= limit) return;
              }
              if (rows.length >= limit) return;
            }
          }
          if (rows.length >= limit) return;
        }
      };
      // eslint-disable-next-line no-await-in-loop
      await walkOneLevel(prefix, firstFolders);
    }

    // Sort newest first (best-effort)
    rows.sort((a, b) => String(b?.updated_at || '').localeCompare(String(a?.updated_at || '')));
    rows = rows.slice(0, limit);

    return res.json({
      success: true,
      data: rows,
      meta: { bucket, requestedBucket, prefix, limit, offset },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Storage listesi alınamadı.') });
  }
}

async function adminStorageDelete(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const bucket = String(body?.bucket || 'uploads').trim() || 'uploads';
  const paths = Array.isArray(body?.paths) ? body.paths.map((p) => String(p || '').trim()).filter(Boolean) : [];
  if (paths.length === 0) return res.status(400).json({ success: false, error: 'Silinecek dosya seçin.' });
  if (paths.length > 50) return res.status(400).json({ success: false, error: 'Tek seferde en fazla 50 dosya silinebilir.' });
  try {
    const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: 'Dosya silinemedi: sunucu depolama anahtarı eksik (SUPABASE_SERVICE_ROLE_KEY).',
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Dosya silinemedi.') });
  }
}

async function adminStorageReplace(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const bucket = String(body?.bucket || 'uploads').trim() || 'uploads';
  const path = String(body?.path || '').trim().replace(/^\/+/, '');
  const dataUrl = String(body?.dataUrl || '');
  const contentType = String(body?.contentType || '').trim();

  if (!path) return res.status(400).json({ success: false, error: 'Geçersiz dosya yolu.' });
  if (path.includes('..')) return res.status(400).json({ success: false, error: 'Geçersiz dosya yolu.' });
  if (path.length > 300) return res.status(400).json({ success: false, error: 'Dosya yolu çok uzun.' });

  // Safety: only allow replacing inside uploads bucket (avoid accidental system bucket ops)
  if (bucket !== 'uploads') {
    return res.status(400).json({ success: false, error: 'Sadece uploads bucket destekleniyor.' });
  }

  if (!dataUrl.startsWith('data:') || !dataUrl.includes('base64,')) {
    return res.status(400).json({ success: false, error: 'Geçersiz dosya verisi.' });
  }
  const base64 = dataUrl.split('base64,')[1] || '';
  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ success: false, error: 'Dosya çözümlenemedi.' });
  }
  if (!buf || buf.length === 0) return res.status(400).json({ success: false, error: 'Dosya boş.' });
  // Keep serverless safe
  const maxBytes = 12 * 1024 * 1024; // 12MB
  if (buf.length > maxBytes) return res.status(400).json({ success: false, error: 'Dosya çok büyük (max 12MB).' });

  const ct = contentType || dataUrl.slice(5).split(';')[0];
  if (!ct) return res.status(400).json({ success: false, error: 'Geçersiz dosya türü.' });

  try {
    await supabaseStorageUploadObject(bucket, path, buf, ct);
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Dosya güncellenemedi.') });
  }

  const { supabaseUrl } = getSupabaseKeys();
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  return res.json({ success: true, data: { bucket, path, publicUrl } });
}

async function togglePostLike(req, res, postId) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!(await ensureEmailVerifiedForWrite(req, res, auth))) return;
    const userId = auth.id;

    // Block checks (either direction) between liker and post owner
    try {
      const postRows = await supabaseRestGet('posts', { select: 'id,user_id,is_deleted', id: `eq.${postId}`, limit: '1' }).catch(() => []);
      const ownerId = postRows?.[0]?.user_id ?? null;
      if (!ownerId || postRows?.[0]?.is_deleted === true) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });
      const blocked = await isBlockedBetween(auth.id, ownerId);
      if (blocked) return res.status(403).json({ success: false, error: 'Bu kullanıcıyla etkileşemezsiniz (engelleme mevcut).' });
    } catch {
      // ignore (best-effort)
    }

    const existing = await supabaseRestGet('likes', { select: 'id', post_id: `eq.${postId}`, user_id: `eq.${userId}`, limit: '1' }).catch(() => []);
    if (existing && existing.length > 0) {
        await supabaseRestDelete('likes', { post_id: `eq.${postId}`, user_id: `eq.${userId}` });
        return res.json({ success: true, action: 'unliked' });
    }
    await supabaseRestInsert('likes', [{ post_id: postId, user_id: userId }]);

    // Notify post owner (no self-notify)
    try {
      const postRows = await supabaseRestGet('posts', { select: 'id,user_id', id: `eq.${postId}`, limit: '1' }).catch(() => []);
      const ownerId = postRows?.[0]?.user_id ?? null;
      if (ownerId && String(ownerId) !== String(userId)) {
        await supabaseInsertNotifications([
          {
            user_id: ownerId,
            actor_id: userId,
            type: 'like',
            post_id: postId,
            is_read: false,
          },
        ]).catch(() => null);
        sendNotificationEmail(req, { userId: ownerId, type: 'like', actorId: userId, postId }).catch(() => null);
      }
    } catch {
      // best-effort
    }
    return res.json({ success: true, action: 'liked' });
}

async function createPost(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!(await ensureEmailVerifiedForWrite(req, res, auth))) return;
    const ip = getClientIp(req);
    const rl = rateLimit(`post:${auth.id}:${ip}`, { windowMs: 60_000, max: 5 });
    if (!rl.ok) {
      return res.status(429).json({ success: false, error: 'Çok fazla paylaşım denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });
    }
    const body = await readJsonBody(req);

    const content = String(body.content_text ?? body.content ?? '').trim();
    const category = String(body.category || 'general').trim();
    const agenda_tag = String(body.agenda_tag || '').trim() || null;
    const media_urls = Array.isArray(body.media_urls) ? body.media_urls : [];
    const content_type = String(body.content_type || (media_urls.length > 0 ? 'image' : 'text')).trim();
    const thumbnail_url = String(body.thumbnail_url || '').trim() || null;
    const is_trending = typeof body?.is_trending === 'boolean' ? body.is_trending : undefined;
    const media_duration =
      body?.media_duration !== undefined && body?.media_duration !== null
        ? Math.max(0, Number(body.media_duration) || 0)
        : undefined;

    if (!content) return res.status(400).json({ success: false, error: 'İçerik boş olamaz.' });
    if (content.length > 5000) return res.status(400).json({ success: false, error: 'İçerik çok uzun.' });

    // Get party_id from user (if exists)
    const userRows = await supabaseRestGet('users', {
      select: 'id,party_id,user_type,is_verified,is_admin,is_active,metadata',
      id: `eq.${auth.id}`,
      limit: '1',
    }).catch(() => []);
    const u = userRows?.[0] || null;
    const party_id = u?.party_id ?? null;

    if (u?.is_active === false) {
      return res.status(403).json({ success: false, error: 'Bu hesap aktif değil.' });
    }

    // Approval gate: pending accounts can login but cannot post yet.
    const ut = String(u?.user_type || 'citizen');
    const pending = !u?.is_admin && ut !== 'citizen' && !u?.is_verified;
    if (pending) {
      return res.status(403).json({
        success: false,
        error: 'Üyeliğiniz onay bekliyor. Onay gelene kadar Polit Atamazsınız.',
        code: 'APPROVAL_REQUIRED',
      });
    }

    // Claim flow gate: allow login, but do not allow posting until admin approval.
    try {
      const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
      const cr = meta?.claim_request && typeof meta.claim_request === 'object' ? meta.claim_request : null;
      if (cr && String(cr.status || '') === 'pending') {
        return res.status(403).json({
          success: false,
          error: 'Profil sahiplenme başvurunuz inceleniyor. Onay gelene kadar paylaşım yapamazsınız.',
          code: 'CLAIM_PENDING',
        });
      }
    } catch {
      // ignore
    }

    // Profanity/security filter for posts (strict: block publishing)
    const analyzed = analyzeCommentContent(content);
    if (analyzed?.flagged) {
      return res.status(400).json({
        success: false,
        error: 'İçerik güvenlik filtresine takıldı. Lütfen metni düzenleyip tekrar deneyin.',
        code: 'CONTENT_FILTERED',
        reasons: analyzed.reasons || [],
      });
    }

    // Try schema variants (content/content_text) and optional fields (is_trending, media_duration)
    let inserted;
    try {
      const willProcessVideo = content_type === 'video' && Array.isArray(media_urls) && media_urls.length > 0;
      const payload = {
        user_id: auth.id,
        party_id,
        content_type,
        content_text: content,
        category,
        agenda_tag,
        media_urls,
        ...(willProcessVideo ? { media_status: 'processing', media_original_urls: media_urls } : {}),
        ...(thumbnail_url ? { thumbnail_url } : {}),
        ...(Number.isFinite(media_duration) ? { media_duration } : {}),
        is_deleted: false,
        ...(typeof is_trending === 'boolean' ? { is_trending } : {}),
      };
      inserted = await supabaseRestInsert('posts', [payload]);
    } catch (e) {
      const msg = String(e?.message || '');
      // Retry without unsupported fields (schema-agnostic)
      if (
        msg.includes('is_trending') ||
        msg.includes('media_duration') ||
        msg.includes('thumbnail_url') ||
        msg.includes('media_status') ||
        msg.includes('media_original_urls') ||
        msg.includes('media_processed_at') ||
        msg.includes('media_processing_error')
      ) {
        try {
          inserted = await supabaseRestInsert('posts', [{
            user_id: auth.id,
            party_id,
            content_type,
            content_text: content,
            category,
            agenda_tag,
            media_urls,
            is_deleted: false,
          }]);
          // eslint-disable-next-line no-empty
        } catch {}
      }
      if (!inserted) {
        if (msg.includes('content_text') || msg.includes('content_type')) {
          // content/content_text schema fallback
          try {
            inserted = await supabaseRestInsert('posts', [{
              user_id: auth.id,
              party_id,
              content,
              category,
              agenda_tag,
              media_urls,
              ...(thumbnail_url ? { thumbnail_url } : {}),
              ...(Number.isFinite(media_duration) ? { media_duration } : {}),
              is_deleted: false,
              ...(typeof is_trending === 'boolean' ? { is_trending } : {}),
            }]);
          } catch (e2) {
            const msg2 = String(e2?.message || '');
            if (msg2.includes('is_trending') || msg2.includes('media_duration') || msg2.includes('thumbnail_url')) {
              inserted = await supabaseRestInsert('posts', [{
                user_id: auth.id,
                party_id,
                content,
                category,
                agenda_tag,
                media_urls,
                is_deleted: false,
              }]);
            } else {
              throw e2;
            }
          }
        } else {
          throw e;
        }
      }
    }
    const post = inserted?.[0] || null;

    // If this is a video upload, enqueue a transcode job (FFmpeg worker will standardize 9:16 + rotation).
    // Best-effort: never block publishing if the queue insert fails.
    try {
      if (post?.id && content_type === 'video' && Array.isArray(media_urls) && media_urls.length > 0) {
        const firstUrl = String(media_urls[0] || '').trim();
        const parsed = parseSupabasePublicObjectUrl(firstUrl);
        if (parsed?.bucket && parsed?.objectPath) {
          await supabaseRestInsert('media_jobs', [
            {
              post_id: String(post.id),
              user_id: String(auth.id),
              input_bucket: parsed.bucket,
              input_path: parsed.objectPath,
              input_public_url: firstUrl,
              status: 'queued',
            },
          ]);
        }
      }
    } catch {
      // ignore
    }

    // Mention notifications in post body (best-effort)
    if (post?.id) {
      notifyMentions(req, { text: content, actorId: auth.id, postId: String(post.id), commentId: null }).catch(() => null);
    }

    // Agenda polit puanı: each post/fast increases selected agenda score by user type.
    // Best-effort only: never block publishing if agenda update fails.
    try {
      const agendaTitle = String(agenda_tag || '').trim();
      if (agendaTitle) {
        const agendaDeltaForUserType = (userType) => {
          const t = String(userType || 'citizen').trim().toLowerCase();
          // Default mapping; can be made admin-configurable in a later phase.
          if (t === 'media' || t === 'journalist' || t === 'press') return 25;
          if (t === 'mp') return 25;
          if (t === 'party_official') return 10;
          if (t === 'party_member') return 5;
          if (t === 'citizen' || t === 'normal') return 1;
          return 1;
        };
        const delta = agendaDeltaForUserType(ut);
        const rows = await supabaseRestGet('agendas', { select: 'id,title,slug,trending_score,total_polit_score,post_count', title: `eq.${agendaTitle}`, limit: '1' }).catch(() => []);
        let a = rows?.[0] || null;

        // If agenda doesn't exist yet, auto-create it (no manual slug; URL-safe + unique).
        if (!a?.id) {
          const slugify = (input) => String(input || '').trim().toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
            .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
          const ensureUniqueSlug = async (base) => {
            const b0 = String(base || '').trim() || `gundem-${Date.now()}`;
            const base200 = b0.slice(0, 200);
            for (let i = 0; i < 50; i += 1) {
              const suffix = i === 0 ? '' : `-${i + 1}`;
              const maxBaseLen = 200 - suffix.length;
              const cand = `${base200.slice(0, Math.max(1, maxBaseLen))}${suffix}`.slice(0, 200);
              // eslint-disable-next-line no-await-in-loop
              const existing = await supabaseRestGet('agendas', { select: 'id', slug: `eq.${cand}`, limit: '1' }).catch(() => []);
              if (!Array.isArray(existing) || existing.length === 0) return cand;
            }
            return `${base200.slice(0, 180)}-${Date.now()}`.slice(0, 200);
          };

          const nowIso = new Date().toISOString();
          const slug = await ensureUniqueSlug(slugify(agendaTitle));
          const created = await supabaseRestInsert('agendas', [{
            title: agendaTitle,
            slug,
            is_active: true,
            is_trending: true,
            trending_score: Math.max(0, delta),
            total_polit_score: Math.max(0, delta),
            post_count: 1,
            created_at: nowIso,
            updated_at: nowIso,
          }]).catch(() => []);
          a = Array.isArray(created) ? created?.[0] : null;
        }

        if (a?.id) {
          const next = {
            updated_at: new Date().toISOString(),
            trending_score: Math.max(0, Number(a.trending_score || 0) + delta),
            total_polit_score: Math.max(0, Number(a.total_polit_score || 0) + delta),
            post_count: Math.max(0, Number(a.post_count || 0) + 1),
          };
          await supabaseRestPatch('agendas', { id: `eq.${a.id}` }, next).catch(() => null);
        }
      }
    } catch {
      // ignore
    }

    res.status(201).json({ success: true, data: post });
}

function fastSinceIso(hours = 24) {
  const h = Math.max(1, Number(hours) || 24);
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

async function getFastPublicUsers(req, res) {
  const since = fastSinceIso(24);
  const { limit = 80 } = req.query || {};
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 80));

  // Public: show globally active Fast users (last 24h), ordered by polit_score (and recency).
  const posts = await supabaseRestGet('posts', {
    select: 'id,user_id,created_at',
    is_deleted: 'eq.false',
    is_trending: 'eq.true',
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '2500',
  }).catch(() => []);

  const byUser = new Map();
  for (const p of Array.isArray(posts) ? posts : []) {
    const uid = p?.user_id != null ? String(p.user_id) : '';
    if (!uid) continue;
    const cur = byUser.get(uid) || { user_id: uid, story_count: 0, latest: 0 };
    cur.story_count += 1;
    const t = new Date(p.created_at || 0).getTime();
    if (t > cur.latest) cur.latest = t;
    byUser.set(uid, cur);
  }

  const ids = Array.from(byUser.keys()).slice(0, 400);
  if (ids.length === 0) return res.json({ success: true, data: [] });

  // NOTE: We keep room for future "Fast visibility" privacy setting.
  // If a user sets metadata.privacy_settings.fastVisibility = 'private', we exclude them from public Fast.
  const users = await supabaseRestGet('users', {
    select: 'id,username,full_name,avatar_url,is_active,polit_score,metadata',
    id: `in.(${ids.join(',')})`,
    is_active: 'eq.true',
    limit: String(Math.min(400, ids.length)),
  }).catch(() => []);
  const userMap = new Map((users || []).map((u) => [String(u.id), u]));

  const cards = ids
    .map((id) => {
      const u = userMap.get(String(id));
      const info = byUser.get(String(id));
      if (!u || !info) return null;
      const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
      const ps = meta?.privacy_settings && typeof meta.privacy_settings === 'object' ? meta.privacy_settings : {};
      const raw = String(ps.fastVisibility ?? ps.fast_visibility ?? 'public').trim().toLowerCase();
      const fastVis =
        raw === 'everyone' || raw === 'public'
          ? 'public'
          : raw === 'none' || raw === 'private'
            ? 'private'
            : raw === 'following'
              ? 'following'
              : raw;
      // Public list must only include "public/everyone" profiles.
      if (fastVis !== 'public') return null;

      return {
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        profile_image: u.avatar_url,
        story_count: info.story_count,
        latest_created_at: info.latest ? new Date(info.latest).toISOString() : null,
        polit_score: u.polit_score ?? 0,
      };
    })
    .filter(Boolean);

  cards.sort((a, b) => (Number(b.polit_score || 0) - Number(a.polit_score || 0)) || (new Date(b.latest_created_at || 0).getTime() - new Date(a.latest_created_at || 0).getTime()));

  const out = cards.slice(0, lim).map(({ polit_score, ...rest }) => rest);
  return res.json({ success: true, data: out });
}

async function getFastUsers(req, res) {
  const auth = verifyJwtFromRequest(req);
  // If not logged in, fall back to public Fast list.
  if (!auth?.id) return await getFastPublicUsers(req, res);
  const since = fastSinceIso(24);
  const { limit = 80 } = req.query || {};
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 80));
  const FALLBACK_THRESHOLD = Math.min(3, lim);

  // Only show followings (+ self)
  const followingRows = await supabaseRestGet('follows', {
    select: 'following_id',
    follower_id: `eq.${auth.id}`,
    limit: '500',
  }).catch(() => []);
  const ids = Array.from(
    new Set([String(auth.id), ...(followingRows || []).map((r) => String(r.following_id)).filter(Boolean)])
  );
  if (ids.length === 0) return res.json({ success: true, data: [] });

  // Fast posts = is_trending=true within last 24h
  const posts = await supabaseRestGet('posts', {
    select: 'id,user_id,created_at',
    user_id: `in.(${ids.join(',')})`,
    is_deleted: 'eq.false',
    is_trending: 'eq.true',
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '1000',
  }).catch(() => []);

  const list = Array.isArray(posts) ? posts : [];
  const byUser = new Map();
  for (const p of list) {
    const uid = p?.user_id != null ? String(p.user_id) : '';
    if (!uid) continue;
    const cur = byUser.get(uid) || { user_id: uid, story_count: 0, latest: 0 };
    cur.story_count += 1;
    const t = new Date(p.created_at || 0).getTime();
    if (t > cur.latest) cur.latest = t;
    byUser.set(uid, cur);
  }

  const activeIds = Array.from(byUser.keys());
  // We may still return fallback fast users if followings have none.

  const fetchUserCards = async (idsIn, infoMap) => {
    const idsList = Array.isArray(idsIn) ? idsIn : [];
    if (idsList.length === 0) return [];
    const users = await supabaseRestGet('users', {
      select: 'id,username,full_name,avatar_url,is_active,polit_score,metadata',
      id: `in.(${idsList.join(',')})`,
      is_active: 'eq.true',
      limit: String(Math.min(200, idsList.length)),
    }).catch(() => []);
    const userMap = new Map((users || []).map((u) => [String(u.id), u]));
    return idsList
      .map((id) => {
        const u = userMap.get(String(id));
        const info = infoMap.get(String(id));
        if (!u || !info) return null;
        // NOTE: Fast visibility is filtered later (applyFastVisibilityFilter).
        return {
          user_id: u.id,
          username: u.username,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          profile_image: u.avatar_url,
          story_count: info.story_count,
          latest_created_at: info.latest ? new Date(info.latest).toISOString() : null,
          polit_score: u.polit_score ?? 0,
          _meta: u.metadata,
        };
      })
      .filter(Boolean);
  };

  // Preload "owner follows viewer" map for fastVisibility=following users (best-effort).
  const ownerFollowsViewerCache = new Map(); // ownerId -> boolean
  const checkOwnerFollowsViewer = async (ownerId) => {
    const k = String(ownerId || '');
    if (!k) return false;
    if (ownerFollowsViewerCache.has(k)) return !!ownerFollowsViewerCache.get(k);
    try {
      const rows = await supabaseRestGet('follows', {
        select: 'id',
        follower_id: `eq.${k}`,
        following_id: `eq.${auth.id}`,
        limit: '1',
      }).catch(() => []);
      const ok = Array.isArray(rows) && rows.length > 0;
      ownerFollowsViewerCache.set(k, ok);
      return ok;
    } catch {
      ownerFollowsViewerCache.set(k, false);
      return false;
    }
  };

  const applyFastVisibilityFilter = async (cards) => {
    const out = [];
    for (const c of Array.isArray(cards) ? cards : []) {
      const ownerId = String(c?.user_id || '');
      if (!ownerId) continue;
      if (ownerId === String(auth.id)) {
        out.push(c);
        continue;
      }
      const meta = c?._meta && typeof c._meta === 'object' ? c._meta : {};
      const ps = meta?.privacy_settings && typeof meta.privacy_settings === 'object' ? meta.privacy_settings : {};
      const raw = String(ps.fastVisibility ?? ps.fast_visibility ?? 'public').trim().toLowerCase();
      const fastVis =
        raw === 'everyone' || raw === 'public'
          ? 'public'
          : raw === 'none' || raw === 'private'
            ? 'private'
            : raw === 'following'
              ? 'following'
              : raw;
      if (fastVis === 'private') continue;
      if (fastVis === 'following') {
        // Only people the OWNER follows can see
        // eslint-disable-next-line no-await-in-loop
        const ok = await checkOwnerFollowsViewer(ownerId);
        if (!ok) continue;
      }
      out.push(c);
    }
    return out;
  };

  const primaryCardsRaw = await fetchUserCards(activeIds, byUser);
  const primaryCards = await applyFastVisibilityFilter(primaryCardsRaw);
  primaryCards.sort((a, b) => new Date(b.latest_created_at || 0).getTime() - new Date(a.latest_created_at || 0).getTime());
  let out = primaryCards.slice(0, lim);

  // Fallback: If followings have no/very few Fast, fill with global top PolitPuan Fast users.
  if (out.length < FALLBACK_THRESHOLD) {
    const exclude = new Set(out.map((x) => String(x.user_id)));
    exclude.add(String(auth.id));

    const globalPosts = await supabaseRestGet('posts', {
      select: 'id,user_id,created_at',
      is_deleted: 'eq.false',
      is_trending: 'eq.true',
      created_at: `gte.${since}`,
      order: 'created_at.desc',
      limit: '2000',
    }).catch(() => []);

    const globalByUser = new Map();
    for (const p of Array.isArray(globalPosts) ? globalPosts : []) {
      const uid = p?.user_id != null ? String(p.user_id) : '';
      if (!uid) continue;
      if (exclude.has(uid)) continue;
      const cur = globalByUser.get(uid) || { user_id: uid, story_count: 0, latest: 0 };
      cur.story_count += 1;
      const t = new Date(p.created_at || 0).getTime();
      if (t > cur.latest) cur.latest = t;
      globalByUser.set(uid, cur);
    }

    const globalIds = Array.from(globalByUser.keys()).slice(0, 200);
    const globalCardsRaw = await fetchUserCards(globalIds, globalByUser);
    const globalCards = await applyFastVisibilityFilter(globalCardsRaw);
    globalCards.sort((a, b) => Number(b.polit_score || 0) - Number(a.polit_score || 0));

    const needed = Math.max(0, lim - out.length);
    out = out.concat(globalCards.slice(0, needed));
  }

  // Do not leak polit_score to the client here; keep output schema stable.
  out = out.map(({ polit_score, _meta, ...rest }) => rest);
  return res.json({ success: true, data: out });
}

async function getFastForUser(req, res, userKey) {
  const auth = verifyJwtFromRequest(req);
  const uid = await resolveUserId(userKey);
  if (!uid) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });

  // Enforce Fast visibility:
  // - public/everyone => anyone (even logged out)
  // - private/none => only self
  // - following => only if owner follows viewer (or self)
  const viewerId = auth?.id ? String(auth.id) : '';
  const ownerId = String(uid);
  if (!viewerId || viewerId !== ownerId) {
    const urows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${ownerId}`, limit: '1' }).catch(() => []);
    const u = urows?.[0] || null;
    const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
    const ps = meta?.privacy_settings && typeof meta.privacy_settings === 'object' ? meta.privacy_settings : {};
    const raw = String(ps.fastVisibility ?? ps.fast_visibility ?? 'public').trim().toLowerCase();
    const fastVis =
      raw === 'everyone' || raw === 'public'
        ? 'public'
        : raw === 'none' || raw === 'private'
          ? 'private'
          : raw === 'following'
            ? 'following'
            : raw;
    if (fastVis === 'private') {
      return res.json({ success: true, data: [] });
    }
    if (fastVis === 'following') {
      if (!viewerId) return res.json({ success: true, data: [] });
      const f = await supabaseRestGet('follows', {
        select: 'id',
        follower_id: `eq.${ownerId}`,
        following_id: `eq.${viewerId}`,
        limit: '1',
      }).catch(() => []);
      if (!Array.isArray(f) || f.length === 0) return res.json({ success: true, data: [] });
    }
  }

  const since = fastSinceIso(24);
  const rows = await supabaseRestGet('posts', {
    select: '*,user:users(*),party:parties(*)',
    user_id: `eq.${uid}`,
    is_deleted: 'eq.false',
    is_trending: 'eq.true',
    created_at: `gte.${since}`,
    order: 'created_at.asc',
    limit: '50',
  }).catch(() => []);
  return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
}

function fastViewsRequiredSql() {
  // Keep types TEXT to support UUID or numeric ids without schema coupling.
  return `
-- Fast izleyenler (bakanlar) tablosu
create extension if not exists pgcrypto;

create table if not exists fast_views (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  owner_id text not null,
  viewer_id text not null,
  viewed_at timestamptz not null default now()
);

create unique index if not exists fast_views_post_viewer_uniq on fast_views (post_id, viewer_id);
create index if not exists fast_views_owner_viewed_at_idx on fast_views (owner_id, viewed_at desc);
create index if not exists fast_views_post_viewed_at_idx on fast_views (post_id, viewed_at desc);
`.trim();
}

async function fastTrackView(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  // Public viewers can watch Fast; tracking is best-effort.
  if (!auth?.id) return res.json({ success: true, ignored: true });
  const id = String(postId || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz içerik.' });

  // Rate limit per viewer+post (best-effort)
  const ip = getClientIp(req);
  const rl = rateLimit(`fast_view:${auth.id}:${id}:${ip}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return res.json({ success: true, ignored: true });

  // Validate post exists + is an active Fast (last 24h, trending)
  const since = fastSinceIso(24);
  const rows = await supabaseRestGet('posts', {
    select: 'id,user_id,is_trending,is_deleted,created_at',
    id: `eq.${id}`,
    limit: '1',
  }).catch(() => []);
  const post = rows?.[0] || null;
  if (!post || post?.is_deleted) return res.json({ success: true, ignored: true });
  if (String(post.is_trending) !== 'true' && post.is_trending !== true) return res.json({ success: true, ignored: true });
  const createdAt = String(post.created_at || '');
  if (createdAt && createdAt < since) return res.json({ success: true, ignored: true });

  const ownerId = String(post.user_id || '').trim();
  if (!ownerId) return res.json({ success: true, ignored: true });
  if (String(ownerId) === String(auth.id)) return res.json({ success: true, ignored: true });

  // Respect blocks (best-effort)
  try {
    const blocked = await isBlockedBetween(auth.id, ownerId);
    if (blocked) return res.json({ success: true, ignored: true });
  } catch {
    // ignore
  }

  try {
    await supabaseRestRequest(
      'POST',
      'fast_views',
      { on_conflict: 'post_id,viewer_id' },
      [{ post_id: id, owner_id: ownerId, viewer_id: String(auth.id), viewed_at: new Date().toISOString() }],
      { Prefer: 'resolution=ignore-duplicates,return=representation' }
    );
    return res.json({ success: true });
  } catch (e) {
    // If table doesn't exist yet, do not break viewing.
    if (isMissingRelationError(e)) return res.json({ success: true, ignored: true });
    return res.json({ success: true, ignored: true });
  }
}

async function fastGetViewers(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const id = String(postId || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz içerik.' });
  const lim = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || 50), 10) || 50));

  // Validate ownership
  const rows = await supabaseRestGet('posts', {
    select: 'id,user_id,is_trending,is_deleted,created_at',
    id: `eq.${id}`,
    limit: '1',
  }).catch(() => []);
  const post = rows?.[0] || null;
  if (!post || post?.is_deleted) return res.status(404).json({ success: false, error: 'İçerik bulunamadı.' });
  const ownerId = String(post.user_id || '').trim();
  const isOwner = ownerId && String(ownerId) === String(auth.id);
  if (!isOwner && !auth?.is_admin) return res.status(403).json({ success: false, error: 'Bu listeyi görüntüleyemezsiniz.' });

  // Only for active Fast within 24h
  const since = fastSinceIso(24);
  const createdAt = String(post.created_at || '');
  if (String(post.is_trending) !== 'true' && post.is_trending !== true) return res.json({ success: true, data: [], total: 0 });
  if (createdAt && createdAt < since) return res.json({ success: true, data: [], total: 0 });

  try {
    const views = await supabaseRestGet('fast_views', {
      select: 'viewer_id,viewed_at',
      post_id: `eq.${id}`,
      order: 'viewed_at.desc',
      limit: String(lim),
    }).catch(() => []);

    const all = Array.isArray(views) ? views : [];
    const viewerIds = all.map((v) => String(v.viewer_id || '')).filter(Boolean);
    if (viewerIds.length === 0) return res.json({ success: true, data: [], total: 0 });

    const isUuidLike = (v) => /^[0-9a-fA-F-]{36}$/.test(String(v));
    const inList = viewerIds.map((v) => (isUuidLike(v) ? `"${v}"` : v)).join(',');
    const users = await supabaseRestGet('users', {
      select: 'id,username,full_name,avatar_url,is_verified,is_active,user_type',
      id: `in.(${inList})`,
      is_active: 'eq.true',
      limit: String(Math.min(200, viewerIds.length)),
    }).catch(() => []);
    const map = new Map((Array.isArray(users) ? users : []).map((u) => [String(u.id), u]));

    const out = all
      .map((v) => {
        const u = map.get(String(v.viewer_id || ''));
        if (!u) return null;
        return { user: u, viewed_at: v.viewed_at };
      })
      .filter(Boolean);

    return res.json({ success: true, data: out, total: out.length });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: false, schemaMissing: true, requiredSql: fastViewsRequiredSql(), data: [], total: 0 });
    }
    return res.status(500).json({ success: false, error: 'Bakanlar yüklenemedi.' });
  }
}

async function updatePost(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Giriş yapmalısınız.' });
  const id = String(postId || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz paylaşım.' });

  const rows = await supabaseRestGet('posts', { select: '*', id: `eq.${id}`, limit: '1' }).catch(() => []);
  const post = rows?.[0];
  if (!post) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });
  if (String(post.user_id) !== String(auth.id)) {
    return res.status(403).json({ success: false, error: 'Bu paylaşımı düzenleyemezsiniz.' });
  }

  const body = await readJsonBody(req);
  const content = String(body?.content_text ?? body?.content ?? post.content_text ?? post.content ?? '').trim();
  if (!content) return res.status(400).json({ success: false, error: 'İçerik boş olamaz.' });
  if (content.length > 5000) return res.status(400).json({ success: false, error: 'İçerik çok uzun.' });

  const patch = {
    content_text: content,
    updated_at: new Date().toISOString(),
  };

  // Allow updating tags/category as well
  if (body?.category !== undefined) patch.category = String(body.category || 'general').trim();
  if (body?.agenda_tag !== undefined) patch.agenda_tag = String(body.agenda_tag || '').trim() || null;

  // Do not allow changing media_urls for now (handled in separate task about sorting / reordering).
  const updated = await supabaseRestPatch('posts', { id: `eq.${id}`, user_id: `eq.${auth.id}` }, patch).catch(() => []);
  return res.json({ success: true, data: updated?.[0] || null });
}

async function deletePost(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Giriş yapmalısınız.' });
  const id = String(postId || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz paylaşım.' });

  const rows = await supabaseRestGet('posts', { select: '*', id: `eq.${id}`, limit: '1' }).catch(() => []);
  const post = rows?.[0];
  if (!post) return res.status(404).json({ success: false, error: 'Paylaşım bulunamadı.' });
  if (String(post.user_id) !== String(auth.id)) {
    return res.status(403).json({ success: false, error: 'Bu paylaşımı silemezsiniz.' });
  }

  // HARD delete (user-requested):
  // - delete related rows
  // - delete media objects from Storage immediately
  // - delete the post row
  try {
    // 1) Delete related rows (best-effort)
    await supabaseRestDelete('likes', { post_id: `eq.${id}` }, { Prefer: 'return=minimal' }).catch(() => null);
    await supabaseRestDelete('comments', { post_id: `eq.${id}` }, { Prefer: 'return=minimal' }).catch(() => null);
    await supabaseRestDelete('notifications', { post_id: `eq.${id}` }, { Prefer: 'return=minimal' }).catch(() => null);
  } catch {
    // ignore
  }

  // 2) Delete media objects from storage (uploads bucket)
  try {
    const urls = [];
    if (Array.isArray(post?.media_urls)) urls.push(...post.media_urls);
    if (Array.isArray(post?.media_original_urls)) urls.push(...post.media_original_urls);
    if (post?.thumbnail_url) urls.push(post.thumbnail_url);
    const objs = (urls || [])
      .map((u) => parseSupabasePublicObjectUrl(u))
      .filter(Boolean)
      .filter((o) => o.bucket === 'uploads' && o.objectPath);
    const seen = new Set();
    for (const o of objs) {
      const key = `${o.bucket}/${o.objectPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // eslint-disable-next-line no-await-in-loop
      await supabaseStorageDeleteObject(o.bucket, o.objectPath).catch(() => null);
    }
  } catch {
    // ignore
  }

  // 3) Delete post row
  await supabaseRestDelete('posts', { id: `eq.${id}` }, { Prefer: 'return=minimal' });
  return res.json({ success: true, deleted: true, id });
}

async function purgeArchivedPosts({ olderThanDays = 3, limit = 200 } = {}) {
  const days = Math.max(1, Math.min(30, Number(olderThanDays) || 3));
  const lim = Math.max(1, Math.min(500, Number(limit) || 200));
  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const candidates = await supabaseRestGet('posts', {
    select: 'id,user_id,media_urls,thumbnail_url,updated_at,is_deleted',
    is_deleted: 'eq.true',
    updated_at: `lt.${cutoffIso}`,
    order: 'updated_at.asc',
    limit: String(lim),
  }).catch(() => []);

  const list = Array.isArray(candidates) ? candidates : [];
  let deletedPosts = 0;
  let deletedMediaObjects = 0;
  let deletedLikes = 0;
  let deletedComments = 0;
  let deletedNotifications = 0;
  const errors = [];

  const safeId = (x) => String(x || '').trim();

  for (const p of list) {
    const pid = safeId(p?.id);
    if (!pid) continue;
    try {
      // 1) Delete related rows (best-effort)
      try {
        const r = await supabaseRestDelete('likes', { post_id: `eq.${pid}` }, { Prefer: 'return=representation' }).catch(() => null);
        if (Array.isArray(r)) deletedLikes += r.length;
      } catch {
        // ignore
      }
      try {
        const r = await supabaseRestDelete('comments', { post_id: `eq.${pid}` }, { Prefer: 'return=representation' }).catch(() => null);
        if (Array.isArray(r)) deletedComments += r.length;
      } catch {
        // ignore
      }
      try {
        const r = await supabaseRestDelete('notifications', { post_id: `eq.${pid}` }, { Prefer: 'return=representation' }).catch(() => null);
        if (Array.isArray(r)) deletedNotifications += r.length;
      } catch {
        // ignore
      }

      // 2) Delete media objects from storage (uploads bucket only)
      try {
        const urls = [];
        if (Array.isArray(p?.media_urls)) urls.push(...p.media_urls);
        if (p?.thumbnail_url) urls.push(p.thumbnail_url);
        const objs = (urls || [])
          .map((u) => parseSupabasePublicObjectUrl(u))
          .filter(Boolean)
          .filter((o) => o.bucket === 'uploads' && o.objectPath);
        const seen = new Set();
        for (const o of objs) {
          const key = `${o.bucket}/${o.objectPath}`;
          if (seen.has(key)) continue;
          seen.add(key);
          // eslint-disable-next-line no-await-in-loop
          await supabaseStorageDeleteObject(o.bucket, o.objectPath).catch(() => null);
          deletedMediaObjects += 1;
        }
      } catch {
        // ignore
      }

      // 3) Hard delete post row
      await supabaseRestDelete('posts', { id: `eq.${pid}` }, { Prefer: 'return=minimal' });
      deletedPosts += 1;
    } catch (e) {
      errors.push({ post_id: pid, error: String(e?.message || e) });
    }
  }

  return {
    days,
    cutoffIso,
    scanned: list.length,
    deletedPosts,
    deletedMediaObjects,
    deletedLikes,
    deletedComments,
    deletedNotifications,
    errors: errors.slice(0, 20),
  };
}

async function cronPurgeArchivedPosts(req, res) {
  const expected = String(process.env.CRON_SECRET || '').trim();
  if (!expected) return res.status(404).json({ success: false, error: 'Not found' });
  const provided = String(req.headers['x-cron-secret'] || '').trim();
  if (!provided || provided !== expected) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const days = Number(req.query?.days || process.env.POST_ARCHIVE_DAYS || 3) || 3;
  const limit = Number(req.query?.limit || 200) || 200;
  const out = await purgeArchivedPosts({ olderThanDays: days, limit });
  return res.json({ success: true, data: out });
}

async function getAgendas(req, res) {
    const { limit = 50, offset = 0, order, search, is_trending, is_active } = req.query || {};
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const allowedOrders = new Set([
      'trending_score.desc',
      'trending_score.asc',
      'total_polit_score.desc',
      'total_polit_score.asc',
      'polit_score.desc',
      'polit_score.asc',
      'created_at.desc',
      'created_at.asc',
    ]);
    const ord = allowedOrders.has(String(order || '')) ? String(order) : 'trending_score.desc';
    const params = {
      select: '*',
      limit: String(lim),
      offset: String(off),
    };
    if (String(is_active || 'true') === 'true') params.is_active = 'eq.true';
    if (String(is_trending || '') === 'true') params.is_trending = 'eq.true';
    if (search && String(search).trim().length >= 2) params.title = `ilike.*${String(search).trim()}*`;

    // If agendas table is empty in a fresh deployment, bootstrap a starter list once.
    // This keeps the UI usable without requiring manual DB seeding, while still storing
    // the final source of truth in the `agendas` table.
    //
    // Safety:
    // - Only runs when table count is 0
    // - Uses deterministic slugs (unique) and best-effort insert
    // - Never blocks or fails the request on errors
    if (!search && String(is_trending || '') !== 'true') {
      try {
        const total = await supabaseCount('agendas', { select: 'id' }).catch(() => 0);
        if (Number(total || 0) === 0) {
          const slugifyAgenda = (input) => {
            const s = String(input || '').trim().toLowerCase();
            const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };
            return s
              .split('')
              .map((ch) => map[ch] ?? ch)
              .join('')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 200);
          };

          const DEFAULT_TITLES = [
            'Asgari ücret 2026',
            'Emekli maaş zamları',
            'Kira artış oranı',
            'Enflasyon verileri',
            'Vergi düzenlemeleri',
            'Ekonomi paketi',
            'Deprem bölgesi destekleri',
            'Kentsel dönüşüm',
            'Eğitim sistemi reformu',
            'MEB öğretmen atamaları',
            'Üniversite kontenjanları',
            'Sağlık randevu sistemi',
            'SGK düzenlemeleri',
            'Genç işsizlik',
            'Göç ve sığınmacı politikaları',
            'Dış politika açıklamaları',
            'AB ilişkileri',
            'NATO gündemi',
            'Savunma sanayi projeleri',
            'Terörle mücadele',
            'Anayasa değişikliği',
            'Yargı reformu',
            'Basın özgürlüğü',
            'Sosyal medya yasası',
            'Yerel yönetimler',
            'Belediye bütçeleri',
            'İstanbul projeleri',
            'Ankara projeleri',
            'Ulaşım zamları',
            'Elektrik fiyatları',
            'Doğalgaz fiyatları',
            'Akaryakıt zamları',
            'Tarım destekleri',
            'Çiftçi borçları',
            'Gıda fiyatları',
            'Kur korumalı mevduat',
            'Faiz kararı',
            'Merkez Bankası',
            'Borsa gündemi',
            'Konut kredileri',
            'Kadın hakları',
            'Çocuk güvenliği',
            'Hayvan hakları',
            'İklim krizi',
            'Orman yangınları',
            'Su kaynakları',
            'Turizm sezonu',
            'Spor kulüpleri',
            'Seçim sistemi',
            'Parti içi tartışmalar',
          ];

          const nowIso = new Date().toISOString();
          const seed = DEFAULT_TITLES.slice(0, 50).map((title, idx) => ({
            title,
            slug: slugifyAgenda(title),
            description: null,
            post_count: 0,
            total_polit_score: 0,
            trending_score: Math.max(0, 5000 - idx * 50),
            is_trending: true,
            is_active: true,
            created_at: nowIso,
            updated_at: nowIso,
          }));

          // Best-effort insert; ignore if it fails due to schema/rls/env issues.
          await supabaseRestInsert('agendas', seed).catch(() => null);
        }
      } catch {
        // ignore
      }
    }

    // Fetch; if caller requests an order by a column that doesn't exist in their schema,
    // retry with the safe default order.
    let rows;
    try {
      rows = await supabaseRestGetWithOrderFallback(
        'agendas',
        params,
        [
          ord,
          ord.startsWith('trending_score') ? 'created_at.desc' : 'trending_score.desc',
          'created_at.desc',
          'id.desc',
          'title.asc',
        ]
      );
    } catch (e) {
      // Some environments may have an older agendas schema (missing is_active/is_trending/trending_score).
      // Retry by dropping filters and using a safe order.
      if (isMissingColumnError(e, 'is_active') || isMissingColumnError(e, 'is_trending') || isMissingColumnError(e, 'trending_score')) {
        const retry = { ...params };
        delete retry.is_active;
        delete retry.is_trending;
        rows = await supabaseRestGetWithOrderFallback('agendas', retry, ['created_at.desc', 'id.desc', 'title.asc']).catch(() => []);
      } else {
        throw e;
      }
    }
    let out = Array.isArray(rows) ? rows : [];

    // Home agenda configuration (admin-controlled via site_settings).
    // Keeps "ana sayfa gündemleri" fully admin-managed without schema changes.
    if (off === 0 && !search) {
      try {
        const cfg = await getSiteSettingJson('home_agenda_config_v1').catch(() => null);
        const pinned = Array.isArray(cfg?.pinned) ? cfg.pinned : [];
        const pinnedIds = pinned
          .map((p) => String(p?.id || '').trim())
          .filter(Boolean)
          .slice(0, 10);
        if (pinnedIds.length > 0) {
          const byId = new Map(out.map((a) => [String(a?.id || '').trim(), a]));
          const pinnedRows = [];
          for (let i = 0; i < pinnedIds.length; i += 1) {
            const id = pinnedIds[i];
            const row = byId.get(id);
            if (!row) continue;
            const meta = pinned.find((p) => String(p?.id || '').trim() === id) || null;
            pinnedRows.push({
              ...row,
              _home_pin_rank: i + 1,
              _home_label: meta?.label ? String(meta.label).slice(0, 20) : null,
              _home_color: meta?.color ? String(meta.color).slice(0, 20) : null,
            });
          }
          const pinnedSet = new Set(pinnedRows.map((r) => String(r?.id || '').trim()));
          const rest = out
            .filter((r) => !pinnedSet.has(String(r?.id || '').trim()))
            .map((r) => ({ ...r, _home_pin_rank: null, _home_label: null, _home_color: null }));
          out = [...pinnedRows, ...rest];
        }
      } catch {
        // ignore – agendas should still load
      }
    }

    res.json({ success: true, data: out });
}

async function getParties(req, res) {
    const data = await supabaseRestGet('parties', {
      select: '*',
      is_active: 'eq.true',
      order: 'follower_count.desc',
      limit: '400',
    }).catch(() => []);
    const parties = Array.isArray(data) ? data : [];

    // Enrich with party chair (best-effort, optional)
    // NOTE: We keep the response shape as ARRAY for backward compatibility.
    try {
      const chairs = await supabaseRestGet('users', {
        select: 'id,party_id,full_name,username,avatar_url,polit_score,politician_type,is_active',
        politician_type: 'eq.party_chair',
        is_active: 'eq.true',
        order: 'polit_score.desc',
        limit: '800',
      }).catch(() => []);

      const bestByParty = new Map(); // party_id -> chair user
      for (const u of chairs || []) {
        const pid = String(u?.party_id || '').trim();
        if (!pid) continue;
        if (!bestByParty.has(pid)) bestByParty.set(pid, u);
      }

      const out = parties.map((p) => {
        const pid = String(p?.id || '').trim();
        const chair = pid ? bestByParty.get(pid) : null;
        if (!chair) return p;
        return {
          ...p,
          party_chair: {
            id: chair.id,
            full_name: chair.full_name,
            username: chair.username,
            avatar_url: chair.avatar_url,
            polit_score: chair.polit_score,
          },
        };
      });

      return res.json(out);
    } catch {
      return res.json(parties);
    }
}

async function getPartyDetail(req, res, id) {
    let party;
    // Check if numeric ID
    if (/^\d+$/.test(id)) {
        const rows = await supabaseRestGet('parties', { id: `eq.${id}`, limit: '1' });
        party = rows[0];
    } else {
        // Slug search
        const rows = await supabaseRestGet('parties', { slug: `eq.${id}`, limit: '1' });
        party = rows[0];
    }
    if (!party) return res.status(404).json({ success: false, error: 'Parti bulunamadı' });
    res.json({ success: true, data: party });
}

async function getUsers(req, res) {
    const auth = verifyJwtFromRequest(req);
    const { search, username, id, party_id, user_type, province, limit = 20, offset = 0, order = 'polit_score.desc' } = req.query;

    // Direct lookup by username or id (frontend uses this form)
    if (username || id) {
        const key = username ? 'username' : 'id';
        const value = username ? String(username) : String(id);
        const rows = await supabaseRestGet('users', { select: '*,party:parties(*)', [key]: `eq.${value}`, limit: '1' });
        const user = rows?.[0];
        if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        // Hide admin profile from everyone except the owner.
        if (String(user?.username || '').toLowerCase() === 'admin') {
          const isOwner = auth?.id && String(auth.id) === String(user.id);
          if (!isOwner) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }
        if (user?.is_active === false) {
          const isOwner = auth?.id && String(auth.id) === String(user.id);
          if (!isOwner && !auth?.is_admin) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
          }
        }
        return res.json({ success: true, data: user });
    }

    // Filter lists (party/city pages use this form) - return ARRAY
    if (party_id || user_type || province) {
      const params = {
        select: '*,party:parties(*)',
        is_active: 'eq.true',
        username: 'neq.admin',
        limit: String(limit),
        offset: String(offset),
      };
      if (order) params.order = order;
      if (party_id) params.party_id = `eq.${party_id}`;
      if (user_type) {
        const raw = String(user_type);
        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
        params.user_type = parts.length > 1 ? `in.(${parts.join(',')})` : `eq.${raw}`;
      }
      if (province) params.province = `ilike.${province}`;
      const rows = await supabaseRestGet('users', params);
      return res.json(Array.isArray(rows) ? rows : []);
    }

    // Default list (Explore profiles, etc.) - return ARRAY
    if (!search) {
      const params = {
        select: '*,party:parties(*)',
        is_active: 'eq.true',
        username: 'neq.admin',
        limit: String(Math.min(parseInt(limit, 10) || 20, 60)),
        offset: String(Math.max(0, parseInt(offset, 10) || 0)),
      };
      if (order) params.order = order;
      const rows = await supabaseRestGet('users', params).catch(() => []);
      return res.json(Array.isArray(rows) ? rows : []);
    }

    // Search list
    if (!search || String(search).length < 3) return res.json([]);
    const data = await supabaseRestGet('users', {
        select: '*,party:parties(*)',
        or: `(username.ilike.*${search}*,full_name.ilike.*${search}*)`,
        username: 'neq.admin',
        limit: String(Math.min(parseInt(limit), 50))
    });
    res.json(data || []);
}

async function getUserDetail(req, res, id) {
    const auth = verifyJwtFromRequest(req);
    // Try username first (most common), then ID
    let user;
    const rows = await supabaseRestGet('users', { select: '*,party:parties(*)', username: `eq.${id}`, limit: '1' });
    if (rows.length > 0) {
        user = rows[0];
    } else if (/^\d+$/.test(id) || /^[0-9a-fA-F-]{36}$/.test(id)) { // numeric or uuid
        const rowsId = await supabaseRestGet('users', { select: '*,party:parties(*)', id: `eq.${id}`, limit: '1' });
        user = rowsId[0];
    }
    
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    // Hide admin profile from everyone except the owner.
    if (String(user?.username || '').toLowerCase() === 'admin') {
      const isOwner = auth?.id && String(auth.id) === String(user.id);
      if (!isOwner) {
        return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
      }
    }
    // Hide inactive profiles from everyone except the owner/admin (e.g. deletion confirmed).
    if (user?.is_active === false) {
      const isOwner = auth?.id && String(auth.id) === String(user.id);
      if (!isOwner && !auth?.is_admin) {
        return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
      }
    }
    res.json({ success: true, data: user });
}

async function getFollowStats(req, res, targetId) {
  const auth = verifyJwtFromRequest(req);
  const tid = String(targetId || '').trim();
  if (!tid) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  // validate target exists
  const targetRows = await supabaseRestGet('users', { select: 'id,is_active', id: `eq.${tid}`, limit: '1' }).catch(() => []);
  const target = targetRows?.[0];
  if (!target) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });

  const followers = await supabaseCount('follows', { following_id: `eq.${tid}` }).catch(() => 0);
  const following = await supabaseCount('follows', { follower_id: `eq.${tid}` }).catch(() => 0);
  const postsCount = await supabaseCount('posts', { user_id: `eq.${tid}`, is_deleted: 'eq.false' }).catch(() => 0);

  let isFollowing = false;
  let isFollowedBy = false;
  if (auth?.id) {
    const existing = await supabaseRestGet('follows', {
      select: 'id',
      follower_id: `eq.${auth.id}`,
      following_id: `eq.${tid}`,
      limit: '1',
    }).catch(() => []);
    isFollowing = Array.isArray(existing) && existing.length > 0;

    // Does the target follow me?
    const reverse = await supabaseRestGet('follows', {
      select: 'id',
      follower_id: `eq.${tid}`,
      following_id: `eq.${auth.id}`,
      limit: '1',
    }).catch(() => []);
    isFollowedBy = Array.isArray(reverse) && reverse.length > 0;
  }

  return res.json({
    success: true,
    data: {
      followers_count: followers,
      following_count: following,
      posts_count: postsCount,
      is_following: isFollowing,
      is_followed_by: isFollowedBy,
    },
  });
}

async function getMessageContacts(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = String(auth.id);
  const { limit = 50 } = req.query || {};
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  // Mutual follows (takipleşme): follower_id=userId AND following_id in myFollowing,
  // and follower_id in myFollowers AND following_id=userId.
  const [myFollowing, myFollowers] = await Promise.all([
    supabaseRestGet('follows', { select: 'following_id', follower_id: `eq.${userId}`, limit: '500' }).catch(() => []),
    supabaseRestGet('follows', { select: 'follower_id', following_id: `eq.${userId}`, limit: '500' }).catch(() => []),
  ]);

  const followingSet = new Set((myFollowing || []).map((r) => String(r.following_id)).filter(Boolean));
  const mutualIds = Array.from(
    new Set((myFollowers || []).map((r) => String(r.follower_id)).filter((id) => id && followingSet.has(id)))
  ).slice(0, lim);

  if (mutualIds.length === 0) return res.json({ success: true, data: [] });

  const users = await supabaseRestGet('users', {
    select:
      'id,username,full_name,avatar_url,user_type,politician_type,party_id,province,is_verified,is_active,polit_score,metadata,party:parties(*)',
    id: `in.(${mutualIds.join(',')})`,
    is_active: 'eq.true',
    order: 'polit_score.desc',
    limit: String(mutualIds.length),
  }).catch(() => []);

  // Do not leak metadata in responses
  const out = (users || [])
    .filter(Boolean)
    .map((u) => {
      const { metadata, ...rest } = u;
      return rest;
    });

  return res.json({ success: true, data: out });
}

async function getMessageSuggestions(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const ip = getClientIp(req);
  const rl = rateLimit(`msg_suggest:${auth.id}:${ip}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return res.status(429).json({ success: false, error: 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' });

  const me = String(auth.id);
  const { limit = 24 } = req.query || {};
  const lim = Math.min(60, Math.max(1, parseInt(limit, 10) || 24));

  // 1) Get my following (friends) (cap for URL-length safety)
  const myFollowingRows = await supabaseRestGet('follows', {
    select: 'following_id',
    follower_id: `eq.${me}`,
    limit: '200',
  }).catch(() => []);
  const friendIds = (myFollowingRows || []).map((r) => String(r?.following_id || '')).filter(Boolean);
  if (friendIds.length === 0) return res.json({ success: true, data: [] });

  // Also load mutual contacts to exclude them from suggestions (they already appear under "Takipleştiklerin")
  const [myFollowing, myFollowers] = await Promise.all([
    supabaseRestGet('follows', { select: 'following_id', follower_id: `eq.${me}`, limit: '500' }).catch(() => []),
    supabaseRestGet('follows', { select: 'follower_id', following_id: `eq.${me}`, limit: '500' }).catch(() => []),
  ]);
  const followingSet = new Set((myFollowing || []).map((r) => String(r.following_id)).filter(Boolean));
  const mutualSet = new Set((myFollowers || []).map((r) => String(r.follower_id)).filter((id) => id && followingSet.has(id)));

  // 2) Fetch "followings of my followings" in chunks
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const friendIdsCapped = friendIds.slice(0, 120);
  const friendChunks = chunk(friendIdsCapped, 40);

  const candidateToFriends = new Map(); // candidateId -> Set(friendId)
  for (const c of friendChunks) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await supabaseRestGet('follows', {
      select: 'follower_id,following_id',
      follower_id: `in.(${c.join(',')})`,
      limit: '2000',
    }).catch(() => []);

    (rows || []).forEach((r) => {
      const fid = String(r?.follower_id || '');
      const cid = String(r?.following_id || '');
      if (!fid || !cid) return;
      if (cid === me) return;
      if (followingSet.has(cid)) return; // already following
      if (mutualSet.has(cid)) return; // already mutual contact
      if (!candidateToFriends.has(cid)) candidateToFriends.set(cid, new Set());
      candidateToFriends.get(cid).add(fid);
    });
  }

  const candidateIds = Array.from(candidateToFriends.keys());
  if (candidateIds.length === 0) return res.json({ success: true, data: [] });

  // 3) Load my friend user map (for "X arkadaşın takip ediyor" label)
  const friendUserRows = await supabaseRestGet('users', {
    select: 'id,full_name,username',
    id: `in.(${friendIdsCapped.join(',')})`,
    is_active: 'eq.true',
    limit: String(friendIdsCapped.length),
  }).catch(() => []);
  const friendNameById = new Map((friendUserRows || []).map((u) => [String(u?.id || ''), String(u?.full_name || u?.username || '').trim()]));

  // 4) Load candidate user records (chunked)
  const candidateChunks = chunk(candidateIds, 60);
  const usersOut = [];
  for (const ids of candidateChunks) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await supabaseRestGet('users', {
      select:
        'id,username,full_name,avatar_url,user_type,politician_type,party_id,province,is_verified,is_active,polit_score,metadata,party:parties(*)',
      id: `in.(${ids.join(',')})`,
      is_active: 'eq.true',
      limit: String(ids.length),
    }).catch(() => []);

    (rows || []).forEach((u) => {
      if (!u) return;
      const cid = String(u.id || '');
      const friends = candidateToFriends.get(cid);
      const friendList = friends ? Array.from(friends) : [];
      const friendNames = friendList
        .map((fid) => friendNameById.get(String(fid)) || null)
        .filter(Boolean)
        .slice(0, 3);
      const friendCount = friendList.length;
      const { metadata, ...rest } = u;
      usersOut.push({ ...rest, friend_count: friendCount, friend_names: friendNames });
    });
  }

  usersOut.sort((a, b) => {
    const fc = Number(b.friend_count || 0) - Number(a.friend_count || 0);
    if (fc !== 0) return fc;
    return Number(b.polit_score || 0) - Number(a.polit_score || 0);
  });

  return res.json({ success: true, data: usersOut.slice(0, lim) });
}

async function toggleFollow(req, res, targetId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!(await ensureEmailVerifiedForWrite(req, res, auth))) return;

  const tid = String(targetId || '').trim();
  const isValidId = /^\d+$/.test(tid) || /^[0-9a-fA-F-]{36}$/.test(tid);
  if (!tid || !isValidId) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  if (String(auth.id) === tid) return res.status(400).json({ success: false, error: 'Kendinizi takip edemezsiniz.' });

  // Block checks (either direction)
  const blocked = await isBlockedBetween(auth.id, tid).catch(() => false);
  if (blocked) return res.status(403).json({ success: false, error: 'Bu kullanıcıyla etkileşemezsiniz (engelleme mevcut).' });

  // Ensure target exists
  const targetRows = await supabaseRestGet('users', { select: 'id,full_name,is_active', id: `eq.${tid}`, limit: '1' }).catch(() => []);
  const target = targetRows?.[0];
  if (!target) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  if (target.is_active === false) return res.status(400).json({ success: false, error: 'Bu kullanıcı aktif değil.' });

  const existing = await supabaseRestGet('follows', {
    select: 'id',
    follower_id: `eq.${auth.id}`,
    following_id: `eq.${tid}`,
    limit: '1',
  }).catch(() => []);

  if (Array.isArray(existing) && existing.length > 0) {
    await supabaseRestDelete('follows', { follower_id: `eq.${auth.id}`, following_id: `eq.${tid}` }).catch(() => null);
    return res.json({ success: true, action: 'unfollowed' });
  }

  // Keep following_id type-agnostic (integer or uuid)
  await supabaseRestInsert('follows', [{ follower_id: auth.id, following_id: tid }]);

  // Notify target user
  await supabaseInsertNotifications([
    {
      user_id: tid,
      actor_id: auth.id,
      type: 'follow',
      title: 'Yeni takipçi',
      message: 'Sizi takip etmeye başladı.',
      is_read: false,
    },
  ]).catch(() => null);
  // Email (best-effort)
  sendNotificationEmail(req, { userId: tid, type: 'follow', actorId: auth.id }).catch(() => null);

  return res.json({ success: true, action: 'followed' });
}

async function getFollowers(req, res, targetId) {
  const raw = String(targetId || '').trim();
  if (!raw) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  const isValidId = /^\d+$/.test(raw) || /^[0-9a-fA-F-]{36}$/.test(raw);
  let tid = raw;
  if (!isValidId) {
    // Keep parity with other endpoints: allow /api/users/:username/followers
    const rows = await supabaseRestGet('users', { select: 'id', username: `eq.${raw}`, limit: '1' }).catch(() => []);
    const id = rows?.[0]?.id ? String(rows[0].id) : '';
    if (!id) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    tid = id;
  }
  const { limit = 50, offset = 0 } = req.query || {};
  // IMPORTANT:
  // Some deployments do not have PostgREST FK relationships configured for embedded selects like `follower:users(*)`.
  // That causes empty lists. So we fetch ids first, then load users by id.
  const lim = Math.min(parseInt(limit, 10) || 50, 200);
  const off = parseInt(offset, 10) || 0;
  let rows = [];
  try {
    rows = await supabaseRestGet('follows', {
      select: 'follower_id,created_at',
      following_id: `eq.${tid}`,
      order: 'created_at.desc',
      limit: String(lim),
      offset: String(off),
    });
  } catch {
    // Fallback if follows table doesn't have created_at
    rows = await supabaseRestGet('follows', {
      select: 'follower_id',
      following_id: `eq.${tid}`,
      limit: String(lim),
      offset: String(off),
    }).catch(() => []);
  }
  const ids = (rows || []).map((r) => String(r?.follower_id || '').trim()).filter(Boolean);
  if (ids.length === 0) return res.json({ success: true, data: [] });
  const select =
    'id,auth_user_id,username,full_name,avatar_url,is_verified,is_active,user_type,politician_type,party_id,province,polit_score,metadata';
  const urows = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    // Try unquoted in.() (works for most id formats)
    try {
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, id: `in.(${chunk.join(',')})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty in() result');
    } catch {
      // try quoted (uuid-safe in some PostgREST setups)
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const quoted = chunk.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, id: `in.(${quoted})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty in() result (quoted)');
    } catch {
      // ignore
    }

    // If follows table stores auth ids (auth_user_id) instead of users.id, try that too.
    try {
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, auth_user_id: `in.(${chunk.join(',')})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty auth_user_id in() result');
    } catch {
      // ignore
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const quoted = chunk.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, auth_user_id: `in.(${quoted})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty auth_user_id in() result (quoted)');
    } catch {
      // fall back to per-id eq lookups (slow but reliable for small limits)
    }
    for (const id of chunk) {
      // eslint-disable-next-line no-await-in-loop
      const one = await supabaseRestGet('users', { select, id: `eq.${id}`, limit: '1' }).catch(() => []);
      if (Array.isArray(one) && one[0]) {
        urows.push(one[0]);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const oneByAuth = await supabaseRestGet('users', { select, auth_user_id: `eq.${id}`, limit: '1' }).catch(() => []);
      if (Array.isArray(oneByAuth) && oneByAuth[0]) urows.push(oneByAuth[0]);
    }
  }
  const byAnyId = new Map();
  (urows || []).forEach((u) => {
    const id = String(u?.id || '').trim();
    const authId = String(u?.auth_user_id || '').trim();
    if (id) byAnyId.set(id, u);
    if (authId) byAnyId.set(authId, u);
  });
  const list = ids.map((id) => byAnyId.get(id)).filter(Boolean);
  return res.json({
    success: true,
    data: list,
    meta: {
      follow_rows: ids.length,
      users_found: list.length,
      sample_ids: ids.slice(0, 3),
    },
  });
}

async function getFollowing(req, res, targetId) {
  const raw = String(targetId || '').trim();
  if (!raw) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  const isValidId = /^\d+$/.test(raw) || /^[0-9a-fA-F-]{36}$/.test(raw);
  let tid = raw;
  if (!isValidId) {
    // Keep parity with other endpoints: allow /api/users/:username/following
    const rows = await supabaseRestGet('users', { select: 'id', username: `eq.${raw}`, limit: '1' }).catch(() => []);
    const id = rows?.[0]?.id ? String(rows[0].id) : '';
    if (!id) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    tid = id;
  }
  const { limit = 50, offset = 0 } = req.query || {};
  const lim = Math.min(parseInt(limit, 10) || 50, 200);
  const off = parseInt(offset, 10) || 0;
  let rows = [];
  try {
    rows = await supabaseRestGet('follows', {
      select: 'following_id,created_at',
      follower_id: `eq.${tid}`,
      order: 'created_at.desc',
      limit: String(lim),
      offset: String(off),
    });
  } catch {
    rows = await supabaseRestGet('follows', {
      select: 'following_id',
      follower_id: `eq.${tid}`,
      limit: String(lim),
      offset: String(off),
    }).catch(() => []);
  }
  const ids = (rows || []).map((r) => String(r?.following_id || '').trim()).filter(Boolean);
  if (ids.length === 0) return res.json({ success: true, data: [] });
  const select =
    'id,auth_user_id,username,full_name,avatar_url,is_verified,is_active,user_type,politician_type,party_id,province,polit_score,metadata';
  const urows = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, id: `in.(${chunk.join(',')})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty in() result');
    } catch {
      // ignore
    }
    try {
      const quoted = chunk.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, id: `in.(${quoted})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty in() result (quoted)');
    } catch {
      // ignore
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, auth_user_id: `in.(${chunk.join(',')})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty auth_user_id in() result');
    } catch {
      // ignore
    }
    try {
      const quoted = chunk.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
      // eslint-disable-next-line no-await-in-loop
      const part = await supabaseRestGet('users', { select, auth_user_id: `in.(${quoted})`, limit: String(chunk.length) });
      if (Array.isArray(part) && part.length > 0) {
        urows.push(...part);
        continue;
      }
      throw new Error('Empty auth_user_id in() result (quoted)');
    } catch {
      // ignore
    }
    for (const id of chunk) {
      // eslint-disable-next-line no-await-in-loop
      const one = await supabaseRestGet('users', { select, id: `eq.${id}`, limit: '1' }).catch(() => []);
      if (Array.isArray(one) && one[0]) {
        urows.push(one[0]);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const oneByAuth = await supabaseRestGet('users', { select, auth_user_id: `eq.${id}`, limit: '1' }).catch(() => []);
      if (Array.isArray(oneByAuth) && oneByAuth[0]) urows.push(oneByAuth[0]);
    }
  }
  const byAnyId = new Map();
  (urows || []).forEach((u) => {
    const id = String(u?.id || '').trim();
    const authId = String(u?.auth_user_id || '').trim();
    if (id) byAnyId.set(id, u);
    if (authId) byAnyId.set(authId, u);
  });
  const list = ids.map((id) => byAnyId.get(id)).filter(Boolean);
  return res.json({
    success: true,
    data: list,
    meta: {
      follow_rows: ids.length,
      users_found: list.length,
      sample_ids: ids.slice(0, 3),
    },
  });
}

async function getUserFollowedByFriends(req, res, targetId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tid = String(targetId || '').trim();
  const isValidId = /^\d+$/.test(tid) || /^[0-9a-fA-F-]{36}$/.test(tid);
  if (!tid || !isValidId) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  const lim = Math.min(parseInt(req?.query?.limit, 10) || 3, 10);

  // 1) Get ids I follow (friends)
  const myFollowingRows = await supabaseRestGet('follows', {
    select: 'following_id',
    follower_id: `eq.${auth.id}`,
    limit: '500',
  }).catch(() => []);
  const myFollowingIds = Array.from(
    new Set((myFollowingRows || []).map((r) => String(r?.following_id || '').trim()).filter(Boolean))
  );
  if (myFollowingIds.length === 0) {
    return res.json({ success: true, data: { count: 0, friends: [] } });
  }

  // 2) Among those, who follows the target profile?
  const followerRows = await supabaseRestGet('follows', {
    select: 'follower_id',
    following_id: `eq.${tid}`,
    follower_id: `in.(${myFollowingIds.join(',')})`,
    limit: '500',
  }).catch(async () => {
    // fallback for uuid / strict parsers
    const quoted = myFollowingIds.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
    return await supabaseRestGet('follows', { select: 'follower_id', following_id: `eq.${tid}`, follower_id: `in.(${quoted})`, limit: '500' }).catch(() => []);
  });
  const friendIds = Array.from(
    new Set((followerRows || []).map((r) => String(r?.follower_id || '').trim()).filter(Boolean))
  );
  if (friendIds.length === 0) {
    return res.json({ success: true, data: { count: 0, friends: [] } });
  }

  // 3) Fetch friend user objects (small payload)
  const friendSelect = 'id,auth_user_id,username,full_name,avatar_url,is_verified,is_active';
  const quoted = friendIds.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
  const limUsers = String(Math.min(friendIds.length, 50));
  let usersRows = await supabaseRestGet('users', {
    select: friendSelect,
    id: `in.(${friendIds.join(',')})`,
    is_active: 'eq.true',
    limit: limUsers,
  }).catch(() => []);
  if (!Array.isArray(usersRows) || usersRows.length === 0) {
    usersRows = await supabaseRestGet('users', { select: friendSelect, id: `in.(${quoted})`, is_active: 'eq.true', limit: limUsers }).catch(() => []);
  }
  if (!Array.isArray(usersRows) || usersRows.length === 0) {
    usersRows = await supabaseRestGet('users', { select: friendSelect, auth_user_id: `in.(${friendIds.join(',')})`, is_active: 'eq.true', limit: limUsers }).catch(() => []);
  }
  if (!Array.isArray(usersRows) || usersRows.length === 0) {
    usersRows = await supabaseRestGet('users', { select: friendSelect, auth_user_id: `in.(${quoted})`, is_active: 'eq.true', limit: limUsers }).catch(() => []);
  }

  const friends = (usersRows || [])
    .filter(Boolean)
    .map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      avatar_url: u.avatar_url || null,
      verification_badge: u.is_verified ?? false,
    }))
    .slice(0, lim);

  return res.json({ success: true, data: { count: friendIds.length, friends } });
}

async function getUserPosts(req, res, username) {
    const auth = verifyJwtFromRequest(req);
    // Resolve user id by username
    const users = await supabaseRestGet('users', { select: 'id,username,is_active', username: `eq.${username}`, limit: '1' });
    const user = users?.[0];
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    if (user?.is_active === false) {
      const isOwner = auth?.id && String(auth.id) === String(user.id);
      if (!isOwner && !auth?.is_admin) {
        return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
      }
    }
    const { limit = '20', offset = '0' } = req.query;
    const posts = await supabaseRestGet('posts', {
        select: '*,user:users(*),party:parties(*)',
        user_id: `eq.${user.id}`,
        is_deleted: 'eq.false',
        order: 'created_at.desc',
        limit: String(limit),
        offset: String(offset)
    });
    res.json({ success: true, data: posts || [] });
}

async function resolveUserId(userKey) {
  const key = String(userKey || '').trim();
  if (!key) return null;
  if (/^\d+$/.test(key) || /^[0-9a-fA-F-]{36}$/.test(key)) return key;
  const rows = await supabaseRestGet('users', { select: 'id', username: `eq.${key}`, limit: '1' }).catch(() => []);
  return rows?.[0]?.id ?? null;
}

async function getUserLikedPosts(req, res, userKey) {
  const uid = await resolveUserId(userKey);
  if (!uid) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  const { limit = 50, offset = 0 } = req.query || {};
  const rows = await supabaseRestGet('likes', {
    select: 'created_at,post:posts(*,user:users(*),party:parties(*))',
    user_id: `eq.${uid}`,
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  }).catch(() => []);
  const list = (rows || [])
    .map((r) => r.post)
    .filter((p) => p && p.is_deleted !== true);
  return res.json({ success: true, data: list });
}

async function getUserCommentsList(req, res, userKey) {
  const uid = await resolveUserId(userKey);
  if (!uid) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  const auth = verifyJwtFromRequest(req);
  const isOwner = auth?.id && String(auth.id) === String(uid);
  const { limit = 50, offset = 0 } = req.query || {};
  const params = {
    select: 'id,content,created_at,updated_at,is_deleted,post_id,post:posts(*,user:users(*),party:parties(*))',
    user_id: `eq.${uid}`,
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  };
  if (!isOwner) params.is_deleted = 'eq.false';
  const rows = await supabaseRestGet('comments', params).catch(() => []);
  const list = (rows || []).filter((c) => c?.post && c.post.is_deleted !== true);
  return res.json({ success: true, data: list });
}

async function getUserActivity(req, res, userKey) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const uid = await resolveUserId(userKey === 'me' ? auth.id : userKey);
  if (!uid) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  if (String(auth.id) !== String(uid) && !auth.is_admin) {
    return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok.' });
  }
  const userId = uid;
  const { limit = 50 } = req.query || {};
  const lim = Math.min(parseInt(limit, 10) || 50, 200);

  const [posts, comments, likes, follows] = await Promise.all([
    supabaseRestGet('posts', { select: '*,user:users(*),party:parties(*)', user_id: `eq.${userId}`, order: 'created_at.desc', limit: '50' }).catch(() => []),
    supabaseRestGet('comments', { select: 'id,content,created_at,is_deleted,post:posts(*,user:users(*),party:parties(*))', user_id: `eq.${userId}`, order: 'created_at.desc', limit: '50' }).catch(() => []),
    supabaseRestGet('likes', { select: 'created_at,post:posts(*,user:users(*),party:parties(*))', user_id: `eq.${userId}`, order: 'created_at.desc', limit: '50' }).catch(() => []),
    supabaseRestGet('follows', { select: 'created_at,following:users(*)', follower_id: `eq.${userId}`, order: 'created_at.desc', limit: '50' }).catch(() => []),
  ]);

  const items = [];
  (posts || []).forEach((p) => {
    if (!p || p.is_deleted === true) return;
    items.push({ type: 'post', created_at: p.created_at, post: p });
  });
  (comments || []).forEach((c) => {
    if (!c?.post || c.post.is_deleted === true) return;
    items.push({ type: 'comment', created_at: c.created_at, comment: c, post: c.post });
  });
  (likes || []).forEach((l) => {
    if (!l?.post || l.post.is_deleted === true) return;
    items.push({ type: 'like', created_at: l.created_at, post: l.post });
  });
  (follows || []).forEach((f) => {
    if (!f?.following) return;
    items.push({ type: 'follow', created_at: f.created_at, target_user: f.following });
  });

  items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return res.json({ success: true, data: items.slice(0, lim) });
}

async function requireAdmin(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  // Primary gate: JWT claim
  if (auth.is_admin) return auth;

  // Fallback gate:
  // Some users are promoted to admin after they already logged in, so their old JWT might not have `is_admin: true`.
  // Since admin pages already require a valid JWT, we can safely re-check the admin flag from DB here.
  try {
    const rows = await supabaseRestGet('users', { select: 'id,is_admin', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
    const u = rows?.[0] || null;
    if (u?.is_admin === true) return { ...auth, is_admin: true };
  } catch {
    // ignore
  }

  res.status(403).json({ success: false, error: 'Forbidden' });
  return null;
}

function requireAdminOrBootstrapToken(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (auth?.id && auth.is_admin) return { mode: 'admin', auth };

  const expected = String(process.env.ADMIN_BOOTSTRAP_TOKEN || '').trim();
  const provided = String(req.headers['x-admin-bootstrap-token'] || '').trim();
  if (expected && provided && provided === expected) return { mode: 'bootstrap', auth: null };

  res.status(401).json({ success: false, error: 'Unauthorized' });
  return null;
}

async function adminEnvCheck(req, res) {
  const gate = requireAdminOrBootstrapToken(req, res);
  if (!gate) return;

  // Return booleans only (never leak secrets)
  const keys = [
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    // Mail (Brevo-only)
    'MAIL_ENABLED',
    'MAIL_PROVIDER',
    'MAIL_SENDER_EMAIL',
    'MAIL_SENDER_NAME',
    'MAIL_REPLY_TO_EMAIL',
    'MAIL_REPLY_TO_NAME',
    'BREVO_API_KEY',
    'ADMIN_BOOTSTRAP_TOKEN',
    'ADMIN_BOOTSTRAP_ALLOW_RESET',
    'PUBLIC_APP_URL',
    'APP_URL',
    'EMAIL_VERIFICATION_ENABLED',
  ];

  const present = {};
  for (const k of keys) present[k] = !!String(process.env[k] || '').trim();

  // Convenience flags
  present.SUPABASE_KEY_OK = present.SUPABASE_SERVICE_ROLE_KEY || present.SUPABASE_ANON_KEY;
  // Brevo is the only supported provider
  present.BREVO_OK = present.BREVO_API_KEY && (present.MAIL_SENDER_EMAIL || present.EMAIL_FROM || present.SMTP_FROM);

  return res.json({ success: true, data: { present } });
}

async function adminSchemaCheck(req, res) {
  const gate = requireAdminOrBootstrapToken(req, res);
  if (!gate) return;

  const env = {
    SUPABASE_URL: !!String(process.env.SUPABASE_URL || '').trim(),
    SUPABASE_SERVICE_ROLE_KEY: !!String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    SUPABASE_ANON_KEY: !!String(process.env.SUPABASE_ANON_KEY || '').trim(),
  };
  if (!env.SUPABASE_URL || (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY)) {
    return res.json({
      success: true,
      data: {
        ok: false,
        env,
        missingTables: [],
        missingColumns: {},
        note: 'Supabase env eksik olduğu için schema kontrolü yapılamadı.',
      },
    });
  }

  const missingTables = [];
  const missingColumns = {};

  const tableExists = async (table) => {
    try {
      await supabaseRestGet(table, { select: 'id', limit: '1' });
      return true;
    } catch (e) {
      const msg = String(e?.message || '');
      // Common PostgREST errors for missing relation/table
      if (msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('relation')) return false;
      // If RLS blocks, table still exists; treat as exists to avoid false negatives.
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('rls')) return true;
      return false;
    }
  };

  const columnExists = async (table, column) => {
    try {
      await supabaseRestGet(table, { select: `id,${column}`, limit: '1' });
      return true;
    } catch (e) {
      const msg = String(e?.message || '');
      const lower = msg.toLowerCase();
      // PostgREST: "Could not find the '<col>' column"
      if (lower.includes('could not find') && lower.includes('column')) return false;
      // Postgres: column "<col>" does not exist
      if (lower.includes(`column \"${String(column).toLowerCase()}\" does not exist`)) return false;
      // If RLS blocks, column exists (avoid false negatives)
      if (lower.includes('permission') || lower.includes('rls')) return true;
      return false;
    }
  };

  const check = async (table, columns) => {
    const exists = await tableExists(table);
    if (!exists) {
      missingTables.push(table);
      return;
    }
    for (const c of columns) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await columnExists(table, c);
      if (!ok) {
        if (!missingColumns[table]) missingColumns[table] = [];
        missingColumns[table].push(c);
      }
    }
  };

  // Tables/columns our current app relies on (minimum set)
  await check('users', ['id', 'username', 'email', 'password_hash', 'full_name', 'avatar_url', 'user_type', 'is_active', 'is_verified', 'is_admin', 'metadata', 'email_verified']);
  await check('posts', [
    'id',
    'user_id',
    'content_type',
    'content_text',
    'content',
    'media_urls',
    'thumbnail_url',
    'media_duration',
    'category',
    'agenda_tag',
    'polit_score',
    'view_count',
    'like_count',
    'dislike_count',
    'comment_count',
    'share_count',
    'is_featured',
    'is_trending',
    'is_deleted',
    'created_at',
  ]);
  await check('follows', ['id', 'follower_id', 'following_id', 'created_at']);
  await check('messages', ['id', 'sender_id', 'receiver_id', 'content', 'is_read', 'is_deleted_by_sender', 'is_deleted_by_receiver', 'created_at']);
  await check('notifications', ['id', 'user_id', 'actor_id', 'type', 'post_id', 'comment_id', 'is_read', 'created_at']);
  await check('agendas', ['id', 'title', 'slug', 'is_active', 'is_trending', 'trending_score', 'total_polit_score', 'post_count']);
  await check('comments', ['id', 'post_id', 'user_id', 'content', 'is_deleted', 'created_at']);
  await check('likes', ['id', 'post_id', 'comment_id', 'user_id', 'created_at']);
  await check('parties', ['id', 'name', 'short_name', 'slug', 'logo_url', 'color', 'is_active']);
  // Admin panel tables (no-mock requirement)
  await check('admin_notification_rules', ['id', 'name', 'description', 'trigger', 'enabled', 'channels', 'priority', 'created_at', 'updated_at']);
  await check('admin_notification_channels', ['id', 'in_app_enabled', 'push_enabled', 'email_enabled', 'sms_enabled', 'updated_at']);
  await check('admin_ads', ['id', 'title', 'position', 'status', 'target_url', 'clicks', 'impressions', 'created_at', 'updated_at']);
  await check('admin_workflows', ['id', 'name', 'status', 'last_run_at', 'success_count', 'fail_count', 'created_at', 'updated_at']);
  await check('admin_revenue_entries', ['id', 'occurred_at', 'amount_cents', 'currency', 'category', 'plan_name', 'payment_method', 'status', 'note', 'created_at']);
  await check('admin_api_keys', ['id', 'name', 'key_hash', 'key_prefix', 'status', 'created_at', 'last_used_at', 'requests_count']);
  await check('admin_sources', ['id', 'name', 'type', 'url', 'rss_feed', 'enabled', 'priority', 'items_collected', 'last_fetch_at', 'created_at', 'updated_at']);
  await check('admin_email_templates', ['id', 'name', 'type', 'subject', 'content_html', 'is_active', 'usage_count', 'updated_at', 'created_at']);
  await check('admin_payment_plans', ['id', 'name', 'period', 'price_cents', 'currency', 'is_active', 'created_at', 'updated_at']);
  await check('admin_payment_transactions', ['id', 'occurred_at', 'user_id', 'user_email', 'plan_name', 'amount_cents', 'currency', 'payment_method', 'status', 'provider', 'provider_ref', 'note', 'created_at']);
  await check('admin_security_events', ['id', 'user_id', 'event_type', 'ip', 'user_agent', 'metadata', 'created_at']);
  await check('admin_trusted_devices', ['id', 'user_id', 'device_key', 'ip', 'user_agent', 'trusted', 'first_seen_at', 'last_seen_at']);
  await check('admin_jobs', ['id', 'job_type', 'status', 'payload', 'result', 'requested_by', 'requested_at', 'started_at', 'finished_at']);

  const ok = missingTables.length === 0 && Object.keys(missingColumns).length === 0;
  return res.json({
    success: true,
    data: {
      ok,
      missingTables,
      missingColumns,
      note:
        'Bu kontrol, PostgREST üzerinden column/table varlığını test eder. RLS engelleri varsa bazı alanlar "var" kabul edilir.',
    },
  });
}

async function adminBootstrap(req, res) {
  // One-time recovery endpoint for initial admin access.
  // Protected by an env token; do NOT leave this enabled without a strong token.
  const expected = String(process.env.ADMIN_BOOTSTRAP_TOKEN || '').trim();
  if (!expected) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  const provided = String(req.headers['x-admin-bootstrap-token'] || '').trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`admin_bootstrap:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return res.status(429).json({ success: false, error: 'Çok fazla istek. Lütfen biraz bekleyin.' });

  const body = await readJsonBody(req);
  const password = String(body?.password || '').trim();
  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Geçerli bir şifre gönderin (en az 8 karakter).' });
  }

  // SECURITY: By default, this endpoint is "initial setup only".
  // If an admin already exists, we refuse unless explicitly allowed by env.
  //
  // - Recommended production practice:
  //   - Use this endpoint ONCE to create the first admin.
  //   - Then remove/clear ADMIN_BOOTSTRAP_TOKEN from Vercel to disable it.
  //
  // If you truly need emergency recovery later, you can set:
  //   ADMIN_BOOTSTRAP_ALLOW_RESET=true
  // and re-deploy, then clear it again after use.
  const allowReset = String(process.env.ADMIN_BOOTSTRAP_ALLOW_RESET || '').trim().toLowerCase() === 'true';
  try {
    const anyAdmin = await supabaseRestGet('users', { select: 'id', is_admin: 'eq.true', limit: '1' }).catch(() => []);
    if (!allowReset && Array.isArray(anyAdmin) && anyAdmin.length > 0) {
      return res.status(403).json({
        success: false,
        error:
          'Admin bootstrap devre dışı: sistemde zaten admin var. Güvenlik için bu endpoint sadece ilk kurulumda çalışır. Acil durumda geçici olarak ADMIN_BOOTSTRAP_ALLOW_RESET=true ayarlayabilirsiniz.',
      });
    }
  } catch {
    // If schema/RLS prevents the check, continue (best-effort).
  }

  // Allow operator to override defaults (kept safe by bootstrap token)
  const username = String(body?.username || 'admin').trim().toLowerCase();
  const email = String(body?.email || 'admin@polithane.com').trim().toLowerCase();
  const full_name = String(body?.full_name || 'Admin').trim() || 'Admin';

  const password_hash = await bcrypt.hash(password, 10);

  // If the user already exists (by email or username), update it. Otherwise create it.
  // NOTE: This endpoint must work across slightly different schemas (some environments
  // don't allow user_type='admin', some may miss optional columns).
  let existing = [];
  try {
    existing = await supabaseRestGet('users', {
      select: 'id',
      or: `(email.eq.${email},username.eq.${username})`,
      limit: '1',
    });
  } catch (e) {
    const msg = String(e?.message || '');
    return res.status(500).json({
      success: false,
      error: 'Admin bootstrap DB erişimi başarısız.',
      debug: msg.slice(0, 600),
    });
  }

  let row = null;
  if (Array.isArray(existing) && existing[0]?.id) {
    try {
      const updated = await supabaseRestPatch(
        'users',
        { id: `eq.${existing[0].id}` },
        { username, email, full_name, password_hash, is_admin: true, is_active: true }
      );
      row = updated?.[0] || null;
    } catch (e) {
      const msg = String(e?.message || '');
      // Common issue: environments where users.is_admin doesn't exist
      if (msg.toLowerCase().includes('is_admin') && msg.toLowerCase().includes('column')) {
        return res.status(500).json({
          success: false,
          error:
            "Admin hesabı güncellenemedi: Supabase'de `users.is_admin` sütunu yok gibi görünüyor. Çözüm: Supabase SQL Editor'da `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean default false;` çalıştırın.",
          debug: msg.slice(0, 600),
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Admin hesabı güncellenemedi.',
        debug: msg.slice(0, 600),
      });
    }
  } else {
    const base = {
      username,
      email,
      full_name,
      password_hash,
      is_admin: true,
      is_active: true,
      is_verified: true,
      email_verified: true,
    };

    // Try multiple variants to survive schema differences:
    // - Some DBs disallow user_type='admin' via check constraint; do NOT use it.
    // - Some DBs may not have email_verified / is_verified columns.
    // - Some DBs may not have is_admin column (then we must instruct the operator).
    const variants = [
      { ...base, user_type: 'citizen' },
      { ...base, user_type: 'normal' },
      { ...base }, // rely on DB default for user_type
      { ...base, is_verified: undefined }, // will be stripped below
      { ...base, email_verified: undefined }, // will be stripped below
    ];

    const stripUndef = (obj) => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = v;
      }
      return out;
    };

    let lastErr = '';
    for (const v of variants) {
      try {
        const inserted = await supabaseRestInsert('users', [stripUndef(v)]);
        row = inserted?.[0] || null;
        if (row) break;
      } catch (e) {
        lastErr = String(e?.message || '');
        // If is_admin column is missing, no retry will fix admin access.
        if (lastErr.toLowerCase().includes('is_admin') && lastErr.toLowerCase().includes('column')) {
          return res.status(500).json({
            success: false,
            error:
              "Admin hesabı oluşturulamadı: Supabase'de `users.is_admin` sütunu yok gibi görünüyor. Çözüm: Supabase SQL Editor'da `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean default false;` çalıştırın.",
            debug: lastErr.slice(0, 600),
          });
        }
        // continue trying next variant
      }
    }

    if (!row) {
      return res.status(500).json({
        success: false,
        error: 'Admin hesabı oluşturulamadı.',
        debug: String(lastErr || 'unknown').slice(0, 600),
      });
    }
  }

  if (!row) return res.status(500).json({ success: false, error: 'Admin hesabı oluşturulamadı.' });
  if (row) delete row.password_hash;
  return res.json({
    success: true,
    message: 'Admin hesabı güncellendi. Artık admin@polithane.com ile giriş yapabilirsiniz.',
    data: { id: row.id, username: row.username, email: row.email, full_name: row.full_name },
  });
}

function requireAuth(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return auth;
}

function getPublicAppUrl(req) {
  // Priority: FRONTEND_URL > PUBLIC_APP_URL > APP_URL (Vercel uses FRONTEND_URL)
  const envUrl = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || process.env.APP_URL || '';
  if (envUrl) return String(envUrl).replace(/\/+$/, '');
  // NEVER use request host (can be preview deployment)
  // Always fallback to production domain
  return 'https://www.polithane.com';
}

function sha256Hex(input) {
  // Node runtime includes crypto
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

const _smtpTransportersByPort = new Map();
function createSmtpTransporter({ port }) {
  const host = String(process.env.SMTP_HOST || 'mail.polithane.com').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const p = parseInt(String(port || process.env.SMTP_PORT || '587'), 10) || 587;
  const secure = p === 465;
  const rejectUnauthorized = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase() !== 'false';

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing).');
  }

  return nodemailer.createTransport({
    host,
    port: p,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    // Tighten network behavior and make TLS behavior configurable.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    // In some hosting environments, STARTTLS negotiation is picky; keep defaults but set servername.
    tls: { servername: host, rejectUnauthorized },
  });
}

function getSmtpTransporterForPort(port) {
  const p = parseInt(String(port || ''), 10) || 587;
  const existing = _smtpTransportersByPort.get(p);
  if (existing) return existing;
  const t = createSmtpTransporter({ port: p });
  _smtpTransportersByPort.set(p, t);
  return t;
}

function getSmtpPortCandidates() {
  const raw = String(process.env.SMTP_PORTS || '').trim();
  const fromEnv = parseInt(String(process.env.SMTP_PORT || ''), 10);
  const base = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 587;
  const list = raw
    ? raw
        .split(',')
        .map((x) => parseInt(String(x).trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [base, base === 587 ? 465 : 587];
  // Unique + preserve order
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out.length > 0 ? out : [587, 465];
}

function withTimeout(promise, ms, label) {
  const t = Math.max(1, Number(ms) || 1);
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label || 'Operation'} timed out after ${t}ms`)), t);
    }),
  ]);
}

function isMailRelayConfigured() {
  const url = String(process.env.MAIL_RELAY_URL || '').trim();
  const token = String(process.env.MAIL_RELAY_TOKEN || '').trim();
  return !!(url && token);
}

function isBrevoConfigured() {
  // Keep env-based fast check for legacy paths (admin env check, etc).
  const key = String(process.env.BREVO_API_KEY || '').trim();
  const fromEmail = String(process.env.BREVO_FROM_EMAIL || process.env.MAIL_SENDER_EMAIL || '').trim();
  return !!(key && fromEmail);
}

async function sendEmailViaBrevo({ to, subject, html, text, fromEmail, fromName, apiKey }) {
  const key = String(apiKey || process.env.BREVO_API_KEY || '').trim();
  if (!key) throw new Error('BREVO is not configured (BREVO_API_KEY missing).');

  const senderEmail = String(fromEmail || '').trim();
  if (!senderEmail) throw new Error('BREVO_FROM_EMAIL (or SMTP_FROM) is missing.');
  const senderName = String(fromName || process.env.BREVO_FROM_NAME || process.env.MAIL_SENDER_NAME || 'Polithane').trim() || 'Polithane';

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: String(to || '').trim() }],
    subject: String(subject || '').trim(),
    ...(html ? { htmlContent: String(html) } : {}),
    ...(text ? { textContent: String(text) } : {}),
  };

  const resp = await withTimeout(
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    }),
    8_000,
    'BREVO send'
  );

  const raw = await resp.text().catch(() => '');
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!resp.ok) {
    // Brevo errors usually include {message, code}
    const msg = String(data?.message || data?.error || raw || `BREVO error (${resp.status})`).slice(0, 900);
    throw new Error(msg);
  }
  return { messageId: data?.messageId || null, raw: data || null };
}

async function getCentralMailConfig() {
  // Single source of truth: ENV overrides, otherwise site_settings (admin Mail Ayarları).
  const map = await getSiteSettingsMapCached().catch(() => ({}));
  const get = (k, fallback = '') => (map && Object.prototype.hasOwnProperty.call(map, k) ? String(map[k] ?? '') : fallback);

  const enabled = String(process.env.MAIL_ENABLED || get('mail_enabled', 'true') || 'true').trim().toLowerCase() !== 'false';
  if (!enabled) throw new Error('Mail sistemi kapalı (mail_enabled=false).');

  const provider = String(process.env.MAIL_PROVIDER || get('mail_provider', 'brevo') || 'brevo').trim().toLowerCase();
  if (provider !== 'brevo') throw new Error(`Desteklenmeyen mail provider: ${provider}. (Sadece brevo)`);

  const apiKey = String(process.env.BREVO_API_KEY || get('mail_brevo_api_key', '') || '').trim();
  if (!apiKey) throw new Error('Brevo API key eksik (BREVO_API_KEY / mail_brevo_api_key).');

  const senderEmail = String(
    process.env.MAIL_SENDER_EMAIL ||
      get('mail_sender_email', '') ||
      get('email_from_address', '') ||
      process.env.EMAIL_FROM ||
      process.env.BREVO_FROM_EMAIL ||
      ''
  ).trim();
  if (!senderEmail) throw new Error('Gönderici e-posta eksik (MAIL_SENDER_EMAIL / mail_sender_email).');

  const senderName = String(process.env.MAIL_SENDER_NAME || process.env.BREVO_FROM_NAME || get('mail_sender_name', 'Polithane') || 'Polithane').trim() || 'Polithane';

  return { provider, apiKey, senderEmail, senderName };
}

async function sendEmailViaRelay({ to, subject, html, text, fromEmail }) {
  const relayUrl = String(process.env.MAIL_RELAY_URL || '').trim();
  const relayToken = String(process.env.MAIL_RELAY_TOKEN || '').trim();
  if (!relayUrl || !relayToken) throw new Error('MAIL_RELAY is not configured (MAIL_RELAY_URL/MAIL_RELAY_TOKEN missing).');

  const payload = {
    to: String(to || '').trim(),
    subject: String(subject || '').trim(),
    text: text ? String(text) : undefined,
    html: html ? String(html) : undefined,
    from: fromEmail ? String(fromEmail) : undefined,
  };

  const resp = await withTimeout(
    fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mail-relay-token': relayToken,
      },
      body: JSON.stringify(payload),
    }),
    6_000,
    'MAIL_RELAY fetch'
  );

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.success === false) {
    const msg = String(data?.error || `MAIL_RELAY error (${resp.status})`).slice(0, 900);
    throw new Error(msg);
  }
  return true;
}

async function sendEmail({ to, subject, html, text }) {
  const cfg = await getCentralMailConfig();
  await sendEmailViaBrevo({ to, subject, html, text, fromEmail: cfg.senderEmail, fromName: cfg.senderName, apiKey: cfg.apiKey });
}

function isSmtpConfigured() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const from = String(process.env.SMTP_FROM || process.env.EMAIL_FROM || '').trim();
  return !!(host && user && pass && (from || user));
}

function emailLayout({ title, bodyHtml, userName = '' }) {
  const salutation = userName ? `<p style="margin:0 0 12px 0;color:#111827;font-size:15px;">Sayın <strong>${userName}</strong>,</p>` : '';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; background:#f3f4f6; padding:20px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,159,214,0.15);">
        <div style="background:linear-gradient(135deg,#009fd6 0%,#0077b6 100%);padding:32px 24px;text-align:center;color:#fff;">
          <div style="font-weight:900;font-size:28px;letter-spacing:-0.5px;margin-bottom:8px;">Polithane</div>
          <div style="font-size:13px;opacity:0.92;font-weight:500;">Özgür, açık, şeffaf siyaset, bağımsız medya!</div>
        </div>
        <div style="padding:32px 24px;">
          ${salutation}
          <h2 style="margin:0 0 16px 0;font-size:20px;color:#111827;font-weight:700;">${title}</h2>
          ${bodyHtml}
          <div style="margin-top:24px;padding-top:20px;border-top:2px solid #e5e7eb;font-size:13px;color:#6b7280;line-height:1.5;">
            <p style="margin:0 0 8px 0;">Bu e-posta <strong style="color:#009fd6;">Polithane</strong> tarafından otomatik olarak gönderilmiştir.</p>
            <p style="margin:0;font-size:12px;">Lütfen bu e-postayı yanıtlamayın.</p>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;">© 2025 Polithane. Tüm hakları saklıdır.</p>
          <p style="margin:8px 0 0 0;font-size:11px;color:#9ca3af;">Özgür, açık, şeffaf siyaset platformu</p>
        </div>
      </div>
    </div>
  `;
}

async function safeSendEmail(payload) {
  try {
    // Keep this bounded so user-facing API endpoints don't stall.
    await withTimeout(sendEmail(payload), 12_000, 'Mail send');
    return true;
  } catch {
    return false;
  }
}

function shouldEmailFromMeta(meta, type) {
  const settings = meta?.notification_settings && typeof meta.notification_settings === 'object' ? meta.notification_settings : {};
  // Global switch (default: on)
  if (settings.emailNotifications === false) return false;
  // Per-type switches (default: on)
  // Backward-compat: older keys used *Email suffix; newer UI uses plain keys.
  const isOff = (plainKey, legacyKey) => settings?.[plainKey] === false || settings?.[legacyKey] === false;

  if (type === 'message' && isOff('messages', 'messagesEmail')) return false;
  if (type === 'like' && isOff('likes', 'likesEmail')) return false;
  if (type === 'comment_like') {
    // Prefer dedicated toggle when present; otherwise fall back to likes.
    const commentLikeOff = settings?.commentLikes === false || settings?.commentLikesEmail === false || settings?.comment_like === false;
    if (commentLikeOff) return false;
    if (isOff('likes', 'likesEmail')) return false;
  }
  if (type === 'comment' && isOff('comments', 'commentsEmail')) return false;
  if (type === 'share' && isOff('shares', 'sharesEmail')) return false;
  if (type === 'follow' && isOff('follows', 'followsEmail')) return false;
  if (type === 'mention' && isOff('mentions', 'mentionsEmail')) return false;
  if (type === 'approval' && isOff('approval', 'approvalEmail')) return false;
  if (type === 'system' && isOff('system', 'systemEmail')) return false;
  if (type === 'weekly_digest' && isOff('weeklyDigest', 'weeklyDigestEmail')) return false;
  return true;
}

// Admin-level notification channel/rule gating (email_enabled + per-trigger channels)
let adminNotifChannelsCache = null;
let adminNotifChannelsCacheAt = 0;
let adminNotifRulesCache = null; // Map(trigger -> { enabled, channels })
let adminNotifRulesCacheAt = 0;
const ADMIN_NOTIF_CACHE_MS = 30_000;

function normalizeChannelsValue(v) {
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
  const s = String(v || '').trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x || '').trim()).filter(Boolean);
  } catch {
    // ignore
  }
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

async function getAdminNotificationChannelsCached() {
  const now = Date.now();
  if (adminNotifChannelsCache && (now - adminNotifChannelsCacheAt) < ADMIN_NOTIF_CACHE_MS) return adminNotifChannelsCache;
  let row = null;
  try {
    const rows = await supabaseRestGet('admin_notification_channels', { select: '*', id: 'eq.1', limit: '1' });
    row = Array.isArray(rows) ? rows?.[0] || null : null;
  } catch {
    row = null;
  }
  const out = row || { id: 1, in_app_enabled: true, push_enabled: false, email_enabled: true, sms_enabled: false };
  adminNotifChannelsCache = out;
  adminNotifChannelsCacheAt = now;
  return out;
}

async function getAdminNotificationRulesCached() {
  const now = Date.now();
  if (adminNotifRulesCache && (now - adminNotifRulesCacheAt) < ADMIN_NOTIF_CACHE_MS) return adminNotifRulesCache;
  const map = new Map();
  try {
    const rows = await supabaseRestGet('admin_notification_rules', { select: 'trigger,enabled,channels', limit: '200' }).catch(() => []);
    for (const r of Array.isArray(rows) ? rows : []) {
      const trig = String(r?.trigger || '').trim();
      if (!trig) continue;
      map.set(trig, { enabled: r?.enabled !== false, channels: normalizeChannelsValue(r?.channels) });
    }
  } catch {
    // ignore
  }
  adminNotifRulesCache = map;
  adminNotifRulesCacheAt = now;
  return map;
}

async function isEmailNotificationAllowedByAdmin(trigger) {
  const t = String(trigger || '').trim() || 'system';
  const channels = await getAdminNotificationChannelsCached();
  if (channels?.email_enabled === false) return false;
  const rules = await getAdminNotificationRulesCached();
  const rule = rules?.get(t) || null;
  // If a rule exists and is disabled, block it. If no rule exists, allow by default.
  if (rule && rule.enabled === false) return false;
  if (rule && Array.isArray(rule.channels) && rule.channels.length > 0 && !rule.channels.includes('email')) return false;
  return true;
}

// Email templates (admin_email_templates) – best-effort runtime usage with safe fallbacks.
let emailTemplateCache = new Map();
let emailTemplateCacheAt = 0;
const EMAIL_TEMPLATE_CACHE_MS = 30_000;

function escapeHtmlEmailTemplate(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function applyTemplateVars(input, vars) {
  let out = String(input ?? '');
  const entries = vars && typeof vars === 'object' ? Object.entries(vars) : [];
  for (const [kRaw, vRaw] of entries) {
    const k = String(kRaw || '').trim();
    if (!k) continue;
    const token = `{{${k}}}`;
    const v = vRaw == null ? '' : String(vRaw);
    out = out.split(token).join(v);
  }
  return out;
}

async function getActiveEmailTemplateByType(type) {
  const t = String(type || '').trim();
  if (!t) return null;

  const now = Date.now();
  if (emailTemplateCache && (now - emailTemplateCacheAt) < EMAIL_TEMPLATE_CACHE_MS) {
    return emailTemplateCache.get(t) || null;
  }

  const next = new Map();
  try {
    let rows = [];
    try {
      rows = await supabaseRestGetWithOrderFallback(
        'admin_email_templates',
        { select: 'id,type,subject,content_html,is_active,usage_count,updated_at,created_at', type: `eq.${t}`, is_active: 'eq.true', limit: '1' },
        ['updated_at.desc', 'created_at.desc', 'id.desc']
      );
    } catch (e) {
      // Some deployments may be missing `is_active` – retry without it.
      if (isMissingColumnError(e, 'is_active')) {
        rows = await supabaseRestGetWithOrderFallback(
          'admin_email_templates',
          { select: 'id,type,subject,content_html,usage_count,updated_at,created_at', type: `eq.${t}`, limit: '1' },
          ['updated_at.desc', 'created_at.desc', 'id.desc']
        );
      } else {
        throw e;
      }
    }
    const tpl = Array.isArray(rows) ? rows?.[0] || null : null;
    // Cache only the requested key (others remain null).
    next.set(t, tpl);
  } catch {
    next.set(t, null);
  }

  emailTemplateCache = next;
  emailTemplateCacheAt = now;
  return next.get(t) || null;
}

async function renderEmailTemplate(req, { type, vars, fallbackSubject = '', fallbackHtml = '', fallbackText = '' }) {
  const tpl = await getActiveEmailTemplateByType(type).catch(() => null);
  if (!tpl?.content_html && !tpl?.subject) return null;

  const safeVars = {};
  const raw = vars && typeof vars === 'object' ? vars : {};
  for (const [k, v] of Object.entries(raw)) {
    safeVars[k] = escapeHtmlEmailTemplate(v);
  }

  const subject = String(applyTemplateVars(tpl?.subject || '', safeVars) || '').trim() || String(fallbackSubject || '').trim();
  const html = String(applyTemplateVars(tpl?.content_html || '', safeVars) || '').trim() || String(fallbackHtml || '').trim();
  const text = String(fallbackText || '').trim();

  // Best-effort usage_count bump (safe to ignore failures).
  try {
    if (tpl?.id) {
      const usage = Math.max(0, parseInt(String(tpl?.usage_count ?? 0), 10) || 0);
      await supabaseRestPatch('admin_email_templates', { id: `eq.${tpl.id}` }, { usage_count: usage + 1, updated_at: new Date().toISOString() }).catch(() => null);
    }
  } catch {
    // ignore
  }

  return { subject, html, text };
}

async function sendVerificationEmailForUser(req, { toEmail, token, fullName = '' }) {
  const appUrl = getPublicAppUrl(req);
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Polithane – E-posta Doğrulama';
  const userName = String(fullName || '').trim();
  const text =
    `Merhaba${userName ? ` ${userName}` : ''},\n\n` +
    `Polithane hesabınızı aktifleştirmek için e-posta adresinizi doğrulayın:\n${verifyUrl}\n\n` +
    `Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n`;
  const html = emailLayout({
    title: 'E-posta Adresinizi Doğrulayın',
    userName,
    bodyHtml: `
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
        Polithane'ye hoş geldiniz! Hesabınızı aktifleştirmek ve platformun tüm özelliklerinden yararlanmak için e-posta adresinizi doğrulamanız gerekmektedir.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#009fd6,#0077b6);color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(0,159,214,0.3);transition:transform 0.2s;">
          E-postamı Doğrula
        </a>
      </div>
      <div style="background:#f0f9ff;border-left:4px solid #009fd6;padding:16px 20px;margin:24px 0;border-radius:8px;">
        <p style="margin:0;font-size:14px;color:#1e3a8a;"><strong>📧 Aktivasyon Sonrası:</strong></p>
        <ul style="margin:8px 0 0 0;padding-left:20px;font-size:14px;color:#1e40af;line-height:1.8;">
          <li>Polit ve Fast paylaşımları yapabilirsiniz</li>
          <li>Yorum yazıp beğenme yapabilirsiniz</li>
          <li>Mesajlaşma ve takip edebilirsiniz</li>
        </ul>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:20px 0 0 0;">
        <strong>Link çalışmıyor mu?</strong> Aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırabilirsiniz:<br>
        <span style="color:#009fd6;word-break:break-all;font-size:12px;">${verifyUrl}</span>
      </p>
    `,
  });
  const rendered = await renderEmailTemplate(req, {
    type: 'email_verification',
    vars: { verification_link: verifyUrl, app_url: appUrl, full_name: userName },
    fallbackSubject: subject,
    fallbackHtml: html,
    fallbackText: text,
  }).catch(() => null);
  // STRICT: verification email must be delivered (uses centralized mail settings).
  // Safety: if a customized template breaks Brevo payload, retry once with the built-in fallback.
  try {
    await sendEmail({ to: toEmail, subject: rendered?.subject || subject, html: rendered?.html || html, text });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('sendVerificationEmailForUser: template send failed, retrying fallback:', String(e?.message || e || 'mail send failed'));
    await sendEmail({ to: toEmail, subject, html, text });
  }
}

async function sendWelcomeEmailToUser(req, { toEmail, fullName }) {
  const appUrl = getPublicAppUrl(req);
  const userName = String(fullName || '').trim();
  const subject = 'Polithane – Hoş Geldiniz! 🎉';
  const html = emailLayout({
    title: '🎊 Hoş Geldiniz!',
    userName,
    bodyHtml: `
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
        Polithane ailesine katıldığınız için çok mutluyuz! E-posta doğrulamanızı başarıyla tamamladınız ve artık platformumuzun tüm özelliklerinden faydalanabilirsiniz.
      </p>
      <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;padding:24px;margin:24px 0;border:2px solid #bae6fd;">
        <h3 style="margin:0 0 12px 0;color:#0077b6;font-size:17px;font-weight:700;">✨ Neler Yapabilirsiniz?</h3>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#1e40af;line-height:2;">
          <li><strong>Polit ve Fast</strong> paylaşımları yaparak sesinizhazır duyurabilirsiniz</li>
          <li>Milletvekillerini ve siyasi figürleri <strong>takip edebilirsiniz</strong></li>
          <li>Gündemdeki konulara <strong>yorum</strong> yapabilirsiniz</li>
          <li>Beğendiğiniz içerikleri <strong>beğenip paylaşabilirsiniz</strong></li>
          <li>Diğer kullanıcılarla <strong>mesajlaşabilirsiniz</strong></li>
          <li><strong>Polit Puan</strong> kazanarak etkileşiminizi artırabilirsiniz</li>
        </ul>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#009fd6,#0077b6);color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(0,159,214,0.3);">
          Polithane'ye Giriş Yap
        </a>
      </div>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;margin:24px 0;border-radius:8px;">
        <p style="margin:0;font-size:14px;color:#92400e;">
          <strong>💡 İpucu:</strong> Profilinizi tamamlayarak güvenilirliğinizi artırabilir ve daha fazla etkileşim alabilirsiniz!
        </p>
      </div>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0 0;">
        Sorularınız veya önerileriniz varsa bizimle iletişime geçmekten çekinmeyin. Polithane ailesinin bir parçası olduğunuz için tekrar teşekkür ederiz!
      </p>
    `,
  });
  const text = `Merhaba ${userName || 'değerli kullanıcımız'},\n\nPolithane ailesine hoş geldiniz! E-posta doğrulamanız tamamlandı.\n\nPlatformumuzda polit ve fast paylaşımları yapabilir, yorum yazabilir, mesajlaşabilir ve daha fazlasını keşfedebilirsiniz.\n\n${appUrl}\n\nİyi kullanımlar dileriz!\nPolithane Ekibi`;
  const rendered = await renderEmailTemplate(req, {
    type: 'welcome',
    vars: { full_name: userName || 'kullanıcı', app_url: appUrl },
    fallbackSubject: subject,
    fallbackHtml: html,
    fallbackText: text,
  }).catch(() => null);
  await sendEmail({ to: toEmail, subject: rendered?.subject || subject, html: rendered?.html || html, text });
}

async function sendNotificationEmail(req, { userId, type, actorId, postId }) {
  try {
    // Admin-level channels/rules (email_enabled + per-trigger channels)
    const adminOk = await isEmailNotificationAllowedByAdmin(type).catch(() => true);
    if (!adminOk) return;

    const rows = await supabaseRestGet('users', { select: 'id,email,full_name,metadata,is_active,email_verified', id: `eq.${userId}`, limit: '1' }).catch(() => []);
    const u = rows?.[0] || null;
    if (!u?.email) return;
    if (u?.is_active === false) return;
    const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
    if (!shouldEmailFromMeta(meta, type)) return;

    const appUrl = getPublicAppUrl(req);
    const link = postId ? `${appUrl}/post/${encodeURIComponent(postId)}` : actorId ? `${appUrl}/profile/${encodeURIComponent(actorId)}` : appUrl;
    const settingsLink = `${appUrl}/settings/notifications`;

    let actorName = '';
    if (actorId) {
      const aRows = await supabaseRestGet('users', { select: 'id,full_name,username', id: `eq.${actorId}`, limit: '1' }).catch(() => []);
      const a = aRows?.[0] || null;
      actorName = a?.full_name || a?.username || '';
    }

    let postExcerpt = '';
    if (postId) {
      try {
        const pRows = await supabaseRestGet('posts', { select: 'id,content_text,content', id: `eq.${postId}`, limit: '1' }).catch(() => []);
        const p = pRows?.[0] || null;
        const raw = String(p?.content_text || p?.content || '').trim();
        if (raw) postExcerpt = raw.replace(/\s+/g, ' ').slice(0, 140);
      } catch {
        postExcerpt = '';
      }
    }

    const titleMap = {
      like: 'Beğeni',
      comment_like: 'Yorum beğenisi',
      comment: 'Yorum',
      share: 'Paylaşım',
      follow: 'Yeni takip',
      mention: 'Bahsedilme',
      message: 'Yeni mesaj',
      approval: 'Üyelik durumu',
      system: 'Bildirim',
    };
    const ttl = titleMap[String(type || 'system')] || 'Bildirim';
    const subject = `Polithane – ${ttl}`;
    const detail =
      type === 'like'
        ? `${actorName ? `<strong>${actorName}</strong> ` : ''}paylaşımınızı beğendi.`
        : type === 'comment_like'
          ? `${actorName ? `<strong>${actorName}</strong> ` : ''}yorumunuzu beğendi.`
        : type === 'comment'
          ? `${actorName ? `<strong>${actorName}</strong> ` : ''}paylaşımınıza yorum yaptı.`
          : type === 'mention'
            ? `${actorName ? `<strong>${actorName}</strong> ` : ''}sizi bir içerikte etiketledi.`
          : type === 'share'
            ? `${actorName ? `<strong>${actorName}</strong> ` : ''}paylaşımınızı paylaştı.`
            : type === 'follow'
              ? `${actorName ? `<strong>${actorName}</strong> ` : ''}sizi takip etmeye başladı.`
              : type === 'approval'
                ? `Üyeliğiniz ile ilgili bir güncelleme var.`
                : `Yeni bir bildiriminiz var.`;

    const html = emailLayout({
      title: ttl,
      bodyHtml: `
        <p>${detail}</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
            Görüntüle
          </a>
        </p>
      `,
    });
    const text = `${ttl}\n\n${actorName ? actorName + ' ' : ''}${detail.replace(/<[^>]+>/g, '')}\n${link}\n`;
    const rendered = await renderEmailTemplate(req, {
      type: String(type || 'system').trim() || 'system',
      vars: { actor_name: actorName, link, app_url: appUrl, settings_link: settingsLink, post_excerpt: postExcerpt },
      fallbackSubject: subject,
      fallbackHtml: html,
      fallbackText: text,
    }).catch(() => null);
    await sendEmail({ to: u.email, subject: rendered?.subject || subject, html: rendered?.html || html, text });
  } catch {
    // best-effort
  }
}

async function sendMessageEmail(req, { receiverId, senderId, messagePreview }) {
  try {
    const adminOk = await isEmailNotificationAllowedByAdmin('message').catch(() => true);
    if (!adminOk) return;

    const recvRows = await supabaseRestGet('users', { select: 'id,email,metadata,is_active', id: `eq.${receiverId}`, limit: '1' }).catch(() => []);
    const recv = recvRows?.[0] || null;
    if (!recv?.email) return;
    if (recv.is_active === false) return;
    const meta = recv?.metadata && typeof recv.metadata === 'object' ? recv.metadata : {};
    if (!shouldEmailFromMeta(meta, 'message')) return;

    const senderRows = await supabaseRestGet('users', { select: 'id,full_name,username', id: `eq.${senderId}`, limit: '1' }).catch(() => []);
    const sender = senderRows?.[0] || null;
    const senderName = sender?.full_name || sender?.username || 'Bir kullanıcı';

    const appUrl = getPublicAppUrl(req);
    const link = `${appUrl}/messages?to=${encodeURIComponent(senderId)}`;
    const subject = `Polithane – Yeni mesaj (${senderName})`;
    const safePreview = String(messagePreview || '').slice(0, 220);
    const html = emailLayout({
      title: 'Yeni mesajınız var',
      bodyHtml: `
        <p><strong>${senderName}</strong> size bir mesaj gönderdi.</p>
        ${safePreview ? `<div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:12px 0;white-space:pre-wrap;">${safePreview}</div>` : ''}
        <p>
          <a href="${link}" style="display:inline-block;padding:10px 14px;background:#009fd6;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
            Mesajı aç
          </a>
        </p>
      `,
    });
    const text = `Yeni mesajınız var.\nGönderen: ${senderName}\n\n${safePreview}\n\n${link}\n`;
    const rendered = await renderEmailTemplate(req, {
      type: 'message',
      vars: { actor_name: senderName, message_excerpt: safePreview, link, app_url: appUrl },
      fallbackSubject: subject,
      fallbackHtml: html,
      fallbackText: text,
    }).catch(() => null);
    await sendEmail({ to: recv.email, subject: rendered?.subject || subject, html: rendered?.html || html, text });
  } catch {
    // best-effort
  }
}

async function safeUserPatch(userId, patch) {
  const maxTries = 8;
  let attempt = 0;
  let payload = { ...patch };
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      const updated = await supabaseRestPatch('users', { id: `eq.${userId}` }, payload);
      return updated;
    } catch (e) {
      if (attempt >= maxTries) throw e;
      const msg = String(e?.message || '');
      // Two common shapes:
      // - "column users.birth_date does not exist"
      // - Supabase Error (PGRST204): "Could not find the 'birth_date' column of 'users' in the schema cache"
      const m1 = msg.match(/column\s+users\.([a-zA-Z0-9_]+)\s+does not exist/i);
      const m2 = msg.match(/Could not find the '([^']+)' column of 'users'/i);
      const col = (m1 && m1[1]) || (m2 && m2[1]);
      if (!col) throw e;
      if (!Object.prototype.hasOwnProperty.call(payload, col)) throw e;
      delete payload[col];
      if (Object.keys(payload).length === 0) return [];
    }
  }
}

async function usersCheckUsername(req, res, username) {
  const u = String(username || '').trim().toLowerCase();
  // Rate limit username checks (best-effort)
  const ip = getClientIp(req);
  const rl = rateLimit(`check_username:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return res.status(429).json({ success: false, available: false, message: 'Çok fazla istek. Lütfen biraz bekleyin.' });
  if (!u || u.length < 5) return res.json({ success: true, available: false, message: 'En az 5 karakter olmalı' });
  if (u.length > 15) return res.json({ success: true, available: false, message: 'En fazla 15 karakter olabilir' });
  if (isReservedUsername(u)) {
    return res.json({ success: true, available: false, message: 'Bu kullanıcı adı sistem tarafından ayrılmıştır.' });
  }
  if (!/^[a-z0-9._-]+$/.test(u)) {
    return res.json({
      success: true,
      available: false,
      message: 'Sadece harf (a-z), rakam (0-9), alt çizgi (_), tire (-) ve nokta (.) kullanılabilir',
    });
  }
  const rows = await supabaseRestGet('users', { select: 'id', username: `eq.${u}`, limit: '1' }).catch(() => []);
  const available = !(Array.isArray(rows) && rows.length > 0);
  res.json({ success: true, available, message: available ? 'Müsait' : 'Kullanımda' });
}

async function usersUpdateUsername(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const u = String(body?.username || '').trim().toLowerCase();
  if (!u || u.length < 5) return res.status(400).json({ success: false, error: 'Kullanıcı adı en az 5 karakter olmalı.' });
  if (u.length > 15) return res.status(400).json({ success: false, error: 'Kullanıcı adı en fazla 15 karakter olabilir.' });
  if (isReservedUsername(u)) return res.status(400).json({ success: false, error: 'Bu kullanıcı adı sistem tarafından ayrılmıştır.' });
  if (!/^[a-z0-9._-]+$/.test(u)) {
    return res.status(400).json({
      success: false,
      error: 'Sadece harf (a-z), rakam (0-9), alt çizgi (_), tire (-) ve nokta (.) kullanılabilir.',
    });
  }

  const exists = await supabaseRestGet('users', { select: 'id', username: `eq.${u}`, limit: '1' }).catch(() => []);
  if (Array.isArray(exists) && exists[0] && String(exists[0].id) !== String(auth.id)) {
    return res.status(400).json({ success: false, error: 'Bu kullanıcı adı kullanımda.' });
  }

  const updated = await safeUserPatch(auth.id, { username: u });
  const user = updated?.[0] || null;
  if (user) delete user.password_hash;
  res.json({ success: true, data: user });
}

async function usersUpdateMe(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);

  const allowed = {};
  if (Object.prototype.hasOwnProperty.call(body, 'full_name')) allowed.full_name = String(body.full_name || '').trim();
  if (Object.prototype.hasOwnProperty.call(body, 'bio')) allowed.bio = body.bio ? String(body.bio).slice(0, 2000) : null;
  if (Object.prototype.hasOwnProperty.call(body, 'avatar_url')) allowed.avatar_url = body.avatar_url ? String(body.avatar_url).slice(0, 500) : null;
  if (Object.prototype.hasOwnProperty.call(body, 'cover_url')) allowed.cover_url = body.cover_url ? String(body.cover_url).slice(0, 500) : null;

  // Schema may vary: province/city_code, phone, birth_date etc. We'll try and drop unknown columns.
  if (Object.prototype.hasOwnProperty.call(body, 'province')) allowed.province = body.province ? String(body.province).slice(0, 100) : null;
  if (Object.prototype.hasOwnProperty.call(body, 'district')) allowed.district = body.district ? String(body.district).slice(0, 100) : null;
  if (Object.prototype.hasOwnProperty.call(body, 'city_code')) allowed.city_code = body.city_code ? String(body.city_code).slice(0, 50) : null;
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) allowed.phone = body.phone ? String(body.phone).slice(0, 30) : null;
  if (Object.prototype.hasOwnProperty.call(body, 'birth_date')) allowed.birth_date = body.birth_date || null;
  if (Object.prototype.hasOwnProperty.call(body, 'metadata') && body.metadata && typeof body.metadata === 'object') {
    allowed.metadata = body.metadata;
  }

  // Basic validation
  if (allowed.full_name && allowed.full_name.length < 2) return res.status(400).json({ success: false, error: 'Ad Soyad çok kısa.' });
  if (allowed.phone && !/^[0-9+\s()-]{6,30}$/.test(allowed.phone)) return res.status(400).json({ success: false, error: 'Telefon formatı geçersiz.' });

  if (Object.keys(allowed).length === 0) return res.status(400).json({ success: false, error: 'Güncellenecek alan yok.' });

  const updated = await safeUserPatch(auth.id, allowed);
  const user = updated?.[0] || null;
  // If caller tries to write only metadata but schema doesn't have the column, return a clear Turkish error.
  if (!user && Object.keys(allowed).length === 1 && Object.prototype.hasOwnProperty.call(allowed, 'metadata')) {
    return res.status(500).json({
      success: false,
      error:
        "Ayarlar kaydedilemedi: Supabase'de `users` tablosunda `metadata` sütunu yok. Çözüm: Supabase SQL Editor'da `server/migrations/006_add_user_metadata.sql` dosyasını çalıştırın (veya `users` tablosuna `metadata` JSONB sütunu ekleyin).",
    });
  }
  if (user) delete user.password_hash;
  res.json({ success: true, data: user });
}

function parseUserIdsFromMetadata(meta) {
  const ids = meta?.blocked_user_ids;
  if (!Array.isArray(ids)) return [];
  return ids.map((x) => String(x)).filter(Boolean);
}

async function usersGetBlocks(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const me = rows?.[0];
  const meta = me?.metadata || {};
  const ids = parseUserIdsFromMetadata(meta);
  if (ids.length === 0) return res.json({ success: true, data: [] });

  // PostgREST in.(...) filter: quote UUID-like ids
  const isUuidLike = (v) => /^[0-9a-fA-F-]{36}$/.test(String(v));
  const inList = ids
    .slice(0, 200)
    .map((v) => (isUuidLike(v) ? `"${v}"` : v))
    .join(',');
  const users = await supabaseRestGet('users', { select: 'id,username,full_name,avatar_url', id: `in.(${inList})` }).catch(() => []);
  res.json({ success: true, data: Array.isArray(users) ? users : [] });
}

async function usersBlock(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const target = String(body?.user_id || '').trim();
  if (!target) return res.status(400).json({ success: false, error: 'user_id zorunlu.' });
  if (String(target) === String(auth.id)) return res.status(400).json({ success: false, error: 'Kendinizi engelleyemezsiniz.' });

  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const me = rows?.[0];
  const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};
  const ids = new Set(parseUserIdsFromMetadata(meta));
  ids.add(String(target));

  const updated = await safeUserPatch(auth.id, { metadata: { ...meta, blocked_user_ids: Array.from(ids) } });
  if (!updated || updated.length === 0) {
    return res.status(500).json({
      success: false,
      error:
        "Engelleme kaydedilemedi: Supabase'de `users.metadata` sütunu yok. Çözüm: Supabase SQL Editor'da `server/migrations/006_add_user_metadata.sql` dosyasını çalıştırın (veya `users` tablosuna `metadata` JSONB sütunu ekleyin).",
    });
  }
  res.json({ success: true });
}

async function usersUnblock(req, res, targetId) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const target = String(targetId || '').trim();
  if (!target) return res.status(400).json({ success: false, error: 'user_id zorunlu.' });

  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const me = rows?.[0];
  const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};
  const ids = parseUserIdsFromMetadata(meta).filter((x) => String(x) !== String(target));

  const updated = await safeUserPatch(auth.id, { metadata: { ...meta, blocked_user_ids: ids } });
  if (!updated || updated.length === 0) {
    return res.status(500).json({
      success: false,
      error:
        "Engel kaldırılamadı: Supabase'de `users.metadata` sütunu yok. Çözüm: Supabase SQL Editor'da `server/migrations/006_add_user_metadata.sql` dosyasını çalıştırın (veya `users` tablosuna `metadata` JSONB sütunu ekleyin).",
    });
  }
  res.json({ success: true });
}

async function usersDeactivateMe(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const updated = await safeUserPatch(auth.id, { is_active: false });
  if (!updated || updated.length === 0) return res.status(500).json({ success: false, error: 'Hesap pasifleştirilemedi.' });
  res.json({ success: true });
}

async function usersRequestDeleteMe(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const ip = getClientIp(req);
  const rl = rateLimit(`delreq:${auth.id}:${ip}`, { windowMs: 60_000, max: 3 });
  if (!rl.ok) return res.status(429).json({ success: false, error: 'Çok fazla istek. Lütfen biraz bekleyin.' });

  const rows = await supabaseRestGet('users', { select: 'id,email,metadata,is_active', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const me = rows?.[0];
  if (!me?.email) return res.status(400).json({ success: false, error: 'Email bulunamadı.' });

  const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};

  // Generate confirmation token (stored as hash in metadata)
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256Hex(token);

  const now = new Date();
  const requestedAt = now.toISOString();
  const confirmExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24h
  const scheduledFor = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90d

  const nextMeta = {
    ...meta,
    delete_request_status: 'pending',
    delete_request_token_hash: tokenHash,
    delete_request_requested_at: requestedAt,
    delete_request_confirm_expires_at: confirmExpiresAt,
    delete_request_scheduled_for: scheduledFor,
  };

  const updated = await safeUserPatch(auth.id, { metadata: nextMeta });
  if (!updated || updated.length === 0) {
    return res.status(500).json({ success: false, error: 'Bu kurulumda metadata alanı yok; silme talebi kaydedilemedi.' });
  }

  const appUrl = getPublicAppUrl(req);
  const confirmUrl = `${appUrl}/delete-confirm?token=${encodeURIComponent(token)}`;

  const subject = 'Polithane – Hesap silme onayı';
  const text =
    `Merhaba,\n\n` +
    `Polithane hesabınız için hesap silme talebi alındı.\n\n` +
    `Bu talebi ONAYLAMAK için 24 saat içinde şu bağlantıya tıklayın:\n${confirmUrl}\n\n` +
    `Onayladıktan sonra:\n` +
    `- Hesabınız pasif duruma alınır.\n` +
    `- Profiliniz ve içerikleriniz (paylaşımlar/yorumlar) diğer kullanıcılara görünmez olur.\n` +
    `- 90 gün boyunca hesabınızı tekrar aktif edebilirsiniz.\n` +
    `- 90 gün sonunda hesabınız ve verileriniz kalıcı olarak silinir.\n\n` +
    `Eğer bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Hesap silme onayı</h2>
      <p>Polithane hesabınız için <strong>silme talebi</strong> aldık.</p>
      <p>Onaylamak için lütfen <strong>24 saat</strong> içinde aşağıdaki butona tıklayın:</p>
      <p>
        <a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">
          Silme talebini onayla
        </a>
      </p>
      <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:14px 0;">
        <div style="font-weight:700;margin-bottom:6px;">Onayladıktan sonra ne olur?</div>
        <ul style="margin:0;padding-left:18px;">
          <li>Hesabınız <strong>pasif</strong> duruma alınır.</li>
          <li>Profiliniz ve içerikleriniz (paylaşımlar/yorumlar) <strong>diğer kullanıcılara görünmez</strong> olur.</li>
          <li><strong>90 gün</strong> boyunca hesabınızı tekrar aktif edebilirsiniz.</li>
          <li>90 gün sonunda hesabınız ve verileriniz <strong>kalıcı</strong> olarak silinir.</li>
        </ul>
      </div>
      <p style="font-size:12px;color:#6b7280;">Eğer bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
    </div>
  `;

  await sendEmail({ to: me.email, subject, html, text });

  res.json({ success: true, message: 'Onay e-postası gönderildi. Lütfen e-postanızı kontrol edin.' });
}

async function usersConfirmDelete(req, res) {
  const { token } = req.query;
  const raw = String(token || '').trim();
  if (!raw) return res.status(400).json({ success: false, error: 'Token eksik.' });
  const tokenHash = sha256Hex(raw);

  const rows = await supabaseRestGet('users', {
    select: 'id,email,is_active,metadata',
    'metadata->>delete_request_token_hash': `eq.${tokenHash}`,
    'metadata->>delete_request_status': 'eq.pending',
    limit: '1',
  }).catch(() => []);
  const u = rows?.[0];
  if (!u) return res.status(404).json({ success: false, error: 'Geçersiz veya süresi dolmuş bağlantı.' });

  const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
  const expiresAt = meta.delete_request_confirm_expires_at ? new Date(meta.delete_request_confirm_expires_at) : null;
  if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Bu onay bağlantısının süresi dolmuş.' });
  }

  const now = new Date().toISOString();
  const scheduledFor = meta.delete_request_scheduled_for || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const nextMeta = {
    ...meta,
    delete_request_status: 'confirmed',
    delete_request_confirmed_at: now,
    delete_request_token_hash: null,
    delete_request_confirm_expires_at: null,
    delete_request_scheduled_for: scheduledFor,
  };

  const updated = await safeUserPatch(u.id, { is_active: false, metadata: nextMeta });
  if (!updated || updated.length === 0) return res.status(500).json({ success: false, error: 'İşlem tamamlanamadı.' });

  res.json({
    success: true,
    message:
      'Hesabınız silinmek üzere kayda alındı. Hesabınız pasif duruma alındı ve profiliniz/içerikleriniz diğer kullanıcılara görünmez hale getirildi. 90 gün boyunca Ayarlar → Hesabı Sil ekranından hesabınızı tekrar aktif edebilirsiniz. 90 gün sonunda hesabınız ve verileriniz kalıcı olarak silinir.',
    scheduled_for: scheduledFor,
  });
}

async function usersReactivateMe(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const me = rows?.[0];
  const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};
  const status = String(meta.delete_request_status || '');
  const scheduledFor = meta.delete_request_scheduled_for ? new Date(meta.delete_request_scheduled_for) : null;
  if (status !== 'confirmed') return res.status(400).json({ success: false, error: 'Aktif bir silme kaydı bulunamadı.' });
  if (scheduledFor && Number.isFinite(scheduledFor.getTime()) && scheduledFor.getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Silme süreci tamamlanmış olabilir. Destek ile iletişime geçin.' });
  }
  const nextMeta = {
    ...meta,
    delete_request_status: 'cancelled',
    delete_request_cancelled_at: new Date().toISOString(),
    delete_request_requested_at: null,
    delete_request_confirmed_at: null,
    delete_request_scheduled_for: null,
  };
  const updated = await safeUserPatch(auth.id, { is_active: true, metadata: nextMeta });
  const user = updated?.[0] || null;
  if (user) delete user.password_hash;
  res.json({ success: true, data: user });
}

async function storageEnsureBucket(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const isPublic = body?.public !== false;

  // Allow-list buckets we manage from the app
  const allowed = new Set(['uploads', 'politfest']);
  if (!allowed.has(name)) return res.status(400).json({ success: false, error: 'Geçersiz bucket adı.' });

  try {
    // If service role is missing, return a helpful error
    getSupabaseServiceRoleKey();
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Storage bucket otomatik oluşturulamıyor. Vercel ortamında SUPABASE_SERVICE_ROLE_KEY gerekli.',
    });
  }

  // Check existing buckets
  const list = await supabaseStorageRequest('GET', 'bucket', undefined).catch(() => []);
  const exists = Array.isArray(list) && list.some((b) => b?.name === name);
  if (!exists) {
    await supabaseStorageRequest('POST', 'bucket', { name, public: isPublic });
  }
  res.json({ success: true, created: !exists, name });
}

async function storageUploadMedia(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const ip = getClientIp(req);
  const rl = rateLimit(`upload:${auth.id}:${ip}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    return res.status(429).json({ success: false, error: 'Çok fazla yükleme denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });
  }
  const body = await readJsonBody(req);
  const bucket = String(body?.bucket || 'uploads').trim();
  const folder = String(body?.folder || 'posts').trim();
  const dataUrl = String(body?.dataUrl || '');
  const contentType = String(body?.contentType || '');

  const allowedBuckets = new Set(['uploads', 'politfest']);
  if (!allowedBuckets.has(bucket)) return res.status(400).json({ success: false, error: 'Geçersiz bucket.' });

  // Allow nested folders under safe roots (e.g. posts/thumbnails).
  const safeFolder = String(folder || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!safeFolder) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });
  if (safeFolder.includes('..')) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });
  if (!/^[a-z0-9/_-]{1,80}$/i.test(safeFolder)) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });
  const root = safeFolder.split('/')[0];
  const allowedRoots = new Set(['posts', 'avatars', 'politfest', 'messages', 'branding']);
  if (!allowedRoots.has(root)) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });

  // Approval gate: pending accounts can browse/login but cannot upload post media yet.
  // (We still allow avatar uploads.)
  if (folder === 'posts' || folder === 'politfest') {
    const urows = await supabaseRestGet('users', {
      select: 'id,user_type,is_verified,is_admin',
      id: `eq.${auth.id}`,
      limit: '1',
    }).catch(() => []);
    const u = urows?.[0] || null;
    const ut = String(u?.user_type || 'citizen');
    const pending = !u?.is_admin && ut !== 'citizen' && !u?.is_verified;
    if (pending) {
      return res.status(403).json({
        success: false,
        error: 'Üyeliğiniz onaylanana kadar medya yükleyemezsiniz. Onay geldikten sonra Polit Atabilirsiniz.',
      });
    }
  }

  if (!dataUrl.startsWith('data:') || !dataUrl.includes('base64,')) {
    return res.status(400).json({ success: false, error: 'Geçersiz dosya verisi.' });
  }

  // Allow common media types
  const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'video/webm',
    'audio/webm',
    'audio/mpeg',
    'video/mp4',
  ]);
  const ct = contentType && allowedTypes.has(contentType) ? contentType : dataUrl.slice(5).split(';')[0];
  if (!allowedTypes.has(ct)) {
    return res.status(400).json({ success: false, error: 'Desteklenmeyen dosya türü.' });
  }

  const base64 = dataUrl.split('base64,')[1] || '';
  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ success: false, error: 'Dosya çözümlenemedi.' });
  }
  if (!buf || buf.length === 0) return res.status(400).json({ success: false, error: 'Dosya boş.' });

  // Size limit to protect serverless runtime (base64 uploads are heavy)
  const maxBytes = 12 * 1024 * 1024; // 12MB
  if (buf.length > maxBytes) {
    return res.status(400).json({
      success: false,
      error: 'Dosya çok büyük. Şimdilik maksimum 12MB medya yükleyebilirsiniz.',
    });
  }

  // Ensure service role exists
  try {
    getSupabaseServiceRoleKey();
  } catch {
    return res.status(500).json({
      success: false,
      error:
        'Medya yüklenemedi: sunucu depolama anahtarı eksik. Vercel ortamında SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı.',
    });
  }

  // Ensure bucket exists (public for uploads)
  try {
    const list = await supabaseStorageRequest('GET', 'bucket', undefined).catch(() => []);
    const exists = Array.isArray(list) && list.some((b) => b?.name === bucket);
    if (!exists) await supabaseStorageRequest('POST', 'bucket', { name: bucket, public: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Depolama bucket oluşturulamadı. Lütfen ayarları kontrol edin.' });
  }

  const ext =
    ct === 'image/png'
      ? 'png'
      : ct === 'image/webp'
        ? 'webp'
        : ct === 'image/jpeg'
          ? 'jpg'
          : ct === 'image/svg+xml'
            ? 'svg'
          : ct === 'video/mp4'
            ? 'mp4'
            : ct === 'video/webm'
              ? 'webm'
              : ct === 'audio/mpeg'
                ? 'mp3'
                : 'webm';

  const objectPath = `${safeFolder}/${auth.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    await supabaseStorageUploadObject(bucket, objectPath, buf, ct);
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Medya yüklenemedi.') });
  }

  const { supabaseUrl } = getSupabaseKeys();
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  return res.json({ success: true, data: { publicUrl, bucket, path: objectPath } });
}

async function storageCreateSignedUpload(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const ip = getClientIp(req);
  const rl = rateLimit(`signupload:${auth.id}:${ip}`, { windowMs: 60_000, max: 40 });
  if (!rl.ok) {
    return res.status(429).json({ success: false, error: 'Çok fazla istek. Lütfen 1 dakika sonra tekrar deneyin.' });
  }

  const body = await readJsonBody(req);
  const bucket = String(body?.bucket || 'uploads').trim();
  const folder = String(body?.folder || 'posts').trim();
  const contentType = String(body?.contentType || '').trim().split(';')[0].trim();

  const allowedBuckets = new Set(['uploads', 'politfest']);
  if (!allowedBuckets.has(bucket)) return res.status(400).json({ success: false, error: 'Geçersiz bucket.' });

  // Allow nested folders under safe roots (e.g. posts/thumbnails).
  const safeFolder = String(folder || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!safeFolder) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });
  if (safeFolder.includes('..')) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });
  if (!/^[a-z0-9/_-]{1,80}$/i.test(safeFolder)) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });
  const root = safeFolder.split('/')[0];
  const allowedRoots = new Set(['posts', 'avatars', 'politfest', 'messages', 'branding']);
  if (!allowedRoots.has(root)) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });

  // Approval gate: pending accounts can browse/login but cannot upload post media yet.
  // (We still allow avatar uploads.)
  if (folder === 'posts' || folder === 'politfest') {
    const urows = await supabaseRestGet('users', {
      select: 'id,user_type,is_verified,is_admin',
      id: `eq.${auth.id}`,
      limit: '1',
    }).catch(() => []);
    const u = urows?.[0] || null;
    const ut = String(u?.user_type || 'citizen');
    const pending = !u?.is_admin && ut !== 'citizen' && !u?.is_verified;
    if (pending) {
      return res.status(403).json({
        success: false,
        error: 'Üyeliğiniz onaylanana kadar medya yükleyemezsiniz. Onay geldikten sonra Polit Atabilirsiniz.',
      });
    }
  }

  // Allow common media types
  // NOTE: Mobile (esp. iOS) may upload videos as `video/quicktime` (MOV).
  // Also some phones produce `image/heic` / `image/heif`, which most browsers cannot render reliably.
  // We reject HEIC/HEIF with a clear message (ask user to convert to JPG/PNG) instead of "unknown error".
  if (contentType === 'image/heic' || contentType === 'image/heif') {
    return res.status(400).json({
      success: false,
      error: 'HEIC/HEIF resim formatı şu an desteklenmiyor. Lütfen resmi JPG veya PNG olarak yükleyin.',
    });
  }

  const allowedTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/webm',
    'video/mp4',
    'video/x-m4v',
    'video/quicktime',
    'video/3gpp',
    'video/3gpp2',
    'audio/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a',
  ]);
  if (!allowedTypes.has(contentType)) {
    return res.status(400).json({
      success: false,
      error: `Desteklenmeyen dosya türü: ${contentType || 'bilinmiyor'}.`,
    });
  }

  // Ensure service role exists (needed to sign upload)
  try {
    getSupabaseServiceRoleKey();
  } catch {
    return res.status(500).json({
      success: false,
      error:
        'Medya yüklenemedi: sunucu depolama anahtarı eksik. Vercel ortamında SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı.',
    });
  }

  // Ensure bucket exists (public for uploads)
  try {
    const list = await supabaseStorageRequest('GET', 'bucket', undefined).catch(() => []);
    const exists = Array.isArray(list) && list.some((b) => b?.name === bucket);
    if (!exists) await supabaseStorageRequest('POST', 'bucket', { name: bucket, public: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Depolama bucket oluşturulamadı. Lütfen ayarları kontrol edin.' });
  }

  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/gif'
          ? 'gif'
        : contentType === 'image/jpeg' || contentType === 'image/jpg'
          ? 'jpg'
          : contentType === 'image/svg+xml'
            ? 'svg'
          : contentType === 'video/quicktime'
            ? 'mov'
          : contentType === 'video/mp4'
            ? 'mp4'
            : contentType === 'video/x-m4v'
              ? 'm4v'
            : contentType === 'video/webm'
              ? 'webm'
              : contentType === 'video/3gpp'
                ? '3gp'
                : contentType === 'video/3gpp2'
                  ? '3g2'
              : contentType === 'audio/mpeg'
                ? 'mp3'
                : contentType === 'audio/mp4' || contentType === 'audio/x-m4a'
                  ? 'm4a'
                  : contentType === 'audio/aac'
                    ? 'aac'
                : 'webm';

  const objectPath = `${safeFolder}/${auth.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(objectPath);
    if (error || !data?.token) {
      return res.status(500).json({ success: false, error: String(error?.message || 'Signed upload oluşturulamadı.') });
    }
    const publicUrl = `${String(process.env.SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${objectPath}`;
    return res.json({
      success: true,
      data: {
        bucket,
        path: objectPath,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Signed upload oluşturulamadı.') });
  }
}

async function usersUploadAvatar(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const dataUrl = String(body?.dataUrl || '');
  const contentType = String(body?.contentType || '');

  if (!dataUrl.startsWith('data:') || !dataUrl.includes('base64,')) {
    return res.status(400).json({ success: false, error: 'Geçersiz dosya verisi.' });
  }
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const ct = contentType && allowed.has(contentType) ? contentType : dataUrl.slice(5).split(';')[0];
  if (!allowed.has(ct)) return res.status(400).json({ success: false, error: 'Sadece JPG/PNG/WEBP yükleyebilirsiniz.' });

  const base64 = dataUrl.split('base64,')[1] || '';
  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ success: false, error: 'Dosya çözümlenemedi.' });
  }
  if (!buf || buf.length === 0) return res.status(400).json({ success: false, error: 'Dosya boş.' });
  if (buf.length > 2 * 1024 * 1024) return res.status(400).json({ success: false, error: 'Dosya boyutu çok büyük (max 2MB).' });

  // Ensure uploads bucket exists (public)
  try {
    // reuse internal ensure logic
    const list = await supabaseStorageRequest('GET', 'bucket', undefined).catch(() => []);
    const exists = Array.isArray(list) && list.some((b) => b?.name === 'uploads');
    if (!exists) await supabaseStorageRequest('POST', 'bucket', { name: 'uploads', public: true });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error:
        'Profil fotoğrafı yüklenemedi. Depolama ayarları eksik olabilir. Vercel ortamında SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı.',
    });
  }

  const ext = ct === 'image/png' ? 'png' : ct === 'image/webp' ? 'webp' : 'jpg';
  const path = `avatars/${auth.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    await supabaseStorageUploadObject('uploads', path, buf, ct);
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Profil fotoğrafı yüklenemedi.') });
  }

  const { supabaseUrl } = getSupabaseKeys();
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
  const updated = await safeUserPatch(auth.id, { avatar_url: publicUrl });
  const user = updated?.[0] || null;
  if (user) delete user.password_hash;
  return res.json({ success: true, data: user });
}

async function supabaseCount(table, params = {}) {
  const { supabaseUrl, key } = getSupabaseKeys();
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}${qs}`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Error: ${text}`);
  }
  const range = res.headers.get('content-range') || '';
  // format: 0-0/123
  const total = Number(range.split('/')[1] || 0);
  await res.arrayBuffer().catch(() => null);
  return Number.isFinite(total) ? total : 0;
}

// -----------------------
// ADMIN CONTROLLERS
// -----------------------

async function adminGetStats(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const now = Date.now();
  const iso24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const isoToday = startOfDay.toISOString();

  const [userCount, postCount, newUsersToday, newPostsToday, activeUsers24h] = await Promise.all([
    supabaseCount('users', { select: 'id' }).catch(() => 0),
    supabaseCount('posts', { select: 'id', is_deleted: 'eq.false' }).catch(() => 0),
    supabaseCount('users', { select: 'id', created_at: `gte.${isoToday}` }).catch(() => 0),
    supabaseCount('posts', { select: 'id', is_deleted: 'eq.false', created_at: `gte.${isoToday}` }).catch(() => 0),
    // Best-effort: users with posts in last 24h
    supabaseRestGet('posts', {
      select: 'user_id',
      is_deleted: 'eq.false',
      created_at: `gte.${iso24h}`,
      limit: '2000',
    })
      .then((rows) => new Set((rows || []).map((r) => String(r?.user_id || '')).filter(Boolean)).size)
      .catch(() => 0),
  ]);

  // Engagement totals: best-effort sum over a capped set of posts (admin-only).
  // If there are more than 5000 posts, this provides a stable approximation (recent-weighted).
  let totals = {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalPolitScore: 0,
    avgPolitScore: 0,
  };
  try {
    const rows = await supabaseRestGet('posts', {
      select: 'view_count,like_count,comment_count,share_count,polit_score,created_at',
      is_deleted: 'eq.false',
      order: 'created_at.desc',
      limit: '5000',
    }).catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
    const sum = (k) => list.reduce((acc, r) => acc + (Number(r?.[k] || 0) || 0), 0);
    totals.totalViews = sum('view_count');
    totals.totalLikes = sum('like_count');
    totals.totalComments = sum('comment_count');
    totals.totalShares = sum('share_count');
    totals.totalPolitScore = sum('polit_score');
    totals.avgPolitScore = list.length ? Math.round(totals.totalPolitScore / list.length) : 0;
  } catch {
    // ignore
  }

  // Lists for dashboard widgets (best-effort)
  let recentUsers = [];
  try {
    const rows = await supabaseRestGet('users', {
      select: 'id,full_name,username,avatar_url,user_type,politician_type,is_active,created_at',
      is_active: 'eq.true',
      order: 'created_at.desc',
      limit: '8',
    }).catch(() => []);
    recentUsers = (Array.isArray(rows) ? rows : []).map((u) => ({ ...u, user_id: u?.id ?? u?.user_id }));
  } catch {
    recentUsers = [];
  }

  let topPosts = [];
  try {
    const rows = await supabaseRestGet('posts', {
      select: 'id,polit_score,content_text,content,created_at,user:users(id,full_name,username,avatar_url,user_type,politician_type)',
      is_deleted: 'eq.false',
      order: 'polit_score.desc',
      limit: '8',
    });
    topPosts = Array.isArray(rows) ? rows : [];
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('content_text')) {
      const rows = await supabaseRestGet('posts', {
        select: 'id,polit_score,content,created_at,user:users(id,full_name,username,avatar_url,user_type,politician_type)',
        is_deleted: 'eq.false',
        order: 'polit_score.desc',
        limit: '8',
      }).catch(() => []);
      topPosts = Array.isArray(rows) ? rows : [];
    } else {
      topPosts = [];
    }
  }

  res.json({
    success: true,
    data: {
      totalUsers: userCount,
      totalPosts: postCount,
      newUsersToday,
      newPostsToday,
      activeUsers24h,
      ...totals,
      recentUsers,
      topPosts,
    },
  });
}

// Minimal DB tables for "admin panel is fully real-data (no mock)".
const SQL_ADMIN_NOTIFICATION_RULES = `
create table if not exists public.admin_notification_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  trigger text not null,
  enabled boolean not null default true,
  channels jsonb not null default '["in_app"]'::jsonb,
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_notification_rules_trigger_idx on public.admin_notification_rules (trigger);
`;

const SQL_ADMIN_NOTIFICATION_CHANNELS = `
create table if not exists public.admin_notification_channels (
  id bigint primary key default 1,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default false,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.admin_notification_channels (id)
values (1)
on conflict (id) do nothing;
`;

const SQL_ADMIN_ADS = `
create table if not exists public.admin_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position text not null,
  status text not null default 'paused',
  target_url text not null default '',
  clicks bigint not null default 0,
  impressions bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_ads_position_idx on public.admin_ads (position);
create index if not exists admin_ads_status_idx on public.admin_ads (status);
`;

const SQL_ADMIN_WORKFLOWS = `
create table if not exists public.admin_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'paused',
  last_run_at timestamptz,
  success_count bigint not null default 0,
  fail_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_workflows_status_idx on public.admin_workflows (status);
`;

const SQL_ADMIN_REVENUE_ENTRIES = `
create table if not exists public.admin_revenue_entries (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  amount_cents bigint not null default 0,
  currency text not null default 'TRY',
  category text not null default 'other', -- subscription | ads | other
  plan_name text not null default '',
  payment_method text not null default '', -- card | transfer | other
  status text not null default 'completed', -- completed | pending | failed
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists admin_revenue_entries_occurred_at_idx on public.admin_revenue_entries (occurred_at desc);
create index if not exists admin_revenue_entries_category_idx on public.admin_revenue_entries (category);
create index if not exists admin_revenue_entries_status_idx on public.admin_revenue_entries (status);
`;

const SQL_ADMIN_API_KEYS = `
create table if not exists public.admin_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  requests_count bigint not null default 0
);
create index if not exists admin_api_keys_status_idx on public.admin_api_keys (status);
`;

const SQL_ADMIN_SOURCES = `
create table if not exists public.admin_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'news', -- news | politician_twitter | politician_instagram | media_twitter | other
  url text not null,
  rss_feed text,
  enabled boolean not null default true,
  priority text not null default 'medium', -- high | medium | low
  items_collected bigint not null default 0,
  last_fetch_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_sources_enabled_idx on public.admin_sources (enabled);
create index if not exists admin_sources_type_idx on public.admin_sources (type);
`;

const SQL_ADMIN_EMAIL_TEMPLATES = `
create table if not exists public.admin_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other', -- welcome | password_reset | email_verification | weekly_digest | other
  subject text not null default '',
  content_html text not null default '',
  is_active boolean not null default true,
  usage_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists admin_email_templates_type_idx on public.admin_email_templates (type);
create index if not exists admin_email_templates_active_idx on public.admin_email_templates (is_active);
`;

const SQL_ADMIN_PAYMENT_PLANS = `
create table if not exists public.admin_payment_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period text not null default 'monthly', -- monthly | yearly | one_time
  price_cents bigint not null default 0,
  currency text not null default 'TRY',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_payment_plans_active_idx on public.admin_payment_plans (is_active);
`;

const SQL_ADMIN_PAYMENT_TRANSACTIONS = `
create table if not exists public.admin_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid,
  user_email text not null default '',
  plan_name text not null default '',
  amount_cents bigint not null default 0,
  currency text not null default 'TRY',
  payment_method text not null default 'card', -- card | transfer | other
  status text not null default 'completed', -- completed | pending | failed
  provider text not null default '', -- iyzico/stripe/etc (optional)
  provider_ref text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists admin_payment_transactions_occurred_at_idx on public.admin_payment_transactions (occurred_at desc);
create index if not exists admin_payment_transactions_status_idx on public.admin_payment_transactions (status);
`;

// Security/audit tables (admin-visible, real data)
const SQL_ADMIN_SECURITY_EVENTS = `
create table if not exists public.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_type text not null, -- login | admin_action | etc.
  ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_security_events_created_at_idx on public.admin_security_events (created_at desc);
create index if not exists admin_security_events_user_id_idx on public.admin_security_events (user_id);
create index if not exists admin_security_events_event_type_idx on public.admin_security_events (event_type);
`;

const SQL_ADMIN_TRUSTED_DEVICES = `
create table if not exists public.admin_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_key text not null,
  ip text,
  user_agent text,
  trusted boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create unique index if not exists admin_trusted_devices_user_device_uniq on public.admin_trusted_devices (user_id, device_key);
create index if not exists admin_trusted_devices_last_seen_at_idx on public.admin_trusted_devices (last_seen_at desc);
`;

// Generic admin job queue (DB-backed)
const SQL_ADMIN_JOBS = `
create table if not exists public.admin_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null, -- scrape_source | run_workflow | send_sms | etc.
  status text not null default 'queued', -- queued | running | success | failed
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  requested_by uuid,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists admin_jobs_requested_at_idx on public.admin_jobs (requested_at desc);
create index if not exists admin_jobs_job_type_idx on public.admin_jobs (job_type);
create index if not exists admin_jobs_status_idx on public.admin_jobs (status);
`;

async function adminGetAnalytics(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const range = String(req.query?.range || '7days').trim();
  const now = Date.now();
  const ms =
    range === 'today' ? 24 * 60 * 60 * 1000 : range === '30days' ? 30 * 24 * 60 * 60 * 1000 : range === '90days' ? 90 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(now - ms).toISOString();

  const [totalUsers, totalPosts, postsInRange, usersInRange] = await Promise.all([
    supabaseCount('users', { select: 'id' }).catch(() => 0),
    supabaseCount('posts', { select: 'id', is_deleted: 'eq.false' }).catch(() => 0),
    supabaseCount('posts', { select: 'id', is_deleted: 'eq.false', created_at: `gte.${sinceIso}` }).catch(() => 0),
    supabaseCount('users', { select: 'id', created_at: `gte.${sinceIso}` }).catch(() => 0),
  ]);

  // User type distribution (best-effort, multiple counts)
  const types = ['normal', 'party_member', 'media', 'politician', 'party_official', 'mp', 'ex_politician', 'citizen'];
  const counts = await Promise.all(
    types.map((t) => supabaseCount('users', { select: 'id', user_type: `eq.${t}` }).catch(() => 0))
  );
  const userTypeCounts = {};
  for (let i = 0; i < types.length; i += 1) userTypeCounts[types[i]] = counts[i] || 0;

  // Top agendas by PolitPuan (real)
  let topAgendas = [];
  try {
    const rows = await supabaseRestGet('agendas', {
      select: 'id,title,slug,total_polit_score,trending_score,post_count,is_active',
      order: 'total_polit_score.desc',
      limit: '10',
    });
    topAgendas = Array.isArray(rows) ? rows : [];
  } catch {
    topAgendas = [];
  }

  // Best-effort: top users by polit_score
  let topUsers = [];
  try {
    const rows = await supabaseRestGet('users', {
      select: 'id,username,full_name,avatar_url,user_type,polit_score',
      order: 'polit_score.desc',
      limit: '10',
    });
    topUsers = Array.isArray(rows) ? rows : [];
  } catch {
    topUsers = [];
  }

  // Posts by type (best-effort)
  const postTypes = ['text', 'image', 'video', 'audio'];
  const postTypeCountsArr = await Promise.all(
    postTypes.map((t) => supabaseCount('posts', { select: 'id', is_deleted: 'eq.false', content_type: `eq.${t}` }).catch(() => 0))
  );
  const postTypeCounts = {};
  for (let i = 0; i < postTypes.length; i += 1) postTypeCounts[postTypes[i]] = postTypeCountsArr[i] || 0;

  // Approx totals (last N posts) to avoid full-table scan
  let approx = { sampleSize: 0, totalViews: null, totalPolitScore: null };
  try {
    const sampleLimit = 5000;
    const rows = await supabaseRestGet('posts', {
      select: 'view_count,polit_score,is_deleted',
      is_deleted: 'eq.false',
      order: 'created_at.desc',
      limit: String(sampleLimit),
    });
    const list = Array.isArray(rows) ? rows : [];
    let viewSum = 0;
    let scoreSum = 0;
    for (const p of list) {
      viewSum += Number(p?.view_count || 0) || 0;
      scoreSum += Number(p?.polit_score || 0) || 0;
    }
    approx = { sampleSize: list.length, totalViews: viewSum, totalPolitScore: scoreSum };
  } catch (e) {
    approx = { sampleSize: 0, totalViews: null, totalPolitScore: null };
  }

  // Detailed window analytics (best-effort, limited sample to avoid heavy queries)
  const windowDetail = {
    sampleLimit: 0,
    sampleSize: 0,
    truncated: false,
    totals: { views: 0, likes: 0, comments: 0, shares: 0, fastPosts: 0 },
    series: [], // [{ date: 'YYYY-MM-DD', users: n, posts: n, fastPosts: n }]
    topPostsByLikes: [], // [{ id, like_count, view_count, comment_count, share_count, created_at, excerpt, content_type }]
  };
  try {
    const dayKey = (iso) => {
      const d = new Date(String(iso || ''));
      if (!Number.isFinite(d.getTime())) return '';
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    const sampleLimit = range === 'today' ? 2000 : range === '90days' ? 5000 : 4000;
    windowDetail.sampleLimit = sampleLimit;

    // Posts created in range (sampled)
    const postRows = await supabaseRestGet('posts', {
      select: 'id,created_at,content_type,is_trending,view_count,like_count,comment_count,share_count,content_text,content,is_deleted',
      is_deleted: 'eq.false',
      created_at: `gte.${sinceIso}`,
      order: 'created_at.desc',
      limit: String(sampleLimit),
    }).catch(() => []);
    const postList = Array.isArray(postRows) ? postRows : [];
    windowDetail.sampleSize = postList.length;
    windowDetail.truncated = postList.length >= sampleLimit;

    const postsByDay = new Map();
    const fastByDay = new Map();
    for (const p of postList) {
      const k = dayKey(p?.created_at);
      if (!k) continue;
      postsByDay.set(k, (postsByDay.get(k) || 0) + 1);
      if (p?.is_trending === true) fastByDay.set(k, (fastByDay.get(k) || 0) + 1);
      windowDetail.totals.views += Number(p?.view_count || 0) || 0;
      windowDetail.totals.likes += Number(p?.like_count || 0) || 0;
      windowDetail.totals.comments += Number(p?.comment_count || 0) || 0;
      windowDetail.totals.shares += Number(p?.share_count || 0) || 0;
      if (p?.is_trending === true) windowDetail.totals.fastPosts += 1;
    }

    // Users created in range (counts by day, from count-only query isn't possible; sample IDs only)
    const userRows = await supabaseRestGet('users', {
      select: 'id,created_at',
      created_at: `gte.${sinceIso}`,
      order: 'created_at.desc',
      limit: String(sampleLimit),
    }).catch(() => []);
    const userList = Array.isArray(userRows) ? userRows : [];
    const usersByDay = new Map();
    for (const u of userList) {
      const k = dayKey(u?.created_at);
      if (!k) continue;
      usersByDay.set(k, (usersByDay.get(k) || 0) + 1);
    }

    // Build ordered series (UTC day keys) for the window
    const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    const series = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const dt = new Date(now - i * 24 * 60 * 60 * 1000);
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const key = `${y}-${m}-${dd}`;
      series.push({
        date: key,
        users: usersByDay.get(key) || 0,
        posts: postsByDay.get(key) || 0,
        fastPosts: fastByDay.get(key) || 0,
      });
    }
    windowDetail.series = series;

    // Top posts (by likes) within window sample
    const excerptOf = (p) => {
      const s = String(p?.content_text || p?.content || '').trim();
      if (!s) return '—';
      return s.length > 120 ? `${s.slice(0, 117)}…` : s;
    };
    windowDetail.topPostsByLikes = postList
      .slice()
      .sort((a, b) => (Number(b?.like_count || 0) || 0) - (Number(a?.like_count || 0) || 0))
      .slice(0, 12)
      .map((p) => ({
        id: p?.id,
        created_at: p?.created_at,
        content_type: p?.content_type,
        is_trending: !!p?.is_trending,
        view_count: Number(p?.view_count || 0) || 0,
        like_count: Number(p?.like_count || 0) || 0,
        comment_count: Number(p?.comment_count || 0) || 0,
        share_count: Number(p?.share_count || 0) || 0,
        excerpt: excerptOf(p),
      }));
  } catch {
    // ignore (best-effort)
  }

  return res.json({
    success: true,
    data: {
      range,
      since: sinceIso,
      totals: { totalUsers, totalPosts },
      window: { usersInRange, postsInRange },
      userTypeCounts,
      topAgendas,
      topUsers,
      postTypeCounts,
      approx,
      windowDetail,
    },
  });
}

async function adminGetAds(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const rows = await supabaseRestGet('admin_ads', { select: '*', order: 'created_at.desc', limit: '200' });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_ADS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Reklamlar yüklenemedi.') });
  }
}

async function adminCreateAd(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const title = String(body?.title || '').trim();
  const position = String(body?.position || '').trim();
  const status = String(body?.status || 'paused').trim() || 'paused';
  const target_url = String(body?.target_url || '').trim();
  if (!title) return res.status(400).json({ success: false, error: 'Başlık gerekli.' });
  if (!position) return res.status(400).json({ success: false, error: 'Pozisyon gerekli.' });
  const payload = { title, position, status, target_url };
  try {
    const inserted = await supabaseRestInsert('admin_ads', [payload]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_ADS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Reklam oluşturulamadı.') });
  }
}

async function adminUpdateAd(req, res, adId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(adId)) return res.status(400).json({ success: false, error: 'Geçersiz reklam.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.title !== undefined) patch.title = String(body.title || '').trim();
  if (body?.position !== undefined) patch.position = String(body.position || '').trim();
  if (body?.status !== undefined) patch.status = String(body.status || '').trim();
  if (body?.target_url !== undefined) patch.target_url = String(body.target_url || '').trim();
  if (body?.clicks !== undefined) patch.clicks = Math.max(0, parseInt(String(body.clicks || 0), 10) || 0);
  if (body?.impressions !== undefined) patch.impressions = Math.max(0, parseInt(String(body.impressions || 0), 10) || 0);
  patch.updated_at = new Date().toISOString();
  try {
    const updated = await supabaseRestPatch('admin_ads', { id: `eq.${adId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_ADS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Reklam güncellenemedi.') });
  }
}

async function adminDeleteAd(req, res, adId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(adId)) return res.status(400).json({ success: false, error: 'Geçersiz reklam.' });
  try {
    await supabaseRestDelete('admin_ads', { id: `eq.${adId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_ADS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Reklam silinemedi.') });
  }
}

async function adminGetWorkflows(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const rows = await supabaseRestGetWithOrderFallback(
      'admin_workflows',
      { select: '*', limit: '200' },
      ['created_at.desc', 'updated_at.desc', 'last_run_at.desc', 'id.desc']
    );
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_WORKFLOWS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'İş akışları yüklenemedi.') });
  }
}

async function adminCreateWorkflow(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const status = String(body?.status || 'paused').trim() || 'paused';
  if (!name) return res.status(400).json({ success: false, error: 'İş akışı adı gerekli.' });
  try {
    const inserted = await supabaseRestInsert('admin_workflows', [{ name, status }]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_WORKFLOWS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'İş akışı oluşturulamadı.') });
  }
}

async function adminUpdateWorkflow(req, res, workflowId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(workflowId)) return res.status(400).json({ success: false, error: 'Geçersiz iş akışı.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.name !== undefined) patch.name = String(body.name || '').trim();
  if (body?.status !== undefined) patch.status = String(body.status || '').trim();
  if (body?.last_run_at !== undefined) patch.last_run_at = body.last_run_at ? String(body.last_run_at) : null;
  if (body?.success_count !== undefined) patch.success_count = Math.max(0, parseInt(String(body.success_count || 0), 10) || 0);
  if (body?.fail_count !== undefined) patch.fail_count = Math.max(0, parseInt(String(body.fail_count || 0), 10) || 0);
  patch.updated_at = new Date().toISOString();
  try {
    const updated = await supabaseRestPatch('admin_workflows', { id: `eq.${workflowId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_WORKFLOWS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'İş akışı güncellenemedi.') });
  }
}

async function adminDeleteWorkflow(req, res, workflowId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(workflowId)) return res.status(400).json({ success: false, error: 'Geçersiz iş akışı.' });
  try {
    await supabaseRestDelete('admin_workflows', { id: `eq.${workflowId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_WORKFLOWS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'İş akışı silinemedi.') });
  }
}

async function adminGetRevenueEntries(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query?.limit || 100), 10) || 100));
  try {
    const rows = await supabaseRestGetWithOrderFallback(
      'admin_revenue_entries',
      { select: '*', limit: String(limit) },
      ['occurred_at.desc', 'created_at.desc', 'updated_at.desc', 'id.desc']
    );
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_REVENUE_ENTRIES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Gelir kayıtları yüklenemedi.') });
  }
}

async function adminCreateRevenueEntry(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const amount_cents = Math.max(0, parseInt(String(body?.amount_cents || 0), 10) || 0);
  const currency = String(body?.currency || 'TRY').trim() || 'TRY';
  const category = String(body?.category || 'other').trim() || 'other';
  const plan_name = String(body?.plan_name || '').trim();
  const payment_method = String(body?.payment_method || '').trim();
  const status = String(body?.status || 'completed').trim() || 'completed';
  const note = String(body?.note || '').trim();
  const occurred_at = body?.occurred_at ? String(body.occurred_at) : new Date().toISOString();
  if (amount_cents <= 0) return res.status(400).json({ success: false, error: 'Tutar gerekli.' });
  const payload = { amount_cents, currency, category, plan_name, payment_method, status, note, occurred_at };
  try {
    const inserted = await supabaseRestInsert('admin_revenue_entries', [payload]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_REVENUE_ENTRIES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Gelir kaydı eklenemedi.') });
  }
}

async function adminDeleteRevenueEntry(req, res, entryId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(entryId)) return res.status(400).json({ success: false, error: 'Geçersiz kayıt.' });
  try {
    await supabaseRestDelete('admin_revenue_entries', { id: `eq.${entryId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_REVENUE_ENTRIES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Silinemedi.') });
  }
}

async function adminGetRevenueSummary(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const rows = await supabaseRestGet('admin_revenue_entries', { select: '*', order: 'occurred_at.desc', limit: '5000' });
    const list = Array.isArray(rows) ? rows : [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const month = list.filter((r) => String(r?.status || '') === 'completed' && String(r?.occurred_at || '') >= monthStart);
    const sumCents = (arr) => arr.reduce((acc, r) => acc + (Number(r?.amount_cents || 0) || 0), 0);
    const by = (key) => {
      const m = new Map();
      for (const r of month) {
        const k = String(r?.[key] || '').trim() || '—';
        m.set(k, (m.get(k) || 0) + (Number(r?.amount_cents || 0) || 0));
      }
      return Array.from(m.entries()).map(([k, v]) => ({ key: k, amount_cents: v }));
    };
    return res.json({
      success: true,
      data: {
        monthStart,
        currency: 'TRY',
        monthTotalCents: sumCents(month),
        byCategory: by('category'),
        byPlan: by('plan_name'),
        byPaymentMethod: by('payment_method'),
      },
    });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: null, schemaMissing: true, requiredSql: SQL_ADMIN_REVENUE_ENTRIES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Özet alınamadı.') });
  }
}

async function adminGetApiKeys(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const rows = await supabaseRestGetWithOrderFallback('admin_api_keys', {
      select: 'id,name,key_prefix,status,created_at,last_used_at,requests_count',
      limit: '200',
    }, ['created_at.desc', 'last_used_at.desc', 'id.desc']);
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_API_KEYS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'API anahtarları yüklenemedi.') });
  }
}

async function adminCreateApiKey(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  if (!name || name.length < 2) return res.status(400).json({ success: false, error: 'Anahtar adı gerekli.' });

  const secret = crypto.randomBytes(32).toString('hex');
  const key_hash = crypto.createHash('sha256').update(secret).digest('hex');
  const key_prefix = secret.slice(0, 10);
  try {
    const inserted = await supabaseRestInsert('admin_api_keys', [{ name, key_hash, key_prefix, status: 'active' }]);
    const row = inserted?.[0] || null;
    return res.json({ success: true, data: row, secret });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_API_KEYS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'API anahtarı oluşturulamadı.') });
  }
}

async function adminUpdateApiKey(req, res, keyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(keyId)) return res.status(400).json({ success: false, error: 'Geçersiz anahtar.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.name !== undefined) patch.name = String(body.name || '').trim();
  if (body?.status !== undefined) patch.status = String(body.status || '').trim();
  try {
    const updated = await supabaseRestPatch('admin_api_keys', { id: `eq.${keyId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_API_KEYS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Güncellenemedi.') });
  }
}

async function adminDeleteApiKey(req, res, keyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(keyId)) return res.status(400).json({ success: false, error: 'Geçersiz anahtar.' });
  try {
    await supabaseRestDelete('admin_api_keys', { id: `eq.${keyId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_API_KEYS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Silinemedi.') });
  }
}

async function adminGetSources(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const rows = await supabaseRestGet('admin_sources', { select: '*', order: 'created_at.desc', limit: '500' });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_SOURCES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kaynaklar yüklenemedi.') });
  }
}

async function adminCreateSource(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const type = String(body?.type || 'news').trim() || 'news';
  const url = String(body?.url || '').trim();
  const rss_feed = body?.rss_feed ? String(body.rss_feed).trim() : null;
  const enabled = body?.enabled !== false;
  const priority = String(body?.priority || 'medium').trim() || 'medium';
  if (!name) return res.status(400).json({ success: false, error: 'Kaynak adı gerekli.' });
  if (!url) return res.status(400).json({ success: false, error: 'URL gerekli.' });
  const payload = { name, type, url, rss_feed, enabled: !!enabled, priority };
  try {
    const inserted = await supabaseRestInsert('admin_sources', [payload]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_SOURCES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kaynak eklenemedi.') });
  }
}

async function adminUpdateSource(req, res, sourceId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(sourceId)) return res.status(400).json({ success: false, error: 'Geçersiz kaynak.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.name !== undefined) patch.name = String(body.name || '').trim();
  if (body?.type !== undefined) patch.type = String(body.type || '').trim();
  if (body?.url !== undefined) patch.url = String(body.url || '').trim();
  if (body?.rss_feed !== undefined) patch.rss_feed = body.rss_feed ? String(body.rss_feed).trim() : null;
  if (body?.enabled !== undefined) patch.enabled = !!body.enabled;
  if (body?.priority !== undefined) patch.priority = String(body.priority || '').trim();
  if (body?.items_collected !== undefined) patch.items_collected = Math.max(0, parseInt(String(body.items_collected || 0), 10) || 0);
  if (body?.last_fetch_at !== undefined) patch.last_fetch_at = body.last_fetch_at ? String(body.last_fetch_at) : null;
  patch.updated_at = new Date().toISOString();
  try {
    const updated = await supabaseRestPatch('admin_sources', { id: `eq.${sourceId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_SOURCES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kaynak güncellenemedi.') });
  }
}

async function adminDeleteSource(req, res, sourceId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(sourceId)) return res.status(400).json({ success: false, error: 'Geçersiz kaynak.' });
  try {
    await supabaseRestDelete('admin_sources', { id: `eq.${sourceId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_SOURCES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kaynak silinemedi.') });
  }
}

async function adminGetEmailTemplates(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    let rows = await supabaseRestGetWithOrderFallback(
      'admin_email_templates',
      { select: '*', limit: '200' },
      ['updated_at.desc', 'created_at.desc', 'id.desc']
    );
    rows = Array.isArray(rows) ? rows : [];

    // Ensure a rich default set exists (insert only missing types; never overwrite).
    try {
      const now = new Date().toISOString();
      const base = (title, bodyHtml) => `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${String(title || '')}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#111827;border-radius:16px;padding:18px 20px;color:#fff;">
        <div style="font-size:18px;font-weight:800;letter-spacing:.2px;">Polithane</div>
        <div style="opacity:.9;font-size:12px;margin-top:6px;">Siyasetin nabzı</div>
      </div>
      <div style="background:#ffffff;border-radius:16px;margin-top:14px;padding:22px;border:1px solid #e5e7eb;">
        ${bodyHtml}
      </div>
      <div style="margin-top:14px;font-size:12px;color:#6b7280;line-height:1.5;">
        Bu e‑posta Polithane tarafından otomatik gönderilmiştir.
      </div>
    </div>
  </body>
</html>`.trim();

      const REQUIRED = [
        {
          name: 'Hoş Geldin',
          type: 'welcome',
          subject: 'Polithane’ye Hoş Geldin!',
          content_html: base(
            'Hoş Geldin',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Aramıza hoş geldin!</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Polithane’de gündemi takip edebilir, Polit paylaşabilir ve Fast akışında anlık gelişmeleri izleyebilirsin.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
  <div style="font-weight:800;color:#111827;">Başlangıç</div>
  <div style="margin-top:6px;color:#374151;">Ana sayfadan gündemi seç, Polit’leri keşfet.</div>
</div>
<div style="margin-top:14px;">
  <a href="{{app_url}}" style="display:inline-block;padding:10px 14px;background:#009fd6;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Polithane’ye git
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'E‑posta Doğrulama',
          type: 'email_verification',
          subject: 'E‑posta adresini doğrula',
          content_html: base(
            'E‑posta doğrulama',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">E‑posta doğrulama</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Hesabını aktifleştirmek için e‑posta adresini doğrulaman gerekiyor.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
  <div style="color:#1d4ed8;font-weight:800;">Doğrulama bağlantısı</div>
  <div style="margin-top:6px;color:#1f2937;word-break:break-all;">{{verification_link}}</div>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Şifre Sıfırlama',
          type: 'password_reset',
          subject: 'Şifre sıfırlama isteği',
          content_html: base(
            'Şifre sıfırlama',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Şifre sıfırlama</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Şifre sıfırlama isteği aldık. Eğer bu isteği sen yapmadıysan bu e‑postayı yok sayabilirsin.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
  <div style="color:#9a3412;font-weight:800;">Sıfırlama bağlantısı</div>
  <div style="margin-top:6px;color:#1f2937;word-break:break-all;">{{reset_link}}</div>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Yeni Mesaj',
          type: 'message',
          subject: 'Yeni mesajın var',
          content_html: base(
            'Yeni mesaj',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Yeni mesaj</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} sana yeni bir mesaj gönderdi.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
  <div style="font-weight:800;color:#111827;">Mesaj</div>
  <div style="margin-top:6px;color:#374151;white-space:pre-wrap;">{{message_excerpt}}</div>
</div>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#009fd6;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Mesajı aç
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Beğeni Bildirimi',
          type: 'like',
          subject: 'Paylaşımın beğenildi',
          content_html: base(
            'Beğeni',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Paylaşımın beğenildi</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} paylaşımını beğendi.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Görüntüle
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Yorum Bildirimi',
          type: 'comment',
          subject: 'Paylaşımına yeni yorum',
          content_html: base(
            'Yorum',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Paylaşımına yeni yorum</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} paylaşımına yorum yaptı.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Görüntüle
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Yorum Beğenisi Bildirimi',
          type: 'comment_like',
          subject: 'Yorumun beğenildi',
          content_html: base(
            'Yorum beğenisi',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Yorumun beğenildi</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} yorumunu beğendi.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Görüntüle
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Paylaşım Bildirimi',
          type: 'share',
          subject: 'Paylaşımın paylaşıldı',
          content_html: base(
            'Paylaşım',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Paylaşımın paylaşıldı</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} paylaşımını paylaştı.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Görüntüle
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Takip Bildirimi',
          type: 'follow',
          subject: 'Yeni takipçin var',
          content_html: base(
            'Yeni takip',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Yeni takipçin var</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} seni takip etmeye başladı.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Profili aç
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Etiketlenme Bildirimi',
          type: 'mention',
          subject: 'Bir içerikte etiketlendin',
          content_html: base(
            'Bahsedilme',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Bir içerikte etiketlendin</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} seni bir içerikte etiketledi.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Görüntüle
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Üyelik Durumu',
          type: 'approval',
          subject: 'Üyelik durumunda güncelleme',
          content_html: base(
            'Üyelik durumu',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Üyelik durumunda güncelleme</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Üyeliğiniz ile ilgili bir güncelleme var.
</p>
<div style="margin-top:14px;">
  <a href="{{app_url}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Polithane’ye git
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
        {
          name: 'Sistem Bildirimi',
          type: 'system',
          subject: 'Yeni bildirimin var',
          content_html: base(
            'Bildirim',
            `
<h2 style="margin:0 0 10px 0;font-size:20px;">Yeni bildirimin var</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Hesabın için yeni bir bildirim var.
</p>
<div style="margin-top:14px;">
  <a href="{{link}}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;">
    Görüntüle
  </a>
</div>
`.trim()
          ),
          is_active: true,
          updated_at: now,
        },
      ];

      const have = new Set((rows || []).map((r) => String(r?.type || '').trim()).filter(Boolean));
      const missing = REQUIRED.filter((t) => t?.type && !have.has(String(t.type)));
      if (missing.length > 0) {
        await supabaseRestInsert('admin_email_templates', missing).catch(() => null);
        rows = await supabaseRestGetWithOrderFallback(
          'admin_email_templates',
          { select: '*', limit: '200' },
          ['updated_at.desc', 'created_at.desc', 'id.desc']
        );
        rows = Array.isArray(rows) ? rows : [];
      }
    } catch {
      // ignore seeding errors
    }

    // If empty, seed a high-quality default set once (best-effort).
    if (rows.length === 0) {
      try {
        const now = new Date().toISOString();
        const base = (title, bodyHtml) => `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${String(title || '')}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#111827;border-radius:16px;padding:18px 20px;color:#fff;">
        <div style="font-size:18px;font-weight:800;letter-spacing:.2px;">Polithane</div>
        <div style="opacity:.9;font-size:12px;margin-top:6px;">Siyasetin nabzı</div>
      </div>
      <div style="background:#ffffff;border-radius:16px;margin-top:14px;padding:22px;border:1px solid #e5e7eb;">
        ${bodyHtml}
      </div>
      <div style="margin-top:14px;font-size:12px;color:#6b7280;line-height:1.5;">
        Bu e‑posta Polithane tarafından otomatik gönderilmiştir.
      </div>
    </div>
  </body>
</html>`.trim();

        const DEFAULTS = [
          {
            name: 'Hoş Geldin',
            type: 'welcome',
            subject: 'Polithane’ye Hoş Geldin!',
            content_html: base(
              'Hoş Geldin',
              `
<h2 style="margin:0 0 10px 0;font-size:20px;">Aramıza hoş geldin!</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Polithane’de gündemi takip edebilir, Polit paylaşabilir ve Fast akışında anlık gelişmeleri izleyebilirsin.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
  <div style="font-weight:800;color:#111827;">İpucu</div>
  <div style="margin-top:6px;color:#374151;">Bildirim ayarlarını dilediğin zaman güncelleyebilirsin.</div>
</div>
`.trim()
            ),
            is_active: true,
            updated_at: now,
          },
          {
            name: 'E‑posta Doğrulama',
            type: 'email_verification',
            subject: 'E‑posta adresini doğrula',
            content_html: base(
              'E‑posta doğrulama',
              `
<h2 style="margin:0 0 10px 0;font-size:20px;">E‑posta doğrulama</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Hesabını aktifleştirmek için e‑posta adresini doğrulaman gerekiyor.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
  <div style="color:#1d4ed8;font-weight:800;">Doğrulama bağlantısı</div>
  <div style="margin-top:6px;color:#1f2937;">{{verification_link}}</div>
</div>
`.trim()
            ),
            is_active: true,
            updated_at: now,
          },
          {
            name: 'Şifre Sıfırlama',
            type: 'password_reset',
            subject: 'Şifre sıfırlama isteği',
            content_html: base(
              'Şifre sıfırlama',
              `
<h2 style="margin:0 0 10px 0;font-size:20px;">Şifre sıfırlama</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Şifre sıfırlama isteği aldık. Eğer bu isteği sen yapmadıysan bu e‑postayı yok sayabilirsin.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
  <div style="color:#9a3412;font-weight:800;">Sıfırlama bağlantısı</div>
  <div style="margin-top:6px;color:#1f2937;">{{reset_link}}</div>
</div>
`.trim()
            ),
            is_active: true,
            updated_at: now,
          },
          {
            name: 'Üyelik Onayı (Beklemede)',
            type: 'approval_pending',
            subject: 'Üyelik onayı bekleniyor',
            content_html: base(
              'Üyelik onayı',
              `
<h2 style="margin:0 0 10px 0;font-size:20px;">Üyelik onayı bekleniyor</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Başvurunu aldık. Admin onayı tamamlanınca Polit/Fast paylaşımın aktif olacaktır.
</p>
`.trim()
            ),
            is_active: true,
            updated_at: now,
          },
          {
            name: 'Üyelik Onayı (Onaylandı)',
            type: 'approval_approved',
            subject: 'Üyeliğin onaylandı',
            content_html: base(
              'Üyelik onaylandı',
              `
<h2 style="margin:0 0 10px 0;font-size:20px;">Üyeliğin onaylandı</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
Artık Polithane’de Polit/Fast paylaşabilir ve etkileşim kurabilirsin.
</p>
`.trim()
            ),
            is_active: true,
            updated_at: now,
          },
          {
            name: 'Yeni Mesaj',
            type: 'message',
            subject: 'Yeni mesajın var',
            content_html: base(
              'Yeni mesaj',
              `
<h2 style="margin:0 0 10px 0;font-size:20px;">Yeni mesaj</h2>
<p style="margin:0;color:#374151;line-height:1.7;">
{{actor_name}} sana yeni bir mesaj gönderdi.
</p>
<div style="margin-top:16px;padding:14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
  <div style="font-weight:800;color:#111827;">Mesaj</div>
  <div style="margin-top:6px;color:#374151;">{{message_excerpt}}</div>
</div>
`.trim()
            ),
            is_active: true,
            updated_at: now,
          },
        ];

        // best-effort insert; ignore if schema differs
        await supabaseRestInsert('admin_email_templates', DEFAULTS).catch(() => null);
        rows = await supabaseRestGet('admin_email_templates', { select: '*', order: 'updated_at.desc', limit: '200' }).catch(() => []);
        rows = Array.isArray(rows) ? rows : [];
      } catch {
        // ignore seeding errors
      }
    }

    return res.json({ success: true, data: rows });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_EMAIL_TEMPLATES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Şablonlar yüklenemedi.') });
  }
}

async function adminCreateEmailTemplate(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const type = String(body?.type || 'other').trim() || 'other';
  const subject = String(body?.subject || '').trim();
  const content_html = String(body?.content_html || '').trim();
  const is_active = body?.is_active !== false;
  if (!name) return res.status(400).json({ success: false, error: 'Şablon adı gerekli.' });
  const payload = { name, type, subject, content_html, is_active: !!is_active, updated_at: new Date().toISOString() };
  try {
    const inserted = await supabaseRestInsert('admin_email_templates', [payload]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_EMAIL_TEMPLATES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Şablon oluşturulamadı.') });
  }
}

async function adminUpdateEmailTemplate(req, res, templateId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(templateId)) return res.status(400).json({ success: false, error: 'Geçersiz şablon.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.name !== undefined) patch.name = String(body.name || '').trim();
  if (body?.type !== undefined) patch.type = String(body.type || '').trim();
  if (body?.subject !== undefined) patch.subject = String(body.subject || '').trim();
  if (body?.content_html !== undefined) patch.content_html = String(body.content_html || '').trim();
  if (body?.is_active !== undefined) patch.is_active = !!body.is_active;
  patch.updated_at = new Date().toISOString();
  try {
    const updated = await supabaseRestPatch('admin_email_templates', { id: `eq.${templateId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_EMAIL_TEMPLATES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Şablon güncellenemedi.') });
  }
}

async function adminDeleteEmailTemplate(req, res, templateId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(templateId)) return res.status(400).json({ success: false, error: 'Geçersiz şablon.' });
  try {
    await supabaseRestDelete('admin_email_templates', { id: `eq.${templateId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_EMAIL_TEMPLATES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Şablon silinemedi.') });
  }
}

async function adminGetPaymentPlans(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const rows = await supabaseRestGet('admin_payment_plans', { select: '*', order: 'created_at.desc', limit: '200' });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_PLANS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Planlar yüklenemedi.') });
  }
}

async function adminCreatePaymentPlan(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const period = String(body?.period || 'monthly').trim() || 'monthly';
  const price_cents = Math.max(0, parseInt(String(body?.price_cents || 0), 10) || 0);
  const currency = String(body?.currency || 'TRY').trim() || 'TRY';
  const is_active = body?.is_active !== false;
  if (!name) return res.status(400).json({ success: false, error: 'Plan adı gerekli.' });
  const payload = { name, period, price_cents, currency, is_active: !!is_active, updated_at: new Date().toISOString() };
  try {
    const inserted = await supabaseRestInsert('admin_payment_plans', [payload]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_PLANS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Plan oluşturulamadı.') });
  }
}

async function adminUpdatePaymentPlan(req, res, planId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(planId)) return res.status(400).json({ success: false, error: 'Geçersiz plan.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.name !== undefined) patch.name = String(body.name || '').trim();
  if (body?.period !== undefined) patch.period = String(body.period || '').trim();
  if (body?.price_cents !== undefined) patch.price_cents = Math.max(0, parseInt(String(body.price_cents || 0), 10) || 0);
  if (body?.currency !== undefined) patch.currency = String(body.currency || '').trim();
  if (body?.is_active !== undefined) patch.is_active = !!body.is_active;
  patch.updated_at = new Date().toISOString();
  try {
    const updated = await supabaseRestPatch('admin_payment_plans', { id: `eq.${planId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_PLANS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Plan güncellenemedi.') });
  }
}

async function adminDeletePaymentPlan(req, res, planId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(planId)) return res.status(400).json({ success: false, error: 'Geçersiz plan.' });
  try {
    await supabaseRestDelete('admin_payment_plans', { id: `eq.${planId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_PLANS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Plan silinemedi.') });
  }
}

async function adminGetPaymentTransactions(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || 100), 10) || 100));
  try {
    const rows = await supabaseRestGet('admin_payment_transactions', { select: '*', order: 'occurred_at.desc', limit: String(limit) });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_TRANSACTIONS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'İşlemler yüklenemedi.') });
  }
}

async function adminCreatePaymentTransaction(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const occurred_at = body?.occurred_at ? String(body.occurred_at) : new Date().toISOString();
  const user_id = body?.user_id ? String(body.user_id).trim() : null;
  const user_email = String(body?.user_email || '').trim();
  const plan_name = String(body?.plan_name || '').trim();
  const amount_cents = Math.max(0, parseInt(String(body?.amount_cents || 0), 10) || 0);
  const currency = String(body?.currency || 'TRY').trim() || 'TRY';
  const payment_method = String(body?.payment_method || 'card').trim() || 'card';
  const status = String(body?.status || 'completed').trim() || 'completed';
  const provider = String(body?.provider || '').trim();
  const provider_ref = String(body?.provider_ref || '').trim();
  const note = String(body?.note || '').trim();
  if (amount_cents <= 0) return res.status(400).json({ success: false, error: 'Tutar gerekli.' });
  const payload = {
    occurred_at,
    user_id: user_id && isSafeId(user_id) ? user_id : null,
    user_email,
    plan_name,
    amount_cents,
    currency,
    payment_method,
    status,
    provider,
    provider_ref,
    note,
  };
  try {
    const inserted = await supabaseRestInsert('admin_payment_transactions', [payload]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_TRANSACTIONS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'İşlem eklenemedi.') });
  }
}

async function adminDeletePaymentTransaction(req, res, txId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(txId)) return res.status(400).json({ success: false, error: 'Geçersiz işlem.' });
  try {
    await supabaseRestDelete('admin_payment_transactions', { id: `eq.${txId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_PAYMENT_TRANSACTIONS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Silinemedi.') });
  }
}

async function adminGetNotificationRules(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    let rows = await supabaseRestGetWithOrderFallback(
      'admin_notification_rules',
      { select: '*', limit: '200' },
      ['created_at.desc', 'updated_at.desc', 'id.desc']
    );
    rows = Array.isArray(rows) ? rows : [];

    // Seed defaults once if empty (best-effort).
    if (rows.length === 0) {
      try {
        const now = new Date().toISOString();
        const DEFAULTS = [
          { name: 'Beğeni', description: 'Birisi paylaşımınızı beğendiğinde', trigger: 'like', enabled: true, priority: 'normal', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Yorum Beğenisi', description: 'Birisi yorumunuzu beğendiğinde', trigger: 'comment_like', enabled: true, priority: 'normal', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Yorum', description: 'Birisi paylaşımınıza yorum yaptığında', trigger: 'comment', enabled: true, priority: 'normal', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Takip', description: 'Birisi sizi takip ettiğinde', trigger: 'follow', enabled: true, priority: 'normal', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Mesaj', description: 'Yeni mesaj aldığınızda', trigger: 'message', enabled: true, priority: 'high', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Bahsedilme', description: 'Birisi sizi etiketlediğinde', trigger: 'mention', enabled: true, priority: 'normal', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Paylaşım', description: 'Paylaşımınız paylaşıldığında', trigger: 'share', enabled: true, priority: 'low', channels: ['in_app'], created_at: now, updated_at: now },
          { name: 'Üyelik Onayı', description: 'Üyelik onayıyla ilgili sistem bildirimi', trigger: 'approval', enabled: true, priority: 'high', channels: ['in_app', 'email'], created_at: now, updated_at: now },
          { name: 'Sistem', description: 'Sistem bildirimi', trigger: 'system', enabled: true, priority: 'normal', channels: ['in_app', 'email'], created_at: now, updated_at: now },
        ];
        await supabaseRestInsert('admin_notification_rules', DEFAULTS).catch(() => null);
        rows = await supabaseRestGet('admin_notification_rules', { select: '*', order: 'created_at.desc', limit: '200' }).catch(() => []);
        rows = Array.isArray(rows) ? rows : [];
      } catch {
        // ignore
      }
    }

    return res.json({ success: true, data: rows });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_NOTIFICATION_RULES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kurallar yüklenemedi.') });
  }
}

async function adminCreateNotificationRule(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const trigger = String(body?.trigger || '').trim();
  const description = String(body?.description || '').trim();
  const enabled = body?.enabled !== false;
  const priority = String(body?.priority || 'normal').trim() || 'normal';
  const channels = Array.isArray(body?.channels) ? body.channels.map((c) => String(c || '').trim()).filter(Boolean) : ['in_app'];

  if (!name || name.length < 2) return res.status(400).json({ success: false, error: 'Kural adı gerekli.' });
  if (!trigger || trigger.length < 2) return res.status(400).json({ success: false, error: 'Tetikleyici gerekli.' });

  const payload = { name, trigger, description, enabled: !!enabled, priority, channels };
  try {
    const inserted = await supabaseRestInsert('admin_notification_rules', [payload]);
    const row = inserted?.[0] || null;
    return res.json({ success: true, data: row });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_NOTIFICATION_RULES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kural oluşturulamadı.') });
  }
}

async function adminUpdateNotificationRule(req, res, ruleId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(ruleId)) return res.status(400).json({ success: false, error: 'Geçersiz kural.' });

  const body = await readJsonBody(req);
  const patch = {};
  if (body?.name !== undefined) patch.name = String(body.name || '').trim();
  if (body?.trigger !== undefined) patch.trigger = String(body.trigger || '').trim();
  if (body?.description !== undefined) patch.description = String(body.description || '').trim();
  if (body?.enabled !== undefined) patch.enabled = !!body.enabled;
  if (body?.priority !== undefined) patch.priority = String(body.priority || '').trim() || 'normal';
  if (body?.channels !== undefined) {
    patch.channels = Array.isArray(body.channels) ? body.channels.map((c) => String(c || '').trim()).filter(Boolean) : ['in_app'];
  }
  patch.updated_at = new Date().toISOString();

  try {
    const updated = await supabaseRestPatch('admin_notification_rules', { id: `eq.${ruleId}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_NOTIFICATION_RULES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kural güncellenemedi.') });
  }
}

async function adminDeleteNotificationRule(req, res, ruleId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(ruleId)) return res.status(400).json({ success: false, error: 'Geçersiz kural.' });

  try {
    await supabaseRestDelete('admin_notification_rules', { id: `eq.${ruleId}` });
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_NOTIFICATION_RULES.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Kural silinemedi.') });
  }
}

async function adminGetNotificationChannels(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    const rows = await supabaseRestGet('admin_notification_channels', { select: '*', id: 'eq.1', limit: '1' });
    const row = Array.isArray(rows) ? rows?.[0] : null;
    return res.json({ success: true, data: row || { id: 1, in_app_enabled: true, push_enabled: false, email_enabled: true, sms_enabled: false } });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({
        success: true,
        data: { id: 1, in_app_enabled: true, push_enabled: false, email_enabled: true, sms_enabled: false },
        schemaMissing: true,
        requiredSql: SQL_ADMIN_NOTIFICATION_CHANNELS.trim(),
      });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Ayarlar yüklenemedi.') });
  }
}

async function adminUpdateNotificationChannels(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const patch = {
    ...(body?.in_app_enabled !== undefined ? { in_app_enabled: !!body.in_app_enabled } : {}),
    ...(body?.push_enabled !== undefined ? { push_enabled: !!body.push_enabled } : {}),
    ...(body?.email_enabled !== undefined ? { email_enabled: !!body.email_enabled } : {}),
    ...(body?.sms_enabled !== undefined ? { sms_enabled: !!body.sms_enabled } : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const updated = await supabaseRestPatch('admin_notification_channels', { id: 'eq.1' }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_NOTIFICATION_CHANNELS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Ayarlar güncellenemedi.') });
  }
}

async function adminGetDbOverview(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const tables = [
    'users',
    'posts',
    'comments',
    'notifications',
    'messages',
    'agendas',
    'parties',
    'follows',
    'likes',
    'admin_notification_rules',
    'admin_notification_channels',
  ];

  const counts = {};
  for (const t of tables) {
    // eslint-disable-next-line no-await-in-loop
    const n = await supabaseCount(t, { select: 'id' }).catch(() => null);
    counts[t] = typeof n === 'number' ? n : null;
  }

  // best-effort "last activity"
  let lastPostAt = null;
  try {
    const rows = await supabaseRestGet('posts', { select: 'created_at', is_deleted: 'eq.false', order: 'created_at.desc', limit: '1' });
    lastPostAt = rows?.[0]?.created_at || null;
  } catch {
    lastPostAt = null;
  }

  return res.json({ success: true, data: { counts, lastPostAt } });
}

function getUserAgent(req) {
  return String(req?.headers?.['user-agent'] || '').slice(0, 500);
}

function makeDeviceKey(userId, userAgent) {
  const base = `${String(userId || '').trim()}|${String(userAgent || '').trim()}`;
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 32);
}

async function adminLogSecurityEvent({ user_id, event_type, ip, user_agent, metadata }) {
  const payload = {
    user_id: user_id || null,
    event_type: String(event_type || '').trim() || 'event',
    ip: ip ? String(ip).slice(0, 100) : null,
    user_agent: user_agent ? String(user_agent).slice(0, 500) : null,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    created_at: new Date().toISOString(),
  };
  try {
    await supabaseRestInsert('admin_security_events', [payload]);
  } catch (e) {
    // Missing table or any other issues must not block auth flows.
  }
}

async function adminUpsertTrustedDevice({ user_id, device_key, ip, user_agent }) {
  if (!user_id || !device_key) return;
  const nowIso = new Date().toISOString();
  try {
    const rows = await supabaseRestGet('admin_trusted_devices', {
      select: 'id,trusted',
      user_id: `eq.${user_id}`,
      device_key: `eq.${device_key}`,
      limit: '1',
    }).catch(() => []);
    const existing = rows?.[0] || null;
    if (existing?.id) {
      await supabaseRestPatch(
        'admin_trusted_devices',
        { id: `eq.${existing.id}` },
        { last_seen_at: nowIso, ip: ip ? String(ip).slice(0, 100) : null, user_agent: user_agent ? String(user_agent).slice(0, 500) : null }
      ).catch(() => null);
      return;
    }
    await supabaseRestInsert('admin_trusted_devices', [
      {
        user_id,
        device_key,
        ip: ip ? String(ip).slice(0, 100) : null,
        user_agent: user_agent ? String(user_agent).slice(0, 500) : null,
        trusted: false,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      },
    ]).catch(() => null);
  } catch {
    // ignore
  }
}

async function adminGetSecurityEvents(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || 100), 10) || 100));
  try {
    const rows = await supabaseRestGet('admin_security_events', {
      select: '*',
      order: 'created_at.desc',
      limit: String(limit),
    });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      const sql = `${SQL_ADMIN_SECURITY_EVENTS.trim()}\n\n${SQL_ADMIN_TRUSTED_DEVICES.trim()}`.trim();
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: sql });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Güvenlik olayları yüklenemedi.') });
  }
}

async function adminGetTrustedDevices(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || 200), 10) || 200));
  try {
    const rows = await supabaseRestGet('admin_trusted_devices', {
      select: '*',
      order: 'last_seen_at.desc',
      limit: String(limit),
    });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      const sql = `${SQL_ADMIN_SECURITY_EVENTS.trim()}\n\n${SQL_ADMIN_TRUSTED_DEVICES.trim()}`.trim();
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: sql });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Cihazlar yüklenemedi.') });
  }
}

async function adminUpdateTrustedDevice(req, res, deviceId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const id = String(deviceId || '').trim();
  if (!id || !isSafeId(id)) return res.status(400).json({ success: false, error: 'Geçersiz cihaz.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (typeof body?.trusted === 'boolean') patch.trusted = body.trusted;
  if (Object.keys(patch).length === 0) return res.status(400).json({ success: false, error: 'Geçersiz istek.' });
  try {
    const updated = await supabaseRestPatch('admin_trusted_devices', { id: `eq.${id}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      const sql = `${SQL_ADMIN_SECURITY_EVENTS.trim()}\n\n${SQL_ADMIN_TRUSTED_DEVICES.trim()}`.trim();
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: sql });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Cihaz güncellenemedi.') });
  }
}

async function adminSystemTransform(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const action = String(body?.action || '').trim();
  const confirm = String(body?.confirm || '').trim();
  if (confirm !== 'ONAYLIYORUM') {
    return res.status(400).json({ success: false, error: 'Onay metni hatalı. Devam etmek için ONAYLIYORUM yazmalısınız.' });
  }

  try {
    if (action === 'purge_archived_posts') {
      const days = Math.max(1, Math.min(365, Number(body?.days || process.env.POST_ARCHIVE_DAYS || 3) || 3));
      const limit = Math.max(1, Math.min(1000, Number(body?.limit || 200) || 200));
      const out = await purgeArchivedPosts({ olderThanDays: days, limit });
      await adminLogSecurityEvent({
        user_id: auth.id,
        event_type: 'admin_action',
        ip: getClientIp(req),
        user_agent: getUserAgent(req),
        metadata: { action, days, limit, result: out },
      });
      return res.json({ success: true, data: out });
    }

    if (action === 'rebuild_agenda_post_counts') {
      const maxAgendas = Math.max(1, Math.min(100, parseInt(String(body?.maxAgendas || 50), 10) || 50));
      const agendas = await supabaseRestGet('agendas', { select: 'id,title', order: 'trending_score.desc', limit: String(maxAgendas) }).catch(() => []);
      const list = Array.isArray(agendas) ? agendas : [];
      const updated = [];
      for (const a of list) {
        const id = a?.id;
        const title = String(a?.title || '').trim();
        if (!id || !title) continue;
        // eslint-disable-next-line no-await-in-loop
        const cnt = await supabaseCount('posts', { select: 'id', is_deleted: 'eq.false', agenda_tag: `eq.${title}` }).catch(() => null);
        if (typeof cnt !== 'number') continue;
        // eslint-disable-next-line no-await-in-loop
        const rows = await supabaseRestPatch('agendas', { id: `eq.${id}` }, { post_count: cnt }).catch(() => []);
        updated.push({ id, title, post_count: cnt, ok: !!rows?.[0] });
      }
      await adminLogSecurityEvent({
        user_id: auth.id,
        event_type: 'admin_action',
        ip: getClientIp(req),
        user_agent: getUserAgent(req),
        metadata: { action, maxAgendas, updatedCount: updated.length },
      });
      return res.json({ success: true, data: { updated } });
    }

    return res.status(400).json({ success: false, error: 'Geçersiz işlem (action).' });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'İşlem başarısız.') });
  }
}

async function adminListJobs(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || 50), 10) || 50));
  try {
    const rows = await supabaseRestGet('admin_jobs', { select: '*', order: 'requested_at.desc', limit: String(limit) });
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [], schemaMissing: true, requiredSql: SQL_ADMIN_JOBS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Job listesi yüklenemedi.') });
  }
}

async function adminEnqueueJob(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const job_type = String(body?.job_type || '').trim();
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
  if (!job_type) return res.status(400).json({ success: false, error: 'job_type gerekli.' });

  const row = {
    job_type,
    status: 'queued',
    payload,
    result: {},
    requested_by: auth.id || null,
    requested_at: new Date().toISOString(),
  };
  try {
    const inserted = await supabaseRestInsert('admin_jobs', [row]);
    return res.json({ success: true, data: inserted?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_JOBS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Job oluşturulamadı.') });
  }
}

async function adminUpdateJob(req, res, jobId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const id = String(jobId || '').trim();
  if (!id || !isSafeId(id)) return res.status(400).json({ success: false, error: 'Geçersiz job.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (body?.status !== undefined) patch.status = String(body.status || '').trim();
  if (body?.result !== undefined) patch.result = body.result && typeof body.result === 'object' ? body.result : {};
  if (body?.started_at !== undefined) patch.started_at = body.started_at ? String(body.started_at) : null;
  if (body?.finished_at !== undefined) patch.finished_at = body.finished_at ? String(body.finished_at) : null;
  if (Object.keys(patch).length === 0) return res.status(400).json({ success: false, error: 'Geçersiz istek.' });
  try {
    const updated = await supabaseRestPatch('admin_jobs', { id: `eq.${id}` }, patch);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_JOBS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Job güncellenemedi.') });
  }
}

function stripCdata(s) {
  return String(s || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function decodeXmlEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(text, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = String(text || '').match(re);
  if (!m) return '';
  return decodeXmlEntities(stripCdata(m[1] || ''));
}

function parseRssItems(xml, { limit = 30 } = {}) {
  const raw = String(xml || '');
  const out = [];
  // RSS <item>
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(raw)) && out.length < limit) {
    const block = m[1] || '';
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    if (!title && !link) continue;
    out.push({ title, link, desc });
  }
  if (out.length > 0) return out;
  // Atom <entry>
  const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((m = entryRe.exec(raw)) && out.length < limit) {
    const block = m[1] || '';
    const title = extractTag(block, 'title');
    // atom links: <link href="..."/>
    let link = '';
    const lm = block.match(/<link[^>]+href="([^"]+)"[^>]*\/?>/i);
    if (lm && lm[1]) link = decodeXmlEntities(lm[1]);
    const desc = extractTag(block, 'summary') || extractTag(block, 'content');
    if (!title && !link) continue;
    out.push({ title, link, desc });
  }
  return out;
}

async function pickAdminUserId() {
  const rows = await supabaseRestGet('users', { select: 'id,is_admin,is_active', is_admin: 'eq.true', is_active: 'eq.true', limit: '1' }).catch(() => []);
  return rows?.[0]?.id || null;
}

async function bestEffortInsertPost(payload) {
  try {
    const inserted = await supabaseRestInsert('posts', [payload]);
    return inserted?.[0] || null;
  } catch (e) {
    const msg = String(e?.message || '');
    // Retry without optional columns if schema lacks them
    if (msg.includes('source_url') || msg.includes('source_title') || msg.includes('source_type')) {
      const retry = { ...payload };
      delete retry.source_url;
      delete retry.source_title;
      delete retry.source_type;
      const inserted = await supabaseRestInsert('posts', [retry]).catch(() => []);
      return inserted?.[0] || null;
    }
    if (msg.includes('content_text') || msg.includes('content_type')) {
      const retry = { ...payload };
      // fallback to legacy schemas with 'content'
      if (retry.content_text && !retry.content) retry.content = retry.content_text;
      delete retry.content_text;
      delete retry.content_type;
      const inserted = await supabaseRestInsert('posts', [retry]).catch(() => []);
      return inserted?.[0] || null;
    }
    throw e;
  }
}

async function processJob(job) {
  const id = String(job?.id || '').trim();
  const type = String(job?.job_type || '').trim();
  const payload = job?.payload && typeof job.payload === 'object' ? job.payload : {};
  const nowIso = new Date().toISOString();

  if (!id || !type) return { ok: false, error: 'Geçersiz job.' };

  if (type === 'run_workflow') {
    const wid = String(payload?.workflow_id || '').trim();
    if (!wid) return { ok: false, error: 'workflow_id gerekli.' };
    try {
      const wfRows = await supabaseRestGet('admin_workflows', { select: 'id,success_count,fail_count', id: `eq.${wid}`, limit: '1' }).catch(() => []);
      const wf = wfRows?.[0] || null;
      if (!wf?.id) return { ok: false, error: 'Workflow bulunamadı.' };
      await supabaseRestPatch('admin_workflows', { id: `eq.${wid}` }, { last_run_at: nowIso, success_count: Math.max(0, Number(wf.success_count || 0) + 1) }).catch(() => null);
      return { ok: true, result: { workflow_id: wid, ran_at: nowIso } };
    } catch (e) {
      return { ok: false, error: String(e?.message || 'Workflow çalıştırılamadı.') };
    }
  }

  if (type === 'scrape_source') {
    const sid = String(payload?.source_id || '').trim();
    if (!sid) return { ok: false, error: 'source_id gerekli.' };
    const sourceRows = await supabaseRestGet('admin_sources', { select: '*', id: `eq.${sid}`, limit: '1' }).catch(() => []);
    const s = sourceRows?.[0] || null;
    if (!s?.id) return { ok: false, error: 'Kaynak bulunamadı.' };
    const feedUrl = String(s.rss_feed || s.url || '').trim();
    if (!feedUrl) return { ok: false, error: 'Kaynak URL/RSS boş.' };

    const resp = await fetch(feedUrl, { method: 'GET', headers: { 'user-agent': 'PolithaneBot/1.0 (+https://polithane.com)' } }).catch(() => null);
    if (!resp || !resp.ok) return { ok: false, error: `RSS çekilemedi (${resp?.status || 'no_response'})` };
    const xml = await resp.text();
    const items = parseRssItems(xml, { limit: 25 });
    if (!items.length) return { ok: false, error: 'RSS içinde item bulunamadı.' };

    const authorId = await pickAdminUserId();
    if (!authorId) return { ok: false, error: 'Post yazacak admin kullanıcı bulunamadı.' };

    let insertedCount = 0;
    let skipped = 0;
    for (const it of items) {
      const link = String(it.link || '').trim();
      const title = String(it.title || '').trim();
      const desc = String(it.desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const content = title ? (desc ? `${title}\n\n${desc}` : title) : desc;
      if (!content) continue;

      // best-effort dedupe by source_url if column exists
      let exists = false;
      if (link) {
        try {
          const ex = await supabaseRestGet('posts', { select: 'id', source_url: `eq.${link}`, limit: '1' }).catch(() => []);
          exists = Array.isArray(ex) && ex.length > 0;
        } catch {
          exists = false;
        }
      }
      if (exists) {
        skipped += 1;
        continue;
      }

      const payloadPost = {
        user_id: authorId,
        content_type: 'text',
        content_text: content.slice(0, 5000),
        category: 'general',
        agenda_tag: null,
        media_urls: [],
        is_deleted: false,
        is_trending: false,
        source_url: link || null,
        source_title: String(s.name || '').trim() || null,
        source_type: String(s.type || '').trim() || null,
        created_at: nowIso,
      };

      try {
        // eslint-disable-next-line no-await-in-loop
        const row = await bestEffortInsertPost(payloadPost);
        if (row) insertedCount += 1;
      } catch {
        // ignore individual item failures
      }
    }

    // Update source stats (best-effort)
    try {
      const nextItems = Math.max(0, Number(s.items_collected || 0) + insertedCount);
      await supabaseRestPatch('admin_sources', { id: `eq.${sid}` }, { items_collected: nextItems, last_fetch_at: nowIso, updated_at: nowIso }).catch(() => null);
    } catch {
      // ignore
    }

    return { ok: true, result: { source_id: sid, fetched: items.length, inserted: insertedCount, skipped, fetched_at: nowIso } };
  }

  if (type === 'send_sms') {
    return { ok: false, error: 'SMS provider yapılandırılmadı (send_sms).' };
  }

  return { ok: false, error: `Bilinmeyen job_type: ${type}` };
}

async function adminProcessJobs(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query?.limit || 10), 10) || 10));
  try {
    const queued = await supabaseRestGet('admin_jobs', { select: '*', status: 'eq.queued', order: 'requested_at.asc', limit: String(limit) });
    const list = Array.isArray(queued) ? queued : [];
    const results = [];
    for (const j of list) {
      const id = String(j?.id || '').trim();
      if (!id) continue;
      // eslint-disable-next-line no-await-in-loop
      await supabaseRestPatch('admin_jobs', { id: `eq.${id}` }, { status: 'running', started_at: new Date().toISOString() }).catch(() => null);
      // eslint-disable-next-line no-await-in-loop
      const r = await processJob(j);
      const finishedIso = new Date().toISOString();
      if (r.ok) {
        // eslint-disable-next-line no-await-in-loop
        await supabaseRestPatch('admin_jobs', { id: `eq.${id}` }, { status: 'success', result: r.result || {}, finished_at: finishedIso }).catch(() => null);
        results.push({ id, ok: true });
      } else {
        // eslint-disable-next-line no-await-in-loop
        await supabaseRestPatch('admin_jobs', { id: `eq.${id}` }, { status: 'failed', result: { error: r.error || 'failed' }, finished_at: finishedIso }).catch(() => null);
        results.push({ id, ok: false, error: r.error || 'failed' });
      }
    }
    return res.json({ success: true, data: { processed: results.length, results } });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.status(400).json({ success: false, error: 'DB tablosu eksik.', schemaMissing: true, requiredSql: SQL_ADMIN_JOBS.trim() });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Job işlenemedi.') });
  }
}

async function cronProcessAdminJobs(req, res) {
  const expected = String(process.env.CRON_SECRET || '').trim();
  if (!expected) return res.status(404).json({ success: false, error: 'Not found' });
  const provided = String(req.headers['x-cron-secret'] || '').trim();
  if (!provided || provided !== expected) return res.status(401).json({ success: false, error: 'Unauthorized' });
  // Reuse processor but without requiring admin token; process as system
  req.query = req.query || {};
  return await adminProcessJobs(req, res);
}

async function adminSeedDemoContent(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const clampInt = (v, { min, max, def }) => {
    const n = parseInt(String(v ?? ''), 10);
    const x = Number.isFinite(n) ? n : def;
    return Math.min(max, Math.max(min, x));
  };

  const postsCount = clampInt(body?.posts, { min: 0, max: 600, def: 200 });
  const fastCount = clampInt(body?.fast, { min: 0, max: 300, def: 50 });
  const dryRun = body?.dryRun === true;

  const users = await supabaseRestGet('users', {
    select: 'id,is_active',
    is_active: 'eq.true',
    order: 'polit_score.desc',
    limit: '200',
  }).catch(() => []);
  const userIds = (users || []).map((u) => String(u?.id || '')).filter(Boolean);
  if (userIds.length === 0) return res.status(400).json({ success: false, error: 'Seed için aktif kullanıcı bulunamadı.' });

  const agendas = await supabaseRestGet('agendas', {
    select: 'title,is_active',
    is_active: 'eq.true',
    order: 'trending_score.desc',
    limit: '60',
  }).catch(() => []);
  const agendaTitles = (agendas || []).map((a) => String(a?.title || '').trim()).filter(Boolean);

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, Math.max(0, (arr?.length || 1) - 1))];
  const maybeAgenda = () => {
    if (!agendaTitles.length) return null;
    // 35% gündem dışı, 65% gündemli
    if (Math.random() < 0.35) return null;
    return pick(agendaTitles);
  };

  const snippets = [
    'Bu konu hakkında görüşünüz nedir?',
    'Sizce çözüm ne olmalı?',
    'Veriler ve sahadaki durum aynı şeyi mi söylüyor?',
    'Toplumsal etkilerini birlikte değerlendirelim.',
    'Şeffaflık ve hesap verebilirlik şart.',
    'Bugün konuşalım, yarın geç kalmayalım.',
  ];
  const makeText = (kind, i) => {
    const tag = kind === 'fast' ? 'FAST' : 'POLIT';
    const n = i + 1;
    return `DEMO ${tag} #${n} — ${pick(snippets)}`;
  };

  const build = (kind, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const text = makeText(kind, i);
      out.push({
        user_id: pick(userIds),
        party_id: null,
        content_type: 'text',
        content_text: text,
        content: text,
        category: 'general',
        agenda_tag: maybeAgenda(),
        media_urls: [],
        is_deleted: false,
        is_trending: kind === 'fast',
        polit_score: rand(5, 800),
        view_count: rand(0, 500),
        like_count: rand(0, 40),
        comment_count: rand(0, 12),
        share_count: rand(0, 8),
        created_at: new Date(Date.now() - rand(0, 7 * 24 * 60 * 60 * 1000)).toISOString(),
      });
    }
    return out;
  };

  const rows = [...build('polit', postsCount), ...build('fast', fastCount)];
  if (dryRun) return res.json({ success: true, dryRun: true, planned: rows.length, sample: rows.slice(0, 3) });

  const chunkSize = 100;
  const inserted = { ok: 0, failed: 0 };
  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = rows.slice(i, i + chunkSize);
    try {
      // eslint-disable-next-line no-await-in-loop
      await supabaseRestInsert('posts', batch);
      inserted.ok += batch.length;
    } catch (e) {
      const msg = String(e?.message || '');
      // Retry without schema-specific fields
      try {
        const safeBatch = batch.map(({ content_text, is_trending, ...rest }) => ({ ...rest, content: rest.content || content_text }));
        // eslint-disable-next-line no-await-in-loop
        await supabaseRestInsert('posts', safeBatch);
        inserted.ok += batch.length;
      } catch (e2) {
        const msg2 = String(e2?.message || msg || '');
        // Final retry: remove is_trending if DB doesn't support it
        if (msg2.includes('is_trending')) {
          try {
            const safeBatch = batch.map(({ content_text, is_trending, ...rest }) => ({
              ...rest,
              content: rest.content || content_text,
              is_trending: undefined,
            }));
            // eslint-disable-next-line no-await-in-loop
            await supabaseRestInsert('posts', safeBatch);
            inserted.ok += batch.length;
            continue;
          } catch {
            // fallthrough
          }
        }
        inserted.failed += batch.length;
      }
    }
  }

  return res.json({ success: true, inserted });
}

async function adminGetUsers(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { page = 1, limit = 20, search, user_type, is_verified } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const params = {
    select: '*',
    order: 'created_at.desc',
    limit: String(limitNum),
    offset: String(offset),
  };
  if (user_type) params.user_type = `eq.${user_type}`;
  if (is_verified === 'true' || is_verified === 'false') params.is_verified = `eq.${is_verified}`;
  if (search && String(search).trim()) {
    const q = String(search).trim();
    params.or = `(username.ilike.*${q}*,email.ilike.*${q}*,full_name.ilike.*${q}*)`;
  }

  const [total, rows] = await Promise.all([
    supabaseCount('users', { select: 'id', ...(params.user_type ? { user_type: params.user_type } : {}), ...(params.is_verified ? { is_verified: params.is_verified } : {}), ...(params.or ? { or: params.or } : {}) }).catch(() => 0),
    supabaseRestGet('users', params).catch(() => []),
  ]);

  res.json({
    success: true,
    data: Array.isArray(rows) ? rows : [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  });
}

async function adminUpdateUser(req, res, userId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const uid = String(userId || '').trim();
  if (!uid || !isSafeId(uid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  // Load previous state for side effects (email/notifications).
  const beforeRows = await supabaseRestGet('users', {
    select: 'id,email,username,full_name,is_active,is_verified,user_type,is_admin',
    id: `eq.${uid}`,
    limit: '1',
  }).catch(() => []);
  const before = beforeRows?.[0] || null;
  if (!before) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });

  const patch = {};
  const setStr = (key, { max = 500, nullable = true, lower = false } = {}) => {
    if (!Object.prototype.hasOwnProperty.call(body, key)) return;
    const raw = body?.[key];
    const s = raw === null ? '' : String(raw ?? '').trim();
    if (!s) {
      if (nullable) patch[key] = null;
      return;
    }
    patch[key] = (lower ? s.toLowerCase() : s).slice(0, max);
  };

  // Core profile fields
  setStr('full_name', { max: 120, nullable: false });
  setStr('province', { max: 100, nullable: true });
  setStr('district_name', { max: 100, nullable: true });
  setStr('avatar_url', { max: 600, nullable: true });
  setStr('politician_type', { max: 60, nullable: true });
  setStr('user_type', { max: 40, nullable: true, lower: true });

  // Email
  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ success: false, error: 'Geçerli bir email adresi giriniz.' });
      patch.email = email.slice(0, 255);
      // Keep app expectations: when email changes, mark unverified unless explicitly set.
      if (!Object.prototype.hasOwnProperty.call(body, 'email_verified')) {
        patch.email_verified = false;
      }
    } else {
      patch.email = null;
    }
  }
  if (typeof body?.email_verified === 'boolean') patch.email_verified = body.email_verified;

  // Username (keep same rules as registration)
  if (Object.prototype.hasOwnProperty.call(body, 'username')) {
    const candRaw = String(body?.username ?? '').trim();
    if (!candRaw) {
      return res.status(400).json({ success: false, error: 'Username boş olamaz.' });
    }
    const cand = normalizeUsernameCandidate(candRaw);
    if (!cand) return res.status(400).json({ success: false, error: 'Geçersiz username.' });
    if (isReservedUsername(cand)) return res.status(400).json({ success: false, error: 'Bu kullanıcı adı kullanılamaz.' });
    const exists = await supabaseRestGet('users', { select: 'id', username: `eq.${cand}`, limit: '1' }).catch(() => []);
    const other = (exists || []).find((r) => String(r?.id || '') !== String(uid));
    if (other) return res.status(400).json({ success: false, error: 'Bu kullanıcı adı zaten kullanılıyor.' });
    patch.username = cand;
  }

  // Party id (can be numeric or uuid depending on schema)
  if (Object.prototype.hasOwnProperty.call(body, 'party_id')) {
    const v = body?.party_id;
    if (v === null || String(v).trim() === '') {
      patch.party_id = null;
    } else {
      const pid = String(v).trim();
      const ok = /^\d+$/.test(pid) || /^[0-9a-fA-F-]{36}$/.test(pid);
      if (!ok) return res.status(400).json({ success: false, error: 'Geçersiz party_id.' });
      patch.party_id = pid;
    }
  }

  // Flags
  if (typeof body?.is_verified === 'boolean') patch.is_verified = body.is_verified;
  if (typeof body?.is_active === 'boolean') patch.is_active = body.is_active;
  if (typeof body?.is_admin === 'boolean') {
    // Safety: prevent self lock-out
    if (String(uid) === String(auth.id) && body.is_admin === false) {
      return res.status(400).json({ success: false, error: 'Kendinizi admin yetkisinden çıkaramazsınız.' });
    }
    patch.is_admin = body.is_admin;
  }

  // Metadata (advanced)
  if (Object.prototype.hasOwnProperty.call(body, 'metadata')) {
    if (body.metadata === null) {
      patch.metadata = null;
    } else if (body.metadata && typeof body.metadata === 'object') {
      patch.metadata = body.metadata;
    } else {
      return res.status(400).json({ success: false, error: 'metadata alanı JSON object olmalı.' });
    }
  }

  if (Object.keys(patch).length === 0) return res.status(400).json({ success: false, error: 'Geçersiz istek.' });

  const tryPatch = async (obj) => {
    try {
      const updated = await supabaseRestPatch('users', { id: `eq.${uid}` }, obj);
      return updated?.[0] || null;
    } catch (e) {
      const msgRaw = String(e?.message || '');
      const m = msgRaw.match(/Could not find the '([^']+)' column/i);
      if (m && m[1] && Object.prototype.hasOwnProperty.call(obj, m[1])) {
        const next = { ...obj };
        delete next[m[1]];
        return await tryPatch(next);
      }
      // Another common PostgREST shape: column "x" of relation "users" does not exist
      const m2 = msgRaw.match(/column \"([a-zA-Z0-9_]+)\" of relation/i);
      if (m2 && m2[1] && Object.prototype.hasOwnProperty.call(obj, m2[1])) {
        const next = { ...obj };
        delete next[m2[1]];
        return await tryPatch(next);
      }
      throw e;
    }
  };

  const after = await tryPatch(patch);

  // If approval changed, also notify + email (best-effort).
  try {
    const beforeVerified = before?.is_verified === true;
    const afterVerified = after?.is_verified === true;
    if (Object.prototype.hasOwnProperty.call(patch, 'is_verified') && before && beforeVerified !== afterVerified) {
      if (afterVerified) {
        await supabaseRestInsert('notifications', [
          {
            user_id: uid,
            type: 'approval',
            title: 'Üyeliğiniz onaylandı',
            message: 'Artık Polit ve Fast paylaşabilirsiniz.',
            is_read: false,
          },
        ]).catch(async (err) => {
          const msg = String(err?.message || '');
          if (msg.includes('title') || msg.includes('message')) {
            await supabaseRestInsert('notifications', [{ user_id: uid, type: 'approval', is_read: false }]).catch(() => {});
          }
        });
        sendNotificationEmail(req, { userId: uid, type: 'approval' }).catch(() => null);
      } else {
        await supabaseRestInsert('notifications', [
          {
            user_id: uid,
            type: 'system',
            title: 'Üyelik durumunuz güncellendi',
            message: 'Üyelik durumunuz admin tarafından güncellendi.',
            is_read: false,
          },
        ]).catch(async (err) => {
          const msg = String(err?.message || '');
          if (msg.includes('title') || msg.includes('message')) {
            await supabaseRestInsert('notifications', [{ user_id: uid, type: 'system', is_read: false }]).catch(() => {});
          }
        });
        sendNotificationEmail(req, { userId: uid, type: 'system' }).catch(() => null);
      }
    }
  } catch {
    // ignore
  }

  res.json({ success: true, data: after });
}

async function adminUpdatePost(req, res, postId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const id = String(postId || '').trim();
  if (!id || !isSafeId(id)) return res.status(400).json({ success: false, error: 'Geçersiz paylaşım.' });
  const body = await readJsonBody(req);

  const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'content')) patch.content = String(body.content ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(body, 'content_text')) patch.content_text = String(body.content_text ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(body, 'category')) patch.category = String(body.category ?? '').trim().slice(0, 40) || 'general';
  if (Object.prototype.hasOwnProperty.call(body, 'agenda_tag')) {
    const t = String(body.agenda_tag ?? '').trim();
    patch.agenda_tag = t ? t.slice(0, 120) : null;
  }
  if (typeof body?.is_trending === 'boolean') patch.is_trending = body.is_trending;
  if (typeof body?.is_deleted === 'boolean') patch.is_deleted = body.is_deleted;
  if (Object.prototype.hasOwnProperty.call(body, 'thumbnail_url')) {
    const u = String(body.thumbnail_url ?? '').trim();
    patch.thumbnail_url = u ? u.slice(0, 600) : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'media_urls')) {
    const arr = Array.isArray(body.media_urls) ? body.media_urls : [];
    const urls = arr.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 12);
    patch.media_urls = urls;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'content_type')) {
    const ct = String(body.content_type ?? '').trim();
    if (ct) patch.content_type = ct.slice(0, 20);
  }
  patch.updated_at = new Date().toISOString();

  if (Object.keys(patch).length === 1 && Object.prototype.hasOwnProperty.call(patch, 'updated_at')) {
    return res.status(400).json({ success: false, error: 'Geçersiz istek.' });
  }

  const tryPatch = async (obj) => {
    try {
      const updated = await supabaseRestPatch('posts', { id: `eq.${id}` }, obj);
      return updated?.[0] || null;
    } catch (e) {
      const msgRaw = String(e?.message || '');
      const m = msgRaw.match(/Could not find the '([^']+)' column/i);
      if (m && m[1] && Object.prototype.hasOwnProperty.call(obj, m[1])) {
        const next = { ...obj };
        delete next[m[1]];
        return await tryPatch(next);
      }
      const m2 = msgRaw.match(/column \"([a-zA-Z0-9_]+)\" of relation/i);
      if (m2 && m2[1] && Object.prototype.hasOwnProperty.call(obj, m2[1])) {
        const next = { ...obj };
        delete next[m2[1]];
        return await tryPatch(next);
      }
      throw e;
    }
  };

  let row = null;
  try {
    row = await tryPatch(patch);
  } catch (e) {
    const msg = String(e?.message || 'Paylaşım güncellenemedi.');
    return res.status(500).json({ success: false, error: msg });
  }
  if (!row) return res.status(500).json({ success: false, error: 'Paylaşım güncellenemedi.' });
  return res.json({ success: true, data: row });
}

async function adminUpdateComment(req, res, commentId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const id = String(commentId || '').trim();
  if (!id || !isSafeId(id)) return res.status(400).json({ success: false, error: 'Geçersiz yorum.' });
  const body = await readJsonBody(req);
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'content')) {
    const text = String(body.content ?? '').trim();
    if (!text) return res.status(400).json({ success: false, error: 'Yorum boş olamaz.' });
    if (text.length > 500) return res.status(400).json({ success: false, error: 'Yorum en fazla 500 karakter olabilir.' });
    patch.content = text;
  }
  if (typeof body?.is_deleted === 'boolean') patch.is_deleted = body.is_deleted;
  patch.updated_at = new Date().toISOString();
  if (Object.keys(patch).length === 1 && Object.prototype.hasOwnProperty.call(patch, 'updated_at')) {
    return res.status(400).json({ success: false, error: 'Geçersiz istek.' });
  }

  const tryPatch = async (obj) => {
    try {
      const updated = await supabaseRestPatch('comments', { id: `eq.${id}` }, obj);
      return updated?.[0] || null;
    } catch (e) {
      const msgRaw = String(e?.message || '');
      const m = msgRaw.match(/Could not find the '([^']+)' column/i);
      if (m && m[1] && Object.prototype.hasOwnProperty.call(obj, m[1])) {
        const next = { ...obj };
        delete next[m[1]];
        return await tryPatch(next);
      }
      const m2 = msgRaw.match(/column \"([a-zA-Z0-9_]+)\" of relation/i);
      if (m2 && m2[1] && Object.prototype.hasOwnProperty.call(obj, m2[1])) {
        const next = { ...obj };
        delete next[m2[1]];
        return await tryPatch(next);
      }
      throw e;
    }
  };

  const row = await tryPatch(patch).catch(() => null);
  if (!row) return res.status(500).json({ success: false, error: 'Yorum güncellenemedi.' });
  return res.json({ success: true, data: row });
}

function normalizePersonKey(input) {
  return String(input || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, ' ');
}

function normalizeAvatarKey(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  // strip query params to avoid signed url mismatches
  return s.split('?')[0];
}

async function adminFindDuplicateUsers(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { limit = 5000 } = req.query || {};
  const lim = Math.min(Math.max(parseInt(limit, 10) || 5000, 200), 5000);

  const rows = await supabaseRestGet('users', {
    select: 'id,username,full_name,email,avatar_url,user_type,politician_type,party_id,province,district_name,is_active,is_verified,created_at,metadata,polit_score',
    limit: String(lim),
    order: 'created_at.asc',
  }).catch(() => []);

  const groups = new Map();
  for (const u of rows || []) {
    const nameKey = normalizePersonKey(u?.full_name);
    const avatarKey = normalizeAvatarKey(u?.avatar_url);
    if (!nameKey || !avatarKey) continue;
    const key = `${nameKey}__${avatarKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  }

  const out = [];
  for (const [key, list] of groups.entries()) {
    if (!Array.isArray(list) || list.length < 2) continue;
    out.push({
      key,
      count: list.length,
      users: list,
    });
  }
  // biggest groups first
  out.sort((a, b) => (b.count || 0) - (a.count || 0));
  res.json({ success: true, data: out });
}

async function adminDedupeUsers(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const primaryId = String(body?.primaryId || '').trim();
  const duplicateIds = Array.isArray(body?.duplicateIds) ? body.duplicateIds.map((x) => String(x).trim()).filter(Boolean) : [];
  const dryRun = body?.dryRun === true;
  if (!/^\d+$/.test(primaryId)) return res.status(400).json({ success: false, error: 'Geçersiz primaryId.' });
  if (duplicateIds.length === 0) return res.status(400).json({ success: false, error: 'duplicateIds gerekli.' });
  if (duplicateIds.some((id) => !/^\d+$/.test(id))) return res.status(400).json({ success: false, error: 'Geçersiz duplicateIds.' });
  if (duplicateIds.includes(primaryId)) return res.status(400).json({ success: false, error: 'primaryId duplicateIds içinde olamaz.' });

  const primaryRows = await supabaseRestGet('users', { select: '*', id: `eq.${primaryId}`, limit: '1' }).catch(() => []);
  const primary = primaryRows?.[0] || null;
  if (!primary) return res.status(404).json({ success: false, error: 'Primary kullanıcı bulunamadı.' });

  const dupRows = await supabaseRestGet('users', { select: '*', id: `in.(${duplicateIds.join(',')})`, limit: String(duplicateIds.length) }).catch(() => []);
  const dups = Array.isArray(dupRows) ? dupRows : [];

  // Merge role hints into metadata.roles (best-effort)
  const roleLabels = new Set();
  const addRole = (u) => {
    const ut = String(u?.user_type || '').trim();
    const pt = String(u?.politician_type || '').trim();
    if (ut) roleLabels.add(ut);
    if (pt) roleLabels.add(pt);
  };
  addRole(primary);
  dups.forEach(addRole);

  const primaryMeta = primary?.metadata && typeof primary.metadata === 'object' ? primary.metadata : {};
  const existingRoles = Array.isArray(primaryMeta.roles) ? primaryMeta.roles.map(String) : [];
  const mergedRoles = Array.from(new Set([...existingRoles, ...Array.from(roleLabels)])).filter(Boolean);

  const plan = {
    primaryId,
    duplicateIds,
    mergedRoles,
    actions: duplicateIds.map((id) => ({ id, set_is_active: false, set_metadata: { merged_into: primaryId } })),
  };
  if (dryRun) return res.json({ success: true, dryRun: true, data: plan });

  // Update primary metadata
  try {
    await supabaseRestPatch('users', { id: `eq.${primaryId}` }, { metadata: { ...primaryMeta, roles: mergedRoles } }).catch(() => null);
  } catch {
    // ignore if metadata column missing
  }

  // Deactivate duplicates + mark metadata (best-effort)
  for (const id of duplicateIds) {
    // eslint-disable-next-line no-await-in-loop
    await supabaseRestPatch('users', { id: `eq.${id}` }, { is_active: false }).catch(() => null);
    // eslint-disable-next-line no-await-in-loop
    await supabaseRestPatch('users', { id: `eq.${id}` }, { metadata: { merged_into: primaryId } }).catch(() => null);
  }

  return res.json({ success: true, data: plan });
}

async function adminDeleteUser(req, res, userId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const updated = await supabaseRestPatch('users', { id: `eq.${userId}` }, { is_active: false });
  res.json({ success: true, data: updated?.[0] || null });
}

async function adminChangeUserPassword(req, res, userId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const uid = String(userId || '').trim();
  if (!uid || !isSafeId(uid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  const newPassword = String(body?.newPassword || '').trim();
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Şifre en az 6 karakter olmalı.' });
  }

  // No password rules for admin password change
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const updated = await supabaseRestPatch('users', { id: `eq.${uid}` }, { password: hashedPassword });
  
  if (!updated || updated.length === 0) {
    return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  }

  return res.json({ success: true, message: 'Şifre başarıyla değiştirildi.', data: updated[0] });
}

async function adminGetPosts(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { page = 1, limit = 20, search, include_deleted, is_deleted } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const includeDeleted = String(include_deleted || '').trim() === 'true';
  const isDeletedFilter = String(is_deleted || '').trim();

  const baseParams = {
    select: '*,user:users(*),party:parties(*)',
    order: 'created_at.desc',
    limit: String(limitNum),
    offset: String(offset),
  };
  if (!includeDeleted) {
    baseParams.is_deleted = 'eq.false';
  }
  if (isDeletedFilter === 'true' || isDeletedFilter === 'false') {
    baseParams.is_deleted = `eq.${isDeletedFilter}`;
  }

  const q = search ? String(search).trim() : '';
  const makeParams = (or) => (or ? { ...baseParams, or } : { ...baseParams });

  let rows = [];
  try {
    if (q) {
      rows = await supabaseRestGet('posts', makeParams(`(content.ilike.*${q}*,content_text.ilike.*${q}*)`));
    } else {
      rows = await supabaseRestGet('posts', baseParams);
    }
  } catch (e) {
    // schema fallback for content/content_text
    if (q) {
      const msg = String(e?.message || '');
      if (msg.includes('content_text')) {
        rows = await supabaseRestGet('posts', makeParams(`(content.ilike.*${q}*)`)).catch(() => []);
      } else if (msg.includes('content')) {
        rows = await supabaseRestGet('posts', makeParams(`(content_text.ilike.*${q}*)`)).catch(() => []);
      } else {
        throw e;
      }
    } else {
      throw e;
    }
  }

  const countParams = { select: 'id' };
  if (!includeDeleted) countParams.is_deleted = 'eq.false';
  if (isDeletedFilter === 'true' || isDeletedFilter === 'false') countParams.is_deleted = `eq.${isDeletedFilter}`;
  if (q) {
    // best-effort: count with same search filter, but ignore column fallback complexity
    countParams.or = `(content.ilike.*${q}*,content_text.ilike.*${q}*)`;
  }
  const total = await supabaseCount('posts', countParams).catch(() => 0);
  res.json({
    success: true,
    data: Array.isArray(rows) ? rows : [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  });
}

async function adminDeletePost(req, res, postId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const id = String(postId || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz paylaşım.' });

  // Best-effort: also delete uploaded media objects from storage (same logic as user delete).
  try {
    const rows = await supabaseRestGet('posts', { select: '*', id: `eq.${id}`, limit: '1' }).catch(() => []);
    const post = rows?.[0] || null;
    const urls = [];
    if (Array.isArray(post?.media_urls)) urls.push(...post.media_urls);
    if (post?.thumbnail_url) urls.push(post.thumbnail_url);
    const objs = (urls || [])
      .map((u) => parseSupabasePublicObjectUrl(u))
      .filter(Boolean)
      // Only delete from uploads bucket (avoid shared assets like avatars/logos)
      .filter((p) => p.bucket === 'uploads' && p.objectPath);
    const seen = new Set();
    for (const o of objs) {
      const key = `${o.bucket}/${o.objectPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // eslint-disable-next-line no-await-in-loop
      await supabaseStorageDeleteObject(o.bucket, o.objectPath).catch(() => null);
    }
  } catch {
    // ignore
  }

  const updated = await supabaseRestPatch('posts', { id: `eq.${id}` }, { is_deleted: true, updated_at: new Date().toISOString() }).catch(() => []);
  return res.json({ success: true, data: updated?.[0] || null });
}

async function adminGetAgendas(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { page = 1, limit = 50, search, is_active, is_trending } = req.query || {};
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const params = {
    select: '*',
    limit: String(limitNum),
    offset: String(offset),
  };
  if (is_active === 'true' || is_active === 'false') params.is_active = `eq.${is_active}`;
  if (is_trending === 'true' || is_trending === 'false') params.is_trending = `eq.${is_trending}`;
  if (search && String(search).trim()) {
    const q = String(search).trim();
    params.or = `(title.ilike.*${q}*,slug.ilike.*${q}*)`;
  }

  const countParams = { select: 'id' };
  if (params.is_active) countParams.is_active = params.is_active;
  if (params.is_trending) countParams.is_trending = params.is_trending;
  if (params.or) countParams.or = params.or;

  const agendasRequiredSql = () => `
-- Gündemler tablosu
create extension if not exists pgcrypto;

create table if not exists agendas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text null,
  post_count integer not null default 0,
  total_polit_score bigint not null default 0,
  trending_score bigint not null default 0,
  is_trending boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agendas_trending_score_idx on agendas (trending_score desc);
create index if not exists agendas_total_polit_score_idx on agendas (total_polit_score desc);
create index if not exists agendas_is_active_idx on agendas (is_active);
`.trim();

  let total = 0;
  let rows = [];
  try {
    const orderCandidates = ['trending_score.desc', 'updated_at.desc', 'created_at.desc', 'id.desc', 'title.asc'];
    total = await supabaseCount('agendas', countParams).catch(() => 0);
    rows = await supabaseRestGetWithOrderFallback('agendas', params, orderCandidates);
    rows = Array.isArray(rows) ? rows : [];
  } catch (e) {
    // Older schemas might not have slug/is_active/is_trending/trending_score.
    // Retry with progressively simpler queries so admin can still see/manage existing data.
    try {
      const orderCandidates = ['trending_score.desc', 'updated_at.desc', 'created_at.desc', 'id.desc', 'title.asc'];
      const retry = { ...params };
      if (isMissingColumnError(e, 'slug')) delete retry.or;
      if (isMissingColumnError(e, 'is_active')) delete retry.is_active;
      if (isMissingColumnError(e, 'is_trending')) delete retry.is_trending;
      rows = await supabaseRestGetWithOrderFallback('agendas', retry, orderCandidates).catch(() => []);
      rows = Array.isArray(rows) ? rows : [];
      total = await supabaseCount('agendas', { select: 'id' }).catch(() => 0);
      if (rows.length > 0) {
        return res.json({
          success: true,
          data: rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.max(1, Math.ceil((total || 0) / limitNum)),
          },
        });
      }
    } catch {
      // ignore fallback errors and continue to normal error handling
    }
    if (isMissingRelationError(e)) {
      return res.json({ success: false, schemaMissing: true, requiredSql: agendasRequiredSql() });
    }
    return res.status(500).json({ success: false, error: 'Gündemler yüklenemedi.' });
  }

  return res.json({
    success: true,
    data: Array.isArray(rows) ? rows : [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil((total || 0) / limitNum)),
    },
  });
}

async function adminCreateAgenda(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const title = String(body?.title || '').trim();
  if (title.length > 80) return res.status(400).json({ success: false, error: 'Başlık en fazla 80 karakter olmalı.' });
  if (!title) return res.status(400).json({ success: false, error: 'title zorunludur.' });

  const slugify = (input) => String(input || '').trim().toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 200);

  const ensureUniqueSlug = async (base, excludeId) => {
    const b0 = String(base || '').trim() || `gundem-${Date.now()}`;
    const base200 = b0.slice(0, 200);
    for (let i = 0; i < 50; i += 1) {
      const suffix = i === 0 ? '' : `-${i + 1}`;
      const maxBaseLen = 200 - suffix.length;
      const cand = `${base200.slice(0, Math.max(1, maxBaseLen))}${suffix}`.slice(0, 200);
      const params = { select: 'id', slug: `eq.${cand}`, limit: '1' };
      if (excludeId) params.id = `neq.${excludeId}`;
      // eslint-disable-next-line no-await-in-loop
      const existing = await supabaseRestGet('agendas', params).catch(() => []);
      if (!Array.isArray(existing) || existing.length === 0) return cand;
    }
    return `${base200.slice(0, 180)}-${Date.now()}`.slice(0, 200);
  };

  const nowIso = new Date().toISOString();
  const baseSlug = slugify(title);
  const slug = await ensureUniqueSlug(baseSlug, null);
  const payload = {
    title,
    slug,
    is_active: typeof body?.is_active === 'boolean' ? body.is_active : true,
    is_trending: typeof body?.is_trending === 'boolean' ? body.is_trending : true,
    trending_score: Number.isFinite(Number(body?.trending_score)) ? Number(body.trending_score) : 0,
    post_count: Number.isFinite(Number(body?.post_count)) ? Number(body.post_count) : 0,
    total_polit_score: Number.isFinite(Number(body?.total_polit_score)) ? Number(body.total_polit_score) : 0,
    created_at: nowIso,
    updated_at: nowIso,
  };
  if (Object.prototype.hasOwnProperty.call(body || {}, 'description')) {
    payload.description = body?.description ?? null;
  }

  try {
    let inserted = await supabaseRestInsert('agendas', [payload]);
    // If schema doesn't have optional columns (e.g. description), retry without them.
    if (!Array.isArray(inserted) || inserted.length === 0) {
      inserted = await supabaseRestInsert('agendas', [payload]).catch(() => []);
    }
    const row = Array.isArray(inserted) ? inserted?.[0] : null;
    if (!row) return res.status(500).json({ success: false, error: 'Gündem oluşturulamadı.' });
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('description') && Object.prototype.hasOwnProperty.call(payload, 'description')) {
      try {
        // eslint-disable-next-line no-unused-vars
        const { description, ...rest } = payload;
        const inserted = await supabaseRestInsert('agendas', [rest]).catch(() => []);
        const row = Array.isArray(inserted) ? inserted?.[0] : null;
        if (row) return res.status(201).json({ success: true, data: row });
      } catch {
        // ignore and fall through
      }
    }
    if (isMissingRelationError(e)) {
      return res.json({
        success: false,
        schemaMissing: true,
        requiredSql: `
-- Gündemler tablosu
create extension if not exists pgcrypto;

create table if not exists agendas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text null,
  post_count integer not null default 0,
  total_polit_score bigint not null default 0,
  trending_score bigint not null default 0,
  is_trending boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agendas_trending_score_idx on agendas (trending_score desc);
create index if not exists agendas_total_polit_score_idx on agendas (total_polit_score desc);
create index if not exists agendas_is_active_idx on agendas (is_active);
`.trim(),
      });
    }
    return res.status(500).json({ success: false, error: 'Gündem oluşturulamadı.' });
  }
}

async function adminUpdateAgenda(req, res, agendaId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (!isSafeId(agendaId)) return res.status(400).json({ success: false, error: 'Geçersiz gündem.' });
  const body = await readJsonBody(req);
  const allowed = {};
  // slug is auto-generated from title on save; never accept manual slug edits.
  const fields = ['title', 'description', 'trending_score', 'post_count', 'total_polit_score'];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f];
  }
  if (typeof body?.is_active === 'boolean') allowed.is_active = body.is_active;
  if (typeof body?.is_trending === 'boolean') allowed.is_trending = body.is_trending;
  allowed.updated_at = new Date().toISOString();
  if (Object.keys(allowed).length === 0) return res.status(400).json({ success: false, error: 'Geçersiz istek.' });

  // Normalize/validate to avoid silent DB constraint failures.
  const slugify = (input) => String(input || '').trim().toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
  const ensureUniqueSlug = async (base, excludeId) => {
    const b0 = String(base || '').trim() || `gundem-${Date.now()}`;
    const base200 = b0.slice(0, 200);
    for (let i = 0; i < 50; i += 1) {
      const suffix = i === 0 ? '' : `-${i + 1}`;
      const maxBaseLen = 200 - suffix.length;
      const cand = `${base200.slice(0, Math.max(1, maxBaseLen))}${suffix}`.slice(0, 200);
      const params = { select: 'id', slug: `eq.${cand}`, limit: '1' };
      if (excludeId) params.id = `neq.${excludeId}`;
      // eslint-disable-next-line no-await-in-loop
      const existing = await supabaseRestGet('agendas', params).catch(() => []);
      if (!Array.isArray(existing) || existing.length === 0) return cand;
    }
    return `${base200.slice(0, 180)}-${Date.now()}`.slice(0, 200);
  };
  if (Object.prototype.hasOwnProperty.call(allowed, 'title')) {
    const t = String(allowed.title || '').trim();
    if (!t) return res.status(400).json({ success: false, error: 'Başlık boş olamaz.' });
    if (t.length > 80) return res.status(400).json({ success: false, error: 'Başlık en fazla 80 karakter olmalı.' });
    allowed.title = t;
    // Always re-generate slug from title on save (URL-safe + unique).
    allowed.slug = await ensureUniqueSlug(slugify(t), String(agendaId));
  }

  try {
    let updated = await supabaseRestPatch('agendas', { id: `eq.${agendaId}` }, allowed);
    const row = Array.isArray(updated) ? updated?.[0] : null;
    if (!row) return res.status(500).json({ success: false, error: 'Gündem kaydedilemedi.' });
    return res.json({ success: true, data: row });
  } catch (e) {
    const msg = String(e?.message || '');
    // If optional column is missing in this deployment, retry without it.
    if (msg.includes('description') && Object.prototype.hasOwnProperty.call(allowed, 'description')) {
      try {
        const retry = { ...allowed };
        delete retry.description;
        const updated = await supabaseRestPatch('agendas', { id: `eq.${agendaId}` }, retry);
        const row = Array.isArray(updated) ? updated?.[0] : null;
        if (row) return res.json({ success: true, data: row });
      } catch {
        // ignore and fall through
      }
    }
    if (isMissingRelationError(e)) {
      return res.json({
        success: false,
        schemaMissing: true,
        requiredSql: `
-- Gündemler tablosu
create extension if not exists pgcrypto;

create table if not exists agendas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text null,
  post_count integer not null default 0,
  total_polit_score bigint not null default 0,
  trending_score bigint not null default 0,
  is_trending boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agendas_trending_score_idx on agendas (trending_score desc);
create index if not exists agendas_total_polit_score_idx on agendas (total_polit_score desc);
create index if not exists agendas_is_active_idx on agendas (is_active);
`.trim(),
      });
    }
    return res.status(500).json({ success: false, error: String(e?.message || 'Gündem kaydedilemedi.') });
  }
}

async function adminDeleteAgenda(req, res, agendaId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const updated = await supabaseRestPatch(
      'agendas',
      { id: `eq.${agendaId}` },
      { is_active: false, updated_at: new Date().toISOString() }
    ).catch(() => []);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    if (isMissingRelationError(e)) {
      return res.json({
        success: false,
        schemaMissing: true,
        requiredSql: `
-- Gündemler tablosu
create extension if not exists pgcrypto;

create table if not exists agendas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text null,
  post_count integer not null default 0,
  total_polit_score bigint not null default 0,
  trending_score bigint not null default 0,
  is_trending boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agendas_trending_score_idx on agendas (trending_score desc);
create index if not exists agendas_total_polit_score_idx on agendas (total_polit_score desc);
create index if not exists agendas_is_active_idx on agendas (is_active);
`.trim(),
      });
    }
    return res.status(500).json({ success: false, error: 'Gündem pasifleştirilemedi.' });
  }
}

function slugifyParty(input) {
  const s = String(input || '').trim().toLowerCase();
  const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };
  return s
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

async function adminGetParties(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { page = 1, limit = 20, search, is_active } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const params = {
    select: '*',
    order: 'name.asc',
    limit: String(limitNum),
    offset: String(offset),
  };
  if (is_active === 'true' || is_active === 'false') params.is_active = `eq.${is_active}`;
  if (search && String(search).trim()) {
    const q = String(search).trim();
    params.or = `(name.ilike.*${q}*,short_name.ilike.*${q}*,slug.ilike.*${q}*)`;
  }

  const countParams = { select: 'id' };
  if (params.is_active) countParams.is_active = params.is_active;
  if (params.or) countParams.or = params.or;

  const [total, rows] = await Promise.all([
    supabaseCount('parties', countParams).catch(() => 0),
    supabaseRestGet('parties', params).catch(() => []),
  ]);

  res.json({
    success: true,
    data: Array.isArray(rows) ? rows : [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  });
}

async function adminCreateParty(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const name = String(body?.name || '').trim();
  const short_name = String(body?.short_name || '').trim();
  if (!name || !short_name) return res.status(400).json({ success: false, error: 'name ve short_name zorunludur.' });

  const payload = {
    name,
    short_name,
    slug: String(body?.slug || '').trim() || slugifyParty(name),
    description: body?.description ?? null,
    logo_url: body?.logo_url ?? null,
    flag_url: body?.flag_url ?? null,
    color: body?.color ?? null,
    is_active: typeof body?.is_active === 'boolean' ? body.is_active : true,
    foundation_date: body?.foundation_date ?? null,
  };

  const inserted = await supabaseRestInsert('parties', payload);
  res.status(201).json({ success: true, data: inserted?.[0] || null });
}

async function adminUpdateParty(req, res, partyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const allowed = {};
  const fields = ['name', 'short_name', 'slug', 'description', 'logo_url', 'flag_url', 'color', 'foundation_date'];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f] ?? null;
  }
  if (typeof body?.is_active === 'boolean') allowed.is_active = body.is_active;
  if (Object.keys(allowed).length === 0) return res.status(400).json({ success: false, error: 'Geçersiz istek.' });

  if (typeof allowed.slug === 'string' && allowed.slug.trim()) {
    allowed.slug = slugifyParty(allowed.slug);
  }

  const updated = await supabaseRestPatch('parties', { id: `eq.${partyId}` }, allowed);
  res.json({ success: true, data: updated?.[0] || null });
}

async function adminDeleteParty(req, res, partyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const updated = await supabaseRestPatch('parties', { id: `eq.${partyId}` }, { is_active: false });
  res.json({ success: true, data: updated?.[0] || null });
}

async function adminFetchAllPartyUsers(partyId) {
  const pid = String(partyId || '').trim();
  if (!/^\d+$/.test(pid)) return [];
  const pageSize = 1000;
  const maxPages = 10;
  let out = [];
  for (let page = 0; page < maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const chunk = await supabaseRestGet('users', {
      select:
        'id,username,full_name,email,avatar_url,user_type,politician_type,province,district_name,party_id,is_active,is_verified,metadata,polit_score',
      party_id: `eq.${pid}`,
      order: 'polit_score.desc',
      limit: String(pageSize),
      offset: String(page * pageSize),
    }).catch(() => []);
    if (Array.isArray(chunk) && chunk.length > 0) out = out.concat(chunk);
    if (!Array.isArray(chunk) || chunk.length < pageSize) break;
  }
  return out;
}

function normalizeMeta(obj) {
  return obj && typeof obj === 'object' ? obj : {};
}

function collectPartyUnitAssignments(partyId, users) {
  const pid = Number(partyId);
  const out = [];
  for (const u of users || []) {
    const meta = normalizeMeta(u?.metadata);
    const list = Array.isArray(meta.party_units) ? meta.party_units : [];
    for (const unit of list) {
      if (!unit || Number(unit.party_id) !== pid) continue;
      out.push({
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        user_type: u.user_type,
        politician_type: u.politician_type,
        unit,
      });
    }
  }
  return out;
}

function groupBy(list, keyFn) {
  const m = new Map();
  (list || []).forEach((item) => {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  });
  return Array.from(m.entries());
}

async function adminGetPartyHierarchy(req, res, partyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const pid = String(partyId || '').trim();
  if (!/^\d+$/.test(pid)) return res.status(400).json({ success: false, error: 'Geçersiz parti.' });

  const partyRows = await supabaseRestGet('parties', { select: '*', id: `eq.${pid}`, limit: '1' }).catch(() => []);
  const party = partyRows?.[0] || null;
  if (!party) return res.status(404).json({ success: false, error: 'Parti bulunamadı.' });

  const users = await adminFetchAllPartyUsers(pid);

  const mps = (users || []).filter((u) => String(u.user_type) === 'mp');
  const officials = (users || []).filter((u) => String(u.user_type) === 'party_official');
  const members = (users || []).filter((u) => String(u.user_type) === 'party_member');

  const provincialChairs = officials.filter((u) => String(u.politician_type) === 'provincial_chair');
  const districtChairs = officials.filter((u) => String(u.politician_type) === 'district_chair');
  const metroMayors = officials.filter((u) => String(u.politician_type) === 'metropolitan_mayor');
  const districtMayors = officials.filter((u) => String(u.politician_type) === 'district_mayor');
  const orgOfficials = officials.filter((u) => String(u.politician_type) === 'party_official');

  const counts = {
    total_users: users.length,
    mps: mps.length,
    party_officials: officials.length,
    party_members: members.length,
    provincial_chairs: provincialChairs.length,
    district_chairs: districtChairs.length,
    metropolitan_mayors: metroMayors.length,
    district_mayors: districtMayors.length,
  };

  const assignments = collectPartyUnitAssignments(pid, users);

  res.json({
    success: true,
    data: {
      party,
      counts,
      users: {
        mps,
        officials,
        members,
      },
      groups: {
        provincial_chairs_by_province: groupBy(provincialChairs, (u) => String(u.province || 'Bilinmiyor')),
        district_chairs_by_province: groupBy(districtChairs, (u) => String(u.province || 'Bilinmiyor')),
        district_mayors_by_province: groupBy(districtMayors, (u) => String(u.province || 'Bilinmiyor')),
        metro_mayors_by_province: groupBy(metroMayors, (u) => String(u.province || 'Bilinmiyor')),
        org_officials_by_province: groupBy(orgOfficials, (u) => String(u.province || 'Bilinmiyor')),
      },
      assignments,
    },
  });
}

async function adminAssignPartyUnit(req, res, partyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const pid = String(partyId || '').trim();
  if (!/^\d+$/.test(pid)) return res.status(400).json({ success: false, error: 'Geçersiz parti.' });

  const body = await readJsonBody(req);
  const targetUserId = String(body?.user_id || '').trim();
  const unit = body?.unit && typeof body.unit === 'object' ? body.unit : null;
  if (!/^\d+$/.test(targetUserId)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  if (!unit) return res.status(400).json({ success: false, error: 'unit zorunlu.' });

  const unitType = String(unit.unit_type || '').trim();
  if (!unitType) return res.status(400).json({ success: false, error: 'unit_type zorunlu.' });

  const province = unit.province ? String(unit.province).slice(0, 100) : null;
  const district = unit.district_name ? String(unit.district_name).slice(0, 100) : null;
  const title = unit.title ? String(unit.title).slice(0, 120) : null;

  const contact = unit.contact && typeof unit.contact === 'object' ? unit.contact : {};
  const cleanContact = {
    phone: contact.phone ? String(contact.phone).slice(0, 30) : null,
    whatsapp: contact.whatsapp ? String(contact.whatsapp).slice(0, 40) : null,
    email: contact.email ? String(contact.email).slice(0, 255) : null,
    website: contact.website ? String(contact.website).slice(0, 255) : null,
    twitter: contact.twitter ? String(contact.twitter).slice(0, 120) : null,
    instagram: contact.instagram ? String(contact.instagram).slice(0, 120) : null,
  };

  const rows = await supabaseRestGet('users', { select: 'id,party_id,metadata', id: `eq.${targetUserId}`, limit: '1' }).catch(() => []);
  const u = rows?.[0] || null;
  if (!u) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  if (String(u.party_id || '') !== String(pid)) {
    return res.status(400).json({ success: false, error: 'Bu kullanıcı seçili partiye bağlı değil.' });
  }

  const meta = normalizeMeta(u.metadata);
  const list = Array.isArray(meta.party_units) ? meta.party_units : [];

  const key = `${pid}:${unitType}:${province || ''}:${district || ''}`;
  const nextUnit = {
    party_id: Number(pid),
    unit_type: unitType,
    province,
    district_name: district,
    title,
    contact: cleanContact,
    key,
    updated_at: new Date().toISOString(),
  };

  // Replace existing assignment with same key for that user (idempotent)
  const kept = list.filter((x) => !(x && String(x.key || '') === key));
  const nextMeta = { ...meta, party_units: [...kept, nextUnit] };

  let updated;
  try {
    updated = await supabaseRestPatch('users', { id: `eq.${targetUserId}` }, { metadata: nextMeta }).catch(() => []);
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('metadata')) {
      return res.status(500).json({
        success: false,
        error:
          "Atama kaydedilemedi: Supabase'de `users` tablosunda `metadata` sütunu yok. Çözüm: `server/migrations/006_add_user_metadata.sql` dosyasını Supabase SQL Editor'da çalıştırın.",
      });
    }
    throw e;
  }

  res.json({ success: true, data: updated?.[0] || null });
}

async function adminUnassignPartyUnit(req, res, partyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const pid = String(partyId || '').trim();
  if (!/^\d+$/.test(pid)) return res.status(400).json({ success: false, error: 'Geçersiz parti.' });

  const body = await readJsonBody(req);
  const targetUserId = String(body?.user_id || '').trim();
  const key = String(body?.key || '').trim();
  if (!/^\d+$/.test(targetUserId)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  if (!key) return res.status(400).json({ success: false, error: 'key zorunlu.' });

  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${targetUserId}`, limit: '1' }).catch(() => []);
  const u = rows?.[0] || null;
  if (!u) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });

  const meta = normalizeMeta(u.metadata);
  const list = Array.isArray(meta.party_units) ? meta.party_units : [];
  const next = list.filter((x) => !(x && String(x.key || '') === key));
  const nextMeta = { ...meta, party_units: next };

  let updated;
  try {
    updated = await supabaseRestPatch('users', { id: `eq.${targetUserId}` }, { metadata: nextMeta }).catch(() => []);
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('metadata')) {
      return res.status(500).json({
        success: false,
        error:
          "Atama kaldırılamadı: Supabase'de `users` tablosunda `metadata` sütunu yok. Çözüm: `server/migrations/006_add_user_metadata.sql` dosyasını Supabase SQL Editor'da çalıştırın.",
      });
    }
    throw e;
  }
  res.json({ success: true, data: updated?.[0] || null });
}

async function adminSetPartyChair(req, res, partyId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const pid = String(partyId || '').trim();
  if (!/^\d+$/.test(pid)) return res.status(400).json({ success: false, error: 'Geçersiz parti.' });

  const body = await readJsonBody(req);
  const targetUserId = String(body?.user_id || '').trim();
  if (!/^\d+$/.test(targetUserId)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  // Ensure target belongs to party
  const uRows = await supabaseRestGet('users', { select: 'id,party_id,is_active', id: `eq.${targetUserId}`, limit: '1' }).catch(() => []);
  const u = uRows?.[0] || null;
  if (!u) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
  if (u?.is_active === false) return res.status(400).json({ success: false, error: 'Bu kullanıcı aktif değil.' });
  if (String(u?.party_id || '') !== String(pid)) return res.status(400).json({ success: false, error: 'Bu kullanıcı seçili partiye bağlı değil.' });

  // Clear previous chairs in same party (best-effort; schema may vary)
  try {
    await supabaseRestPatch(
      'users',
      { party_id: `eq.${pid}`, politician_type: 'eq.party_chair' },
      { politician_type: null }
    ).catch(() => []);
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('politician_type')) {
      return res.status(500).json({
        success: false,
        error: "Bu ortamda `politician_type` alanı yok. Parti başkanı atanamıyor.",
      });
    }
    // ignore
  }

  // Set the new chair
  try {
    const updated = await supabaseRestPatch('users', { id: `eq.${targetUserId}` }, { politician_type: 'party_chair' }).catch(() => []);
    return res.json({ success: true, data: updated?.[0] || null });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('politician_type')) {
      return res.status(500).json({
        success: false,
        error: "Bu ortamda `politician_type` alanı yok. Parti başkanı atanamıyor.",
      });
    }
    throw e;
  }
}

async function authCheckAvailability(req, res) {
    const { email } = req.query;
    const result = { emailAvailable: true };
    if (email) {
      const rows = await supabaseRestGet('users', { select: 'id', email: `eq.${email}`, limit: '1' }).catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) result.emailAvailable = false;
    }
    res.json({ success: true, ...result });
}

async function authLogin(req, res) {
    const body = await readJsonBody(req);
    const { identifier, email, password } = body;
    const loginValue = (identifier || email || '').trim();
    if (!loginValue || !password) return res.status(400).json({ success: false, error: 'Bilgiler eksik.' });

    // Rate limit login attempts (best-effort, per serverless instance)
    const ip = getClientIp(req);
    const rl = rateLimit(`login:${ip}:${String(loginValue).toLowerCase()}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) return res.status(429).json({ success: false, error: 'Çok fazla giriş denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });

    let users = await supabaseRestGet('users', { 
      select: '*',
      or: `(email.eq.${loginValue},username.eq.${loginValue})`,
      limit: '1'
    }).catch(() => []);

    // Retry with normalized value to support case-insensitive login for usernames/emails
    if (!Array.isArray(users) || !users[0]) {
      const lowered = String(loginValue).toLowerCase();
      users = await supabaseRestGet('users', {
        select: '*',
        or: `(email.eq.${lowered},username.eq.${lowered})`,
        limit: '1',
      }).catch(() => []);
    }

    const user = (Array.isArray(users) && users[0]) ? users[0] : null;
    if (!user) return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    
    if (!user.password_hash) return res.status(401).json({ success: false, error: 'Şifre hatalı.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Şifre hatalı.' });

    // Block login for inactive accounts (deactivated, claim-pending, etc.)
    if (user?.is_active === false) {
      return res.status(403).json({ success: false, error: 'Bu hesap aktif değil.' });
    }

    // Claim flow: allow login (read-only), block posting/uploading elsewhere.
    let claimPending = false;
    try {
      const meta = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
      const cr = meta?.claim_request && typeof meta.claim_request === 'object' ? meta.claim_request : null;
      const status = cr ? String(cr.status || '') : '';
      if (status === 'pending') claimPending = true;
    } catch {
      claimPending = false;
    }
    
    // Email/SMS verification gate (optional, admin-controlled via site_settings unless env overrides)
    const settingsMap = await getSiteSettingsMapCached().catch(() => ({}));
    const envEmailGate = String(process.env.EMAIL_VERIFICATION_ENABLED || '').trim();
    const emailVerificationRequired =
      envEmailGate ? envEmailGate === 'true' : String(settingsMap?.email_verification_enabled || 'false').trim() === 'true';
    const verificationChannel = String(settingsMap?.verification_channel || 'email').trim().toLowerCase() || 'email';
    if (emailVerificationRequired) {
      const meta = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
      const verified = user?.email_verified === true || meta?.email_verified === true;
      if (verificationChannel === 'sms') {
        // SMS verification is not implemented without a provider; keep error explicit.
        return res.status(503).json({
          success: false,
          error: 'SMS doğrulama aktif ancak SMS provider yapılandırılmadı.',
          code: 'SMS_NOT_CONFIGURED',
        });
      }
      // NEW PRODUCT RULE:
      // - Unverified users can login and browse
      // - but they must not interact (like/comment/follow/post/message) and should be guided to verify
      // So, do NOT block login here.
      if (!verified) {
        try {
          // Ensure they see "verify your email" notification instead of profile reminder.
          const existing = await supabaseRestGet('notifications', {
            select: 'id,type',
            user_id: `eq.${user.id}`,
            type: 'in.(email_verification_required,profile_reminder)',
            limit: '20',
          }).catch(() => []);
          const hasVerify = Array.isArray(existing) && existing.some((n) => String(n?.type || '') === 'email_verification_required');
          const profileNotifs = Array.isArray(existing) ? existing.filter((n) => String(n?.type || '') === 'profile_reminder') : [];
          if (profileNotifs.length > 0) {
            // best-effort cleanup: do not show profile reminder before email verification
            await supabaseRestDelete('notifications', { user_id: `eq.${user.id}`, type: 'eq.profile_reminder' }).catch(() => null);
          }
          if (!hasVerify) {
            await supabaseInsertNotifications([
              {
                user_id: user.id,
                actor_id: null,
                type: 'email_verification_required',
                title: 'E-posta adresinizi aktif edin',
                message: 'Hesabınızı kullanmak için e-posta doğrulaması gerekiyor. Gelen kutusu yanında spam/junk klasörünü de kontrol edin.',
                is_read: false,
              },
            ]).catch(() => null);
          }
        } catch {
          // ignore (best-effort)
        }
      }
    }

    // Approval pending: allow login, but ensure user sees a notification.
    try {
      const ut = String(user?.user_type || 'citizen');
      const pending = !user?.is_admin && ut !== 'citizen' && !user?.is_verified;
      if (pending) {
        const existing = await supabaseRestGet('notifications', {
          select: 'id',
          user_id: `eq.${user.id}`,
          type: 'eq.approval',
          limit: '1',
        }).catch(() => []);
        if (!Array.isArray(existing) || existing.length === 0) {
          await supabaseRestInsert('notifications', [
            {
              user_id: user.id,
              type: 'approval',
              title: 'Üyelik onayı bekleniyor',
              message: 'Başvurunuz alındı. Admin onayı gelene kadar Polit Atamazsınız; ancak uygulamayı gezebilirsiniz.',
              is_read: false,
            },
          ]).catch(async (err) => {
            const msg = String(err?.message || '');
            if (msg.includes('title') || msg.includes('message')) {
              await supabaseRestInsert('notifications', [{ user_id: user.id, type: 'approval', is_read: false }]).catch(() => {});
            }
          });
          sendNotificationEmail(req, { userId: user.id, type: 'approval' }).catch(() => null);
        }
      }
    } catch {
      // notification is best-effort; do not block login
    }

    const token = signJwt({ id: user.id, username: user.username, email: user.email, is_admin: !!user.is_admin });
    delete user.password_hash;

    // Real admin security audit (best-effort; never blocks login)
    try {
      if (user?.is_admin === true) {
        const ua = getUserAgent(req);
        const deviceKey = makeDeviceKey(user.id, ua);
        await adminLogSecurityEvent({
          user_id: user.id,
          event_type: 'login',
          ip,
          user_agent: ua,
          metadata: { via: 'password' },
        });
        await adminUpsertTrustedDevice({ user_id: user.id, device_key: deviceKey, ip, user_agent: ua });
      }
    } catch {
      // ignore
    }
    
    // Add a hint so the UI can gracefully block interactions client-side too.
    const meta = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const emailVerified = user?.email_verified === true || meta?.email_verified === true;
    res.json({ success: true, message: 'Giriş başarılı.', data: { user, token, claimPending, emailVerified } });
}

async function authForgotPassword(req, res) {
    const ip = getClientIp(req);
    const body = await readJsonBody(req);
    const emailRaw = String(body?.email || '').trim();
    const emailLower = emailRaw ? emailRaw.toLowerCase() : '';

    // Layered rate limits (best-effort, per serverless instance)
    // - IP burst: limit total attempts from the same IP
    // - IP+email burst: limit repeated targeting of a specific email from the same IP (3 per hour)
    // - Email sustained: limit total attempts for the same email across IPs (best-effort)
    const rlIp = rateLimit(`forgot:ip:${ip}`, { windowMs: 60_000, max: 5 });
    const rlEmail = emailLower ? rateLimit(`forgot:email:${emailLower}`, { windowMs: 15 * 60_000, max: 5 }) : { ok: true };
    const rlIpEmail = emailLower ? rateLimit(`forgot:ip_email:${ip}:${emailLower}`, { windowMs: 60 * 60_000, max: 3 }) : { ok: true };
    if (!rlIp.ok || !rlEmail.ok || !rlIpEmail.ok) {
      return res.status(429).json({ success: false, error: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.' });
    }

    if (!emailRaw) return res.status(400).json({ success: false, error: 'E-posta adresi gerekli.' });

    try {
      const email = emailLower;
      const rows = await supabaseRestGet('users', { select: 'id,email,metadata', email: `eq.${email}`, limit: '1' }).catch(() => []);
      const u = rows?.[0] || null;
      if (!u?.id || !u?.email) {
        return res.status(404).json({ success: false, error: 'Bu e-posta adresi sistemde kayıtlı değil.' });
      }

      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3h
      const expiresIso = expiresAt.toISOString();

      // Try DB columns first (if present), else fallback to users.metadata.
      let stored = false;
      try {
        await supabaseRestPatch(
          'users',
          { id: `eq.${u.id}` },
          { password_reset_token: token, password_reset_expires: expiresIso }
        );
        stored = true;
      } catch (e) {
        const msg = String(e?.message || '');
        // Fallback to metadata if columns don't exist.
        if (msg.toLowerCase().includes('password_reset')) {
          const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
          const nextMeta = {
            ...meta,
            password_reset_token_hash: sha256Hex(token),
            password_reset_expires_at: expiresIso,
          };
          await safeUserPatch(u.id, { metadata: nextMeta }).catch(() => null);
          stored = true;
        }
      }

      if (stored) {
        const appUrl = getPublicAppUrl(req);
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
        const subject = 'Polithane – Şifre Sıfırlama';
        const userName = u.full_name || u.username || '';
        const text =
          `Sayın ${userName || 'Değerli Kullanıcımız'},\n\n` +
          `Polithane hesabınız için şifre sıfırlama talebi aldık.\n\n` +
          `Şifrenizi sıfırlamak için 3 saat içinde şu bağlantıya tıklayın:\n${resetUrl}\n\n` +
          `Bu bağlantı 3 saat sonra geçersiz olacaktır.\n\n` +
          `Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\nPolithane Ekibi`;
        const html = emailLayout({
          title: '🔒 Şifre Sıfırlama Talebi',
          userName,
          bodyHtml: `
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
              Polithane hesabınız için <strong>şifre sıfırlama talebi</strong> aldık. Şifrenizi değiştirmek için aşağıdaki butona tıklayarak işleminize devam edebilirsiniz.
            </p>
            <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;margin:20px 0;border-radius:8px;">
              <p style="margin:0;font-size:14px;color:#991b1b;">
                <strong>⚠️ Önemli:</strong> Bu bağlantı güvenliğiniz için <strong>sadece 3 saat</strong> geçerlidir.
              </p>
            </div>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#009fd6,#0077b6);color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(0,159,214,0.3);">
                🔐 Şifremi Sıfırla
              </a>
            </div>
            <div style="background:#f0f9ff;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 12px 0;font-size:14px;color:#1e3a8a;"><strong>🛡️ Güvenlik İpuçları:</strong></p>
              <ul style="margin:0;padding-left:20px;font-size:14px;color:#1e40af;line-height:1.8;">
                <li>En az 8 karakter uzunluğunda bir şifre seçin</li>
                <li>Harf ve rakam kombinasyonu kullanın</li>
                <li>Kolay tahmin edilebilecek şifrelerden kaçının</li>
              </ul>
            </div>
            <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;margin:24px 0;border-radius:8px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>📋 Not:</strong> Bu talebi siz yapmadıysanız, hesap güvenliğiniz için şifrenizi değiştirmenizi ve bu e-postayı yok saymanızı öneririz.
              </p>
            </div>
            <p style="font-size:13px;color:#6b7280;margin:20px 0 0 0;">
              <strong>Link çalışmıyor mu?</strong> Aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırabilirsiniz:<br>
              <span style="color:#009fd6;word-break:break-all;font-size:12px;">${resetUrl}</span>
            </p>
          `,
        });
        const rendered = await renderEmailTemplate(req, {
          type: 'password_reset',
          vars: { reset_link: resetUrl, app_url: appUrl, full_name: userName },
          fallbackSubject: subject,
          fallbackHtml: html,
          fallbackText: text,
        }).catch(() => null);
        // STRICT for membership flows: if template is broken, retry once with fallback.
        try {
          await sendEmail({ to: u.email, subject: rendered?.subject || subject, html: rendered?.html || html, text });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('authForgotPassword: template send failed, retrying fallback:', String(e?.message || e || 'mail send failed'));
          await sendEmail({ to: u.email, subject, html, text });
        }
      }
      return res.json({ success: true, message: 'Şifre sıfırlama bağlantısı gönderildi.' });
    } catch (e) {
      return res.status(503).json({
        success: false,
        error: 'İşlem şu an tamamlanamadı. Lütfen tekrar deneyin.',
        code: 'MAIL_SEND_FAILED',
        debug: String(e?.message || 'mail send failed').slice(0, 900),
      });
    }
}

async function authResetPassword(req, res) {
  const body = await readJsonBody(req);
  const token = String(body?.token || '').trim();
  const newPassword = String(body?.newPassword || '').trim();
  if (!token || !newPassword) return res.status(400).json({ success: false, error: 'Eksik bilgi.' });

  // Password rules aligned with other flows
  if (newPassword.length < 8) return res.status(400).json({ success: false, error: 'Yeni şifre en az 8 karakter olmalı.' });
  if (newPassword.length > 50) return res.status(400).json({ success: false, error: 'Yeni şifre en fazla 50 karakter olabilir.' });
  if (!/[a-zA-Z]/.test(newPassword)) return res.status(400).json({ success: false, error: 'Yeni şifre en az 1 harf içermeli.' });
  if (!/[0-9]/.test(newPassword)) return res.status(400).json({ success: false, error: 'Yeni şifre en az 1 rakam içermeli.' });

  const password_hash = await bcrypt.hash(newPassword, 10);

  // Try schema with password_reset_token/password_reset_expires columns.
  try {
    const rows = await supabaseRestGet('users', {
      select: 'id,password_reset_expires',
      password_reset_token: `eq.${token}`,
      limit: '1',
    });
    const u = rows?.[0] || null;
    if (u?.id) {
      const exp = u.password_reset_expires ? new Date(u.password_reset_expires) : null;
      if (exp && Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş link.' });
      }
      await supabaseRestPatch(
        'users',
        { id: `eq.${u.id}` },
        { password_hash, password_reset_token: null, password_reset_expires: null }
      );
      return res.json({ success: true, message: 'Şifreniz sıfırlandı.' });
    }
  } catch (e) {
    // fall through to metadata-based reset
  }

  // Metadata fallback: users.metadata.password_reset_token_hash + password_reset_expires_at
  const tokenHash = sha256Hex(token);
  const rows = await supabaseRestGet('users', {
    select: 'id,metadata',
    'metadata->>password_reset_token_hash': `eq.${tokenHash}`,
    limit: '1',
  }).catch(() => []);
  const u = rows?.[0] || null;
  if (!u?.id) return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş link.' });

  const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
  const exp = meta.password_reset_expires_at ? new Date(meta.password_reset_expires_at) : null;
  if (!exp || !Number.isFinite(exp.getTime()) || exp.getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş link.' });
  }
  const nextMeta = { ...meta, password_reset_token_hash: null, password_reset_expires_at: null };
  const updated = await safeUserPatch(u.id, { password_hash, metadata: nextMeta }).catch(() => []);
  if (!updated || updated.length === 0) {
    return res.status(500).json({ success: false, error: 'Şifre sıfırlanamadı (veritabanı şeması uyumsuz olabilir).' });
  }
  return res.json({ success: true, message: 'Şifreniz sıfırlandı.' });
}

async function authVerifyEmail(req, res) {
  const token = String(req.query?.token || '').trim();
  if (!token) return res.status(400).json({ success: false, error: 'Token eksik.' });
  const tokenHash = sha256Hex(token);

  // Try metadata-based storage
  const rows = await supabaseRestGet('users', {
    select: 'id,email,full_name,metadata,email_verified',
    'metadata->>email_verification_token_hash': `eq.${tokenHash}`,
    limit: '1',
  }).catch(() => []);
  const u = rows?.[0] || null;
  if (!u?.id) return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş link.' });
  const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
  const exp = meta.email_verification_expires_at ? new Date(meta.email_verification_expires_at) : null;
  if (!exp || !Number.isFinite(exp.getTime()) || exp.getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Doğrulama linkinin süresi dolmuş.' });
  }
  const nextMeta = {
    ...meta,
    email_verified: true,
    email_verification_token_hash: null,
    email_verification_expires_at: null,
    email_verified_at: new Date().toISOString(),
  };
  await safeUserPatch(u.id, { metadata: nextMeta, email_verified: true }).catch(() => null);

  // After verification:
  // - remove "verify email" notification
  // - add "profile reminder" notification (so onboarding continues)
  try {
    await supabaseRestDelete('notifications', { user_id: `eq.${u.id}`, type: 'eq.email_verification_required' }).catch(() => null);
    // After verification, keep onboarding focused: remove welcome notification (user can still access /welcome anytime).
    await supabaseRestDelete('notifications', { user_id: `eq.${u.id}`, type: 'eq.welcome' }).catch(() => null);
    const existing = await supabaseRestGet('notifications', {
      select: 'id',
      user_id: `eq.${u.id}`,
      type: 'eq.profile_reminder',
      limit: '1',
    }).catch(() => []);
    if (!Array.isArray(existing) || existing.length === 0) {
      await supabaseInsertNotifications([
        {
          user_id: u.id,
          actor_id: null,
          type: 'profile_reminder',
          title: 'Profilinizi tamamlayın',
          message: 'Eksik profil bilgilerinizi doldurmanızı rica ederiz. Bu, doğrulama ve görünürlük açısından önemlidir.',
          is_read: false,
        },
      ]).catch(() => null);
    }
  } catch {
    // ignore
  }

  await sendWelcomeEmailToUser(req, { toEmail: u.email, fullName: u.full_name }).catch(() => null);
  return res.json({ success: true, message: 'E-posta doğrulandı.' });
}

async function authResendVerification(req, res) {
  const body = await readJsonBody(req);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, error: 'Email gerekli.' });
  const rows = await supabaseRestGet('users', { select: 'id,email,full_name,metadata,email_verified,is_active', email: `eq.${email}`, limit: '1' }).catch(() => []);
  const u = rows?.[0] || null;
  if (!u?.id) return res.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderilecektir.' });
  if (u?.is_active === false) return res.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa, doğrulama bağlantısı gönderilecektir.' });
  const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
  const verified = u?.email_verified === true || meta?.email_verified === true;
  if (verified) return res.json({ success: true, message: 'E-posta zaten doğrulanmış.' });

  const tokenRaw = crypto.randomBytes(32).toString('base64url');
  const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nextMeta = {
    ...meta,
    email_verification_token_hash: sha256Hex(tokenRaw),
    email_verification_expires_at: expiresIso,
    email_verified: false,
  };
  await safeUserPatch(u.id, { metadata: nextMeta, email_verified: false }).catch(() => null);
  try {
    await sendVerificationEmailForUser(req, { toEmail: u.email, token: tokenRaw, fullName: u.full_name || '' });
    return res.json({ success: true, message: 'Doğrulama e-postası gönderildi.' });
  } catch (e) {
    return res.status(503).json({
      success: false,
      error: 'İşlem şu an tamamlanamadı. Lütfen tekrar deneyin.',
      code: 'MAIL_SEND_FAILED',
      debug: String(e?.message || 'mail send failed').slice(0, 900),
    });
  }
}

async function authRegister(req, res) {
  try {
    const body = await readJsonBody(req);
    const { email, password, full_name, user_type = 'citizen', province, district, party_id, politician_type, metadata = {}, document, is_claim, claim_user_id } = body;
    
    if (!email || !password || !full_name) return res.status(400).json({ success: false, error: 'Eksik bilgi.' });

    // Rate limit registrations (best-effort, per serverless instance)
    const ip = getClientIp(req);
    const rl = rateLimit(`register:${ip}:${String(email).toLowerCase()}`, { windowMs: 60_000, max: 5 });
    if (!rl.ok) return res.status(429).json({ success: false, error: 'Çok fazla kayıt denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });

    // Server-side email validation (avoid DB checks for invalid emails)
    const emailStr = String(email).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasTurkish = /[çğıöşüİÇĞÖŞÜ]/.test(emailStr);
    if (!emailRegex.test(emailStr) || hasTurkish) {
      return res.status(400).json({ success: false, error: 'Geçerli bir email adresi giriniz.' });
    }

    // Server-side password validation (must be enforced here, not only on UI)
    const pwErr = validatePasswordForAuth(password);
    if (pwErr) return res.status(400).json({ success: false, error: pwErr });
    
    const emailLower = emailStr.toLowerCase();
    const emailCheck = await supabaseRestGet('users', { select: 'id', email: `eq.${emailLower}`, limit: '1' });
    if (emailCheck.length > 0) return res.status(400).json({ success: false, error: 'Email kayıtlı.' });

    const local = emailLower.split('@')[0] || '';
    let username = normalizeUsernameCandidate(local);
    if (!username) username = normalizeUsernameCandidate(`user_${Date.now()}`) || `user_${Date.now()}`;
    const checkUser = async (u) => (await supabaseRestGet('users', { select: 'id', username: `eq.${u}`, limit: '1' })).length > 0;

    // Never allow reserved usernames (route/security).
    if (isReservedUsername(username)) {
      username = normalizeUsernameCandidate(`user_${Date.now()}`) || `user_${Date.now()}`;
    }

    // Ensure uniqueness (keep stable/padded shape where possible)
    if (await checkUser(username)) {
      const base = username.slice(0, 15);
      for (let i = 0; i < 10; i += 1) {
        const suffix = String(Math.floor(Math.random() * 10000)).padStart(2, '0');
        const cand = normalizeUsernameCandidate(`${base}_${suffix}`).slice(0, 20);
        if (isReservedUsername(cand)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (!(await checkUser(cand))) {
          username = cand;
          break;
        }
      }
    }

    if (document && document.content) {
        try {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            const buffer = Buffer.from(document.content.split(',')[1], 'base64');
            const fileName = `doc_${Date.now()}_${Math.random().toString(36).substr(7)}.pdf`;
            const { error } = await supabase.storage.from('uploads').upload(`documents/${fileName}`, buffer, { contentType: document.type || 'application/pdf' });
            if (!error) {
                const { data } = supabase.storage.from('uploads').getPublicUrl(`documents/${fileName}`);
                metadata.document_path = data.publicUrl;
                metadata.document_original_name = document.name;
            }
        } catch (e) { console.error('Upload error', e); }
    }

    const isClaim = String(is_claim || '') === 'true' && !!claim_user_id;
    const claimTargetId = isClaim ? String(claim_user_id || '').trim() : '';
    if (isClaim) {
      const isValidId = /^\d+$/.test(claimTargetId) || /^[0-9a-fA-F-]{36}$/.test(claimTargetId);
      if (!isValidId) return res.status(400).json({ success: false, error: 'Geçersiz claim_user_id.' });
      metadata.claim_request = {
        target_user_id: claimTargetId,
        status: 'pending',
        requested_at: new Date().toISOString(),
      };
    }

    const password_hash = await bcrypt.hash(password, 10);
    // Email/SMS verification gate (optional, admin-controlled via site_settings unless env overrides)
    const settingsMap = await getSiteSettingsMapCached().catch(() => ({}));
    const envEmailGate = String(process.env.EMAIL_VERIFICATION_ENABLED || '').trim();
    const emailVerificationRequired =
      envEmailGate ? envEmailGate === 'true' : String(settingsMap?.email_verification_enabled || 'false').trim() === 'true';
    const verificationChannel = String(settingsMap?.verification_channel || 'email').trim().toLowerCase() || 'email';

    if (emailVerificationRequired && verificationChannel === 'sms') {
      return res.status(503).json({
        success: false,
        error: 'SMS doğrulama aktif ancak SMS provider yapılandırılmadı.',
        code: 'SMS_NOT_CONFIGURED',
      });
    }
    const cleanEmpty = (v) => (v === '' ? null : v);
    const userData = {
        username,
        email: emailLower,
        password_hash,
        full_name,
        user_type,
        province: cleanEmpty(province),
        district_name: cleanEmpty(district),
        party_id: cleanEmpty(party_id),
        politician_type: cleanEmpty(politician_type),
        // Verified is reserved for admin approval (non-citizen account types).
        // Citizens don't display a verified badge in UI anyway, but keep this false to avoid confusion.
        is_verified: false,
        // Claim registrations can login (online) but cannot post until approved.
        is_active: true,
        email_verified: emailVerificationRequired ? false : true,
        is_admin: false
    };

    // Insert (schema may vary: metadata / district_name / politician_type can be missing)
    let user;
    try {
        const inserted = await supabaseRestInsert('users', [{ ...userData, metadata }]);
        user = inserted[0];
    } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('metadata')) {
          console.warn('Metadata column missing, retrying without metadata');
          const inserted = await supabaseRestInsert('users', [{ ...userData }]);
          user = inserted[0];
        } else if (msg.includes('district_name') || msg.includes('politician_type')) {
          console.warn('Optional columns missing, retrying with minimal payload');
          const minimal = {
            username,
            email,
            password_hash,
            full_name,
            user_type,
            province: cleanEmpty(province),
            party_id: cleanEmpty(party_id),
            is_verified: false,
            is_active: true,
            email_verified: true,
            is_admin: false
          };
          const inserted = await supabaseRestInsert('users', [{ ...minimal, metadata }]).catch(async (err2) => {
            const msg2 = String(err2?.message || '');
            if (msg2.includes('metadata')) return await supabaseRestInsert('users', [{ ...minimal }]);
            throw err2;
          });
          user = inserted[0];
        } else {
          throw e;
        }
    }

    if (!user) throw new Error('Kullanıcı oluşturulamadı.');
    if (user && Object.prototype.hasOwnProperty.call(user, 'password_hash')) {
      try {
        delete user.password_hash;
      } catch {
        // ignore
      }
    }

    // First-login notifications (schema-agnostic insert helper)
    // First-login notifications
    // Product rule:
    // - If email verification is required: show welcome + "verify email" (NOT profile reminder yet)
    // - After verification: show profile reminder (handled in verify endpoint)
    await supabaseInsertNotifications(
      [
        {
          user_id: user.id,
          actor_id: null,
          type: 'welcome',
          title: 'Hoş geldiniz',
          message:
            'Polithane ailesine katıldığınız için çok mutluyuz. Kısa bir turla başlayalım: amacımız, misyonumuz ve vizyonumuz burada.',
          is_read: false,
        },
        emailVerificationRequired
          ? {
              user_id: user.id,
              actor_id: null,
              type: 'email_verification_required',
              title: 'E-posta adresinizi aktif edin',
              message:
                'Hesabınızı kullanmak için e-posta doğrulaması gerekiyor. Gelen kutusu yanında spam/junk klasörünü de kontrol edin.',
              is_read: false,
            }
          : {
              user_id: user.id,
              actor_id: null,
              type: 'profile_reminder',
              title: 'Profilinizi tamamlayın',
              message:
                'Eksik profil bilgilerinizi doldurmanızı rica ederiz. Bu, doğrulama ve görünürlük açısından önemlidir.',
              is_read: false,
            },
      ].filter(Boolean)
    ).catch(() => null);

    // Approval notification for non-citizen accounts (they can login, but cannot post until approved).
    if (user_type !== 'citizen') {
      await supabaseRestInsert('notifications', [
        {
          user_id: user.id,
          type: 'approval',
          title: 'Üyelik onayı bekleniyor',
          message: 'Başvurunuz alındı. Admin onayı gelene kadar Polit Atamazsınız; ancak uygulamayı gezebilirsiniz.',
          is_read: false,
        },
      ]).catch(async (err) => {
        const msg = String(err?.message || '');
        if (msg.includes('title') || msg.includes('message')) {
          await supabaseRestInsert('notifications', [{ user_id: user.id, type: 'approval', is_read: false }]).catch(() => {});
        }
      });
      // Email too (best-effort) so the user knows their request is pending.
      sendNotificationEmail(req, { userId: user.id, type: 'approval' }).catch(() => null);
    }

    // Claim registrations always require manual admin review.
    const requiresApproval = user_type !== 'citizen' || isClaim;
    if (isClaim) {
      // Also send email verification when enabled (claim users should still verify their email).
      if (emailVerificationRequired) {
        try {
          const tokenRaw = crypto.randomBytes(32).toString('base64url');
          const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
          const baseMeta = user?.metadata && typeof user.metadata === 'object' ? user.metadata : (metadata && typeof metadata === 'object' ? metadata : {});
          const nextMeta = {
            ...baseMeta,
            email_verification_token_hash: sha256Hex(tokenRaw),
            email_verification_expires_at: expiresIso,
            email_verified: false,
          };
          await safeUserPatch(user.id, { metadata: nextMeta, email_verified: false }).catch(() => null);
          await sendVerificationEmailForUser(req, { toEmail: user.email, token: tokenRaw, fullName: user.full_name || '' });
        } catch {
          // ignore
        }
      }
      const token = signJwt({ id: user.id, username: user.username, email: user.email, user_type: user.user_type, is_admin: !!user.is_admin });
      return res.status(201).json({
        success: true,
        message: 'Profil sahiplenme başvurunuz alındı. Admin incelemesi sonrası bilgilendirileceksiniz.',
        data: { user, token, requiresApproval: true, claimPending: true },
      });
    }

    // Email verification (STRICT). If enabled, registration must successfully send the verification email.
    if (emailVerificationRequired) {
      const tokenRaw = crypto.randomBytes(32).toString('base64url');
      const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
      // Store in metadata so we don't depend on optional columns.
      const baseMeta = user?.metadata && typeof user.metadata === 'object' ? user.metadata : (metadata && typeof metadata === 'object' ? metadata : {});
      const nextMeta = {
        ...baseMeta,
        email_verification_token_hash: sha256Hex(tokenRaw),
        email_verification_expires_at: expiresIso,
        email_verified: false,
      };
      await safeUserPatch(user.id, { metadata: nextMeta, email_verified: false }).catch(() => null);
      try {
        await sendVerificationEmailForUser(req, { toEmail: user.email, token: tokenRaw, fullName: user.full_name || '' });
      } catch (e) {
        // Roll back (so the user can re-register with the same email without "email kayıtlı").
        const errMsg = String(e?.message || 'Doğrulama e-postası gönderilemedi.');
        try {
          await supabaseRestDelete('notifications', { user_id: `eq.${user.id}` }).catch(() => null);
        } catch {
          // ignore
        }
        let removed = false;
        try {
          await supabaseRestDelete('users', { id: `eq.${user.id}` }).catch(() => null);
          // verify it is gone (best-effort)
          const chk = await supabaseRestGet('users', { select: 'id', id: `eq.${user.id}`, limit: '1' }).catch(() => []);
          removed = !Array.isArray(chk) || chk.length === 0;
        } catch {
          removed = false;
        }
        if (!removed) {
          // If hard delete didn't work, free the email by rewriting it.
          try {
            const em = String(user.email || emailLower).trim().toLowerCase();
            const parts = em.split('@');
            const local = parts[0] || 'user';
            const domain = parts[1] || 'example.com';
            const nextEmail = `${local}+failed-${String(user.id).slice(0, 8)}-${Date.now()}@${domain}`;
            const baseMeta = user?.metadata && typeof user.metadata === 'object' ? user.metadata : (metadata && typeof metadata === 'object' ? metadata : {});
            const nextMeta2 = { ...baseMeta, registration_failed: true, registration_failed_at: new Date().toISOString() };
            await safeUserPatch(user.id, { email: nextEmail, is_active: false, metadata: nextMeta2 }).catch(() => null);
          } catch {
            // ignore
          }
        }
        return res.status(503).json({
          success: false,
          error: 'İşlem şu an tamamlanamadı. Lütfen tekrar deneyin.',
          code: 'MAIL_SEND_FAILED',
          debug: errMsg.slice(0, 900),
        });
      }

      const token = signJwt({ id: user.id, username: user.username, email: user.email, user_type: user.user_type, is_admin: !!user.is_admin });
      return res.status(201).json({
        success: true,
        message: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.',
        data: { user, token, requiresApproval, emailVerificationRequired: true, mailSent: true },
      });
    }

    // Welcome email (best-effort)
    sendWelcomeEmailToUser(req, { toEmail: user.email, fullName: user.full_name }).catch(() => null);
    const token = signJwt({ id: user.id, username: user.username, email: user.email, user_type: user.user_type, is_admin: !!user.is_admin });
    res.status(201).json({ success: true, message: 'Kayıt başarılı.', data: { user, token, requiresApproval } });
  } catch (e) {
    // Never return a generic "sunucu hatası" for registration: surface a safe message.
    const msg = String(e?.message || 'Kayıt başarısız.');
    // eslint-disable-next-line no-console
    console.error('authRegister error:', msg);
    return res.status(500).json({ success: false, error: 'Kayıt başarısız. Lütfen tekrar deneyin.', debug: msg.slice(0, 900) });
  }
}

async function authMe(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const rows = await supabaseRestGet('users', { select: '*,party:parties(*)', id: `eq.${auth.id}`, limit: '1' });
    const user = rows?.[0];
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    // IMPORTANT:
    // Admin authorization uses the JWT `is_admin` claim.
    // If a user is promoted to admin after logging in, their old token may not include that.
    // So, always return a refreshed token here to keep the client in sync.
    const token = signJwt({
      id: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      is_admin: !!user.is_admin,
    });
    res.json({ success: true, data: { user, token } });
}

async function authChangePassword(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = await readJsonBody(req);
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Eksik bilgi.' });

    // Match registration password rules:
    // - 8-50 chars
    // - at least 1 letter, 1 number
    const np = String(newPassword || '');
    if (np.length < 8) return res.status(400).json({ success: false, error: 'Yeni şifre en az 8 karakter olmalı.' });
    if (np.length > 50) return res.status(400).json({ success: false, error: 'Yeni şifre en fazla 50 karakter olabilir.' });
    if (!/[a-zA-Z]/.test(np)) return res.status(400).json({ success: false, error: 'Yeni şifre en az 1 harf içermeli.' });
    if (!/[0-9]/.test(np)) return res.status(400).json({ success: false, error: 'Yeni şifre en az 1 rakam içermeli.' });

    const rows = await supabaseRestGet('users', { select: 'id,password_hash', id: `eq.${auth.id}`, limit: '1' });
    const user = rows?.[0];
    if (!user?.password_hash) return res.status(400).json({ success: false, error: 'Şifre değiştirilemiyor.' });
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Mevcut şifre hatalı.' });
    const password_hash = await bcrypt.hash(newPassword, 10);
    await supabaseRestPatch('users', { id: `eq.${auth.id}` }, { password_hash });
    res.json({ success: true, message: 'Şifre değiştirildi.' });
}

// -----------------------
// MESSAGES (DM)
// -----------------------

async function getConversations(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;

  const conversationPreview = (content) => {
    const s = String(content || '').trim();
    if (!s) return '';
    // If it's a JSON-encoded attachment, avoid leaking raw payload in previews.
    // Note: conversations may store a truncated JSON snippet, so check loosely.
    try {
      if (s.startsWith('{')) {
        const obj = JSON.parse(s);
        if (obj && typeof obj === 'object' && obj.type === 'image') return 'Resim Gönderildi.';
      }
    } catch {
      // ignore
    }
    if (/"type"\s*:\s*"image"/i.test(s)) return 'Resim Gönderildi.';
    return s;
  };

  const rows = await supabaseRestGet('messages', {
    select: '*',
    or: `(sender_id.eq.${userId},receiver_id.eq.${userId})`,
    order: 'created_at.desc',
    limit: '500',
  }).catch(() => []);

  const byOther = new Map();
  for (const m of rows || []) {
    // Respect per-user soft deletes
    if (m.sender_id === userId && m.is_deleted_by_sender === true) continue;
    if (m.receiver_id === userId && m.is_deleted_by_receiver === true) continue;

    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!otherId) continue;
    const prev = byOther.get(otherId) || { unread_count: 0, has_outgoing: false, has_incoming: false };
    const unreadInc = m.receiver_id === userId && m.is_read === false ? 1 : 0;
    if (!byOther.has(otherId)) {
      byOther.set(otherId, {
        conversation_id: `${userId}-${otherId}`,
        participant_id: otherId,
        last_message: conversationPreview(m.content),
        last_message_time: m.created_at,
        unread_count: unreadInc,
        has_outgoing: m.sender_id === userId,
        has_incoming: m.receiver_id === userId,
      });
    } else {
      // since ordered desc, first occurrence is last_message
      byOther.set(otherId, {
        ...prev,
        unread_count: (prev.unread_count || 0) + unreadInc,
        has_outgoing: prev.has_outgoing || m.sender_id === userId,
        has_incoming: prev.has_incoming || m.receiver_id === userId,
      });
    }
  }

  // attach user profiles
  const participants = Array.from(byOther.keys());
  // PostgREST in.(...) filter: quote UUID-like ids (hyphens break parsing without quotes)
  const buildInList = (ids) => {
    const isUuidLike = (v) => /^[0-9a-fA-F-]{36}$/.test(String(v));
    return (ids || [])
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .slice(0, 500)
      .map((v) => (isUuidLike(v) ? `"${v}"` : v))
      .join(',');
  };
  const participantIn = buildInList(participants);
  let users = [];
  if (participants.length > 0 && participantIn) {
    users = await supabaseRestGet('users', {
      select: '*,party:parties(*)',
      id: `in.(${participantIn})`,
      limit: String(Math.min(participants.length, 500)),
    }).catch(() => []);
  }
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  // Determine if there's a social link between users:
  // - If I follow the other user: incoming should not be treated as "request"
  // - If the other user follows me: also treat as regular (prevents false requests)
  let followingSet = new Set();
  let followersOfMeSet = new Set();
  try {
    if (participants.length > 0 && participantIn) {
      const fr = await supabaseRestGet('follows', {
        select: 'following_id',
        follower_id: `eq.${userId}`,
        following_id: `in.(${participantIn})`,
        limit: String(Math.min(2000, participants.length)),
      }).catch(() => []);
      followingSet = new Set((fr || []).map((r) => String(r?.following_id)).filter(Boolean));
    }
  } catch {
    // ignore
  }
  try {
    if (participants.length > 0 && participantIn) {
      const rr = await supabaseRestGet('follows', {
        select: 'follower_id',
        following_id: `eq.${userId}`,
        follower_id: `in.(${participantIn})`,
        limit: String(Math.min(2000, participants.length)),
      }).catch(() => []);
      followersOfMeSet = new Set((rr || []).map((r) => String(r?.follower_id)).filter(Boolean));
    }
  } catch {
    // ignore
  }

  const out = Array.from(byOther.values())
    .map((c) => {
      const pid = String(c.participant_id);
      const isFollowingOther = followingSet.has(pid);
      const isFollowedByOther = followersOfMeSet.has(pid);
      const hasSocialLink = isFollowingOther || isFollowedByOther;
      const message_type = c.has_incoming && !c.has_outgoing && !hasSocialLink ? 'request' : 'regular';
      const { has_incoming, has_outgoing, ...rest } = c;
      return { ...rest, message_type, participant: userMap.get(c.participant_id) || null };
    })
    .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

  res.json({ success: true, data: out });
}

async function getMessagesBetween(req, res, otherId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;
  const oid = String(otherId || '').trim();
  if (!isSafeId(oid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  const rows = await supabaseRestGet('messages', {
    select: '*',
    or: `(and(sender_id.eq.${userId},receiver_id.eq.${oid}),and(sender_id.eq.${oid},receiver_id.eq.${userId}))`,
    order: 'created_at.asc',
    limit: '500',
  }).catch(() => []);

  const filtered = (rows || []).filter((m) => {
    if (m.sender_id === userId && m.is_deleted_by_sender === true) return false;
    if (m.receiver_id === userId && m.is_deleted_by_receiver === true) return false;
    return true;
  });

  // mark received messages as read
  await supabaseRestPatch('messages', { receiver_id: `eq.${userId}`, sender_id: `eq.${oid}`, is_read: 'eq.false' }, { is_read: true }).catch(() => {});

  res.json({ success: true, data: filtered });
}

function safeParseJson(input) {
  try {
    return JSON.parse(String(input));
  } catch {
    return null;
  }
}

async function isBlockedBetween(userId, otherId) {
  const aId = String(userId || '').trim();
  const bId = String(otherId || '').trim();
  if (!isSafeId(aId) || !isSafeId(bId)) return false;
  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `in.(${aId},${bId})`, limit: '2' }).catch(() => []);
  const m = new Map((rows || []).map((u) => [String(u.id), u?.metadata && typeof u.metadata === 'object' ? u.metadata : {}]));
  const a = m.get(String(aId)) || {};
  const b = m.get(String(bId)) || {};
  const aBlocked = Array.isArray(a.blocked_user_ids) && a.blocked_user_ids.map(String).includes(String(bId));
  const bBlocked = Array.isArray(b.blocked_user_ids) && b.blocked_user_ids.map(String).includes(String(aId));
  return aBlocked || bBlocked;
}

async function rejectMessageRequest(req, res, otherId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;
  const oid = String(otherId || '').trim();
  if (!isSafeId(oid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  // Soft-delete incoming messages for me (this effectively removes the request)
  await supabaseRestPatch(
    'messages',
    { receiver_id: `eq.${userId}`, sender_id: `eq.${oid}`, is_deleted_by_receiver: 'eq.false' },
    { is_deleted_by_receiver: true }
  ).catch(() => {});
  res.json({ success: true });
}

async function searchMessageUsers(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, data: [] });
  const safe = q.slice(0, 50);

  const meRows = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const meMeta = meRows?.[0]?.metadata && typeof meRows[0].metadata === 'object' ? meRows[0].metadata : {};
  const blocked = new Set(Array.isArray(meMeta.blocked_user_ids) ? meMeta.blocked_user_ids.map(String) : []);

  const candidates = await supabaseRestGet('users', {
    select:
      'id,username,full_name,avatar_url,user_type,politician_type,party_id,province,is_verified,is_active,polit_score,metadata,party:parties(*)',
    is_active: 'eq.true',
    or: `(username.ilike.*${safe}*,full_name.ilike.*${safe}*)`,
    limit: '12',
    order: 'polit_score.desc',
  }).catch(() => []);

  const list = (candidates || [])
    .filter((u) => u && String(u.id) !== String(auth.id))
    .filter((u) => !blocked.has(String(u.id)))
    .slice(0, 10);

  // Filter out users who blocked me (best-effort), then enrich with "friends who follow them"
  const base = [];
  for (const u of list) {
    const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
    const theirBlocked = Array.isArray(meta.blocked_user_ids) ? meta.blocked_user_ids.map(String) : [];
    if (theirBlocked.includes(String(auth.id))) continue;
    // don't leak their metadata
    const { metadata, ...rest } = u;
    base.push(rest);
  }
  if (base.length === 0) return res.json({ success: true, data: [] });

  // Social context: "X arkadaşın takip ediyor" (friends = my following)
  try {
    const me = String(auth.id);
    const myFollowingRows = await supabaseRestGet('follows', {
      select: 'following_id',
      follower_id: `eq.${me}`,
      limit: '200',
    }).catch(() => []);
    const friendIds = (myFollowingRows || []).map((r) => String(r?.following_id || '')).filter(Boolean);
    if (friendIds.length === 0) return res.json({ success: true, data: base });

    const friendIdsCapped = friendIds.slice(0, 120);
    const friendUserRows = await supabaseRestGet('users', {
      select: 'id,full_name,username',
      id: `in.(${friendIdsCapped.join(',')})`,
      is_active: 'eq.true',
      limit: String(friendIdsCapped.length),
    }).catch(() => []);
    const friendNameById = new Map(
      (friendUserRows || []).map((u) => [String(u?.id || ''), String(u?.full_name || u?.username || '').trim()])
    );

    const candidateIds = base.map((u) => String(u?.id || '')).filter(Boolean);
    if (candidateIds.length === 0) return res.json({ success: true, data: base });

    const chunk = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const candidateToFriends = new Map(); // candidateId -> Set(friendId)
    const friendChunks = chunk(friendIdsCapped, 40);
    for (const c of friendChunks) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await supabaseRestGet('follows', {
        select: 'follower_id,following_id',
        follower_id: `in.(${c.join(',')})`,
        limit: '2000',
      }).catch(() => []);

      (rows || []).forEach((r) => {
        const fid = String(r?.follower_id || '');
        const cid = String(r?.following_id || '');
        if (!fid || !cid) return;
        if (!candidateIds.includes(cid)) return;
        if (!candidateToFriends.has(cid)) candidateToFriends.set(cid, new Set());
        candidateToFriends.get(cid).add(fid);
      });
    }

    const candidateIdSet = new Set(candidateIds);
    const enriched = base.map((u) => {
      const cid = String(u?.id || '');
      if (!candidateIdSet.has(cid)) return { ...u, friend_count: 0, friend_names: [] };
      const friends = candidateToFriends.get(cid);
      const friendList = friends ? Array.from(friends) : [];
      const friendNames = friendList
        .map((fid) => friendNameById.get(String(fid)) || null)
        .filter(Boolean)
        .slice(0, 3);
      const friendCount = friendList.length;
      return { ...u, friend_count: friendCount, friend_names: friendNames };
    });

    return res.json({ success: true, data: enriched });
  } catch {
    return res.json({ success: true, data: base });
  }
}

async function deleteConversation(req, res, otherId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;
  const oid = String(otherId || '').trim();
  if (!isSafeId(oid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  // Correct behavior:
  // - If one side "deletes chat", only hide it for that side (soft-delete per user).
  // - Only when BOTH sides deleted the same message, hard-delete it and cleanup any message media.
  try {
    // 1) Soft-delete for current user (both directions).
    await supabaseRestPatch(
      'messages',
      { sender_id: `eq.${userId}`, receiver_id: `eq.${oid}` },
      { is_deleted_by_sender: true }
    ).catch(() => null);

    await supabaseRestPatch(
      'messages',
      { receiver_id: `eq.${userId}`, sender_id: `eq.${oid}` },
      { is_deleted_by_receiver: true }
    ).catch(() => null);

    // 2) Cleanup messages that are deleted by BOTH sides.
    const bothDeleted = await supabaseRestGet('messages', {
      select: 'id,content',
      or: `and(sender_id.eq.${userId},receiver_id.eq.${oid}),and(sender_id.eq.${oid},receiver_id.eq.${userId})`,
      is_deleted_by_sender: 'eq.true',
      is_deleted_by_receiver: 'eq.true',
      limit: '500',
    }).catch(() => []);

    // 2a) Storage cleanup for attachments (only after both sides deleted).
    try {
      const urls = [];
      for (const m of bothDeleted || []) {
        const s = String(m?.content || '').trim();
        if (!s) continue;
        try {
          if (s.startsWith('{')) {
            const obj = JSON.parse(s);
            if (obj && typeof obj === 'object' && obj.type === 'image' && obj.url) urls.push(String(obj.url));
          }
        } catch {
          // ignore
        }
      }
      const objs = urls
        .map((u) => parseSupabasePublicObjectUrl(u))
        .filter(Boolean)
        .filter((p) => p.bucket === 'uploads' && p.objectPath && p.objectPath.startsWith('messages/'));
      const seen = new Set();
      for (const o of objs) {
        const key = `${o.bucket}/${o.objectPath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // eslint-disable-next-line no-await-in-loop
        await supabaseStorageDeleteObject(o.bucket, o.objectPath).catch(() => null);
      }
    } catch {
      // ignore
    }

    // 2b) Hard-delete DB rows that are deleted for both sides.
    const ids = (bothDeleted || []).map((m) => String(m?.id || '')).filter(Boolean);
    if (ids.length > 0) {
      await supabaseRestDelete('messages', { id: `in.(${ids.join(',')})` }).catch(() => null);
    }
  } catch {
    // ignore
  }
  return res.json({ success: true });
}

async function reportConversation(req, res, otherId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;
  const oid = String(otherId || '').trim();
  if (!isSafeId(oid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });

  const body = await readJsonBody(req);
  const reason = String(body?.reason || '').trim();
  const details = String(body?.details || '').trim();
  if (!reason) return res.status(400).json({ success: false, error: 'Şikayet nedeni seçmelisiniz.' });
  if (details.length > 200) return res.status(400).json({ success: false, error: 'Şikayet notu en fazla 200 karakter olabilir.' });
  if (details) {
    const analyzed = analyzeCommentContent(details);
    if (analyzed?.flagged && (analyzed.reasons || []).some((r) => r === 'zararlı_kod' || r === 'sql')) {
      return res.status(400).json({ success: false, error: 'Şikayet notu güvenlik filtresine takıldı. Lütfen metni sadeleştirip tekrar deneyin.' });
    }
  }

  await notifyAdminsAboutComment(req, {
    type: 'message_report',
    commentId: null,
    postId: null,
    actorId: userId,
    title: 'Mesaj şikayeti',
    message: `Kişi: ${oid}\nNeden: ${reason}${details ? `\nNot: ${details}` : ''}`,
  }).catch(() => null);

  return res.json({ success: true, message: 'Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.' });
}

async function sendMessage(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!(await ensureEmailVerifiedForWrite(req, res, auth))) return;
  const ip = getClientIp(req);
  const rl = rateLimit(`msg:${auth.id}:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return res.status(429).json({ success: false, error: 'Çok fazla mesaj denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });
  }
  const body = await readJsonBody(req);
  const receiver_id = body.receiver_id;
  const rawContent = body.content;
  const attachment = body.attachment && typeof body.attachment === 'object' ? body.attachment : null;
  const text = typeof rawContent === 'string' ? String(rawContent).trim() : '';
  if (!receiver_id || !isSafeId(receiver_id)) return res.status(400).json({ success: false, error: 'Geçersiz alıcı.' });
  if (String(receiver_id) === String(auth.id)) return res.status(400).json({ success: false, error: 'Kendinize mesaj gönderemezsiniz.' });

  if (text) {
    const analyzed = analyzeCommentContent(text);
    if (analyzed?.flagged) {
      return res.status(400).json({
        success: false,
        error: 'Mesajınız uygunsuz içerik içeriyor. Lütfen düzeltip tekrar deneyin.',
        code: 'CONTENT_FILTERED',
      });
    }
  }

  // Sender must be active (deactivated / claim-pending accounts cannot message)
  try {
    const meRows = await supabaseRestGet('users', { select: 'id,is_active,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
    const me = meRows?.[0] || null;
    if (!me || me.is_active === false) {
      return res.status(403).json({ success: false, error: 'Bu hesap aktif değil.' });
    }
    const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};
    const cr = meta?.claim_request && typeof meta.claim_request === 'object' ? meta.claim_request : null;
    if (cr && String(cr.status || '') === 'pending') {
      return res.status(403).json({ success: false, error: 'Profil sahiplenme başvurunuz inceleniyor.' });
    }
  } catch {
    // best-effort
  }

  // Block checks (either direction)
  const blocked = await isBlockedBetween(auth.id, receiver_id);
  if (blocked) {
    return res.status(403).json({ success: false, error: 'Bu kullanıcıyla mesajlaşamazsınız (engelleme mevcut).' });
  }

  // Respect receiver message privacy settings (users.metadata.privacy_settings.allowMessages)
  try {
    const recvRows = await supabaseRestGet('users', { select: 'id,is_active,metadata', id: `eq.${receiver_id}`, limit: '1' }).catch(() => []);
    const recv = recvRows?.[0] || null;
    if (!recv || recv.is_active === false) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }
    const meta = recv?.metadata && typeof recv.metadata === 'object' ? recv.metadata : {};
    const ps = meta.privacy_settings && typeof meta.privacy_settings === 'object' ? meta.privacy_settings : {};
    const rule = String(ps.allowMessages || 'everyone');

    if (rule === 'none') {
      return res.status(403).json({ success: false, error: 'Bu kullanıcı mesaj almayı kapattı.' });
    }
    if (rule === 'followers') {
      // Only people who follow the receiver can message
      const r = await supabaseRestGet('follows', {
        select: 'id',
        follower_id: `eq.${auth.id}`,
        following_id: `eq.${receiver_id}`,
        limit: '1',
      }).catch(() => []);
      if (!Array.isArray(r) || r.length === 0) {
        return res.status(403).json({ success: false, error: 'Bu kullanıcı yalnızca takipçilerinden mesaj alıyor.' });
      }
    }
    if (rule === 'following') {
      // Only people the receiver follows can message (i.e. receiver follows me)
      const r = await supabaseRestGet('follows', {
        select: 'id',
        follower_id: `eq.${receiver_id}`,
        following_id: `eq.${auth.id}`,
        limit: '1',
      }).catch(() => []);
      if (!Array.isArray(r) || r.length === 0) {
        return res.status(403).json({ success: false, error: 'Bu kullanıcı yalnızca takip ettiklerinden mesaj alıyor.' });
      }
    }
  } catch {
    // Best-effort only; do not fail hard.
  }

  let content = '';
  let plainTextForSafety = '';
  if (attachment && attachment.url && attachment.kind) {
    const url = String(attachment.url || '').trim();
    const kind = String(attachment.kind || '').trim();
    if (!url) return res.status(400).json({ success: false, error: 'Dosya bağlantısı eksik.' });
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ success: false, error: 'Dosya bağlantısı geçersiz.' });
    if (kind !== 'image') return res.status(400).json({ success: false, error: 'Şimdilik sadece resim mesajı destekleniyor.' });
    const payload = { type: kind, url, text: text || '' };
    content = JSON.stringify(payload);
    plainTextForSafety = String(payload.text || '').trim();
  } else {
    content = String(text || '').trim();
    plainTextForSafety = content;
  }

  if (!content) return res.status(400).json({ success: false, error: 'Mesaj boş olamaz.' });
  if (content.length > 2000) return res.status(400).json({ success: false, error: 'Mesaj çok uzun.' });

  // Safety/profanity filter (best-effort; same core logic as posts/comments)
  try {
    const analyzed = analyzeCommentContent(String(plainTextForSafety || '').slice(0, 2000));
    if (analyzed?.flagged) {
      return res.status(400).json({
        success: false,
        error:
          'Mesajınız gönderilemedi. İçerik, topluluk kurallarımıza aykırı olabilecek ifadeler içeriyor olabilir. Lütfen metni düzenleyip tekrar deneyin.',
        code: 'CONTENT_FILTERED',
        reasons: analyzed.reasons || [],
      });
    }
  } catch {
    // ignore
  }

  const inserted = await supabaseRestInsert('messages', [{
    sender_id: auth.id,
    receiver_id,
    content,
    is_read: false,
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
  }]);

  // Notify receiver in-app (best-effort)
  try {
    await supabaseInsertNotifications([
      {
        user_id: receiver_id,
        actor_id: auth.id,
        type: 'message',
        is_read: false,
      },
    ]).catch(() => null);
  } catch {
    // ignore
  }
  // Email receiver (best-effort)
  try {
    const preview = (() => {
      // If attachment message, show a generic preview
      try {
        const obj = JSON.parse(String(content || ''));
        if (obj && typeof obj === 'object' && obj.type === 'image') return (obj.text ? String(obj.text).slice(0, 200) : '📷 Resim mesajı');
      } catch {
        // ignore
      }
      return String(text || content || '').slice(0, 220);
    })();
    sendMessageEmail(req, { receiverId: receiver_id, senderId: auth.id, messagePreview: preview }).catch(() => null);
  } catch {
    // ignore
  }
  res.status(201).json({ success: true, data: inserted?.[0] || null });
}

async function deleteMessage(req, res, messageId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;
  const mid = String(messageId || '').trim();
  if (!isSafeId(mid)) return res.status(400).json({ success: false, error: 'Geçersiz mesaj.' });

  const rows = await supabaseRestGet('messages', { select: '*', id: `eq.${mid}`, limit: '1' }).catch(() => []);
  const msg = rows?.[0];
  if (!msg) return res.status(404).json({ success: false, error: 'Mesaj bulunamadı' });

  const patch = {};
  if (msg.sender_id === userId) patch.is_deleted_by_sender = true;
  if (msg.receiver_id === userId) patch.is_deleted_by_receiver = true;
  if (Object.keys(patch).length === 0) return res.status(403).json({ success: false, error: 'Forbidden' });

  const updated = await supabaseRestPatch('messages', { id: `eq.${mid}` }, patch).catch(() => []);
  const row = updated?.[0] || null;

  // If BOTH sides deleted, hard-delete row + delete attachment from storage (best-effort)
  try {
    const isBoth = (row?.is_deleted_by_sender === true || msg?.is_deleted_by_sender === true) &&
      (row?.is_deleted_by_receiver === true || msg?.is_deleted_by_receiver === true);
    if (isBoth) {
      try {
        const s = String(row?.content ?? msg?.content ?? '').trim();
        if (s.startsWith('{')) {
          const obj = JSON.parse(s);
          if (obj && typeof obj === 'object' && obj.type === 'image' && obj.url) {
            const parsed = parseSupabasePublicObjectUrl(String(obj.url));
            if (parsed?.bucket === 'uploads' && parsed?.objectPath && parsed.objectPath.startsWith('messages/')) {
              await supabaseStorageDeleteObject(parsed.bucket, parsed.objectPath).catch(() => null);
            }
          }
        }
      } catch {
        // ignore
      }
      await supabaseRestDelete('messages', { id: `eq.${mid}` }).catch(() => null);
      return res.json({ success: true, data: null, hard_deleted: true });
    }
  } catch {
    // ignore
  }

  res.json({ success: true, data: row });
}

// -----------------------
// NOTIFICATIONS
// -----------------------

async function getNotifications(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const { limit = 50, offset = 0 } = req.query;
  // Keep notifications for max 15 days. Best-effort cleanup per-user.
  try {
    const cutoffIso = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseRestDelete(
      'notifications',
      { user_id: `eq.${auth.id}`, created_at: `lt.${cutoffIso}` },
      { Prefer: 'return=minimal' }
    ).catch(() => null);
  } catch {
    // ignore cleanup errors
  }
  const params = {
    select: '*,actor:users(*),post:posts(*),comment:comments(*)',
    user_id: `eq.${auth.id}`,
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  };
  try {
    // IMPORTANT:
    // If embedded relations are not configured (FK missing in PostgREST), this request fails.
    // Do NOT swallow that error here; we need to fall back to a schema-agnostic select below.
    const rows = await supabaseRestGet('notifications', params);
    return res.json({ success: true, data: rows || [] });
  } catch {
    // Fallback: schema-agnostic (in case embedded relations/columns differ).
    // Still attach actor/post objects (best-effort) so UI can render avatar + navigation.
    const baseRows = await supabaseRestGet('notifications', {
      select: '*',
      user_id: `eq.${auth.id}`,
      order: 'created_at.desc',
      limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
      offset: String(parseInt(offset, 10) || 0),
    }).catch(() => []);
    const rows = Array.isArray(baseRows) ? baseRows : [];

    const actorIds = Array.from(new Set(rows.map((r) => r?.actor_id).filter(Boolean).map(String))).slice(0, 200);
    const postIds = Array.from(new Set(rows.map((r) => r?.post_id).filter(Boolean).map(String))).slice(0, 200);

    let actors = [];
    if (actorIds.length) {
      // Keep selection schema-agnostic (avoid non-existent columns).
      actors = await supabaseRestGet('users', {
        select:
          'id,auth_user_id,username,full_name,avatar_url,is_verified,is_active,user_type,politician_type,party_id,province,polit_score,metadata',
        id: `in.(${actorIds.join(',')})`,
        limit: String(Math.min(actorIds.length, 200)),
      }).catch(() => []);
    }
    const actorsById = new Map((Array.isArray(actors) ? actors : []).map((u) => [String(u?.id), u]));

    let posts = [];
    if (postIds.length) {
      posts = await supabaseRestGet('posts', {
        select: 'id,content,content_text,media_url,media_type,thumbnail_url,user_id',
        id: `in.(${postIds.join(',')})`,
        limit: String(Math.min(postIds.length, 200)),
      }).catch(async () => {
        // Some envs don't have content_text
        return await supabaseRestGet('posts', {
          select: 'id,content,media_url,media_type,thumbnail_url,user_id',
          id: `in.(${postIds.join(',')})`,
          limit: String(Math.min(postIds.length, 200)),
        }).catch(() => []);
      });
    }
    const postsById = new Map((Array.isArray(posts) ? posts : []).map((p) => [String(p?.id), p]));

    const enriched = rows.map((n) => ({
      ...n,
      actor: n?.actor ? n.actor : actorsById.get(String(n?.actor_id)) || null,
      post: n?.post ? n.post : postsById.get(String(n?.post_id)) || null,
    }));

    return res.json({ success: true, data: enriched });
  }
}

async function getUnreadNotificationCount(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  // Same retention cleanup (best-effort) to keep the bell count consistent.
  try {
    const cutoffIso = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseRestDelete(
      'notifications',
      { user_id: `eq.${auth.id}`, created_at: `lt.${cutoffIso}` },
      { Prefer: 'return=minimal' }
    ).catch(() => null);
  } catch {
    // ignore cleanup errors
  }
  const count = await supabaseCount('notifications', { user_id: `eq.${auth.id}`, is_read: 'eq.false' }).catch(() => 0);
  return res.json({ success: true, data: { unread: Number(count || 0) || 0 } });
}

async function markNotificationRead(req, res, id) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const updated = await supabaseRestPatch('notifications', { id: `eq.${id}`, user_id: `eq.${auth.id}` }, { is_read: true });
  res.json({ success: true, data: updated?.[0] || null });
}

async function markAllNotificationsRead(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  await supabaseRestPatch('notifications', { user_id: `eq.${auth.id}`, is_read: 'eq.false' }, { is_read: true }).catch(() => {});
  res.json({ success: true });
}

async function deleteNotification(req, res, id) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  // Hard delete (safe for user-owned row). If RLS blocks, fallback to mark read.
  await supabaseRestDelete('notifications', { id: `eq.${id}`, user_id: `eq.${auth.id}` }).catch(async () => {
    await supabaseRestPatch('notifications', { id: `eq.${id}`, user_id: `eq.${auth.id}` }, { is_read: true }).catch(() => {});
  });
  res.json({ success: true });
}

// Admin: send notification to a user, or broadcast
async function adminSendNotification(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await readJsonBody(req);
  const { user_id, type = 'system', title, message, broadcast } = body || {};
  const t = String(type || 'system').slice(0, 20);
  const ttl = title ? String(title).slice(0, 255) : null;
  const msg = message ? String(message).slice(0, 2000) : null;
  if (!ttl && !msg) return res.status(400).json({ success: false, error: 'Başlık veya mesaj gerekli.' });

  let targets = [];
  if (broadcast === true) {
    // broadcast to active users (cap to avoid runaway)
    const users = await supabaseRestGet('users', { select: 'id', is_active: 'eq.true', limit: '5000' }).catch(() => []);
    targets = (users || []).map((u) => u.id).filter(Boolean);
  } else {
    if (!user_id || !/^\d+$/.test(String(user_id))) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
    targets = [Number(user_id)];
  }

  const rows = targets.map((uid) => ({
    user_id: uid,
    type: t,
    title: ttl,
    message: msg,
    is_read: false,
  }));
  // Insert in chunks
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    // eslint-disable-next-line no-await-in-loop
    await supabaseInsertNotifications(rows.slice(i, i + chunkSize));
  }
  res.json({ success: true, sent: targets.length });
}

// Admin: send a one-off SMTP test email (debug-safe)
async function adminSendTestEmail(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const to = String(body?.to || '').trim();
  const subject = String(body?.subject || 'Polithane Mail Test').trim().slice(0, 200);
  const text = String(body?.text || '').trim().slice(0, 10_000);
  const html = body?.html ? String(body.html).slice(0, 50_000) : null;

  if (!to || !to.includes('@')) return res.status(400).json({ success: false, error: 'Geçerli bir alıcı e-posta gerekli.' });
  if (!text && !html) return res.status(400).json({ success: false, error: 'Mesaj (text veya html) gerekli.' });

  let cfg = null;
  try {
    cfg = await getCentralMailConfig();
  } catch (e) {
    cfg = null;
  }
  const brevoConfigured = !!(cfg?.apiKey && cfg?.senderEmail);

  const debug = {
    brevo: {
      configured: brevoConfigured,
      keyPresent: !!cfg?.apiKey || !!String(process.env.BREVO_API_KEY || '').trim(),
      fromEmailPresent: !!cfg?.senderEmail || !!String(process.env.EMAIL_FROM || '').trim(),
      fromName: String(cfg?.senderName || process.env.BREVO_FROM_NAME || 'Polithane').trim() || 'Polithane',
    },
    config: {
      enabled: cfg ? true : false,
      provider: cfg?.provider || 'brevo',
    },
    appUrl: getPublicAppUrl(req),
    time: new Date().toISOString(),
  };

  try {
    const attempts = [];

    if (!cfg) {
      return res.status(400).json({ success: false, error: 'Mail ayarları eksik veya hatalı.', debug });
    }

    const a = { provider: 'brevo', sent: false, error: null };
    try {
      const out = await sendEmailViaBrevo({
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
        fromEmail: cfg.senderEmail,
        fromName: cfg.senderName,
        apiKey: cfg.apiKey,
      });
      a.sent = true;
      a.messageId = out?.messageId || null;
      attempts.push(a);
      debug.attempts = attempts;
      debug.usedProvider = 'brevo';
      return res.json({ success: true, debug });
    } catch (e) {
      a.sent = false;
      a.error = String(e?.message || e || '').slice(0, 900);
      a.messageId = null;
      attempts.push(a);
      debug.attempts = attempts;
      return res.status(500).json({ success: false, error: a.error || 'Brevo send failed', debug });
    }
  } catch (e) {
    const msg = String(e?.message || e || 'SMTP send failed');
    return res.status(500).json({
      success: false,
      error: msg.slice(0, 900),
      debug,
    });
  }
}

// -----------------------
// SEARCH (Header live search)
// -----------------------

async function searchAll(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ success: true, data: { users: [], posts: [], parties: [] } });

  const safe = q.slice(0, 50);
  const [users, parties] = await Promise.all([
    supabaseRestGet('users', {
      select: 'id,username,full_name,avatar_url,user_type,politician_type,party_id,province,is_verified,is_active,party:parties(*)',
      is_active: 'eq.true',
      or: `(username.ilike.*${safe}*,full_name.ilike.*${safe}*)`,
      limit: '8',
      order: 'polit_score.desc',
    }).catch(() => []),
    supabaseRestGet('parties', {
      select: '*',
      is_active: 'eq.true',
      or: `(name.ilike.*${safe}*,short_name.ilike.*${safe}*)`,
      limit: '6',
      order: 'follower_count.desc',
    }).catch(() => []),
  ]);

  // Posts: try both schema variants
  let posts = [];
  try {
    posts = await supabaseRestGet('posts', {
      select: '*,user:users(*),party:parties(*)',
      is_deleted: 'eq.false',
      or: `(content.ilike.*${safe}*,content_text.ilike.*${safe}*)`,
      limit: '8',
      order: 'polit_score.desc',
    });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('content_text')) {
      posts = await supabaseRestGet('posts', {
        select: '*,user:users(*),party:parties(*)',
        is_deleted: 'eq.false',
        content: `ilike.*${safe}*`,
        limit: '8',
        order: 'polit_score.desc',
      }).catch(() => []);
    } else if (msg.includes('content')) {
      posts = await supabaseRestGet('posts', {
        select: '*,user:users(*),party:parties(*)',
        is_deleted: 'eq.false',
        content_text: `ilike.*${safe}*`,
        limit: '8',
        order: 'polit_score.desc',
      }).catch(() => []);
    } else {
      posts = [];
    }
  }

  res.json({
    success: true,
    data: {
      users: Array.isArray(users) ? users : [],
      posts: Array.isArray(posts) ? posts : [],
      parties: Array.isArray(parties) ? parties : [],
    },
  });
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOgHtml({ title, description, image, canonicalUrl, redirectUrl }) {
  const t = escapeHtml(title || 'Polithane');
  const d = escapeHtml(description || 'Polithane');
  const img = escapeHtml(image || 'https://polithane.com/favicon.ico');
  const canon = escapeHtml(canonicalUrl || 'https://polithane.com/');
  const redir = escapeHtml(redirectUrl || canon);
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t}</title>
    <link rel="canonical" href="${canon}" />

    <meta name="description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:url" content="${canon}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${img}" />

    <meta http-equiv="refresh" content="0; url=${redir}" />
  </head>
  <body>
    <p>Yönlendiriliyorsunuz… <a href="${redir}">Devam etmek için tıklayın</a></p>
  </body>
</html>`;
}

async function ogPost(req, res) {
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).send('Missing id');
  const appUrl = getPublicAppUrl(req) || 'https://polithane.com';
  const canonicalUrl = `${appUrl.replace(/\/+$/, '')}/post/${encodeURIComponent(id)}`;

  let row = null;
  try {
    const rows = await supabaseRestGet('posts', {
      select: 'id,content_text,content,media_urls,thumbnail_url,created_at,user:users(id,full_name,username,avatar_url)',
      id: `eq.${id}`,
      is_deleted: 'eq.false',
      limit: '1',
    });
    row = rows?.[0] || null;
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('content_text')) {
      const rows = await supabaseRestGet('posts', {
        select: 'id,content,media_urls,thumbnail_url,created_at,user:users(id,full_name,username,avatar_url)',
        id: `eq.${id}`,
        is_deleted: 'eq.false',
        limit: '1',
      }).catch(() => []);
      row = rows?.[0] || null;
    }
  }

  if (!row) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(buildOgHtml({ title: 'Paylaşım bulunamadı', description: 'Polithane', canonicalUrl, redirectUrl: appUrl }));
  }

  const author = String(row?.user?.full_name || row?.user?.username || 'Polithane').trim();
  const rawText = String(row?.content_text ?? row?.content ?? '').trim();
  const oneLine = rawText.replace(/\s+/g, ' ').slice(0, 180);
  const title = oneLine ? `${author}: ${oneLine.slice(0, 80)}` : `${author} • Polithane`;
  const description = oneLine || 'Polithane paylaşımları';

  const media = row?.thumbnail_url || (Array.isArray(row?.media_urls) ? row.media_urls[0] : row?.media_urls);
  const image = media && String(media).startsWith('http') ? String(media) : 'https://polithane.com/favicon.ico';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return res.status(200).send(buildOgHtml({ title, description, image, canonicalUrl, redirectUrl: canonicalUrl }));
}

function normalizeSiteSettingValue(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  // Some environments stored JSON-stringified values (e.g. "\"true\"").
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : String(parsed);
    } catch {
      return raw;
    }
  }
  // Keep as string; callers expect string flags like "true"/"false".
  return typeof value === 'string' ? value : String(value ?? '');
}

function siteSettingsRequiredSql() {
  return [
    '-- Required table for admin/site settings (no mock)',
    'create table if not exists public.site_settings (',
    '  key text primary key,',
    '  value text not null,',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    '-- Helpful index for admin lists (optional)',
    'create index if not exists site_settings_updated_at_idx on public.site_settings(updated_at desc);',
  ].join('\n');
}

function isMissingRelationError(e, relationName) {
  const msgRaw = String(e?.message || e || '');
  const msg = msgRaw.toLowerCase();
  const rel = String(relationName || '').trim();

  // PostgREST schema-cache miss (common in Supabase):
  // {"code":"PGRST205","message":"Could not find the table 'public.xxx' in the schema cache"}
  if (msg.includes('pgrst205') || (msg.includes('could not find the table') && msg.includes('schema cache'))) {
    if (!rel) return true;
    // Match either raw 'public.rel' hint or the rel name itself.
    return msgRaw.includes(`'public.${rel}'`) || msgRaw.includes(`public.${rel}`) || msg.includes(rel.toLowerCase());
  }

  // Generic (schema-agnostic) check used by most admin endpoints.
  if (!rel) {
    return (
      msg.includes('does not exist') ||
      msg.includes('relation') && msg.includes('does not exist') ||
      msg.includes('table') && msg.includes('does not exist') ||
      // PostgREST common shapes
      msg.includes('could not find the relation') ||
      msg.includes('could not find the table') ||
      msg.includes('unknown table') ||
      msg.includes('not found') && msg.includes('relation')
    );
  }

  // Targeted check for a specific relation/table name.
  return (
    msgRaw.includes(`relation "${rel}" does not exist`) ||
    (msgRaw.includes(`"${rel}"`) && msg.includes('does not exist')) ||
    msg.includes(`relation "${rel}"`) ||
    (msg.includes(`table "${rel}"`) && msg.includes('does not exist'))
  );
}

async function getSiteSettings(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  let rows;
  try {
    rows = await supabaseRestGet('site_settings', { select: 'key,value', order: 'key.asc', limit: '2000' });
  } catch (e) {
    if (isMissingRelationError(e, 'site_settings')) {
      return res.status(200).json({
        success: false,
        schemaMissing: true,
        requiredSql: siteSettingsRequiredSql(),
        error: 'DB tablosu eksik: site_settings',
      });
    }
    return res.status(500).json({ success: false, error: 'Ayarlar yüklenemedi.' });
  }
  const out = {};
  for (const r of rows || []) {
    const k = String(r?.key || '').trim();
    if (!k) continue;
    out[k] = normalizeSiteSettingValue(r?.value);
  }
  return res.json({ success: true, data: out });
}

async function updateSiteSettings(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const obj = body && typeof body === 'object' ? body : {};
  const entries = Object.entries(obj);
  if (entries.length > 200) return res.status(400).json({ success: false, error: 'Çok fazla ayar gönderildi.' });

  const rows = [];
  for (const [key, value] of entries) {
    const k = String(key || '').trim();
    if (!k || k.length > 120) continue;
    const v =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value ?? null);
    rows.push({ key: k, value: v });
  }
  if (rows.length === 0) return res.json({ success: true, data: { updated: 0 } });

  // Upsert in bulk.
  try {
    await supabaseRestRequest('POST', 'site_settings', { on_conflict: 'key' }, rows, {
      Prefer: 'return=representation,resolution=merge-duplicates',
    });
  } catch (e) {
    if (isMissingRelationError(e, 'site_settings')) {
      return res.status(200).json({
        success: false,
        schemaMissing: true,
        requiredSql: siteSettingsRequiredSql(),
        error: 'DB tablosu eksik: site_settings',
      });
    }
    return res.status(500).json({ success: false, error: 'Ayarlar kaydedilemedi.' });
  }

  // Invalidate public cache so changes take effect immediately.
  publicSiteCache = null;
  publicSiteCacheAt = 0;

  return res.json({ success: true, data: { updated: rows.length } });
}

function isValidEmailAddress(input) {
  const s = String(input || '').trim();
  if (!s) return false;
  // Simple, safe check (client also validates)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function adminGetWelcomeContent(req, res) {
  try {
    const map = await getSiteSettingsMapCached().catch(() => ({}));
    const get = (k, fallback = '') => (map && Object.prototype.hasOwnProperty.call(map, k) ? String(map[k] ?? '') : fallback);

    return res.json({
      success: true,
      data: {
        who_we_are: get('welcome_who_we_are', 'Polithane, özgür ve bağımsız bir siyaset platformudur. Vatandaşların, siyasetçilerin ve medya temsilcilerinin bir araya geldiği, şeffaf ve demokratik bir ortam sunuyoruz.'),
        problem_we_solve: get('welcome_problem_we_solve', 'Siyasette şeffaflık eksikliği, vatandaşların sesinin duyulmaması ve güvenilir bilgiye erişim zorluğu gibi sorunlara çözüm üretiyoruz. Polithane ile herkes eşit şartlarda sesini duyurabilir.'),
        mission: get('welcome_mission', 'Misyonumuz, Türkiye\'de siyasi katılımı artırmak, şeffaflığı sağlamak ve vatandaşlarla siyasetçiler arasında güçlü bir köprü kurmaktır. Özgür tartışma ortamı yaratarak demokrasiye katkıda bulunmayı hedefliyoruz.'),
        vision: get('welcome_vision', 'Vizyonumuz, Polithane\'yi Türkiye\'nin en güvenilir ve en çok tercih edilen siyaset platformu haline getirmektir. Gelecekte, her vatandaşın siyasete katılım sağlayabildiği, şeffaf ve hesap verebilir bir ekosistem yaratmak istiyoruz.'),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'İçerik yüklenemedi.' });
  }
}

async function adminUpdateWelcomeContent(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const obj = body && typeof body === 'object' ? body : {};

  const updates = [];
  if (obj.who_we_are !== undefined) {
    updates.push({ key: 'welcome_who_we_are', value: String(obj.who_we_are || '').trim() });
  }
  if (obj.problem_we_solve !== undefined) {
    updates.push({ key: 'welcome_problem_we_solve', value: String(obj.problem_we_solve || '').trim() });
  }
  if (obj.mission !== undefined) {
    updates.push({ key: 'welcome_mission', value: String(obj.mission || '').trim() });
  }
  if (obj.vision !== undefined) {
    updates.push({ key: 'welcome_vision', value: String(obj.vision || '').trim() });
  }

  try {
    for (const { key, value } of updates) {
      await upsertSiteSetting(key, value);
    }
    invalidateSiteSettingsCache();
    return res.json({ success: true, message: 'Karşılama içeriği güncellendi.' });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Güncelleme başarısız.' });
  }
}

async function adminGetMailSettings(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const map = await getSiteSettingsMapCached().catch(() => ({}));
  const get = (k, fallback = '') => (map && Object.prototype.hasOwnProperty.call(map, k) ? String(map[k] ?? '') : fallback);

  const envKey = String(process.env.BREVO_API_KEY || '').trim();
  const dbKey = String(get('mail_brevo_api_key', '') || '').trim();
  const brevoConfigured = !!(envKey || dbKey);

  return res.json({
    success: true,
    data: {
      mail_enabled: get('mail_enabled', 'true') || 'true',
      mail_provider: (get('mail_provider', 'brevo') || 'brevo').toLowerCase(),
      mail_sender_email: get('mail_sender_email', '') || '',
      mail_sender_name: get('mail_sender_name', 'Polithane') || 'Polithane',
      mail_reply_to_email: get('mail_reply_to_email', '') || '',
      mail_reply_to_name: get('mail_reply_to_name', '') || '',
      email_verification_enabled: get('email_verification_enabled', 'false') || 'false',
      verification_channel: (get('verification_channel', 'email') || 'email').toLowerCase(),
      brevo_api_key_configured: brevoConfigured,
    },
  });
}

async function adminUpdateMailSettings(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const obj = body && typeof body === 'object' ? body : {};

  const fieldErrors = {};
  const mail_enabled = obj.mail_enabled !== undefined ? String(obj.mail_enabled).trim() : undefined;
  const mail_provider = obj.mail_provider !== undefined ? String(obj.mail_provider || '').trim().toLowerCase() : undefined;
  const mail_sender_email = obj.mail_sender_email !== undefined ? String(obj.mail_sender_email || '').trim() : undefined;
  const mail_sender_name = obj.mail_sender_name !== undefined ? String(obj.mail_sender_name || '').trim() : undefined;
  const mail_reply_to_email = obj.mail_reply_to_email !== undefined ? String(obj.mail_reply_to_email || '').trim() : undefined;
  const mail_reply_to_name = obj.mail_reply_to_name !== undefined ? String(obj.mail_reply_to_name || '').trim() : undefined;
  const email_verification_enabled =
    obj.email_verification_enabled !== undefined ? String(obj.email_verification_enabled).trim() : undefined;
  const verification_channel = obj.verification_channel !== undefined ? String(obj.verification_channel || '').trim().toLowerCase() : undefined;

  const brevo_api_key = typeof obj.brevo_api_key === 'string' ? obj.brevo_api_key.trim() : '';
  const clear_brevo_api_key = obj.clear_brevo_api_key === true;

  const enabledBool = mail_enabled !== undefined ? mail_enabled === 'true' : null;
  if (mail_enabled !== undefined && mail_enabled !== 'true' && mail_enabled !== 'false') {
    fieldErrors.mail_enabled = 'true/false olmalı.';
  }
  if (email_verification_enabled !== undefined && email_verification_enabled !== 'true' && email_verification_enabled !== 'false') {
    fieldErrors.email_verification_enabled = 'true/false olmalı.';
  }
  if (verification_channel !== undefined && verification_channel && verification_channel !== 'email' && verification_channel !== 'sms') {
    fieldErrors.verification_channel = 'email veya sms olmalı.';
  }
  if (mail_provider !== undefined && mail_provider && mail_provider !== 'brevo') {
    fieldErrors.mail_provider = 'Sadece "brevo" destekleniyor.';
  }
  if (mail_sender_email !== undefined && mail_sender_email && !isValidEmailAddress(mail_sender_email)) {
    fieldErrors.mail_sender_email = 'Geçerli bir e-posta girin.';
  }
  if ((enabledBool === true || enabledBool === null) && mail_sender_email !== undefined) {
    // if explicitly enabled, enforce
    if (enabledBool === true && !mail_sender_email) fieldErrors.mail_sender_email = 'Gönderici e-posta zorunlu.';
  }
  if (mail_reply_to_email !== undefined && mail_reply_to_email && !isValidEmailAddress(mail_reply_to_email)) {
    fieldErrors.mail_reply_to_email = 'Geçerli bir e-posta girin.';
  }
  if (brevo_api_key && brevo_api_key.length < 20) {
    fieldErrors.brevo_api_key = 'Brevo API key çok kısa görünüyor.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return res.status(400).json({ success: false, error: 'Hatalı alanlar var.', fieldErrors });
  }

  const rows = [];
  const push = (key, value) => rows.push({ key, value: String(value ?? '') });

  if (mail_enabled !== undefined) push('mail_enabled', mail_enabled);
  if (mail_provider !== undefined) push('mail_provider', mail_provider || 'brevo');
  if (mail_sender_email !== undefined) push('mail_sender_email', mail_sender_email);
  if (mail_sender_name !== undefined) push('mail_sender_name', mail_sender_name);
  if (mail_reply_to_email !== undefined) push('mail_reply_to_email', mail_reply_to_email);
  if (mail_reply_to_name !== undefined) push('mail_reply_to_name', mail_reply_to_name);
  if (email_verification_enabled !== undefined) push('email_verification_enabled', email_verification_enabled);
  if (verification_channel !== undefined) push('verification_channel', verification_channel || 'email');

  if (brevo_api_key) push('mail_brevo_api_key', brevo_api_key);
  if (clear_brevo_api_key) push('mail_brevo_api_key', '');

  if (rows.length === 0) return res.json({ success: true, data: { updated: 0 } });

  try {
    await supabaseRestRequest('POST', 'site_settings', { on_conflict: 'key' }, rows, {
      Prefer: 'return=representation,resolution=merge-duplicates',
    });
  } catch (e) {
    if (isMissingRelationError(e, 'site_settings')) {
      return res.status(200).json({
        success: false,
        schemaMissing: true,
        requiredSql: siteSettingsRequiredSql(),
        error: 'DB tablosu eksik: site_settings',
      });
    }
    return res.status(500).json({ success: false, error: 'Mail ayarları kaydedilemedi.' });
  }

  // Invalidate settings cache immediately
  siteSettingsMapCache = null;
  siteSettingsMapCacheAt = 0;

  return res.json({ success: true, data: { updated: rows.length } });
}

function isValidHexColor(input) {
  const s = String(input || '').trim();
  return /^#[0-9a-f]{6}$/i.test(s) || /^#[0-9a-f]{3}$/i.test(s);
}

async function getPublicTheme(req, res) {
  // Public, read-only subset of site_settings (no auth).
  const rows = await supabaseRestGet('site_settings', { select: 'key,value', limit: '2000' }).catch(() => []);
  const map = {};
  for (const r of rows || []) {
    const k = String(r?.key || '').trim();
    if (!k) continue;
    map[k] = normalizeSiteSettingValue(r?.value);
  }

  const out = {};
  const primary = map.theme_primary_color;
  const secondary = map.theme_secondary_color;
  const accent = map.theme_accent_color;
  const danger = map.theme_danger_color;
  const background = map.theme_background_color;
  const text = map.theme_text_color;
  const borderRadius = map.theme_border_radius;
  const fontFamily = map.theme_font_family;

  if (isValidHexColor(primary)) out.primaryColor = primary;
  if (isValidHexColor(secondary)) out.secondaryColor = secondary;
  if (isValidHexColor(accent)) out.accentColor = accent;
  if (isValidHexColor(danger)) out.dangerColor = danger;
  if (isValidHexColor(background)) out.backgroundColor = background;
  if (isValidHexColor(text)) out.textColor = text;
  if (typeof borderRadius === 'string' && borderRadius.trim()) out.borderRadius = borderRadius.trim();
  if (typeof fontFamily === 'string' && fontFamily.trim()) out.fontFamily = fontFamily.trim();

  return res.json({ success: true, data: out });
}

let publicSiteCache = null;
let publicSiteCacheAt = 0;
const PUBLIC_SITE_CACHE_MS = 60_000;
let publicParliamentCache = null;
let publicParliamentCacheAt = 0;

function safeParseJsonString(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Lightweight site_settings cache for public endpoints that need a single key.
let siteSettingsMapCache = null;
let siteSettingsMapCacheAt = 0;
const SITE_SETTINGS_MAP_CACHE_MS = 30_000;

async function getSiteSettingsMapCached() {
  const now = Date.now();
  if (siteSettingsMapCache && (now - siteSettingsMapCacheAt) < SITE_SETTINGS_MAP_CACHE_MS) return siteSettingsMapCache;
  const rows = await supabaseRestGet('site_settings', { select: 'key,value', limit: '2000' }).catch(() => []);
  const map = {};
  for (const r of rows || []) {
    const k = String(r?.key || '').trim();
    if (!k) continue;
    map[k] = normalizeSiteSettingValue(r?.value);
  }
  siteSettingsMapCache = map;
  siteSettingsMapCacheAt = now;
  return map;
}

async function getSiteSettingJson(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  const map = await getSiteSettingsMapCached().catch(() => ({}));
  const raw = map?.[k];
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') return safeParseJsonString(raw);
  return null;
}

async function getPublicSite(req, res) {
  // Public, read-only site info (safe subset).
  const now = Date.now();
  if (publicSiteCache && (now - publicSiteCacheAt) < PUBLIC_SITE_CACHE_MS) {
    return res.json({ success: true, data: publicSiteCache });
  }

  const rows = await supabaseRestGet('site_settings', { select: 'key,value', limit: '2000' }).catch(() => []);
  const map = {};
  for (const r of rows || []) {
    const k = String(r?.key || '').trim();
    if (!k) continue;
    map[k] = normalizeSiteSettingValue(r?.value);
  }

  const social = map.social_links;
  const socialObj =
    social && typeof social === 'object'
      ? social
      : typeof social === 'string'
        ? safeParseJsonString(social)
        : null;

  const out = {
    siteName: String(map.site_name || 'Polithane').trim(),
    siteSlogan: String(map.site_slogan || '').trim(),
    siteDescription: String(map.site_description || '').trim(),
    contactEmail: String(map.contact_email || 'info@polithane.com').trim(),
    supportEmail: String(map.support_email || '').trim(),
    maintenanceMode: String(map.maintenance_mode || '').trim() === 'true',
    allowRegistration: String(map.allow_registration || '').trim() !== 'false',
    allowComments: String(map.allow_comments || '').trim() !== 'false',
    allowMessages: String(map.allow_messages || '').trim() !== 'false',
    socialLinks: socialObj && typeof socialObj === 'object' ? socialObj : {},
    // Home feed layout (admin-controlled)
    homePostsPerRow: Math.max(1, Math.min(3, parseInt(String(map.home_posts_per_row || '2'), 10) || 2)),
    // Public SEO settings (admin-controlled)
    seo: {
      metaTitle: String(map.seo_metaTitle || '').trim(),
      metaDescription: String(map.seo_metaDescription || '').trim(),
      metaKeywords: String(map.seo_metaKeywords || '').trim(),
      ogTitle: String(map.seo_ogTitle || '').trim(),
      ogDescription: String(map.seo_ogDescription || '').trim(),
      ogImage: String(map.seo_ogImage || '').trim(),
      twitterCard: String(map.seo_twitterCard || '').trim(),
      twitterSite: String(map.seo_twitterSite || '').trim(),
      favicon: String(map.seo_favicon || '').trim(),
      robots: String(map.seo_robots || '').trim(),
      canonicalURL: String(map.seo_canonicalURL || '').trim(),
      googleAnalyticsID: String(map.seo_googleAnalyticsID || '').trim(),
      googleAdsenseID: String(map.seo_googleAdsenseID || '').trim(),
      headHtml: String(map.seo_head_html || '').trim(),
      bodyHtml: String(map.seo_body_html || '').trim(),
    },
    branding: {
      logoHeaderUrl: String(map.logo_header_url || '').trim(),
      logoFooterUrl: String(map.logo_footer_url || '').trim(),
      logoAuthUrl: String(map.logo_auth_url || '').trim(),
      logoAdminTopUrl: String(map.logo_admin_top_url || '').trim(),
      logoAdminBottomUrl: String(map.logo_admin_bottom_url || '').trim(),
      logoHeaderWidth: Number(map.logo_header_w || 0) || 0,
      logoHeaderHeight: Number(map.logo_header_h || 0) || 0,
      logoFooterWidth: Number(map.logo_footer_w || 0) || 0,
      logoFooterHeight: Number(map.logo_footer_h || 0) || 0,
      logoAuthWidth: Number(map.logo_auth_w || 0) || 0,
      logoAuthHeight: Number(map.logo_auth_h || 0) || 0,
      logoAdminTopWidth: Number(map.logo_admin_top_w || 0) || 0,
      logoAdminTopHeight: Number(map.logo_admin_top_h || 0) || 0,
      logoAdminBottomWidth: Number(map.logo_admin_bottom_w || 0) || 0,
      logoAdminBottomHeight: Number(map.logo_admin_bottom_h || 0) || 0,
    },
    welcomePageHtml: String(map.welcome_page_html || '').trim(),
  };

  publicSiteCache = out;
  publicSiteCacheAt = now;
  return res.json({ success: true, data: out });
}

async function getPublicParliament(req, res) {
  // Public, read-only parliament data (distribution + general info).
  const now = Date.now();
  if (publicParliamentCache && (now - publicParliamentCacheAt) < PUBLIC_SITE_CACHE_MS) {
    return res.json({ success: true, data: publicParliamentCache });
  }

  const rows = await supabaseRestGet('site_settings', { select: 'key,value', limit: '2000' }).catch(() => []);
  const map = {};
  for (const r of rows || []) {
    const k = String(r?.key || '').trim();
    if (!k) continue;
    map[k] = normalizeSiteSettingValue(r?.value);
  }

  const rawDist = map.parliament_distribution;
  const rawInfo = map.parliament_info;
  const distParsed =
    rawDist && Array.isArray(rawDist)
      ? rawDist
      : typeof rawDist === 'string'
        ? safeParseJsonString(rawDist)
        : null;
  const infoParsed =
    rawInfo && typeof rawInfo === 'object'
      ? rawInfo
      : typeof rawInfo === 'string'
        ? safeParseJsonString(rawInfo)
        : null;

  const distribution = Array.isArray(distParsed)
    ? distParsed
        .map((p) => {
          const name = String(p?.name || '').trim();
          const shortName = String(p?.shortName || p?.short_name || '').trim();
          const seats = Math.max(0, Number(p?.seats || 0) || 0);
          const color = String(p?.color || '').trim();
          const slug = String(p?.slug || p?.party_slug || '').trim();
          const logo_url = String(p?.logo_url || '').trim();
          if (!shortName || !name) return null;
          return {
            name,
            shortName,
            seats,
            ...(isValidHexColor(color) ? { color } : {}),
            ...(slug ? { slug } : {}),
            ...(logo_url ? { logo_url } : {}),
          };
        })
        .filter(Boolean)
    : [];

  const info =
    infoParsed && typeof infoParsed === 'object'
      ? {
          legislatureName: String(infoParsed.legislatureName || infoParsed.legislature_name || '').trim(),
          legislatureYear: String(infoParsed.legislatureYear || infoParsed.legislature_year || '').trim(),
          termStart: String(infoParsed.termStart || infoParsed.term_start || '').trim(),
          termEnd: String(infoParsed.termEnd || infoParsed.term_end || '').trim(),
          speakerName: String(infoParsed.speakerName || infoParsed.speaker_name || '').trim(),
          speakerProfileId: String(infoParsed.speakerProfileId || infoParsed.speaker_profile_id || '').trim(),
          description: String(infoParsed.description || '').trim(),
          officials: Array.isArray(infoParsed.officials)
            ? infoParsed.officials
                .map((o) => {
                  const role = String(o?.role || '').trim();
                  const name = String(o?.name || '').trim();
                  const profileId = String(o?.profileId || o?.profile_id || '').trim();
                  if (!role || !name) return null;
                  return { role, name, ...(profileId ? { profileId } : {}) };
                })
                .filter(Boolean)
            : [],
        }
      : {
          legislatureName: '',
          legislatureYear: '',
          termStart: '',
          termEnd: '',
          speakerName: '',
          speakerProfileId: '',
          description: '',
          officials: [],
        };

  const out = { distribution, info };
  publicParliamentCache = out;
  publicParliamentCacheAt = now;
  return res.json({ success: true, data: out });
}

async function getPublicAds(req, res) {
  // Public, read-only ads (safe subset).
  const position = String(req.query?.position || '').trim() || null;
  const lim = Math.min(20, Math.max(1, parseInt(String(req.query?.limit || 1), 10) || 1));
  try {
    const params = {
      select: 'id,title,position,status,target_url,created_at,updated_at',
      order: 'created_at.desc',
      limit: String(lim),
    };
    if (position) params.position = `eq.${position}`;
    // Show only active ads publicly.
    params.status = 'eq.active';
    const rows = await supabaseRestGet('admin_ads', params);
    return res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    // If ads table doesn't exist yet, return empty list (public should not expose schema SQL).
    if (isMissingRelationError(e)) {
      return res.json({ success: true, data: [] });
    }
    return res.status(500).json({ success: false, error: 'Reklamlar yüklenemedi.' });
  }
}

async function publicTrackAd(req, res, adId, kind) {
  const id = String(adId || '').trim();
  const k = String(kind || '').trim().toLowerCase();
  if (!id) return res.status(400).json({ success: false, error: 'Geçersiz reklam.' });
  if (k !== 'click' && k !== 'impression') return res.status(400).json({ success: false, error: 'Geçersiz event.' });
  try {
    const rows = await supabaseRestGet('admin_ads', { select: 'id,status,clicks,impressions', id: `eq.${id}`, limit: '1' });
    const ad = rows?.[0] || null;
    if (!ad) return res.status(404).json({ success: false, error: 'Reklam bulunamadı.' });
    // Only track active ads to avoid skew.
    if (String(ad.status || '') !== 'active') return res.json({ success: true, ignored: true });

    const clicks = Math.max(0, parseInt(String(ad.clicks || 0), 10) || 0);
    const imps = Math.max(0, parseInt(String(ad.impressions || 0), 10) || 0);
    const patch =
      k === 'click'
        ? { clicks: clicks + 1, updated_at: new Date().toISOString() }
        : { impressions: imps + 1, updated_at: new Date().toISOString() };
    await supabaseRestPatch('admin_ads', { id: `eq.${id}` }, patch).catch(() => null);
    return res.json({ success: true });
  } catch (e) {
    if (isMissingRelationError(e)) return res.json({ success: true, ignored: true });
    return res.status(500).json({ success: false, error: 'Event kaydedilemedi.' });
  }
}

// --- DISPATCHER ---
export default async function handler(req, res) {
  setSecurityHeaders(req, res);
  setCors(res);
  setCorsOrigin(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
      const url = req.url.split('?')[0];
      // Build/debug meta (safe: only commit + time).
      if (url === '/api/meta' && req.method === 'GET') {
        const env = {
          NODE_ENV: String(process.env.NODE_ENV || ''),
          SUPABASE_URL: !!String(process.env.SUPABASE_URL || '').trim(),
          SUPABASE_SERVICE_ROLE_KEY: !!String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
          SUPABASE_ANON_KEY: !!String(process.env.SUPABASE_ANON_KEY || '').trim(),
        };
        // Safe diagnostics (booleans + error strings only; no secrets, no row data)
        const diag = {
          supabase_rest_ok: false,
          supabase_rest_error: null,
          admin_tables_read_ok: {},
          admin_tables_read_error: {},
          storage_sample_counts: {},
          storage_sample_error: null,
        };
        try {
          // Smoke test: can we call PostgREST at all?
          await supabaseRestGet('users', { select: 'id', limit: '1' }).catch((e) => {
            throw e;
          });
          diag.supabase_rest_ok = true;
        } catch (e) {
          diag.supabase_rest_ok = false;
          diag.supabase_rest_error = String(e?.message || e || '').slice(0, 500);
        }
        try {
          const tables = [
            'admin_email_templates',
            'admin_notification_rules',
            'admin_workflows',
            'admin_sources',
            'admin_ads',
          ];
          for (const t of tables) {
            // eslint-disable-next-line no-await-in-loop
            await supabaseRestGet(t, { select: 'id', limit: '1' })
              .then(() => {
                diag.admin_tables_read_ok[t] = true;
              })
              .catch((e) => {
                diag.admin_tables_read_ok[t] = false;
                diag.admin_tables_read_error[t] = String(e?.message || e || '').slice(0, 500);
              });
          }
        } catch {
          // ignore
        }
        try {
          const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
          const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
          if (supabaseUrl && serviceKey) {
            const supabase = createClient(supabaseUrl, serviceKey);
            const bucket = 'uploads';
            const samples = ['', 'posts', 'messages', 'avatars', 'documents'];
            for (const pfx of samples) {
              // eslint-disable-next-line no-await-in-loop
              const { data, error } = await supabase.storage.from(bucket).list(pfx, { limit: 100, offset: 0 });
              if (error) throw error;
              diag.storage_sample_counts[pfx || '(root)'] = Array.isArray(data) ? data.length : 0;
            }

            // Depth-2 file counts (no names) to diagnose "media empty" reports.
            const countFilesDepth2 = async (rootPrefix) => {
              const { data: lvl1, error: e1 } = await supabase.storage.from(bucket).list(rootPrefix, { limit: 200, offset: 0 });
              if (e1) throw e1;
              const one = Array.isArray(lvl1) ? lvl1 : [];
              let files = 0;
              let folders = 0;
              for (const it of one) {
                if (!it || !it.name || it.name.endsWith('/')) continue;
                if (it.id) {
                  files += 1;
                  continue;
                }
                folders += 1;
                // eslint-disable-next-line no-await-in-loop
                const { data: lvl2, error: e2 } = await supabase.storage.from(bucket).list(`${rootPrefix}/${it.name}`, { limit: 200, offset: 0 });
                if (e2) continue;
                const two = Array.isArray(lvl2) ? lvl2 : [];
                for (const it2 of two) {
                  if (!it2 || !it2.name || it2.name.endsWith('/')) continue;
                  if (it2.id) files += 1;
                }
                if (files > 5000) break;
              }
              return { folders, files };
            };
            try {
              diag.storage_depth2 = {
                posts: await countFilesDepth2('posts'),
                messages: await countFilesDepth2('messages'),
                avatars: await countFilesDepth2('avatars'),
              };
            } catch {
              // ignore
            }
          }
        } catch (e) {
          diag.storage_sample_error = String(e?.message || e || '').slice(0, 500);
        }
        return res.json({
          success: true,
          rev: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GITHUB_COMMIT_SHA || null,
          ref: process.env.VERCEL_GIT_COMMIT_REF || null,
          now: new Date().toISOString(),
          env,
          diag,
        });
      }
      // Cron: purge archived posts (hard delete + storage cleanup)
      if (url === '/api/cron/purge-archived-posts' && req.method === 'POST') {
        return await cronPurgeArchivedPosts(req, res);
      }
      if (url === '/api/cron/process-admin-jobs' && req.method === 'POST') {
        return await cronProcessAdminJobs(req, res);
      }
      if (url === '/api/avatar' && req.method === 'GET') return await proxyAvatar(req, res);

      // Dynamic share/OG previews
      if (url === '/api/og/post' && req.method === 'GET') return await ogPost(req, res);

      // Admin site settings (used by /admin/site-settings and /admin/seo)
      if (url === '/api/settings' && req.method === 'GET') return await getSiteSettings(req, res);
      if (url === '/api/settings' && req.method === 'PUT') return await updateSiteSettings(req, res);
      // Backwards-compatible alias (some admin UI calls this)
      if (url === '/api/admin/settings' && req.method === 'GET') return await getSiteSettings(req, res);
      if (url === '/api/admin/settings' && req.method === 'PUT') return await updateSiteSettings(req, res);

      // Public theme settings (read-only)
      if (url === '/api/theme' && req.method === 'GET') return await getPublicTheme(req, res);
      if (url === '/api/public/site' && req.method === 'GET') return await getPublicSite(req, res);
      if (url === '/api/public/parliament' && req.method === 'GET') return await getPublicParliament(req, res);
      if (url === '/api/public/ads' && req.method === 'GET') return await getPublicAds(req, res);
      if (url.startsWith('/api/public/ads/') && req.method === 'POST') {
        const rest = url.split('/api/public/ads/')[1] || '';
        const parts = rest.split('/').filter(Boolean);
        const id = parts[0];
        const tail = parts[1];
        if (id && tail === 'impression') return await publicTrackAd(req, res, id, 'impression');
        if (id && tail === 'click') return await publicTrackAd(req, res, id, 'click');
      }
      
      // Public Lists
      if (url === '/api/posts' && req.method === 'POST') return await createPost(req, res);
      if ((url === '/api/posts' || url === '/api/posts/') && req.method === 'GET') return await getPosts(req, res);
      if ((url === '/api/agendas' || url === '/api/agendas/') && req.method === 'GET') return await getAgendas(req, res);
      if (url === '/api/parties' || url === '/api/parties/') return await getParties(req, res);
      if ((url === '/api/fast' || url === '/api/fast/') && req.method === 'GET') return await getFastUsers(req, res);
      if ((url === '/api/fast/public' || url === '/api/fast/public/' || url === '/api/fast-public' || url === '/api/fast-public/') && req.method === 'GET') {
        return await getFastPublicUsers(req, res);
      }
      // Fast item helpers (view tracking + viewers list)
      if (url.startsWith('/api/fast/items/')) {
        const rest = url.split('/api/fast/items/')[1] || '';
        const parts = rest.split('/').filter(Boolean);
        const postId = parts[0];
        const tail = parts[1];
        if (postId && tail === 'view' && req.method === 'POST') return await fastTrackView(req, res, postId);
        if (postId && tail === 'viewers' && req.method === 'GET') return await fastGetViewers(req, res, postId);
      }
      if (url.startsWith('/api/fast/') && req.method === 'GET') {
        const key = url.split('/api/fast/')[1];
        if (key) return await getFastForUser(req, res, key);
      }

      // Posts (detail + interactions)
      if (url.startsWith('/api/posts/') && !url.endsWith('/')) {
          const rest = url.split('/api/posts/')[1];
          const parts = rest.split('/').filter(Boolean);
          const postId = parts[0];
          const tail = parts[1];
          if (postId && !tail && req.method === 'GET') return await getPostById(req, res, postId);
          if (postId && !tail && req.method === 'PUT') return await updatePost(req, res, postId);
          if (postId && !tail && req.method === 'DELETE') return await deletePost(req, res, postId);
          if (postId && tail === 'like' && req.method === 'POST') return await togglePostLike(req, res, postId);
          if (postId && tail === 'share' && req.method === 'POST') return await trackPostShare(req, res, postId);
          if (postId && tail === 'comments' && req.method === 'GET') return await getPostComments(req, res, postId);
          if (postId && tail === 'comments' && req.method === 'POST') return await addPostComment(req, res, postId);
          if (postId && tail === 'polit-score-breakdown' && req.method === 'GET') return await getPostPolitScoreBreakdown(req, res, postId);
          if (postId && tail === 'report' && req.method === 'POST') return await reportPost(req, res, postId);
      }

      // Comments (edit / report)
      if (url.startsWith('/api/comments/')) {
        const rest = url.split('/api/comments/')[1] || '';
        const parts = rest.split('/').filter(Boolean);
        const commentId = parts[0];
        const tail = parts[1];
        if (commentId && tail === 'like' && req.method === 'POST') return await toggleCommentLike(req, res, commentId);
        if (commentId && !tail && req.method === 'PUT') return await updateComment(req, res, commentId);
        if (commentId && tail === 'report' && req.method === 'POST') return await reportComment(req, res, commentId);
      }
      
      // Detail Pages (Pattern Matching)
      if (url.startsWith('/api/parties/')) {
          const id = url.split('/api/parties/')[1];
          if (id) return await getPartyDetail(req, res, id);
      }
      
      if (url === '/api/users' || url === '/api/users/') return await getUsers(req, res); // Search
      if (url.startsWith('/api/users/check-username/') && req.method === 'GET') {
        const username = url.split('/api/users/check-username/')[1];
        return await usersCheckUsername(req, res, username);
      }
      if (url === '/api/users/username' && req.method === 'PUT') return await usersUpdateUsername(req, res);
      if (url === '/api/users/me' && req.method === 'PUT') return await usersUpdateMe(req, res);
      if (url === '/api/users/me' && req.method === 'DELETE') return await usersDeactivateMe(req, res);
      if (url === '/api/users/me/delete-request' && req.method === 'POST') return await usersRequestDeleteMe(req, res);
      if (url === '/api/users/me/reactivate' && req.method === 'POST') return await usersReactivateMe(req, res);
      if (url === '/api/users/delete-confirm' && req.method === 'GET') return await usersConfirmDelete(req, res);
      if (url === '/api/users/me/avatar' && req.method === 'POST') return await usersUploadAvatar(req, res);
      if (url === '/api/storage/ensure-bucket' && req.method === 'POST') return await storageEnsureBucket(req, res);
      if (url === '/api/storage/upload' && req.method === 'POST') return await storageUploadMedia(req, res);
      if (url === '/api/storage/sign-upload' && req.method === 'POST') return await storageCreateSignedUpload(req, res);
      if (url === '/api/users/blocks' && req.method === 'GET') return await usersGetBlocks(req, res);
      if (url === '/api/users/blocks' && req.method === 'POST') return await usersBlock(req, res);
      if (url.startsWith('/api/users/blocks/') && req.method === 'DELETE') {
        const targetId = url.split('/api/users/blocks/')[1];
        return await usersUnblock(req, res, targetId);
      }
      if (url.startsWith('/api/users/')) {
          const rest = url.split('/api/users/')[1];
          const parts = rest.split('/').filter(Boolean);
          const id = parts[0];
          const tail = parts[1];
          if (id && tail === 'posts' && req.method === 'GET') return await getUserPosts(req, res, id);
          if (id && tail === 'likes' && req.method === 'GET') return await getUserLikedPosts(req, res, id);
          if (id && tail === 'comments' && req.method === 'GET') return await getUserCommentsList(req, res, id);
          if (id && tail === 'activity' && req.method === 'GET') return await getUserActivity(req, res, id);
          if (id && tail === 'follow' && req.method === 'POST') return await toggleFollow(req, res, id);
          if (id && tail === 'follow-stats' && req.method === 'GET') return await getFollowStats(req, res, id);
          if (id && tail === 'followers' && req.method === 'GET') return await getFollowers(req, res, id);
          if (id && tail === 'following' && req.method === 'GET') return await getFollowing(req, res, id);
          if (id && tail === 'followed-by-friends' && req.method === 'GET') return await getUserFollowedByFriends(req, res, id);
          if (id && tail === 'report' && req.method === 'POST') return await reportUser(req, res, id);
          if (id && !tail) return await getUserDetail(req, res, id); // Profile
      }

      // Auth
      if (url === '/api/auth/check-availability') return await authCheckAvailability(req, res);
      if (url === '/api/auth/login' && req.method === 'POST') return await authLogin(req, res);
      if (url === '/api/auth/register' && req.method === 'POST') return await authRegister(req, res);
      if (url === '/api/auth/forgot-password' && req.method === 'POST') return await authForgotPassword(req, res);
      if (url === '/api/auth/resend-verification' && req.method === 'POST') return await authResendVerification(req, res);
      if (url === '/api/auth/verify-email' && req.method === 'GET') return await authVerifyEmail(req, res);
      if (url === '/api/auth/reset-password' && req.method === 'POST') return await authResetPassword(req, res);
      if (url === '/api/auth/me' && req.method === 'GET') return await authMe(req, res);
      if (url === '/api/auth/change-password' && req.method === 'POST') return await authChangePassword(req, res);
      if (url === '/api/auth/logout') return res.json({ success: true });

      // Notifications
      if (url === '/api/notifications' && req.method === 'GET') return await getNotifications(req, res);
      if (url === '/api/notifications/unread-count' && req.method === 'GET') return await getUnreadNotificationCount(req, res);
      if (url === '/api/notifications/read-all' && req.method === 'POST') return await markAllNotificationsRead(req, res);
      if (url.startsWith('/api/notifications/') && req.method === 'POST') {
        const id = url.split('/api/notifications/')[1];
        return await markNotificationRead(req, res, id);
      }
      if (url.startsWith('/api/notifications/') && req.method === 'DELETE') {
        const id = url.split('/api/notifications/')[1];
        return await deleteNotification(req, res, id);
      }

      // Messages
      if (url === '/api/messages/conversations' && req.method === 'GET') return await getConversations(req, res);
      if (url === '/api/messages/contacts' && req.method === 'GET') return await getMessageContacts(req, res);
      if (url === '/api/messages/suggestions' && req.method === 'GET') return await getMessageSuggestions(req, res);
      if (url === '/api/messages/search' && req.method === 'GET') return await searchMessageUsers(req, res);
      if (url.startsWith('/api/messages/send') && req.method === 'POST') return await sendMessage(req, res);
      if (url.startsWith('/api/messages/requests/') && url.endsWith('/reject') && req.method === 'POST') {
        const otherId = url.split('/api/messages/requests/')[1].split('/reject')[0];
        return await rejectMessageRequest(req, res, otherId);
      }
      if (url.startsWith('/api/messages/conversations/') && req.method === 'DELETE') {
        const otherId = url.split('/api/messages/conversations/')[1];
        return await deleteConversation(req, res, otherId);
      }
      if (url.startsWith('/api/messages/conversations/') && url.endsWith('/report') && req.method === 'POST') {
        const otherId = url.split('/api/messages/conversations/')[1].split('/report')[0];
        return await reportConversation(req, res, otherId);
      }
      if (url.startsWith('/api/messages/') && req.method === 'GET') {
        const otherId = url.split('/api/messages/')[1];
        return await getMessagesBetween(req, res, otherId);
      }
      if (url.startsWith('/api/messages/') && req.method === 'DELETE') {
        const messageId = url.split('/api/messages/')[1];
        return await deleteMessage(req, res, messageId);
      }

      // Admin
      if (url === '/api/admin/bootstrap' && req.method === 'POST') return await adminBootstrap(req, res);
      if (url === '/api/admin/env-check' && req.method === 'GET') return await adminEnvCheck(req, res);
      if (url === '/api/admin/schema-check' && req.method === 'GET') return await adminSchemaCheck(req, res);
      if (url === '/api/admin/stats' && req.method === 'GET') return await adminGetStats(req, res);
      if (url === '/api/admin/seed/demo' && req.method === 'POST') return await adminSeedDemoContent(req, res);
      if (url === '/api/admin/analytics' && req.method === 'GET') return await adminGetAnalytics(req, res);
      if (url === '/api/admin/notification-rules' && req.method === 'GET') return await adminGetNotificationRules(req, res);
      if (url === '/api/admin/notification-rules' && req.method === 'POST') return await adminCreateNotificationRule(req, res);
      if (url === '/api/admin/notification-channels' && req.method === 'GET') return await adminGetNotificationChannels(req, res);
      if (url === '/api/admin/notification-channels' && req.method === 'PUT') return await adminUpdateNotificationChannels(req, res);
      if (url === '/api/admin/db/overview' && req.method === 'GET') return await adminGetDbOverview(req, res);
      if (url === '/api/admin/security/events' && req.method === 'GET') return await adminGetSecurityEvents(req, res);
      if (url === '/api/admin/security/devices' && req.method === 'GET') return await adminGetTrustedDevices(req, res);
      if (url === '/api/admin/system/transform' && req.method === 'POST') return await adminSystemTransform(req, res);
      if (url === '/api/admin/jobs' && req.method === 'GET') return await adminListJobs(req, res);
      if (url === '/api/admin/jobs' && req.method === 'POST') return await adminEnqueueJob(req, res);
      if (url === '/api/admin/jobs/process' && req.method === 'POST') return await adminProcessJobs(req, res);
      if (url === '/api/admin/ads' && req.method === 'GET') return await adminGetAds(req, res);
      if (url === '/api/admin/ads' && req.method === 'POST') return await adminCreateAd(req, res);
      if (url === '/api/admin/workflows' && req.method === 'GET') return await adminGetWorkflows(req, res);
      if (url === '/api/admin/workflows' && req.method === 'POST') return await adminCreateWorkflow(req, res);
      if (url === '/api/admin/revenue/entries' && req.method === 'GET') return await adminGetRevenueEntries(req, res);
      if (url === '/api/admin/revenue/entries' && req.method === 'POST') return await adminCreateRevenueEntry(req, res);
      if (url === '/api/admin/revenue/summary' && req.method === 'GET') return await adminGetRevenueSummary(req, res);
      if (url === '/api/admin/api-keys' && req.method === 'GET') return await adminGetApiKeys(req, res);
      if (url === '/api/admin/api-keys' && req.method === 'POST') return await adminCreateApiKey(req, res);
      if (url === '/api/admin/sources' && req.method === 'GET') return await adminGetSources(req, res);
      if (url === '/api/admin/sources' && req.method === 'POST') return await adminCreateSource(req, res);
      if (url === '/api/admin/email-templates' && req.method === 'GET') return await adminGetEmailTemplates(req, res);
      if (url === '/api/admin/email-templates' && req.method === 'POST') return await adminCreateEmailTemplate(req, res);
      if (url === '/api/admin/payments/plans' && req.method === 'GET') return await adminGetPaymentPlans(req, res);
      if (url === '/api/admin/payments/plans' && req.method === 'POST') return await adminCreatePaymentPlan(req, res);
      if (url === '/api/admin/payments/transactions' && req.method === 'GET') return await adminGetPaymentTransactions(req, res);
      if (url === '/api/admin/payments/transactions' && req.method === 'POST') return await adminCreatePaymentTransaction(req, res);
      if (url === '/api/admin/users' && req.method === 'GET') return await adminGetUsers(req, res);
      if (url === '/api/admin/users/duplicates' && req.method === 'GET') return await adminFindDuplicateUsers(req, res);
      if (url === '/api/admin/users/dedupe' && req.method === 'POST') return await adminDedupeUsers(req, res);
      if (url === '/api/admin/posts' && req.method === 'GET') return await adminGetPosts(req, res);
      if (url === '/api/admin/agendas' && req.method === 'GET') return await adminGetAgendas(req, res);
      if (url === '/api/admin/agendas' && req.method === 'POST') return await adminCreateAgenda(req, res);
      if (url === '/api/admin/parties' && req.method === 'GET') return await adminGetParties(req, res);
      if (url === '/api/admin/parties' && req.method === 'POST') return await adminCreateParty(req, res);
      // Welcome content (public GET, admin PUT)
      if (url === '/api/admin/welcome-content' && req.method === 'GET') return await adminGetWelcomeContent(req, res);
      if (url === '/api/admin/welcome-content' && req.method === 'PUT') return await adminUpdateWelcomeContent(req, res);
      // Mail settings / test (new canonical endpoints)
      if (url === '/api/admin/mail/settings' && req.method === 'GET') return await adminGetMailSettings(req, res);
      if (url === '/api/admin/mail/settings' && req.method === 'PUT') return await adminUpdateMailSettings(req, res);
      if (url === '/api/admin/mail/test' && req.method === 'POST') return await adminSendTestEmail(req, res);
      // Backward compatible legacy endpoint
      if (url === '/api/admin/email/test' && req.method === 'POST') return await adminSendTestEmail(req, res);
      if (url === '/api/admin/notifications' && req.method === 'POST') return await adminSendNotification(req, res);
      if (url === '/api/admin/comments/pending' && req.method === 'GET') return await adminListPendingComments(req, res);
      if (url === '/api/admin/comments' && req.method === 'GET') return await adminGetComments(req, res);
      if (url === '/api/admin/storage/list' && req.method === 'GET') return await adminStorageList(req, res);
      if (url === '/api/admin/storage/delete' && req.method === 'POST') return await adminStorageDelete(req, res);
      if (url === '/api/admin/storage/replace' && req.method === 'POST') return await adminStorageReplace(req, res);
      if (url.startsWith('/api/admin/notification-rules/') && req.method === 'PUT') {
        const ruleId = url.split('/api/admin/notification-rules/')[1];
        return await adminUpdateNotificationRule(req, res, ruleId);
      }
      if (url.startsWith('/api/admin/notification-rules/') && req.method === 'DELETE') {
        const ruleId = url.split('/api/admin/notification-rules/')[1];
        return await adminDeleteNotificationRule(req, res, ruleId);
      }
      if (url.startsWith('/api/admin/ads/') && req.method === 'PUT') {
        const adId = url.split('/api/admin/ads/')[1];
        return await adminUpdateAd(req, res, adId);
      }
      if (url.startsWith('/api/admin/ads/') && req.method === 'DELETE') {
        const adId = url.split('/api/admin/ads/')[1];
        return await adminDeleteAd(req, res, adId);
      }
      if (url.startsWith('/api/admin/workflows/') && req.method === 'PUT') {
        const workflowId = url.split('/api/admin/workflows/')[1];
        return await adminUpdateWorkflow(req, res, workflowId);
      }
      if (url.startsWith('/api/admin/workflows/') && req.method === 'DELETE') {
        const workflowId = url.split('/api/admin/workflows/')[1];
        return await adminDeleteWorkflow(req, res, workflowId);
      }
      if (url.startsWith('/api/admin/revenue/entries/') && req.method === 'DELETE') {
        const entryId = url.split('/api/admin/revenue/entries/')[1];
        return await adminDeleteRevenueEntry(req, res, entryId);
      }
      if (url.startsWith('/api/admin/api-keys/') && req.method === 'PUT') {
        const keyId = url.split('/api/admin/api-keys/')[1];
        return await adminUpdateApiKey(req, res, keyId);
      }
      if (url.startsWith('/api/admin/api-keys/') && req.method === 'DELETE') {
        const keyId = url.split('/api/admin/api-keys/')[1];
        return await adminDeleteApiKey(req, res, keyId);
      }
      if (url.startsWith('/api/admin/security/devices/') && req.method === 'PUT') {
        const deviceId = url.split('/api/admin/security/devices/')[1];
        return await adminUpdateTrustedDevice(req, res, deviceId);
      }
      if (url.startsWith('/api/admin/jobs/') && req.method === 'PUT') {
        const jobId = url.split('/api/admin/jobs/')[1];
        return await adminUpdateJob(req, res, jobId);
      }
      if (url.startsWith('/api/admin/sources/') && req.method === 'PUT') {
        const sourceId = url.split('/api/admin/sources/')[1];
        return await adminUpdateSource(req, res, sourceId);
      }
      if (url.startsWith('/api/admin/sources/') && req.method === 'DELETE') {
        const sourceId = url.split('/api/admin/sources/')[1];
        return await adminDeleteSource(req, res, sourceId);
      }
      if (url.startsWith('/api/admin/email-templates/') && req.method === 'PUT') {
        const templateId = url.split('/api/admin/email-templates/')[1];
        return await adminUpdateEmailTemplate(req, res, templateId);
      }
      if (url.startsWith('/api/admin/email-templates/') && req.method === 'DELETE') {
        const templateId = url.split('/api/admin/email-templates/')[1];
        return await adminDeleteEmailTemplate(req, res, templateId);
      }
      if (url.startsWith('/api/admin/payments/plans/') && req.method === 'PUT') {
        const planId = url.split('/api/admin/payments/plans/')[1];
        return await adminUpdatePaymentPlan(req, res, planId);
      }
      if (url.startsWith('/api/admin/payments/plans/') && req.method === 'DELETE') {
        const planId = url.split('/api/admin/payments/plans/')[1];
        return await adminDeletePaymentPlan(req, res, planId);
      }
      if (url.startsWith('/api/admin/payments/transactions/') && req.method === 'DELETE') {
        const txId = url.split('/api/admin/payments/transactions/')[1];
        return await adminDeletePaymentTransaction(req, res, txId);
      }
      if (url.startsWith('/api/admin/parties/') && req.method === 'GET') {
        const rest = url.split('/api/admin/parties/')[1] || '';
        const parts = rest.split('/').filter(Boolean);
        const pid = parts[0];
        const tail = parts[1];
        if (pid && tail === 'hierarchy') return await adminGetPartyHierarchy(req, res, pid);
      }
      if (url.startsWith('/api/admin/parties/') && req.method === 'POST') {
        const rest = url.split('/api/admin/parties/')[1] || '';
        const parts = rest.split('/').filter(Boolean);
        const pid = parts[0];
        const tail = parts[1];
        if (pid && tail === 'assign') return await adminAssignPartyUnit(req, res, pid);
        if (pid && tail === 'unassign') return await adminUnassignPartyUnit(req, res, pid);
        if (pid && tail === 'chair') return await adminSetPartyChair(req, res, pid);
      }
      if (url.startsWith('/api/admin/users/') && req.method === 'PUT') {
        const parts = url.split('/api/admin/users/')[1].split('/');
        const userId = parts[0];
        if (parts[1] === 'password') {
          return await adminChangeUserPassword(req, res, userId);
        }
        return await adminUpdateUser(req, res, userId);
      }
      if (url.startsWith('/api/admin/users/') && req.method === 'DELETE') {
        const userId = url.split('/api/admin/users/')[1];
        return await adminDeleteUser(req, res, userId);
      }
      if (url.startsWith('/api/admin/posts/') && req.method === 'DELETE') {
        const postId = url.split('/api/admin/posts/')[1];
        return await adminDeletePost(req, res, postId);
      }
      if (url.startsWith('/api/admin/posts/') && req.method === 'PUT') {
        const postId = url.split('/api/admin/posts/')[1];
        return await adminUpdatePost(req, res, postId);
      }
      if (url.startsWith('/api/admin/agendas/') && req.method === 'PUT') {
        const agendaId = url.split('/api/admin/agendas/')[1];
        return await adminUpdateAgenda(req, res, agendaId);
      }
      if (url.startsWith('/api/admin/agendas/') && req.method === 'DELETE') {
        const agendaId = url.split('/api/admin/agendas/')[1];
        return await adminDeleteAgenda(req, res, agendaId);
      }
      if (url.startsWith('/api/admin/parties/') && req.method === 'PUT') {
        const partyId = url.split('/api/admin/parties/')[1];
        return await adminUpdateParty(req, res, partyId);
      }
      if (url.startsWith('/api/admin/parties/') && req.method === 'DELETE') {
        const partyId = url.split('/api/admin/parties/')[1];
        return await adminDeleteParty(req, res, partyId);
      }
      if (url.startsWith('/api/admin/comments/') && req.method === 'POST') {
        const rest = url.split('/api/admin/comments/')[1] || '';
        const parts = rest.split('/').filter(Boolean);
        const commentId = parts[0];
        const tail = parts[1];
        if (commentId && tail === 'approve') return await adminApproveComment(req, res, commentId);
      }
      if (url.startsWith('/api/admin/comments/') && req.method === 'DELETE') {
        const commentId = url.split('/api/admin/comments/')[1] || '';
        return await adminDeleteComment(req, res, commentId);
      }
      if (url.startsWith('/api/admin/comments/') && req.method === 'PUT') {
        const commentId = url.split('/api/admin/comments/')[1] || '';
        return await adminUpdateComment(req, res, commentId);
      }

      // Search
      if (url === '/api/search' && req.method === 'GET') return await searchAll(req, res);

      // Health
      if (url === '/api/health') return res.json({ status: 'ok', time: new Date().toISOString() });

      res.status(404).json({ error: 'Endpoint Not Found (Monolith)', url });
  } catch (error) {
      const requestId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      console.error('API Error:', error);
      if (isProd()) {
        res.status(500).json({ error: 'Sunucu hatası.', requestId });
        return;
      }
      res.status(500).json({ error: error.message, stack: error.stack, requestId });
  }
}
// Cache bust for mail config - Sat Jan 10 02:05:49 +03 2026
