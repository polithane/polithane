// Vercel Serverless Function - Like/Unlike Post
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getUserFromToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET || 'polithane-secret-key-2025');
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Giriş yapmalısınız.' 
      });
    }

    const { id: post_id } = req.query;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id);

      return res.status(200).json({
        success: true,
        message: 'Beğeni kaldırıldı.',
        data: { liked: false }
      });
    } else {
      // Like
      await supabase
        .from('likes')
        .insert({
          post_id,
          user_id: user.id
        });

      // Create notification for post owner (async)
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', post_id)
        .single();

      if (post && post.user_id !== user.id) {
        supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'like',
          content: `${user.username} postunuzu beğendi.`,
          related_user_id: user.id,
          related_post_id: post_id
        }).then();
      }

      return res.status(200).json({
        success: true,
        message: 'Post beğenildi.',
        data: { liked: true }
      });
    }

  } catch (error) {
    console.error('Like error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Bir hata oluştu.' 
    });
  }
}
