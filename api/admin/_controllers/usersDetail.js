import { requireAdmin, supabaseRestGet, supabaseRestPatch, supabaseRestDelete, supabaseRestUpsert } from '../../_utils/adminAuth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { id } = req.query; // Vercel route param

  try {
    if (req.method === 'PUT') {
      const { is_verified, is_active, user_type } = req.body;
      const updates = {};
      
      if (is_verified !== undefined) updates.is_verified = is_verified;
      if (is_active !== undefined) updates.is_active = is_active;
      if (user_type) updates.user_type = user_type;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      const updated = await supabaseRestPatch('users', { id: `eq.${id}` }, updates);

      // If verifying, create notification
      if (updates.is_verified === true) {
        await supabaseRestUpsert('notifications', [{
            user_id: id,
            type: 'system',
            content: 'Hesabınız onaylandı! Artık Polithane\'nin tüm özelliklerini kullanabilirsiniz.',
            is_read: false
        }]).catch(() => {});
      }

      res.json({ success: true, data: Array.isArray(updated) ? updated[0] : updated });

    } else if (req.method === 'DELETE') {
      if (auth.user.id === id) { 
         return res.status(400).json({ success: false, error: 'Self deletion not allowed' });
      }
      
      await supabaseRestDelete('users', { id: `eq.${id}` });
      res.json({ success: true, message: 'User deleted' });

    } else if (req.method === 'GET') {
      const rows = await supabaseRestGet('users', { id: `eq.${id}`, limit: '1' });
      const user = Array.isArray(rows) ? rows[0] : rows;
      
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: user });

    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin User Action Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
