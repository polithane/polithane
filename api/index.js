import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Vercel Monolith API - Last Updated: Now
// --- CONFIG & HELPERS ---
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-insecure-secret');

function getJwtSecret() {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is missing in production environment');
  return JWT_SECRET;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization');
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) throw new Error('Supabase env missing');
  return { supabaseUrl, key };
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

async function supabaseRestDelete(path, params) {
  return await supabaseRestRequest('DELETE', path, params, undefined);
}

// --- CONTROLLERS ---

async function getPosts(req, res) {
    const { limit = '50', offset = '0', party_id, user_id, user_ids, category, order = 'created_at.desc' } = req.query;
    const params = {
        // Keep selects schema-agnostic: embed with *
        select: '*,user:users(*),party:parties(*)',
        limit: String(limit),
        offset: String(offset),
        is_deleted: 'eq.false'
    };
    if (order) params.order = order;
    if (party_id) params.party_id = `eq.${party_id}`;
    if (user_id) params.user_id = `eq.${user_id}`;
    if (category) params.category = `eq.${category}`;
    if (user_ids) {
        const raw = String(user_ids);
        const list = raw
          .split(',')
          .map((s) => s.trim())
          .filter((id) => /^\d+$/.test(id) || /^[0-9a-fA-F-]{8,}$/.test(id));
        if (list.length > 0) params.user_id = `in.(${list.join(',')})`;
    }
    const data = await supabaseRestGet('posts', params);
    res.json(Array.isArray(data) ? data : []);
}

async function getPostById(req, res, id) {
    const rows = await supabaseRestGet('posts', {
        select: '*,user:users(*),party:parties(*)',
        id: `eq.${id}`,
        limit: '1'
    });
    const post = rows?.[0];
    if (!post) return res.status(404).json({ success: false, error: 'Post bulunamadı' });
    res.json({ success: true, data: post });
}

async function getPostComments(req, res, postId) {
    const rows = await supabaseRestGet('comments', {
        select: '*,user:users(*)',
        post_id: `eq.${postId}`,
        order: 'created_at.desc'
    });
    res.json({ success: true, data: rows || [] });
}

async function addPostComment(req, res, postId) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = await readJsonBody(req);
    const content = (body.content || '').trim();
    const parent_id = body.parent_id || null;
    if (!content) return res.status(400).json({ success: false, error: 'Yorum boş olamaz' });
    const inserted = await supabaseRestInsert('comments', [{
        post_id: postId,
        user_id: auth.id,
        content,
        parent_id
    }]);
    res.status(201).json({ success: true, data: inserted?.[0] || null });
}

async function togglePostLike(req, res, postId) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const userId = auth.id;
    const existing = await supabaseRestGet('likes', { select: 'id', post_id: `eq.${postId}`, user_id: `eq.${userId}`, limit: '1' }).catch(() => []);
    if (existing && existing.length > 0) {
        await supabaseRestDelete('likes', { post_id: `eq.${postId}`, user_id: `eq.${userId}` });
        return res.json({ success: true, action: 'unliked' });
    }
    await supabaseRestInsert('likes', [{ post_id: postId, user_id: userId }]);
    return res.json({ success: true, action: 'liked' });
}

