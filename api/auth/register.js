import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import sql from '../_utils/db.js';
import { signJwt } from '../_utils/adminAuth.js';

// CORS Helper
function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );
}

// Supabase Client for Storage
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TURKISH_MAP = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };

function normalizeUsername(value) {
  if (!value) return '';
  let out = String(value)
    .trim()
    .split('')
    .map((ch) => TURKISH_MAP[ch] ?? ch)
    .join('')
    .toLowerCase();
  out = out.replace(/^@+/, '').replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
  if (out && out.length < 3) out = (out + '___').slice(0, 3);
  if (out && !/^[a-z]/.test(out)) out = `u${out}`.slice(0, 20);
  return out;
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
      user_type = 'citizen',
      province,
      district,
      party_id,
      politician_type,
      metadata = {},
      document, // { name, type, content: "data:..." }
      is_claim,
      claim_user_id
    } = req.body;

    // 1. Validation
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Email, şifre ve tam ad zorunludur.' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Şifre en az 8 karakter olmalıdır.' });
    }

    const [existingEmail] = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email})`;
    if (existingEmail) {
      return res.status(400).json({ success: false, error: 'Bu email adresi zaten kayıtlı.' });
    }

    // 2. Auto Username
    const base = email.split('@')[0];
    let username = normalizeUsername(base);
    
    const exists = async (u) => {
      const [row] = await sql`SELECT id FROM users WHERE username = ${u} LIMIT 1`;
      return !!row;
    };

    if (await exists(username)) {
      const baseTrimmed = username.slice(0, 20);
      let ok = false;
      for (let i = 0; i < 50; i++) {
        const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
        const candidate = `${baseTrimmed.slice(0, Math.max(0, 20 - (suffix.length + 1)))}_${suffix}`.slice(0, 20);
        if (!(await exists(candidate))) {
          username = candidate;
          ok = true;
          break;
        }
      }
      if (!ok) username = `user_${Date.now().toString().slice(-8)}`;
    }

    // 3. Document Upload (Base64 to Supabase Storage)
    if (document && document.content) {
        try {
            // Remove header (data:application/pdf;base64,)
            const base64Data = document.content.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${document.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(`documents/${fileName}`, buffer, {
                    contentType: document.type,
                    upsert: false
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                // Continue without document? No, user expects it.
                // But let's log and maybe allow fail gracefully or throw?
                // Throwing is better.
                throw new Error('Dosya yüklenemedi: ' + uploadError.message);
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(`documents/${fileName}`);

            metadata.document_path = publicUrl; // Use full URL
            metadata.document_original_name = document.name;

        } catch (fileErr) {
            console.error('File process error:', fileErr);
            return res.status(500).json({ success: false, error: 'Dosya yükleme hatası.' });
        }
    }

    // 4. Create User
    const password_hash = await bcrypt.hash(password, 10);
    const metadataJson = JSON.stringify(metadata);
    
    // Determine status
    const needsReview = user_type !== 'citizen';
    const isVerified = user_type === 'citizen';
    const isActive = true; // Always active to login, but maybe restricted features

    const [user] = await sql`
      INSERT INTO users (
        username, email, password_hash, full_name, user_type,
        province, district_name, party_id, politician_type, metadata,
        is_verified, is_active, email_verified, is_admin
      ) VALUES (
        ${username}, ${email}, ${password_hash}, ${full_name}, ${user_type},
        ${province || null}, ${district || null}, ${party_id || null}, ${politician_type || null},
        ${metadataJson}::jsonb, ${isVerified}, ${isActive}, true, false
      )
      RETURNING id, username, email, full_name, user_type, is_verified, is_admin
    `;

    // 5. Claim Logic
    if (is_claim === 'true' && claim_user_id) {
       await sql`
         UPDATE users 
         SET metadata = jsonb_set(metadata, '{claim_request}', ${JSON.stringify({ target_user_id: claim_user_id, status: 'pending' })})
         WHERE id = ${user.id}
       `.catch(console.error);
    }

    // 6. Notification
    await sql`
      INSERT INTO notifications (user_id, type, content, is_read)
      VALUES (${user.id}, 'system', 'Aramıza hoş geldiniz! Profilinizi düzenleyerek eksik bilgilerinizi tamamlayabilir ve kullanıcı adınızı belirleyebilirsiniz.', false)
    `.catch(err => {
        // If content column missing, fallback to old insert
        console.error('Notification error (content column might be missing):', err);
    });

    // 7. Token
    const token = signJwt({
      id: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      is_admin: user.is_admin,
      roles: user.is_admin ? ['admin'] : [],
      permissions: user.is_admin ? ['*'] : [],
    });

    res.status(201).json({
      success: true,
      message: needsReview ? 'Başvurunuz alındı. İnceleme sonrası hesabınız aktif edilecektir.' : 'Kayıt başarılı! Hoş geldiniz.',
      data: {
        user,
        token,
        requiresApproval: needsReview
      }
    });

  } catch (error) {
    console.error('Register API Error:', error);
    res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
  }
}
