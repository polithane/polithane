// Vercel Serverless Function - Single Post API
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    // GET - Single post
    if (req.method === 'GET') {
      const { data: post, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (username, full_name, avatar_url, is_verified, user_type),
          parties:party_id (name, logo_url, color)
        `)
        .eq('id', id)
        .single();

      if (error || !post) {
        return res.status(404).json({ 
          success: false, 
          error: 'Post bulunamadı.' 
        });
      }

      // Get counts
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', id)
      ]);

      // Increment view count (async, don't wait)
      supabase.from('posts').update({ view_count: (post.view_count || 0) + 1 }).eq('id', id).then();

      return res.status(200).json({
        success: true,
        data: {
          ...post,
          like_count: likesResult.count || 0,
          comment_count: commentsResult.count || 0,
          user_avatar: post.users?.avatar_url,
          username: post.users?.username,
          full_name: post.users?.full_name,
          is_verified: post.users?.is_verified,
          user_type: post.users?.user_type,
          party_name: post.parties?.name,
          party_logo: post.parties?.logo_url,
          party_color: post.parties?.color
        }
      });
    }

    // PUT - Update post
    if (req.method === 'PUT') {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Giriş yapmalısınız.' 
        });
      }

      const { content, category } = req.body;

      // Check ownership
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!post || post.user_id !== user.id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Bu postu düzenleme yetkiniz yok.' 
        });
      }

      // Update
      const { data: updatedPost, error } = await supabase
        .from('posts')
        .update({ content, category, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Post güncellendi.',
        data: updatedPost
      });
    }

    // DELETE - Delete post
    if (req.method === 'DELETE') {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Giriş yapmalısınız.' 
        });
      }

      // Check ownership
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!post || post.user_id !== user.id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Bu postu silme yetkiniz yok.' 
        });
      }

      // Delete
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Post silindi.'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Post API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Bir hata oluştu.' 
    });
  }
}
