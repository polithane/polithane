import { requireAdmin, getSiteSettings, supabaseRestUpsert } from '../_utils/adminAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    if (req.method === 'GET') {
      const settings = await getSiteSettings();
      // Ensure our keys always exist (defaults)
      return res.status(200).json({
        success: true,
        data: {
          admin_mfa_enabled: settings.admin_mfa_enabled ?? 'false',
          admin_mfa_require_new_device: settings.admin_mfa_require_new_device ?? 'false',
        },
      });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const updates = [];

      if (body.admin_mfa_enabled !== undefined) {
        updates.push({ key: 'admin_mfa_enabled', value: String(body.admin_mfa_enabled) });
      }
      if (body.admin_mfa_require_new_device !== undefined) {
        updates.push({ key: 'admin_mfa_require_new_device', value: String(body.admin_mfa_require_new_device) });
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No settings provided' });
      }

      await supabaseRestUpsert('site_settings', updates).catch(() => null);
      return res.status(200).json({ success: true, message: 'Settings updated' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin settings error:', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

