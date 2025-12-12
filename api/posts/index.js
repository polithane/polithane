// Vercel Serverless Function - Posts API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper: Get user from token (optional)
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

  try {
    // GET - List posts
    if (req.method === 'GET') {
      const { 
        category, 
        page = 1, 
        limit = 20,
        user_id,
        party_id 
      } = req.query;

      const from = (page - 1) * limit;
      const to = from + parseInt(limit) - 1;

      // Build query
      let query = supabase
        .from('posts')
        .select(`
          *,
          users:user_id (username, full_name, avatar_url, is_verified, user_type),
          parties:party_id (name, logo_url, color)
        `, { count: 'exact' });

      // Filters
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (user_id) {
        query = query.eq('user_id', user_id);
      }
      if (party_id) {
        query = query.eq('party_id', party_id);
      }

      // Pagination & sort
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: posts, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get like/comment counts for each post
      const postsWithCounts = await Promise.all(posts.map(async (post) => {
        const [likesResult, commentsResult] = await Promise.all([
          supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
          supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id)
        ]);

        return {
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
        };
      }));

      return res.status(200).json({
        success: true,
        data: postsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    }

    // POST - Create new post
    if (req.method === 'POST') {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Giriş yapmalısınız.' 
        });
      }

      const { content, category = 'gundem', party_id, media_url, media_type } = req.body;

      if (!content) {
        return res.status(400).json({ 
          success: false, 
          error: 'İçerik zorunludur.' 
        });
      }

      // Create post
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          category,
          party_id: party_id || null,
          media_url: media_url || null,
          media_type: media_type || null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update user's post count
      await supabase.rpc('increment_post_count', { user_id_param: user.id });

      return res.status(201).json({
        success: true,
        message: 'Post başarıyla oluşturuldu.',
        data: post
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Posts API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Bir hata oluştu.' 
    });
  }
}
