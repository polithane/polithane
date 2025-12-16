import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'polithane-super-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

export function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwtFromRequest(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  const token = String(auth).startsWith('Bearer ') ? String(auth).slice(7) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req) {
  const decoded = verifyJwtFromRequest(req);
  if (!decoded) return { ok: false, status: 401, error: 'Unauthorized' };
  return { ok: true, user: decoded };
}

export function requireAdmin(req) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth;
  if (!auth.user?.is_admin) return { ok: false, status: 403, error: 'Admin required' };
  return auth;
}

export function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

export async function supabaseRestGet(path, params) {
  const cfg = getSupabaseRestConfig();
  if (!cfg) throw new Error('Supabase env missing');
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}${qs}`, {
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${res.statusText} ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function supabaseRestUpsert(path, body, prefer = 'resolution=merge-duplicates') {
  const cfg = getSupabaseRestConfig();
  if (!cfg) throw new Error('Supabase env missing');
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${res.statusText} ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function supabaseRestPatch(path, params, body) {
  const cfg = getSupabaseRestConfig();
  if (!cfg) throw new Error('Supabase env missing');
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}${qs}`, {
    method: 'PATCH',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${res.statusText} ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function supabaseRestDelete(path, params) {
  const cfg = getSupabaseRestConfig();
  if (!cfg) throw new Error('Supabase env missing');
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}${qs}`, {
    method: 'DELETE',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase error: ${res.status} ${res.statusText} ${text}`);
  }
  return true;
}

export async function getSiteSettings() {
  const rows = await supabaseRestGet('site_settings', {
    select: 'key,value',
    order: 'key.asc',
  }).catch(() => []);
  const out = {};
  (rows || []).forEach((r) => {
    out[r.key] = r.value;
  });
  return out;
}

