import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  signJwt,
  supabaseRestGet,
  supabaseRestUpsert,
  getSiteSettings,
} from '../_utils/adminAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );
}

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function computeDeviceId(req) {
  // Optional explicit device id (future mobile apps can set this)
  const explicit = req.headers['x-polithane-device-id'];
  const ua = req.headers['user-agent'] || '';
  const ip = getIp(req);
  const base = explicit ? `explicit:${explicit}` : `ua:${ua}|ip:${ip}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { identifier, password } = req.body || {};
    const loginValue = String(identifier || '').trim();
    const pass = String(password || '');

    if (!loginValue || !pass) {
      return res.status(400).json({ success: false, error: 'Email/benzersiz isim ve şifre zorunludur.' });
    }

    const isEmail = loginValue.includes('@');
    const rows = await supabaseRestGet('users', {
      select: [
        'id',
        'username',
        'email',
        'password_hash',
        'full_name',
        'avatar_url',
        'bio',
        'user_type',
        'politician_type',
        'party_id',
        'province',
        'city_code',
        'district_name',
        'is_verified',
        'is_active',
        'is_admin',
      ].join(','),
      ...(isEmail ? { email: `eq.${loginValue}` } : { username: `eq.${loginValue}` }),
      limit: '1',
    }).catch(() => []);

    const user = Array.isArray(rows) ? rows[0] : rows;
    const ok = user?.password_hash ? await bcrypt.compare(pass, user.password_hash) : false;
    if (!user || !ok) {
      return res.status(401).json({ success: false, error: 'Email/benzersiz isim veya şifre hatalı.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ success: false, error: 'Hesabınız pasif.' });
    }

    const settings = await getSiteSettings();
    const mfaEnabled = String(settings.admin_mfa_enabled || 'false') === 'true';
    const requireMfaNewDevice = String(settings.admin_mfa_require_new_device || 'false') === 'true';

    const isPrivileged = !!user.is_admin; // managers will be added via RBAC later

    const deviceId = computeDeviceId(req);
    if (isPrivileged && mfaEnabled && requireMfaNewDevice) {
      // Check trusted device list
      const existing = await supabaseRestGet('admin_trusted_devices', {
        select: 'id',
        user_id: `eq.${user.id}`,
        device_id: `eq.${deviceId}`,
        limit: '1',
      }).catch(() => []);

      const isTrusted = Array.isArray(existing) && existing.length > 0;
      if (!isTrusted) {
        // MFA is required but not implemented yet (feature flag default off).
        return res.status(403).json({
          success: false,
          error: 'Bu giriş için mobil doğrulama gerekli (özellik şu an pasif).',
          mfa_required: true,
        });
      }
    }

    // Record/update trusted device (even when MFA disabled; enables future enforcement)
    if (isPrivileged) {
      await supabaseRestUpsert(
        'admin_trusted_devices',
        [
          {
            user_id: user.id,
            device_id: deviceId,
            user_agent: String(req.headers['user-agent'] || ''),
            ip_address: getIp(req),
            last_seen_at: new Date().toISOString(),
          },
        ],
        'resolution=merge-duplicates'
      ).catch(() => null);
    }

    delete user.password_hash;

    const token = signJwt({
      id: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      is_admin: !!user.is_admin,
      roles: user.is_admin ? ['admin'] : [],
      permissions: user.is_admin ? ['*'] : [],
    });

    return res.status(200).json({
      success: true,
      message: 'Giriş başarılı!',
      data: { user, token },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Auth login error:', e);
    return res.status(500).json({ success: false, error: 'Giriş sırasında bir hata oluştu.' });
  }
}

