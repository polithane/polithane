import { supabaseRestGet } from './_utils/adminAuth.js';

export default async function handler(req, res) {
  try {
    // Test users table connection
    const data = await supabaseRestGet('users', { limit: '1', select: 'id,username' });
    res.json({ 
        success: true, 
        message: 'Supabase connection OK', 
        data,
        env_check: {
            url_exists: !!process.env.SUPABASE_URL,
            key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    });
  } catch (error) {
    res.status(500).json({ 
        success: false, 
        error: error.message,
        env_check: {
            url_exists: !!process.env.SUPABASE_URL,
            key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    });
  }
}