async function createPost(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = await readJsonBody(req);

    const content = String(body.content_text ?? body.content ?? '').trim();
    const category = String(body.category || 'general').trim();
    const media_urls = Array.isArray(body.media_urls) ? body.media_urls : [];
    const content_type = String(body.content_type || (media_urls.length > 0 ? 'image' : 'text')).trim();

    if (!content) return res.status(400).json({ success: false, error: 'İçerik boş olamaz.' });
    if (content.length > 5000) return res.status(400).json({ success: false, error: 'İçerik çok uzun.' });

    // Get party_id from user (if exists)
    const userRows = await supabaseRestGet('users', { select: 'id,party_id', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
    const party_id = userRows?.[0]?.party_id ?? null;

    // Try schema variants (content/content_text)
    let inserted;
    try {
      inserted = await supabaseRestInsert('posts', [{
        user_id: auth.id,
        party_id,
        content_type,
        content_text: content,
        category,
        media_urls,
        is_deleted: false
      }]);
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('content_text') || msg.includes('content_type')) {
        inserted = await supabaseRestInsert('posts', [{
          user_id: auth.id,
          party_id,
          content,
          category,
          media_urls,
          is_deleted: false
        }]);
      } else {
        throw e;
      }
    }
    const post = inserted?.[0] || null;
    res.status(201).json({ success: true, data: post });
}

async function getParties(req, res) {
    const data = await supabaseRestGet('parties', {
      select: '*',
      is_active: 'eq.true',
      order: 'follower_count.desc',
    });
    res.json(data || []);
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
    const { search, username, id, party_id, user_type, province, limit = 20, offset = 0, order = 'polit_score.desc' } = req.query;

    // Direct lookup by username or id (frontend uses this form)
    if (username || id) {
        const key = username ? 'username' : 'id';
        const value = username ? String(username) : String(id);
        const rows = await supabaseRestGet('users', { select: '*,party:parties(*)', [key]: `eq.${value}`, limit: '1' });
        const user = rows?.[0];
        if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        return res.json({ success: true, data: user });
    }

    // Filter lists (party/city pages use this form) - return ARRAY
    if (party_id || user_type || province) {
      const params = {
        select: '*,party:parties(*)',
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

    // Search list
    if (!search || String(search).length < 3) return res.json([]);
    const data = await supabaseRestGet('users', {
        select: '*,party:parties(*)',
        or: `(username.ilike.*${search}*,full_name.ilike.*${search}*)`,
        limit: String(Math.min(parseInt(limit), 50))
    });
    res.json(data || []);
}

async function getUserDetail(req, res, id) {
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
    res.json({ success: true, data: user });
}

async function getUserPosts(req, res, username) {
    // Resolve user id by username
    const users = await supabaseRestGet('users', { select: 'id,username', username: `eq.${username}`, limit: '1' });
    const user = users?.[0];
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
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

function requireAdmin(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  if (!auth.is_admin) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return null;
  }
  return auth;
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
  requireAdmin(req, res);
  // counts
  const [userCount, postCount] = await Promise.all([
    supabaseCount('users', { select: 'id' }).catch(() => 0),
    supabaseCount('posts', { select: 'id', is_deleted: 'eq.false' }).catch(() => 0),
  ]);
  res.json({
    success: true,
    data: {
      totalUsers: userCount,
      totalPosts: postCount,
    },
  });
}

async function adminGetUsers(req, res) {
  requireAdmin(req, res);
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
  requireAdmin(req, res);
  const body = await readJsonBody(req);
  const allowed = {};
  if (typeof body.is_verified === 'boolean') allowed.is_verified = body.is_verified;
  if (typeof body.is_active === 'boolean') allowed.is_active = body.is_active;
  if (typeof body.user_type === 'string') allowed.user_type = body.user_type;
  if (Object.keys(allowed).length === 0) return res.status(400).json({ success: false, error: 'Geçersiz istek.' });
  const updated = await supabaseRestPatch('users', { id: `eq.${userId}` }, allowed);
  res.json({ success: true, data: updated?.[0] || null });
}

async function adminDeleteUser(req, res, userId) {
  requireAdmin(req, res);
  const updated = await supabaseRestPatch('users', { id: `eq.${userId}` }, { is_active: false });
  res.json({ success: true, data: updated?.[0] || null });
}

async function adminGetPosts(req, res) {
  requireAdmin(req, res);
  const { page = 1, limit = 20, search } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const baseParams = {
    select: '*,user:users(*),party:parties(*)',
    is_deleted: 'eq.false',
    order: 'created_at.desc',
    limit: String(limitNum),
    offset: String(offset),
  };

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

  const total = await supabaseCount('posts', { select: 'id', is_deleted: 'eq.false' }).catch(() => 0);
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
  requireAdmin(req, res);
  const updated = await supabaseRestPatch('posts', { id: `eq.${postId}` }, { is_deleted: true });
  res.json({ success: true, data: updated?.[0] || null });
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

    const users = await supabaseRestGet('users', { 
        select: '*',
        or: `(email.eq.${loginValue},username.eq.${loginValue})`,
        limit: '1'
    });
    
    const user = users[0];
    if (!user) return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    
    if (!user.password_hash) return res.status(401).json({ success: false, error: 'Şifre hatalı.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Şifre hatalı.' });
    
    const token = signJwt({ id: user.id, username: user.username, email: user.email, is_admin: !!user.is_admin });
    delete user.password_hash;
    
    res.json({ success: true, message: 'Giriş başarılı.', data: { user, token } });
}

async function authForgotPassword(req, res) {
    const ip = getClientIp(req);
    const rl = rateLimit(`forgot:${ip}`, { windowMs: 60_000, max: 3 });
    if (!rl.ok) return res.status(429).json({ success: false, error: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.' });

    // Keep response generic to prevent user enumeration.
    res.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderilecektir.' });
}

async function authRegister(req, res) {
    const body = await readJsonBody(req);
    const { email, password, full_name, user_type = 'citizen', province, district, party_id, politician_type, metadata = {}, document, is_claim, claim_user_id } = body;
    
    if (!email || !password || !full_name) return res.status(400).json({ success: false, error: 'Eksik bilgi.' });

    // Server-side email validation (avoid DB checks for invalid emails)
    const emailStr = String(email).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasTurkish = /[çğıöşüİÇĞÖŞÜ]/.test(emailStr);
    if (!emailRegex.test(emailStr) || hasTurkish) {
      return res.status(400).json({ success: false, error: 'Geçerli bir email adresi giriniz.' });
    }
    
    const emailCheck = await supabaseRestGet('users', { select: 'id', email: `eq.${email}`, limit: '1' });
    if (emailCheck.length > 0) return res.status(400).json({ success: false, error: 'Email kayıtlı.' });

    let username = email.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase().slice(0, 20);
    if (username.length < 3) username = `user_${Date.now()}`;
    const checkUser = async (u) => (await supabaseRestGet('users', { select: 'id', username: `eq.${u}`, limit: '1' })).length > 0;
    if (await checkUser(username)) {
        username = `${username.slice(0,15)}_${Math.floor(Math.random()*1000)}`;
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

    if (is_claim === 'true' && claim_user_id) {
        metadata.claim_request = { target_user_id: claim_user_id, status: 'pending' };
    }

    const password_hash = await bcrypt.hash(password, 10);
    const cleanEmpty = (v) => (v === '' ? null : v);
    const userData = {
        username,
        email,
        password_hash,
        full_name,
        user_type,
        province: cleanEmpty(province),
        district_name: cleanEmpty(district),
        party_id: cleanEmpty(party_id),
        politician_type: cleanEmpty(politician_type),
        is_verified: user_type === 'citizen',
        is_active: true,
        email_verified: true,
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
            is_verified: user_type === 'citizen',
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

    // First-login notifications (try title/message schema, fallback to minimal)
    await supabaseRestInsert('notifications', [
      {
        user_id: user.id,
        type: 'system',
        title: 'Hoş geldiniz!',
        message: 'Polithane ailesine katıldığınız için çok mutluyuz. Profilinizi tamamlayarak daha güçlü bir deneyim yaşayabilirsiniz.',
        is_read: false
      },
      {
        user_id: user.id,
        type: 'system',
        title: 'Profilinizi tamamlayın',
        message: 'Eksik profil bilgilerinizi doldurmanızı rica ederiz. Bu, doğrulama ve görünürlük açısından önemlidir.',
        is_read: false
      }
    ]).catch(async (err) => {
      const msg = String(err?.message || '');
      if (msg.includes('title') || msg.includes('message')) {
        await supabaseRestInsert('notifications', [
          { user_id: user.id, type: 'system', is_read: false },
          { user_id: user.id, type: 'system', is_read: false }
        ]).catch(() => {});
      }
    });

    const token = signJwt({ id: user.id, username: user.username, email: user.email, user_type: user.user_type, is_admin: !!user.is_admin });
    
    res.status(201).json({ success: true, message: 'Kayıt başarılı.', data: { user, token, requiresApproval: user_type !== 'citizen' } });
}

async function authMe(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const rows = await supabaseRestGet('users', { select: '*,party:parties(*)', id: `eq.${auth.id}`, limit: '1' });
    const user = rows?.[0];
    if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    res.json({ success: true, data: { user } });
}

async function authChangePassword(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = await readJsonBody(req);
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Eksik bilgi.' });
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

  const rows = await supabaseRestGet('messages', {
    select: '*',
    or: `(sender_id.eq.${userId},receiver_id.eq.${userId})`,
    order: 'created_at.desc',
    limit: '500',
  }).catch(() => []);

  const byOther = new Map();
  for (const m of rows || []) {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!otherId) continue;
    const prev = byOther.get(otherId) || { unread_count: 0 };
    const unreadInc = m.receiver_id === userId && m.is_read === false ? 1 : 0;
    if (!byOther.has(otherId)) {
      byOther.set(otherId, {
        conversation_id: `${userId}-${otherId}`,
        participant_id: otherId,
        last_message: m.content,
        last_message_time: m.created_at,
        unread_count: unreadInc,
        message_type: 'regular',
      });
    } else {
      // since ordered desc, first occurrence is last_message
      byOther.set(otherId, { ...prev, unread_count: (prev.unread_count || 0) + unreadInc });
    }
  }

  // attach user profiles
  const participants = Array.from(byOther.keys());
  let users = [];
  if (participants.length > 0) {
    users = await supabaseRestGet('users', {
      select: '*,party:parties(*)',
      id: `in.(${participants.join(',')})`,
      limit: String(Math.min(participants.length, 500)),
    }).catch(() => []);
  }
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  const out = Array.from(byOther.values())
    .map((c) => ({ ...c, participant: userMap.get(c.participant_id) || null }))
    .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

  res.json({ success: true, data: out });
}

async function getMessagesBetween(req, res, otherId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;

  const rows = await supabaseRestGet('messages', {
    select: '*',
    or: `(and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId}))`,
    order: 'created_at.asc',
    limit: '500',
  }).catch(() => []);

  // mark received messages as read
  await supabaseRestPatch('messages', { receiver_id: `eq.${userId}`, sender_id: `eq.${otherId}`, is_read: 'eq.false' }, { is_read: true }).catch(() => {});

  res.json({ success: true, data: rows || [] });
}

async function sendMessage(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const body = await readJsonBody(req);
  const receiver_id = body.receiver_id;
  const content = String(body.content || '').trim();
  if (!receiver_id || !/^\d+$/.test(String(receiver_id))) return res.status(400).json({ success: false, error: 'Geçersiz alıcı.' });
  if (!content) return res.status(400).json({ success: false, error: 'Mesaj boş olamaz.' });
  if (content.length > 2000) return res.status(400).json({ success: false, error: 'Mesaj çok uzun.' });

  const inserted = await supabaseRestInsert('messages', [{
    sender_id: auth.id,
    receiver_id: Number(receiver_id),
    content,
    is_read: false,
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
  }]);
  res.status(201).json({ success: true, data: inserted?.[0] || null });
}

async function deleteMessage(req, res, messageId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;

  const rows = await supabaseRestGet('messages', { select: '*', id: `eq.${messageId}`, limit: '1' }).catch(() => []);
  const msg = rows?.[0];
  if (!msg) return res.status(404).json({ success: false, error: 'Mesaj bulunamadı' });

  const patch = {};
  if (msg.sender_id === userId) patch.is_deleted_by_sender = true;
  if (msg.receiver_id === userId) patch.is_deleted_by_receiver = true;
  if (Object.keys(patch).length === 0) return res.status(403).json({ success: false, error: 'Forbidden' });

  const updated = await supabaseRestPatch('messages', { id: `eq.${messageId}` }, patch);
  res.json({ success: true, data: updated?.[0] || null });
}

// -----------------------
// NOTIFICATIONS
// -----------------------

async function getNotifications(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const { limit = 50, offset = 0 } = req.query;
  const rows = await supabaseRestGet('notifications', {
    select: '*,actor:users(*),post:posts(*),comment:comments(*)',
    user_id: `eq.${auth.id}`,
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  }).catch(() => []);
  res.json({ success: true, data: rows || [] });
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
  requireAdmin(req, res);
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
    await supabaseRestInsert('notifications', rows.slice(i, i + chunkSize));
  }
  res.json({ success: true, sent: targets.length });
}

// --- DISPATCHER ---
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
      const url = req.url.split('?')[0];
      
      // Public Lists
      if (url === '/api/posts' && req.method === 'POST') return await createPost(req, res);
      if ((url === '/api/posts' || url === '/api/posts/') && req.method === 'GET') return await getPosts(req, res);
      if (url === '/api/parties' || url === '/api/parties/') return await getParties(req, res);

      // Posts (detail + interactions)
      if (url.startsWith('/api/posts/') && !url.endsWith('/')) {
          const rest = url.split('/api/posts/')[1];
          const parts = rest.split('/').filter(Boolean);
          const postId = parts[0];
          const tail = parts[1];
          if (postId && !tail && req.method === 'GET') return await getPostById(req, res, postId);
          if (postId && tail === 'like' && req.method === 'POST') return await togglePostLike(req, res, postId);
          if (postId && tail === 'comments' && req.method === 'GET') return await getPostComments(req, res, postId);
          if (postId && tail === 'comments' && req.method === 'POST') return await addPostComment(req, res, postId);
      }
      
      // Detail Pages (Pattern Matching)
      if (url.startsWith('/api/parties/')) {
          const id = url.split('/api/parties/')[1];
          if (id) return await getPartyDetail(req, res, id);
      }
      
      if (url === '/api/users' || url === '/api/users/') return await getUsers(req, res); // Search
      if (url.startsWith('/api/users/')) {
          const rest = url.split('/api/users/')[1];
          const parts = rest.split('/').filter(Boolean);
          const id = parts[0];
          const tail = parts[1];
          if (id && tail === 'posts' && req.method === 'GET') return await getUserPosts(req, res, id);
          if (id && !tail) return await getUserDetail(req, res, id); // Profile
      }

      // Auth
      if (url === '/api/auth/check-availability') return await authCheckAvailability(req, res);
      if (url === '/api/auth/login' && req.method === 'POST') return await authLogin(req, res);
      if (url === '/api/auth/register' && req.method === 'POST') return await authRegister(req, res);
      if (url === '/api/auth/forgot-password' && req.method === 'POST') return await authForgotPassword(req, res);
      if (url === '/api/auth/me' && req.method === 'GET') return await authMe(req, res);
      if (url === '/api/auth/change-password' && req.method === 'POST') return await authChangePassword(req, res);
      if (url === '/api/auth/logout') return res.json({ success: true });

      // Notifications
      if (url === '/api/notifications' && req.method === 'GET') return await getNotifications(req, res);
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
      if (url.startsWith('/api/messages/send') && req.method === 'POST') return await sendMessage(req, res);
      if (url.startsWith('/api/messages/') && req.method === 'GET') {
        const otherId = url.split('/api/messages/')[1];
        return await getMessagesBetween(req, res, otherId);
      }
      if (url.startsWith('/api/messages/') && req.method === 'DELETE') {
        const messageId = url.split('/api/messages/')[1];
        return await deleteMessage(req, res, messageId);
      }

      // Admin
      if (url === '/api/admin/stats' && req.method === 'GET') return await adminGetStats(req, res);
      if (url === '/api/admin/users' && req.method === 'GET') return await adminGetUsers(req, res);
      if (url === '/api/admin/posts' && req.method === 'GET') return await adminGetPosts(req, res);
      if (url === '/api/admin/notifications' && req.method === 'POST') return await adminSendNotification(req, res);
      if (url.startsWith('/api/admin/users/') && req.method === 'PUT') {
        const userId = url.split('/api/admin/users/')[1];
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

      // Health
      if (url === '/api/health') return res.json({ status: 'ok', time: new Date().toISOString() });

      res.status(404).json({ error: 'Endpoint Not Found (Monolith)', url });
  } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
  }
}
