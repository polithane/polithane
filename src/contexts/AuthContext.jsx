import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiCall } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [emailVerified, setEmailVerified] = useState(true); // Default true to avoid blocking until verified
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false); // Admin setting
  const navigate = useNavigate();

  const ensureStorageBuckets = async () => {
    // Bucket yoksa Supabase Storage "bucket not found" hatası çıkarabiliyor.
    // Bu çağrı (servis anahtarı varsa) bucket'ları otomatik oluşturur.
    try {
      await apiCall('/api/storage/ensure-bucket', {
        method: 'POST',
        body: JSON.stringify({ name: 'uploads', public: true }),
      });
    } catch {
      // noop
    }
    try {
      await apiCall('/api/storage/ensure-bucket', {
        method: 'POST',
        body: JSON.stringify({ name: 'politfest', public: true }),
      });
    } catch {
      // noop
    }
  };

  // Initialize auth from localStorage and verify token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        
        try {
          const data = await api.auth.me();
          const resolvedUser = data?.data?.user ?? data?.data ?? null;
          if (resolvedUser) {
            // Refresh token too (server may upgrade claims like is_admin)
            if (data?.data?.token) {
              setToken(data.data.token);
              localStorage.setItem('auth_token', data.data.token);
            }
            setUser(resolvedUser);
            localStorage.setItem('user', JSON.stringify(resolvedUser));
            await ensureStorageBuckets();
          } else {
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          console.error('Auth verification error:', error);
          // Network error, use cached user
          setUser(JSON.parse(storedUser));
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login function (email OR username)
  const login = async (identifier, password) => {
    try {
      setLoading(true);
      const data = await api.auth.login(identifier, password);

      // Save to state and localStorage
      setToken(data.data.token);
      setUser(data.data.user);
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Update emailVerified status from backend response
      setEmailVerified(data.data.emailVerified !== false);
      
      await ensureStorageBuckets();
      
      return { success: true, user: data.data.user };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Sunucuya bağlanılamıyor. Lütfen backend serverı çalıştırdığınızdan emin olun.' 
        : error.message || 'Giriş sırasında bir hata oluştu';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      const data = await api.auth.register(userData);

      // Save to state and localStorage
      setToken(data.data.token);
      setUser(data.data.user);
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // New users may need email verification
      setEmailVerified(data.data.emailVerified !== false);
      
      await ensureStorageBuckets();
      
      return { success: true, user: data.data.user };
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Sunucuya bağlanılamıyor. Lütfen backend serverı çalıştırdığınızdan emin olun.' 
        : error.message || 'Kayıt sırasında bir hata oluştu';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await api.auth.logout().catch(() => null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  // Update user function
  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Refresh user data from backend
  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const data = await api.auth.me();
      const resolvedUser = data?.data?.user ?? data?.data ?? null;
      if (resolvedUser) {
        if (data?.data?.token) {
          setToken(data.data.token);
          localStorage.setItem('auth_token', data.data.token);
        }
        setUser(resolvedUser);
        localStorage.setItem('user', JSON.stringify(resolvedUser));
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const data = await api.auth.changePassword(currentPassword, newPassword);
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.is_admin) return true;
    return user.permissions?.includes(permission);
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.is_admin === true || user?.user_type === 'admin';
  };

  // Get authorization header
  const getAuthHeader = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Helper: Check if interaction is allowed (considering email verification)
  const canInteract = () => {
    if (!user) return false;
    if (!requiresEmailVerification) return true; // Email verification not required
    return emailVerified === true; // Must be verified if required
  };

  // Helper: Resend verification email
  const resendVerificationEmail = async () => {
    try {
      const response = await apiCall('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: user?.email }),
      });
      return { success: true, message: response?.message || 'Doğrulama e-postası gönderildi!' };
    } catch (error) {
      return { success: false, error: error.message || 'E-posta gönderilemedi.' };
    }
  };

  const value = {
    user,
    token,
    loading,
    emailVerified,
    requiresEmailVerification,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    changePassword,
    hasPermission,
    isAdmin,
    getAuthHeader,
    isAuthenticated: !!user,
    canInteract,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
