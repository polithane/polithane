import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// --- CONFIG & HELPERS ---
const JWT_SECRET = process.env.JWT_SECRET || 'polithane-super-secret-key-2024';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization');
}

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function supabaseRestGet(path, params) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase env missing');
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}${qs}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`Supabase Error: ${text}`); }
  return await res.json();
}

async function supabaseRestUpsert(path, body) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase env missing');
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`Supabase Error: ${text}`); }
  return await res.json();
}

// --- CONTROLLERS ---

async function getPosts(req, res) {
    const { limit = '50', offset = '0', party_id, user_id, user_ids, agenda_tag, order = 'created_at.desc' } = req.query;
    const params = {
        select: '*,user:users(id,username,full_name,avatar_url,user_type,politician_type,party_id,province,city_code,is_verified,is_active)',
        limit: String(limit),
        offset: String(offset),
        is_deleted: 'eq.false'
    };
    if (order) params.order = order;
    if (party_id) params.party_id = `eq.${party_id}`;
    if (user_id) params.user_id = `eq.${user_id}`;
    if (agenda_tag) params.agenda_tag = `eq.${agenda_tag}`;
    if (user_ids) {
        const raw = String(user_ids);
        const list = raw.split(',').map(s => s.trim()).filter(id => /^[0-9a-fA-F-]{10,}$/.test(id));
        if (list.length > 0) params.user_id = `in.(${list.join(',')})`;
    }
    const data = await supabaseRestGet('posts', params);
    res.json(Array.isArray(data) ? data : []);
}

async function getParties(req, res) {
    const data = await supabaseRestGet('parties', { select: 'id,name,short_name,logo_url,color,seats', is_active: 'eq.true', order: 'follower_count.desc' });
    res.json(data || []);
}

async function getUsers(req, res) {
    const { search, limit = 20 } = req.query;
    if (!search || search.length < 3) return res.json({ success: true, data: [] });
    const data = await supabaseRestGet('users', {
        select: 'id,username,full_name,avatar_url,user_type,politician_type,party_id,province',
        or: `username.ilike.*${search}*,full_name.ilike.*${search}*`,
        limit: String(Math.min(parseInt(limit), 50))
    });
    res.json({ success: true, data: data || [] });
}

async function authCheckAvailability(req, res) {
    const { email } = req.query;
    const result = { emailAvailable: true };
    if (email) {
      const rows = await supabaseRestGet('users', { select: 'id', email: `ilike.${email}`, limit: '1' }).catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) result.emailAvailable = false;
    }
    res.json({ success: true, ...result });
}

async function authRegister(req, res) {
    const { email, password, full_name, user_type = 'citizen', province, district, party_id, politician_type, metadata = {}, document, is_claim, claim_user_id } = req.body;
    
    // Validation
    if (!email || !password || !full_name) return res.status(400).json({ success: false, error: 'Eksik bilgi.' });
    
    // Check Email
    const emailCheck = await supabaseRestGet('users', { select: 'id', email: `ilike.${email}`, limit: '1' });
    if (emailCheck.length > 0) return res.status(400).json({ success: false, error: 'Email kayıtlı.' });

    // Auto Username
    let username = email.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase().slice(0, 20);
    if (username.length < 3) username = `user_${Date.now()}`;
    const checkUser = async (u) => (await supabaseRestGet('users', { select: 'id', username: `eq.${u}`, limit: '1' })).length > 0;
    if (await checkUser(username)) {
        username = `${username.slice(0,15)}_${Math.floor(Math.random()*1000)}`;
    }

    // Document Upload
    if (document && document.content) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const buffer = Buffer.from(document.content.split(',')[1], 'base64');
        const fileName = `doc_${Date.now()}_${Math.random().toString(36).substr(7)}.pdf`;
        const { error } = await supabase.storage.from('uploads').upload(`documents/${fileName}`, buffer, { contentType: document.type || 'application/pdf' });
        if (!error) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(`documents/${fileName}`);
            metadata.document_path = data.publicUrl;
            metadata.document_original_name = document.name;
        }
    }

    if (is_claim === 'true' && claim_user_id) {
        metadata.claim_request = { target_user_id: claim_user_id, status: 'pending' };
    }

    const password_hash = await bcrypt.hash(password, 10);
    const inserted = await supabaseRestUpsert('users', [{
        username, email, password_hash, full_name, user_type, province, district_name: district, party_id, politician_type, metadata,
        is_verified: user_type === 'citizen', is_active: true, email_verified: true, is_admin: false
    }]);

    const user = inserted[0];
    if (!user) throw new Error('Kullanıcı oluşturulamadı.');

    // Notification
    await supabaseRestUpsert('notifications', [{
        user_id: user.id, type: 'system', content: 'Hoşgeldiniz! Profilinizi tamamlayın.', is_read: false
    }]).catch(() => {});

    const token = signJwt({ id: user.id, username: user.username, email: user.email, user_type: user.user_type, is_admin: !!user.is_admin });
    
    res.status(201).json({ success: true, message: 'Kayıt başarılı.', data: { user, token, requiresApproval: user_type !== 'citizen' } });
}

// --- DISPATCHER ---
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
      const url = req.url.split('?')[0];
      
      if (url === '/api/posts') return await getPosts(req, res);
      if (url === '/api/parties') return await getParties(req, res);
      if (url === '/api/users') return await getUsers(req, res);
      if (url === '/api/auth/check-availability') return await authCheckAvailability(req, res);
      if (url === '/api/auth/register' && req.method === 'POST') return await authRegister(req, res);
      if (url === '/api/health') return res.json({ status: 'ok', time: new Date().toISOString() });

      res.status(404).json({ error: 'Endpoint Not Found (Monolith)', url });
  } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
  }
}
