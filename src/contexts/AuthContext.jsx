/**
 * AuthContext with Supabase Integration
 * 
 * This replaces the old JWT-based auth with Supabase Auth
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // ============================================
  // INITIALIZE AUTH STATE
  // ============================================
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ============================================
  // LOAD USER PROFILE
  // ============================================
  
  const loadUserProfile = async (authUserId) => {
    try {
      // Get user profile from database
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
        .eq('auth_user_id', authUserId)
        .single();
      
      if (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // AUTH ACTIONS
  // ============================================

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast.success('Giriş başarılı!');
      return data.user;
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Giriş başarısız');
      throw error;
    }
  };

  /**
   * Sign up new user
   */
  const signUp = async (email, password, metadata) => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (authError) throw authError;

      // 2. Create user profile in database
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: email,
          username: metadata.username.toLowerCase(),
          full_name: metadata.full_name,
          user_type: metadata.user_type || 'citizen',
          party_id: metadata.party_id || null,
          province: metadata.province || null
        })
        .select()
        .single();

      if (profileError) {
        // Rollback: delete auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      toast.success('Kayıt başarılı! Lütfen email\'inizi doğrulayın.');
      return authData.user;
    } catch (error) {
      console.error('Sign up error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Kayıt başarısız';
      
      if (error.message.includes('duplicate')) {
        errorMessage = 'Bu email veya kullanıcı adı zaten kullanılıyor';
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Geçersiz email adresi';
      } else if (error.message.includes('password')) {
        errorMessage = 'Şifre en az 8 karakter olmalıdır';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      toast.success('Çıkış yapıldı');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Çıkış yapılırken bir hata oluştu');
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    if (!profile) {
      throw new Error('No profile loaded');
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.success('Profil güncellendi!');
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
      throw error;
    }
  };

  /**
   * Update avatar
   */
  const updateAvatar = async (file) => {
    if (!profile) {
      throw new Error('No profile loaded');
    }

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update user profile
      const { data, error } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.success('Profil fotoğrafı güncellendi!');
      return publicUrl;
    } catch (error) {
      console.error('Update avatar error:', error);
      toast.error('Fotoğraf yüklenirken bir hata oluştu');
      throw error;
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Şifre sıfırlama linki email\'inize gönderildi');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Email gönderilemedi');
      throw error;
    }
  };

  /**
   * Update password
   */
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Şifreniz güncellendi');
    } catch (error) {
      console.error('Update password error:', error);
      toast.error('Şifre güncellenirken bir hata oluştu');
      throw error;
    }
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = {
    // State
    user,           // Supabase auth user
    profile,        // User profile from database
    session,        // Supabase session
    loading,
    
    // Computed
    isAuthenticated: !!user,
    isEmailVerified: user?.email_confirmed_at != null,
    
    // Actions
    signIn,
    signUp,
    signOut,
    updateProfile,
    updateAvatar,
    resetPassword,
    updatePassword,
    
    // Refresh profile
    refreshProfile: () => user && loadUserProfile(user.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}

export default AuthContext;
