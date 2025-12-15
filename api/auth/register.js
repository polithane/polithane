import bcrypt from 'bcryptjs';
import {
  signJwt,
  supabaseRestGet,
  supabaseRestUpsert,
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

const TURKISH_MAP = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };

function normalizeUsername(value) {
  if (!value) return '';
  let out = String(value)
    .trim()
    .split('')
    .map((ch) => TURKISH_MAP[ch] ?? ch)
    .join('')
    .toLowerCase();
  out = out.replace(/^@+/, '');
  out = out.replace(/[\s-]+/g, '_');
  out = out.replace(/[^a-z0-9_]/g, '');
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  out = out.slice(0, 20);
  if (out && out.length < 3) out = (out + '___').slice(0, 3);
  if (out && !/^[a-z]/.test(out)) out = `u${out}`.slice(0, 20);
  return out;
}

function isValidUsername(u) {
  return /^[a-z0-9_]{3,20}$/.test(String(u || ''));
}

async function usernameExists(username) {
  const rows = await supabaseRestGet('users', { select: 'id', username: `eq.${username}`, limit: '1' }).catch(() => []);
  return Array.isArray(rows) ? rows.length > 0 : !!rows;
}

function mapMembershipTypeToUserType(raw) {
  const v = String(raw || '').trim();
  if (!v) return 'citizen';
  if (v === 'normal' || v === 'citizen') return 'citizen';
  if (v === 'party_member') return 'party_member';
  if (v === 'organization' || v === 'party_official') return 'party_official';
  if (v === 'mp') return 'mp';
  if (v === 'media') return 'media';
  if (v === 'ex_politician') return 'ex_politician';
  return 'citizen';
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const {
      email,
      password,
      full_name,
      username: requestedUsername,
      membership_type,
      user_type,
      province,
      district_name,
      party_id,
    } = req.body || {};

    const emailValue = String(email || '').trim();
    const pass = String(password || '');
    const fullName = String(full_name || '').trim();
    const requestedType = mapMembershipTypeToUserType(user_type || membership_type);

    if (!emailValue || !pass || !fullName) {
      return res.status(400).json({ success: false, error: 'Email, şifre ve tam ad zorunludur.' });
    }
    if (pass.length < 8) {
      return res.status(400).json({ success: false, error: 'Şifre en az 8 karakter olmalıdır.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return res.status(400).json({ success: false, error: 'Geçersiz email formatı.' });
    }

    // Email unique check (case-insensitive)
    const emailCheck = await supabaseRestGet('users', {
      select: 'id',
      email: `ilike.${emailValue}`,
      limit: '1',
    }).catch(() => []);
    if (Array.isArray(emailCheck) && emailCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Bu email adresi zaten kayıtlı.' });
    }

    // Username
    const base = requestedUsername ? requestedUsername : emailValue.split('@')[0];
    let username = normalizeUsername(base);
    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        error: 'Benzersiz isim geçersiz. Sadece a-z, 0-9 ve _ kullanılabilir; 3-20 karakter olmalıdır.',
      });
    }

    if (await usernameExists(username)) {
      const baseTrimmed = username.slice(0, 20);
      let ok = false;
      for (let i = 0; i < 25; i++) {
        const suffix = Math.floor(Math.random() * 900 + 100).toString();
        const candidate = `${baseTrimmed.slice(0, Math.max(0, 20 - (suffix.length + 1)))}_${suffix}`.slice(0, 20);
        // eslint-disable-next-line no-await-in-loop
        if (!(await usernameExists(candidate))) {
          username = candidate;
          ok = true;
          break;
        }
      }
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Benzersiz isim kullanılamıyor. Lütfen farklı bir isim deneyin.' });
      }
    }

    const password_hash = await bcrypt.hash(pass, 10);

    // Types that require review: party_member, party_official, mp
    const needsReview = ['party_member', 'party_official', 'mp'].includes(requestedType);
    const is_active = !needsReview;

    const inserted = await supabaseRestUpsert(
      'users',
      [
        {
          username,
          email: emailValue,
          password_hash,
          full_name: fullName,
          user_type: requestedType,
          province: province || null,
          district_name: district_name || null,
          party_id: party_id || null,
          is_verified: false,
          is_active,
          is_admin: false,
          is_automated: false,
          email_verified: true,
        },
      ],
      'return=representation'
    ).catch(() => null);

    const createdUser = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!createdUser?.id) {
      return res.status(500).json({ success: false, error: 'Kayıt sırasında bir hata oluştu.' });
    }

    const token = signJwt({
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      user_type: createdUser.user_type,
      is_admin: !!createdUser.is_admin,
      roles: createdUser.is_admin ? ['admin'] : [],
      permissions: createdUser.is_admin ? ['*'] : [],
    });

    return res.status(201).json({
      success: true,
      message: needsReview ? 'Başvurunuz alındı. İnceleme sonrası hesabınız aktif edilecektir.' : 'Kayıt başarılı! Hoş geldiniz.',
      data: {
        user: createdUser,
        token,
        requiresReview: needsReview,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Auth register error:', e);
    return res.status(500).json({ success: false, error: 'Kayıt sırasında bir hata oluştu.' });
  }
}

