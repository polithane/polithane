import { supabaseRestGet } from './_utils/adminAuth.js';

export default async function handler(req, res) {
  try {
    // 1. Column Check (city_code)
    const usersCheck = await supabaseRestGet('users', { limit: '1', select: 'id,city_code,politician_type,party_id,province,is_verified,is_active' })
        .catch(e => ({ error: e.message }));
    
    // 2. Full Join Check (Like posts api)
    const joinCheck = await supabaseRestGet('posts', { 
        limit: '1', 
        select: 'id,user:users(id,username,full_name,avatar_url,user_type,politician_type,party_id,province,city_code,is_verified,is_active)' 
    }).catch(e => ({ error: e.message }));

    res.json({ 
        success: true, 
        usersCheck,
        joinCheck
    });
  } catch (error) {
    res.status(500).json({ 
        success: false, 
        error: error.message
    });
  }
}
