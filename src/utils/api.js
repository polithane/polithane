const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  // Don't add Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API call failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ============================================
// AUTH API
// ============================================
export const auth = {
  login: (username, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
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
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/api/posts${query ? `?${query}` : ''}`);
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
  getByUsername: (username) => apiCall(`/api/users/${username}`),

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
  getAll: () => apiCall('/api/parties'),
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
