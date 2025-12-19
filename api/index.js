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

// Notifications table schema differs between environments (some don't have title/message).
// This helper tries inserting as-is, then falls back to minimal columns if needed.
async function supabaseInsertNotifications(rows) {
  try {
    return await supabaseRestInsert('notifications', rows);
  } catch (e) {
    const msg = String(e?.message || '');
    const lower = msg.toLowerCase();
    if (lower.includes('title') || lower.includes('message')) {
      const stripped = (rows || []).map((r) => {
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
    const { limit = '50', offset = '0', party_id, user_id, user_ids, category, agenda_tag, order = 'created_at.desc' } = req.query;
    const auth = verifyJwtFromRequest(req);
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
    const rows = await supabaseRestGet('comments', params).catch(() => []);
    res.json({ success: true, data: rows || [] });
}

function analyzeCommentContent(input) {
  const text = String(input || '').trim();
  if (!text) return { ok: false, error: 'Yorum boş olamaz.' };
  if (text.length > 300) return { ok: false, error: 'Yorum en fazla 300 karakter olabilir.' };

  const lower = text.toLocaleLowerCase('tr-TR');

  // Basic threat heuristics (profanity/harassment/links/code).
  const reasons = [];
  if (/(https?:\/\/|www\.)/i.test(text)) reasons.push('link');
  if (/<\s*script|\bon\w+\s*=|javascript:/i.test(text)) reasons.push('zararlı_kod');
  if (/\b(select|union|drop|insert|update|delete)\b/i.test(text)) reasons.push('sql');
  if (/(?:\b(amk|aq|orospu|siktir|yarrak|ibne|piç|kahpe|ananı)\b)/i.test(lower)) reasons.push('hakaret');
  if (/(?:\b(öl|öldür|vur|kes|tehdit)\b)/i.test(lower)) reasons.push('tehdit');

  const flagged = reasons.length > 0;
  return { ok: true, text, flagged, reasons };
}

async function notifyAdminsAboutComment({ type, commentId, postId, actorId, title, message }) {
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
}

async function addPostComment(req, res, postId) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const ip = getClientIp(req);
    const rl = rateLimit(`comment:${auth.id}:${ip}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) {
      return res.status(429).json({ success: false, error: 'Çok fazla yorum denemesi. Lütfen 1 dakika sonra tekrar deneyin.' });
    }
    const body = await readJsonBody(req);
    const analyzed = analyzeCommentContent(body.content || '');
    if (!analyzed.ok) return res.status(400).json({ success: false, error: analyzed.error });
    const content = analyzed.text;
    const parent_id = body.parent_id || null;

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
      const postRows = await supabaseRestGet('posts', { select: 'id,user_id', id: `eq.${postId}`, limit: '1' }).catch(() => []);
      const ownerId = postRows?.[0]?.user_id ?? null;
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
      }
    } catch {
      // best-effort
    }

    if (pending && row?.id) {
      await notifyAdminsAboutComment({
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
  const analyzed = analyzeCommentContent(body.content || '');
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
    await notifyAdminsAboutComment({
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

  // Load comment for context (best effort)
  const rows = await supabaseRestGet('comments', { select: '*', id: `eq.${commentId}`, limit: '1' }).catch(() => []);
  const c = rows?.[0] || null;
  const postId = c?.post_id || null;

  await notifyAdminsAboutComment({
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

  await notifyAdminsAboutComment({
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

async function trackPostShare(req, res, postId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
      }
    }
  } catch {
    // noop
  }
  return res.json({ success: true });
}

async function toggleCommentLike(req, res, commentId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // Try to use likes table with comment_id if available
  let supportsCommentId = true;
  try {
    await supabaseRestGet('likes', { select: 'id', comment_id: `eq.${commentId}`, user_id: `eq.${auth.id}`, limit: '1' });
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('comment_id')) supportsCommentId = false;
  }

  const commentRows = await supabaseRestGet('comments', { select: '*', id: `eq.${commentId}`, limit: '1' }).catch(() => []);
  const c = commentRows?.[0];
  if (!c) return res.status(404).json({ success: false, error: 'Yorum bulunamadı.' });

  if (supportsCommentId) {
    const existing = await supabaseRestGet('likes', { select: 'id', comment_id: `eq.${commentId}`, user_id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
    if (existing && existing.length > 0) {
      await supabaseRestDelete('likes', { comment_id: `eq.${commentId}`, user_id: `eq.${auth.id}` }).catch(() => null);
      const next = Math.max(0, Number(c.like_count || 0) - 1);
      await supabaseRestPatch('comments', { id: `eq.${commentId}` }, { like_count: next }).catch(() => null);
      return res.json({ success: true, action: 'unliked', like_count: next });
    }
    await supabaseRestInsert('likes', [{ comment_id: commentId, user_id: auth.id }]);
    const next = Number(c.like_count || 0) + 1;
    await supabaseRestPatch('comments', { id: `eq.${commentId}` }, { like_count: next }).catch(() => null);
    return res.json({ success: true, action: 'liked', like_count: next });
  }

  // Fallback: track liked comment ids in user.metadata (requires users.metadata)
  const users = await supabaseRestGet('users', { select: 'id,metadata', id: `eq.${auth.id}`, limit: '1' }).catch(() => []);
  const me = users?.[0] || null;
  const meta = me?.metadata && typeof me.metadata === 'object' ? me.metadata : {};
  const liked = Array.isArray(meta.liked_comment_ids) ? meta.liked_comment_ids.map(String) : [];
  const cid = String(commentId);
  const has = liked.includes(cid);
  const nextLiked = has ? liked.filter((x) => x !== cid) : [cid, ...liked].slice(0, 5000);
  const nextCount = Math.max(0, Number(c.like_count || 0) + (has ? -1 : 1));

  await safeUserPatch(auth.id, { metadata: { ...meta, liked_comment_ids: nextLiked } }).catch(() => null);
  await supabaseRestPatch('comments', { id: `eq.${commentId}` }, { like_count: nextCount }).catch(() => null);
  return res.json({ success: true, action: has ? 'unliked' : 'liked', like_count: nextCount });
}

async function adminListPendingComments(req, res) {
  requireAdmin(req, res);
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
  requireAdmin(req, res);
  const updated = await supabaseRestPatch('comments', { id: `eq.${commentId}` }, { is_deleted: false }).catch(() => []);
  return res.json({ success: true, data: updated?.[0] || null });
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
      }
    } catch {
      // best-effort
    }
    return res.json({ success: true, action: 'liked' });
}

async function createPost(req, res) {
    const auth = verifyJwtFromRequest(req);
    if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
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

    if (!content) return res.status(400).json({ success: false, error: 'İçerik boş olamaz.' });
    if (content.length > 5000) return res.status(400).json({ success: false, error: 'İçerik çok uzun.' });

    // Get party_id from user (if exists)
    const userRows = await supabaseRestGet('users', {
      select: 'id,party_id,user_type,is_verified,is_admin',
      id: `eq.${auth.id}`,
      limit: '1',
    }).catch(() => []);
    const u = userRows?.[0] || null;
    const party_id = u?.party_id ?? null;

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

    // Try schema variants (content/content_text)
    let inserted;
    try {
      inserted = await supabaseRestInsert('posts', [{
        user_id: auth.id,
        party_id,
        content_type,
        content_text: content,
        category,
        agenda_tag,
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
          agenda_tag,
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

  const updated = await supabaseRestPatch(
    'posts',
    { id: `eq.${id}`, user_id: `eq.${auth.id}` },
    { is_deleted: true, updated_at: new Date().toISOString() }
  ).catch(() => []);
  return res.json({ success: true, data: updated?.[0] || null });
}

async function getAgendas(req, res) {
    const { limit = 50, search, is_trending, is_active } = req.query || {};
    const params = {
      select: '*',
      limit: String(Math.min(Math.max(parseInt(limit) || 50, 1), 200)),
      order: 'trending_score.desc',
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

    const rows = await supabaseRestGet('agendas', params).catch(() => []);
    res.json({ success: true, data: Array.isArray(rows) ? rows : [] });
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
    const auth = verifyJwtFromRequest(req);
    const { search, username, id, party_id, user_type, province, limit = 20, offset = 0, order = 'polit_score.desc' } = req.query;

    // Direct lookup by username or id (frontend uses this form)
    if (username || id) {
        const key = username ? 'username' : 'id';
        const value = username ? String(username) : String(id);
        const rows = await supabaseRestGet('users', { select: '*,party:parties(*)', [key]: `eq.${value}`, limit: '1' });
        const user = rows?.[0];
        if (!user) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
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
    select: 'id,username,full_name,avatar_url,user_type,politician_type,party_id,province,is_verified,is_active,metadata,party:parties(*)',
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

async function toggleFollow(req, res, targetId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tid = String(targetId || '').trim();
  const isValidId = /^\d+$/.test(tid) || /^[0-9a-fA-F-]{36}$/.test(tid);
  if (!tid || !isValidId) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  if (String(auth.id) === tid) return res.status(400).json({ success: false, error: 'Kendinizi takip edemezsiniz.' });

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

  return res.json({ success: true, action: 'followed' });
}

async function getFollowers(req, res, targetId) {
  const tid = String(targetId || '').trim();
  if (!tid) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  const { limit = 50, offset = 0 } = req.query || {};
  const rows = await supabaseRestGet('follows', {
    select: 'follower:users(*)',
    following_id: `eq.${tid}`,
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  }).catch(() => []);
  const list = (rows || []).map((r) => r.follower).filter(Boolean);
  return res.json({ success: true, data: list });
}

async function getFollowing(req, res, targetId) {
  const tid = String(targetId || '').trim();
  if (!tid) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
  const { limit = 50, offset = 0 } = req.query || {};
  const rows = await supabaseRestGet('follows', {
    select: 'following:users(*)',
    follower_id: `eq.${tid}`,
    order: 'created_at.desc',
    limit: String(Math.min(parseInt(limit, 10) || 50, 200)),
    offset: String(parseInt(offset, 10) || 0),
  }).catch(() => []);
  const list = (rows || []).map((r) => r.following).filter(Boolean);
  return res.json({ success: true, data: list });
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

  const username = 'admin';
  const email = 'admin@polithane.com';
  const full_name = 'Admin';

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
  const envUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || '';
  if (envUrl) return String(envUrl).replace(/\/+$/, '');
  // best-effort from request
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (host) return `${proto}://${host}`.replace(/\/+$/, '');
  return 'https://polithane.vercel.app';
}

function sha256Hex(input) {
  // Node runtime includes crypto
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

async function sendSendGridEmail({ to, subject, html, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!apiKey || !from) {
    throw new Error('Email is not configured (SENDGRID_API_KEY / SENDGRID_FROM missing).');
  }
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: 'Polithane' },
    subject,
    content: [
      { type: 'text/plain', value: text || '' },
      { type: 'text/html', value: html || '' },
    ],
  };
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`SendGrid Error: ${t}`);
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
  if (!u || u.length < 3) return res.json({ success: true, available: false, message: 'En az 3 karakter olmalı' });
  if (u.length > 15) return res.json({ success: true, available: false, message: 'En fazla 15 karakter olabilir' });
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
  if (!u || u.length < 3) return res.status(400).json({ success: false, error: 'Kullanıcı adı en az 3 karakter olmalı.' });
  if (u.length > 15) return res.status(400).json({ success: false, error: 'Kullanıcı adı en fazla 15 karakter olabilir.' });
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
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
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

  await sendSendGridEmail({ to: me.email, subject, html, text });

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

  const allowedFolders = new Set(['posts', 'avatars', 'politfest', 'messages']);
  if (!allowedFolders.has(folder)) return res.status(400).json({ success: false, error: 'Geçersiz klasör.' });

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
          : ct === 'video/mp4'
            ? 'mp4'
            : ct === 'video/webm'
              ? 'webm'
              : ct === 'audio/mpeg'
                ? 'mp3'
                : 'webm';

  const objectPath = `${folder}/${auth.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    await supabaseStorageUploadObject(bucket, objectPath, buf, ct);
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || 'Medya yüklenemedi.') });
  }

  const { supabaseUrl } = getSupabaseKeys();
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  return res.json({ success: true, data: { publicUrl, bucket, path: objectPath } });
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
  requireAdmin(req, res);
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
        }
      }
    } catch {
      // notification is best-effort; do not block login
    }

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
        // Verified is reserved for admin approval (non-citizen account types).
        // Citizens don't display a verified badge in UI anyway, but keep this false to avoid confusion.
        is_verified: false,
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
    }

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
        last_message: m.content,
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
    .map((c) => {
      const message_type = c.has_incoming && !c.has_outgoing ? 'request' : 'regular';
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

  const rows = await supabaseRestGet('messages', {
    select: '*',
    or: `(and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId}))`,
    order: 'created_at.asc',
    limit: '500',
  }).catch(() => []);

  const filtered = (rows || []).filter((m) => {
    if (m.sender_id === userId && m.is_deleted_by_sender === true) return false;
    if (m.receiver_id === userId && m.is_deleted_by_receiver === true) return false;
    return true;
  });

  // mark received messages as read
  await supabaseRestPatch('messages', { receiver_id: `eq.${userId}`, sender_id: `eq.${otherId}`, is_read: 'eq.false' }, { is_read: true }).catch(() => {});

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
  const ids = [Number(userId), Number(otherId)].filter((x) => Number.isFinite(x));
  if (ids.length !== 2) return false;
  const rows = await supabaseRestGet('users', { select: 'id,metadata', id: `in.(${ids.join(',')})`, limit: '2' }).catch(() => []);
  const m = new Map((rows || []).map((u) => [u.id, u?.metadata && typeof u.metadata === 'object' ? u.metadata : {}]));
  const a = m.get(Number(userId)) || {};
  const b = m.get(Number(otherId)) || {};
  const aBlocked = Array.isArray(a.blocked_user_ids) && a.blocked_user_ids.map(String).includes(String(otherId));
  const bBlocked = Array.isArray(b.blocked_user_ids) && b.blocked_user_ids.map(String).includes(String(userId));
  return aBlocked || bBlocked;
}

async function rejectMessageRequest(req, res, otherId) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = auth.id;
  const oid = String(otherId || '').trim();
  if (!/^\d+$/.test(oid)) return res.status(400).json({ success: false, error: 'Geçersiz kullanıcı.' });
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
    select: 'id,username,full_name,avatar_url,user_type,politician_type,party_id,province,is_verified,is_active,metadata,party:parties(*)',
    is_active: 'eq.true',
    or: `(username.ilike.*${safe}*,full_name.ilike.*${safe}*)`,
    limit: '12',
    order: 'polit_score.desc',
  }).catch(() => []);

  const list = (candidates || [])
    .filter((u) => u && String(u.id) !== String(auth.id))
    .filter((u) => !blocked.has(String(u.id)))
    .slice(0, 10);

  // Filter out users who blocked me (best-effort)
  const out = [];
  for (const u of list) {
    const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : {};
    const theirBlocked = Array.isArray(meta.blocked_user_ids) ? meta.blocked_user_ids.map(String) : [];
    if (theirBlocked.includes(String(auth.id))) continue;
    // don't leak their metadata
    const { metadata, ...rest } = u;
    out.push(rest);
  }
  res.json({ success: true, data: out });
}

async function sendMessage(req, res) {
  const auth = verifyJwtFromRequest(req);
  if (!auth?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
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
  if (!receiver_id || !/^\d+$/.test(String(receiver_id))) return res.status(400).json({ success: false, error: 'Geçersiz alıcı.' });
  if (String(receiver_id) === String(auth.id)) return res.status(400).json({ success: false, error: 'Kendinize mesaj gönderemezsiniz.' });

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
  if (attachment && attachment.url && attachment.kind) {
    const url = String(attachment.url || '').trim();
    const kind = String(attachment.kind || '').trim();
    if (!url) return res.status(400).json({ success: false, error: 'Dosya bağlantısı eksik.' });
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ success: false, error: 'Dosya bağlantısı geçersiz.' });
    if (kind !== 'image') return res.status(400).json({ success: false, error: 'Şimdilik sadece resim mesajı destekleniyor.' });
    const payload = { type: kind, url, text: text || '' };
    content = JSON.stringify(payload);
  } else {
    content = String(text || '').trim();
  }

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
    await supabaseInsertNotifications(rows.slice(i, i + chunkSize));
  }
  res.json({ success: true, sent: targets.length });
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

// --- DISPATCHER ---
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
      const url = req.url.split('?')[0];
      
      // Public Lists
      if (url === '/api/posts' && req.method === 'POST') return await createPost(req, res);
      if ((url === '/api/posts' || url === '/api/posts/') && req.method === 'GET') return await getPosts(req, res);
      if ((url === '/api/agendas' || url === '/api/agendas/') && req.method === 'GET') return await getAgendas(req, res);
      if (url === '/api/parties' || url === '/api/parties/') return await getParties(req, res);

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
      if (url === '/api/messages/contacts' && req.method === 'GET') return await getMessageContacts(req, res);
      if (url === '/api/messages/search' && req.method === 'GET') return await searchMessageUsers(req, res);
      if (url.startsWith('/api/messages/send') && req.method === 'POST') return await sendMessage(req, res);
      if (url.startsWith('/api/messages/requests/') && url.endsWith('/reject') && req.method === 'POST') {
        const otherId = url.split('/api/messages/requests/')[1].split('/reject')[0];
        return await rejectMessageRequest(req, res, otherId);
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
      if (url === '/api/admin/stats' && req.method === 'GET') return await adminGetStats(req, res);
      if (url === '/api/admin/users' && req.method === 'GET') return await adminGetUsers(req, res);
      if (url === '/api/admin/users/duplicates' && req.method === 'GET') return await adminFindDuplicateUsers(req, res);
      if (url === '/api/admin/users/dedupe' && req.method === 'POST') return await adminDedupeUsers(req, res);
      if (url === '/api/admin/posts' && req.method === 'GET') return await adminGetPosts(req, res);
      if (url === '/api/admin/parties' && req.method === 'GET') return await adminGetParties(req, res);
      if (url === '/api/admin/parties' && req.method === 'POST') return await adminCreateParty(req, res);
      if (url === '/api/admin/notifications' && req.method === 'POST') return await adminSendNotification(req, res);
      if (url === '/api/admin/comments/pending' && req.method === 'GET') return await adminListPendingComments(req, res);
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
      }
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

      // Search
      if (url === '/api/search' && req.method === 'GET') return await searchAll(req, res);

      // Health
      if (url === '/api/health') return res.json({ status: 'ok', time: new Date().toISOString() });

      res.status(404).json({ error: 'Endpoint Not Found (Monolith)', url });
  } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
  }
}
