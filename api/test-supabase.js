import { supabaseRestGet } from './_utils/adminAuth.js';

export default async function handler(req, res) {
  try {
    // 1. Basit Post Çekimi (Sadece post verisi)
    const simplePosts = await supabaseRestGet('posts', { limit: '1' }).catch(e => ({ error: e.message }));
    
    // 2. Joinli Post Çekimi (User ilişkisi ile)
    const joinPosts = await supabaseRestGet('posts', { 
        limit: '1', 
        select: 'id,content,user:users(username)' 
    }).catch(e => ({ error: e.message }));

    res.json({ 
        success: true, 
        simplePosts,
        joinPosts
    });
  } catch (error) {
    res.status(500).json({ 
        success: false, 
        error: error.message
    });
  }
}
