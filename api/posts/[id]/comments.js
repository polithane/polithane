// Vercel Serverless Function - Post Comments
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: post_id } = req.query;

  try {
    // GET - List comments
    if (req.method === 'GET') {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (username, full_name, avatar_url, is_verified, user_type)
        `)
        .eq('post_id', post_id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: comments
      });
    }

    // POST - Create comment
    if (req.method === 'POST') {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Giriş yapmalısınız.' 
        });
      }

      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ 
          success: false, 
          error: 'Yorum içeriği zorunludur.' 
        });
      }

      // Create comment
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          post_id,
          user_id: user.id,
          content
        })
        .select(`
          *,
          users:user_id (username, full_name, avatar_url, is_verified, user_type)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Create notification for post owner (async)
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', post_id)
        .single();

      if (post && post.user_id !== user.id) {
        supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'comment',
          content: `${user.username} postunuza yorum yaptı: "${content.substring(0, 50)}..."`,
          related_user_id: user.id,
          related_post_id: post_id
        }).then();
      }

      return res.status(201).json({
        success: true,
        message: 'Yorum eklendi.',
        data: comment
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Comments error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Bir hata oluştu.' 
    });
  }
}
