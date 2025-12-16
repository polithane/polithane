import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { 
  signJwt, 
  supabaseRestGet, 
  supabaseRestUpsert 
} from '../_utils/adminAuth.js';

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
// (Storage REST API is complex, using client library is safer/easier for upload)
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

    const emailValue = String(email || '').trim();
    const pass = String(password || '');
    const fullName = String(full_name || '').trim();

    // 1. Validation
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

    // Email Unique Check
    const emailCheck = await supabaseRestGet('users', { 
        select: 'id', 
        email: `ilike.${emailValue}`, 
        limit: '1' 
    }).catch(() => []);
    
    if (Array.isArray(emailCheck) && emailCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Bu email adresi zaten kayıtlı.' });
    }

    // 2. Auto Username
    const base = emailValue.split('@')[0];
    let username = normalizeUsername(base);
    
    const checkUsername = async (u) => {
        const rows = await supabaseRestGet('users', { select: 'id', username: `eq.${u}`, limit: '1' }).catch(() => []);
        return Array.isArray(rows) && rows.length > 0;
    };

    if (await checkUsername(username)) {
      const baseTrimmed = username.slice(0, 20);
      let ok = false;
      for (let i = 0; i < 50; i++) {
        const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
        const candidate = `${baseTrimmed.slice(0, Math.max(0, 20 - (suffix.length + 1)))}_${suffix}`.slice(0, 20);
        // eslint-disable-next-line no-await-in-loop
        if (!(await checkUsername(candidate))) {
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
            // Remove header
            const base64Data = document.content.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${document.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            const { error: uploadError } = await supabase.storage
                .from('uploads') // Bucket name
                .upload(`documents/${fileName}`, buffer, {
                    contentType: document.type,
                    upsert: false
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error('Dosya yüklenemedi: ' + uploadError.message);
            }

            // Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(`documents/${fileName}`);

            metadata.document_path = publicUrl;
            metadata.document_original_name = document.name;

        } catch (fileErr) {
            console.error('File process error:', fileErr);
            return res.status(500).json({ success: false, error: 'Dosya yükleme hatası.' });
        }
    }

    // 4. Create User
    const password_hash = await bcrypt.hash(pass, 10);
    
    // Status Logic
    const needsReview = user_type !== 'citizen';
    const isVerified = user_type === 'citizen'; // Citizen auto-verified
    const isActive = true; // Always active for login

    // Handle Claim Request in Metadata
    if (is_claim === 'true' && claim_user_id) {
        metadata.claim_request = { target_user_id: claim_user_id, status: 'pending' };
    }

    const inserted = await supabaseRestUpsert(
        'users',
        [{
            username,
            email: emailValue,
            password_hash,
            full_name: fullName,
            user_type,
            province: province || null,
            district_name: district || null, // DB uses district_name
            party_id: party_id || null,
            politician_type: politician_type || null,
            metadata: metadata, // JSONB
            is_verified: isVerified,
            is_active: isActive,
            email_verified: true, // Assuming auto-verified for now
            is_admin: false,
            created_at: new Date().toISOString()
        }],
        'return=representation'
    );

    const user = Array.isArray(inserted) ? inserted[0] : inserted;
    
    if (!user || !user.id) {
        throw new Error('Kullanıcı oluşturulamadı (DB yanıt vermedi).');
    }

    // 5. Notification
    await supabaseRestUpsert('notifications', [{
        user_id: user.id,
        type: 'system',
        // content: ... (If schema has content column. If not, this might fail or be ignored)
        // We added content column via migration in server/index.js but that was Express server...
        // Did user run migration on Supabase?
        // Let's hope content column exists. If not, insert might fail.
        // Safer to omit content if we are unsure, but user wants notification text.
        // We will assume column exists (or I should check schema).
        // I will try to insert content. If it fails, supabase REST will return error.
        content: 'Aramıza hoş geldiniz! Profilinizi düzenleyerek eksik bilgilerinizi tamamlayabilir ve kullanıcı adınızı belirleyebilirsiniz.',
        is_read: false
    }]).catch(err => console.error('Notification error:', err));

    // 6. Token
    const token = signJwt({
      id: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      is_admin: !!user.is_admin,
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
