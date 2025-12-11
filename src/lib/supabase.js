/**
 * Polithane Supabase Client
 * 
 * This file contains all Supabase configuration and helper functions
 * for database queries, auth, storage, and realtime subscriptions.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// ============================================
// SUPABASE CLIENT
// ============================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ============================================
// AUTH HELPERS
// ============================================

export const auth = {
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data.user;
  },

  /**
   * Sign up new user
   */
  async signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // { username, full_name, etc. }
        emailRedirectTo: `${window.location.origin}/verify-email`
      }
    });
    
    if (error) throw error;
    return data.user;
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Reset password
   */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

// ============================================
// DATABASE HELPERS
// ============================================

export const db = {
  // ============================================
  // POSTS
  // ============================================

  /**
   * Get posts with pagination and filters
   */
  async getPosts({ category = 'all', page = 1, limit = 20, userId = null }) {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified,
          user_type
        ),
        party:parties(
          id,
          name,
          short_name,
          logo_url,
          color
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      posts: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  },

  /**
   * Get single post by ID
   */
  async getPost(postId) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified,
          user_type
        ),
        party:parties(
          id,
          name,
          logo_url,
          color
        )
      `)
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();
    
    if (error) throw error;
    
    // Increment view count (async, don't wait)
    supabase
      .from('posts')
      .update({ view_count: data.view_count + 1 })
      .eq('id', postId)
      .then(() => {})
      .catch(console.error);
    
    return data;
  },

  /**
   * Create new post
   */
  async createPost(postData) {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update post
   */
  async updatePost(postId, updates) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete post (soft delete)
   */
  async deletePost(postId) {
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId);
    
    if (error) throw error;
  },

  /**
   * Like/unlike post
   */
  async toggleLike(postId, userId) {
    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return { action: 'unliked', liked: false };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: userId });
      
      if (error) throw error;
      return { action: 'liked', liked: true };
    }
  },

  /**
   * Check if user liked post
   */
  async isPostLiked(postId, userId) {
    if (!userId) return false;
    
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
    
    return !!data;
  },

  // ============================================
  // COMMENTS
  // ============================================

  /**
   * Get comments for a post
   */
  async getComments(postId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Add comment to post
   */
  async addComment(postId, userId, content, parentId = null) {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_id: parentId
      })
      .select(`
        *,
        user:users!comments_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete comment (soft delete)
   */
  async deleteComment(commentId) {
    const { error } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId);
    
    if (error) throw error;
  },

  // ============================================
  // USERS
  // ============================================

  /**
   * Get user profile by username
   */
  async getUserProfile(username) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        party:parties(
          id,
          name,
          short_name,
          logo_url,
          color
        )
      `)
      .eq('username', username)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get user profile by ID
   */
  async getUserById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();
    
    return !data; // true if available
  },

  /**
   * Search users
   */
  async searchUsers(query, limit = 10) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, is_verified, user_type')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // ============================================
  // FOLLOWS
  // ============================================

  /**
   * Follow/unfollow user
   */
  async toggleFollow(followerId, followingId) {
    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();
    
    if (existing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      
      if (error) throw error;
      return { action: 'unfollowed', following: false };
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });
      
      if (error) throw error;
      return { action: 'followed', following: true };
    }
  },

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId, followingId) {
    if (!followerId) return false;
    
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();
    
    return !!data;
  },

  /**
   * Get user's followers
   */
  async getFollowers(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower:users!follows_follower_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('following_id', userId);
    
    if (error) throw error;
    return data.map(f => f.follower);
  },

  /**
   * Get user's following
   */
  async getFollowing(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:users!follows_following_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('follower_id', userId);
    
    if (error) throw error;
    return data.map(f => f.following);
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * Get user notifications
   */
  async getNotifications(userId, limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:users!notifications_actor_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        post:posts(id, content)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
  },

  // ============================================
  // PARTIES
  // ============================================

  /**
   * Get all parties
   */
  async getParties() {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('is_active', true)
      .order('parliament_seats', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Get party by ID
   */
  async getParty(partyId) {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('id', partyId)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================
// STORAGE HELPERS
// ============================================

export const storage = {
  /**
   * Upload avatar
   */
  async uploadAvatar(userId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Upload cover photo
   */
  async uploadCover(userId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('covers')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Upload post media
   */
  async uploadPostMedia(userId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('posts')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Delete file
   */
  async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const realtime = {
  /**
   * Subscribe to new posts
   */
  subscribeToNewPosts(callback) {
    return supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  /**
   * Subscribe to post comments
   */
  subscribeToPostComments(postId, callback) {
    return supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
};

// ============================================
// UTILITIES
// ============================================

/**
 * Handle Supabase errors with user-friendly messages
 */
export function handleSupabaseError(error) {
  console.error('Supabase error:', error);
  
  if (error.message.includes('JWT')) {
    return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  }
  
  if (error.message.includes('duplicate key')) {
    return 'Bu kayıt zaten mevcut.';
  }
  
  if (error.message.includes('foreign key')) {
    return 'İlişkili kayıt bulunamadı.';
  }
  
  if (error.message.includes('violates row-level security')) {
    return 'Bu işlem için yetkiniz yok.';
  }
  
  return error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

export default supabase;
