// NOTE:
// - In production on Vercel, we must call same-origin /api/* (no localhost).
// - In local dev, fallback to the local backend if VITE_API_URL is not set.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

// Helper function to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Türkçe hata mesajları
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Sunucuya bağlanılamıyor. Lütfen backend serverın çalıştığından emin olun.',
  SERVER_ERROR: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  UNAUTHORIZED: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
  NOT_FOUND: 'İstek bulunamadı.',
  BAD_REQUEST: 'Geçersiz istek.',
  UNKNOWN: 'Bilinmeyen bir hata oluştu.',
};

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  console.log('🌐 API_URL:', API_URL);
  console.log('📍 Endpoint:', endpoint);
  console.log('🔗 Full URL:', url);
  console.log('⚙️ Options:', options);
  
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  // Don't add Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  console.log('📋 Headers:', headers);

  try {
    console.log('📤 Fetching...');
    
    // Timeout kontrolü (30 saniye)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏰ Request timeout! (30s)');
      controller.abort();
    }, 30000);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('📥 Response received:', response.status, response.statusText);

    // Network error
    if (!response.ok && response.status === 0) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Backend'den gelen hata mesajını kullan
      let errorMessage = data.error || data.message || ERROR_MESSAGES.UNKNOWN;
      
      // HTTP status'e göre varsayılan mesajlar (sadece backend mesajı yoksa)
      if (response.status === 401 && !data.error) {
        errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
      } else if (response.status === 404 && !data.error) {
        errorMessage = data.error || ERROR_MESSAGES.NOT_FOUND;
      } else if (response.status === 400 && !data.error) {
        errorMessage = errorMessage || ERROR_MESSAGES.BAD_REQUEST;
      } else if (response.status === 429) {
        // Rate Limit (429) - Backend mesajını kullan
        errorMessage = data.error || 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.';
      } else if (response.status >= 500 && !data.error) {
        errorMessage = ERROR_MESSAGES.SERVER_ERROR;
      }
      
      // Kalan deneme hakkını ekle (brute force koruması)
      if (data.remainingAttempts !== undefined) {
        errorMessage += ` (Kalan deneme: ${data.remainingAttempts})`;
      }
      
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('💥 API Hatası:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Timeout hatası
    if (error.name === 'AbortError') {
      throw new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
    }
    
    // Network hatası kontrolü
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    
    throw error;
  }
};

// ============================================
// AUTH API
// ============================================
export const auth = {
  login: (identifier, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  register: (userData) =>
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  me: () => apiCall('/api/auth/me'),

  logout: () =>
    apiCall('/api/auth/logout', {
      method: 'POST',
    }),

  changePassword: (currentPassword, newPassword) =>
    apiCall('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ============================================
// POSTS API
// ============================================
export const posts = {
  getAll: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiCall(`/api/posts${query ? `?${query}` : ''}`);
    } catch (error) {
      console.error('Posts API error:', error);
      return [];
    }
  },

  getById: (id) => apiCall(`/api/posts/${id}`),

  create: (formData) => {
    // FormData for file upload
    return apiCall('/api/posts', {
      method: 'POST',
      body: formData,
    });
  },

  update: (id, data) =>
    apiCall(`/api/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/api/posts/${id}`, {
      method: 'DELETE',
    }),

  like: (id) =>
    apiCall(`/api/posts/${id}/like`, {
      method: 'POST',
    }),

  getComments: (id) => apiCall(`/api/posts/${id}/comments`),

  addComment: (id, content, parent_id = null) =>
    apiCall(`/api/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id }),
    }),
};

// ============================================
// USERS API
// ============================================
export const users = {
  // NOTE: Vercel dynamic route (/api/users/:username) may be shadowed by SPA rewrites.
  // Use query-based lookup to ensure it always returns JSON.
  getByUsername: (username) => apiCall(`/api/users?username=${encodeURIComponent(username)}`),
  getById: (id) => apiCall(`/api/users?id=${encodeURIComponent(id)}`),

  updateProfile: (formData) =>
    apiCall('/api/users/profile', {
      method: 'PUT',
      body: formData,
    }),

  follow: (userId) =>
    apiCall(`/api/users/${userId}/follow`, {
      method: 'POST',
    }),

  getPosts: (username, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/api/users/${username}/posts${query ? `?${query}` : ''}`);
  },

  getFollowers: (userId) => apiCall(`/api/users/${userId}/followers`),

  getFollowing: (userId) => apiCall(`/api/users/${userId}/following`),
};

// ============================================
// MESSAGES API
// ============================================
export const messages = {
  getConversations: () => apiCall('/api/messages/conversations'),

  getMessages: (userId) => apiCall(`/api/messages/${userId}`),

  send: (receiver_id, content) =>
    apiCall('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({ receiver_id, content }),
    }),

  delete: (messageId) =>
    apiCall(`/api/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// ADMIN API
// ============================================
export const admin = {
  getStats: () => apiCall('/api/admin/stats'),

  // Users
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/api/admin/users${query ? `?${query}` : ''}`);
  },

  updateUser: (userId, data) =>
    apiCall(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUser: (userId) =>
    apiCall(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  // Posts
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/api/admin/posts${query ? `?${query}` : ''}`);
  },

  deletePost: (postId) =>
    apiCall(`/api/admin/posts/${postId}`, {
      method: 'DELETE',
    }),

  // Settings
  getSettings: () => apiCall('/api/admin/settings'),

  updateSettings: (settings) =>
    apiCall('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};

// ============================================
// PARTIES API
// ============================================
export const parties = {
  getAll: async () => {
    try {
      return await apiCall('/api/parties');
    } catch (error) {
      console.error('Parties API error:', error);
      return [];
    }
  },
  getById: (id) => apiCall(`/api/parties/${id}`),
};

// Export default object with all API modules
export default {
  auth,
  posts,
  users,
  messages,
  admin,
  parties,
};
