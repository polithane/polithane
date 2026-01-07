// NOTE:
// - In production on Vercel, we must call same-origin /api/* (no localhost).
// - In local dev, fallback to the local backend if VITE_API_URL is not set.
// - IMPORTANT: Some older envs set VITE_API_URL to ".../api". Normalize to avoid "/api/api/*".
const normalizeBaseUrl = (base) => {
  const s = String(base || '');
  // keep '' for production (same-origin)
  if (!s) return '';
  // trim trailing slashes
  let out = s.replace(/\/+$/, '');
  // tolerate accidental "/api" suffix
  if (out.endsWith('/api')) out = out.slice(0, -4);
  return out;
};

const API_URL = import.meta.env.PROD ? '' : normalizeBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:5000');
const DEBUG_API = !import.meta.env.PROD && String(import.meta.env.VITE_DEBUG_API || '').toLowerCase() === 'true';

const debugLog = (...args) => {
  if (!DEBUG_API) return;
  // eslint-disable-next-line no-console
  console.log(...args);
};
const debugError = (...args) => {
  if (!DEBUG_API) return;
  // eslint-disable-next-line no-console
  console.error(...args);
};

// Helper function to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Build query string without undefined/null/"undefined"/empty values
const toQueryString = (params = {}) => {
  try {
    if (!params || typeof params !== 'object') return '';
    const entries = Object.entries(params).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      const s = String(v).trim();
      if (!s) return false;
      if (s === 'undefined' || s === 'null') return false;
      return true;
    });
    if (entries.length === 0) return '';
    return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  } catch {
    return '';
  }
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
  debugLog('🌐 API_URL:', API_URL);
  debugLog('📍 Endpoint:', endpoint);
  debugLog('🔗 Full URL:', url);
  debugLog('⚙️ Options:', options);
  
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  // Don't add Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  debugLog('📋 Headers:', headers);

  try {
    debugLog('📤 Fetching...');
    
    // Timeout kontrolü (30 saniye)
    // NOTE: Some mobile/older browsers don't support AbortController.
    const supportsAbort = typeof AbortController !== 'undefined';
    const timeoutMs = 30000;
    let timeoutId = null;
    let controller = null;

    if (supportsAbort) {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        debugError('⏰ Request timeout! (30s)');
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }, timeoutMs);
    }

    const fetchPromise = fetch(url, {
      ...options,
      headers,
      ...(supportsAbort ? { signal: controller.signal } : {}),
    });

    const response = supportsAbort
      ? await fetchPromise
      : await Promise.race([
          fetchPromise,
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              debugError('⏰ Request timeout! (30s)');
              reject(new Error('REQUEST_TIMEOUT'));
            }, timeoutMs);
          }),
        ]);

    if (timeoutId) clearTimeout(timeoutId);
    debugLog('📥 Response received:', response.status, response.statusText);

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
      
      const err = new Error(errorMessage);
      // Attach structured payload for callers that need field-level errors
      // (Backward compatible: message remains the same.)
      err.status = response.status;
      err.data = data;
      // Keep last error for debug panel (admin only UI will read this).
      try {
        window.__lastApiError = {
          ts: new Date().toISOString(),
          endpoint,
          url,
          status: response.status,
          message: errorMessage,
          data,
        };
      } catch {
        // ignore
      }
      throw err;
    }

    return data;
  } catch (error) {
    debugError('💥 API Hatası:', error);
    debugError('Error name:', error.name);
    debugError('Error message:', error.message);
    
    // Timeout hatası
    if (error.name === 'AbortError' || error.message === 'REQUEST_TIMEOUT') {
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
      const query = toQueryString(params);
      return await apiCall(`/api/posts${query ? `?${query}` : ''}`);
    } catch (error) {
      debugError('Posts API error:', error);
      return [];
    }
  },

  getById: (id) => apiCall(`/api/posts/${id}`),

  create: (payload) =>
    apiCall('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

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

  share: (id) =>
    apiCall(`/api/posts/${id}/share`, {
      method: 'POST',
    }),

  getComments: (id) => apiCall(`/api/posts/${id}/comments`),

  addComment: (id, content, parent_id = null) =>
    apiCall(`/api/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id }),
    }),

  likeComment: (commentId) =>
    apiCall(`/api/comments/${commentId}/like`, {
      method: 'POST',
    }),

  updateComment: (commentId, content) =>
    apiCall(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  reportComment: (commentId, reason, details = '') =>
    apiCall(`/api/comments/${commentId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),

  reportPost: (postId, reason, details = '') =>
    apiCall(`/api/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),

  getPolitScoreBreakdown: (postId) => apiCall(`/api/posts/${postId}/polit-score-breakdown`),
};

// ============================================
// USERS API
// ============================================
export const users = {
  // NOTE: Vercel dynamic route (/api/users/:username) may be shadowed by SPA rewrites.
  // Use query-based lookup to ensure it always returns JSON.
  getByUsername: (username) => apiCall(`/api/users?username=${encodeURIComponent(username)}`),
  getById: (id) => apiCall(`/api/users?id=${encodeURIComponent(id)}`),

  getAll: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/users${query ? `?${query}` : ''}`);
  },

  updateProfile: (formData) =>
    apiCall('/api/users/profile', {
      method: 'PUT',
      body: formData,
    }),

  follow: (userId) =>
    apiCall(`/api/users/${userId}/follow`, {
      method: 'POST',
    }),

  getFollowStats: (userId) => apiCall(`/api/users/${userId}/follow-stats`),

  getPosts: (username, params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/users/${username}/posts${query ? `?${query}` : ''}`);
  },

  getFollowers: (userId, params = {}) => {
    const query = toQueryString(params || {});
    return apiCall(`/api/users/${userId}/followers${query ? `?${query}` : ''}`);
  },

  getFollowing: (userId, params = {}) => {
    const query = toQueryString(params || {});
    return apiCall(`/api/users/${userId}/following${query ? `?${query}` : ''}`);
  },

  getFollowedByFriends: (targetUserId, { limit = 3 } = {}) =>
    apiCall(`/api/users/${targetUserId}/followed-by-friends?limit=${encodeURIComponent(String(limit))}`),

  getLikes: (userId, params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/users/${userId}/likes${query ? `?${query}` : ''}`);
  },
  getComments: (userId, params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/users/${userId}/comments${query ? `?${query}` : ''}`);
  },
  getActivity: (userId = 'me', params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/users/${userId}/activity${query ? `?${query}` : ''}`);
  },

  getBlocks: () => apiCall('/api/users/blocks'),
  block: (targetId) =>
    apiCall('/api/users/blocks', {
      method: 'POST',
      // Backend expects `user_id` (not `target_id`)
      body: JSON.stringify({ user_id: targetId }),
    }),
  unblock: (targetId) =>
    apiCall(`/api/users/blocks/${targetId}`, {
      method: 'DELETE',
    }),

  report: (userId, reason, details = '') =>
    apiCall(`/api/users/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),
};

// ============================================
// MESSAGES API
// ============================================
export const messages = {
  getConversations: () => apiCall('/api/messages/conversations'),

  getMessages: (userId) => apiCall(`/api/messages/${userId}`),

  getContacts: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/messages/contacts${query ? `?${query}` : ''}`);
  },

  getSuggestions: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/messages/suggestions${query ? `?${query}` : ''}`);
  },

  searchUsers: (q) => {
    const query = new URLSearchParams({ q: String(q || '') }).toString();
    return apiCall(`/api/messages/search?${query}`);
  },

  rejectRequest: (otherUserId) =>
    apiCall(`/api/messages/requests/${otherUserId}/reject`, {
      method: 'POST',
    }),

  send: (receiver_id, content, attachment = null) =>
    apiCall('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({ receiver_id, content, attachment }),
    }),

  deleteConversation: (otherUserId) =>
    apiCall(`/api/messages/conversations/${otherUserId}`, {
      method: 'DELETE',
    }),

  reportConversation: (otherUserId, { reason, details } = {}) =>
    apiCall(`/api/messages/conversations/${otherUserId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
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
  envCheck: () => apiCall('/api/admin/env-check'),
  schemaCheck: () => apiCall('/api/admin/schema-check'),
  getDbOverview: () => apiCall('/api/admin/db/overview'),
  getSecurityEvents: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/security/events${query ? `?${query}` : ''}`);
  },
  getSecurityDevices: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/security/devices${query ? `?${query}` : ''}`);
  },
  updateSecurityDevice: (deviceId, data) =>
    apiCall(`/api/admin/security/devices/${deviceId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  systemTransform: (payload) =>
    apiCall('/api/admin/system/transform', { method: 'POST', body: JSON.stringify(payload || {}) }),
  getJobs: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/jobs${query ? `?${query}` : ''}`);
  },
  enqueueJob: (payload) => apiCall('/api/admin/jobs', { method: 'POST', body: JSON.stringify(payload || {}) }),
  updateJob: (jobId, payload) => apiCall(`/api/admin/jobs/${jobId}`, { method: 'PUT', body: JSON.stringify(payload || {}) }),
  processJobs: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/jobs/process${query ? `?${query}` : ''}`, { method: 'POST' });
  },
  getAds: () => apiCall('/api/admin/ads'),
  createAd: (data) => apiCall('/api/admin/ads', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateAd: (adId, data) => apiCall(`/api/admin/ads/${adId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deleteAd: (adId) => apiCall(`/api/admin/ads/${adId}`, { method: 'DELETE' }),

  getWorkflows: () => apiCall('/api/admin/workflows'),
  createWorkflow: (data) => apiCall('/api/admin/workflows', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateWorkflow: (workflowId, data) =>
    apiCall(`/api/admin/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deleteWorkflow: (workflowId) => apiCall(`/api/admin/workflows/${workflowId}`, { method: 'DELETE' }),

  getRevenueSummary: () => apiCall('/api/admin/revenue/summary'),
  getRevenueEntries: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/revenue/entries${query ? `?${query}` : ''}`);
  },
  createRevenueEntry: (data) => apiCall('/api/admin/revenue/entries', { method: 'POST', body: JSON.stringify(data || {}) }),
  deleteRevenueEntry: (entryId) => apiCall(`/api/admin/revenue/entries/${entryId}`, { method: 'DELETE' }),

  getApiKeys: () => apiCall('/api/admin/api-keys'),
  createApiKey: (data) => apiCall('/api/admin/api-keys', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateApiKey: (keyId, data) => apiCall(`/api/admin/api-keys/${keyId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deleteApiKey: (keyId) => apiCall(`/api/admin/api-keys/${keyId}`, { method: 'DELETE' }),

  getSources: () => apiCall('/api/admin/sources'),
  createSource: (data) => apiCall('/api/admin/sources', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateSource: (sourceId, data) => apiCall(`/api/admin/sources/${sourceId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deleteSource: (sourceId) => apiCall(`/api/admin/sources/${sourceId}`, { method: 'DELETE' }),

  getEmailTemplates: () => apiCall('/api/admin/email-templates'),
  createEmailTemplate: (data) => apiCall('/api/admin/email-templates', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateEmailTemplate: (templateId, data) =>
    apiCall(`/api/admin/email-templates/${templateId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deleteEmailTemplate: (templateId) => apiCall(`/api/admin/email-templates/${templateId}`, { method: 'DELETE' }),

  getComments: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/comments${query ? `?${query}` : ''}`);
  },
  approveComment: (commentId) => apiCall(`/api/admin/comments/${commentId}/approve`, { method: 'POST' }),
  deleteComment: (commentId) => apiCall(`/api/admin/comments/${commentId}`, { method: 'DELETE' }),

  storageList: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/storage/list${query ? `?${query}` : ''}`);
  },
  storageDelete: (payload) => apiCall('/api/admin/storage/delete', { method: 'POST', body: JSON.stringify(payload || {}) }),
  storageReplace: (payload) => apiCall('/api/admin/storage/replace', { method: 'POST', body: JSON.stringify(payload || {}) }),

  getPaymentPlans: () => apiCall('/api/admin/payments/plans'),
  createPaymentPlan: (data) => apiCall('/api/admin/payments/plans', { method: 'POST', body: JSON.stringify(data || {}) }),
  updatePaymentPlan: (planId, data) =>
    apiCall(`/api/admin/payments/plans/${planId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deletePaymentPlan: (planId) => apiCall(`/api/admin/payments/plans/${planId}`, { method: 'DELETE' }),

  getPaymentTransactions: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/payments/transactions${query ? `?${query}` : ''}`);
  },
  createPaymentTransaction: (data) =>
    apiCall('/api/admin/payments/transactions', { method: 'POST', body: JSON.stringify(data || {}) }),
  deletePaymentTransaction: (txId) => apiCall(`/api/admin/payments/transactions/${txId}`, { method: 'DELETE' }),

  getAnalytics: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/analytics${query ? `?${query}` : ''}`);
  },

  getNotificationRules: () => apiCall('/api/admin/notification-rules'),
  createNotificationRule: (data) =>
    apiCall('/api/admin/notification-rules', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateNotificationRule: (ruleId, data) =>
    apiCall(`/api/admin/notification-rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  deleteNotificationRule: (ruleId) => apiCall(`/api/admin/notification-rules/${ruleId}`, { method: 'DELETE' }),
  getNotificationChannels: () => apiCall('/api/admin/notification-channels'),
  updateNotificationChannels: (data) =>
    apiCall('/api/admin/notification-channels', { method: 'PUT', body: JSON.stringify(data || {}) }),

  seedDemo: (params = {}) =>
    apiCall('/api/admin/seed/demo', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Users
  getUsers: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/users${query ? `?${query}` : ''}`);
  },

  getDuplicateUsers: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/users/duplicates${query ? `?${query}` : ''}`);
  },

  dedupeUsers: ({ primaryId, duplicateIds, dryRun = true }) =>
    apiCall('/api/admin/users/dedupe', {
      method: 'POST',
      body: JSON.stringify({ primaryId, duplicateIds, dryRun }),
    }),

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
    const query = toQueryString(params);
    return apiCall(`/api/admin/posts${query ? `?${query}` : ''}`);
  },

  updatePost: (postId, data) =>
    apiCall(`/api/admin/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data || {}),
    }),

  deletePost: (postId) =>
    apiCall(`/api/admin/posts/${postId}`, {
      method: 'DELETE',
    }),

  // Comments
  updateComment: (commentId, data) =>
    apiCall(`/api/admin/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data || {}),
    }),

  // Agendas
  getAgendas: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/agendas${query ? `?${query}` : ''}`);
  },
  createAgenda: (data) =>
    apiCall('/api/admin/agendas', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  updateAgenda: (agendaId, data) =>
    apiCall(`/api/admin/agendas/${agendaId}`, {
      method: 'PUT',
      body: JSON.stringify(data || {}),
    }),
  deleteAgenda: (agendaId) =>
    apiCall(`/api/admin/agendas/${agendaId}`, {
      method: 'DELETE',
    }),

  // Settings
  getSettings: () => apiCall('/api/settings'),

  updateSettings: (settings) =>
    apiCall('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Notifications (admin broadcast / direct)
  sendNotification: ({ user_id, title, message, type = 'system', broadcast = false }) =>
    apiCall('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({ user_id, title, message, type, broadcast }),
    }),

  // Parties
  getParties: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/admin/parties${query ? `?${query}` : ''}`);
  },
  createParty: (data) =>
    apiCall('/api/admin/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateParty: (partyId, data) =>
    apiCall(`/api/admin/parties/${partyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteParty: (partyId) =>
    apiCall(`/api/admin/parties/${partyId}`, {
      method: 'DELETE',
    }),

  getPartyHierarchy: (partyId) => apiCall(`/api/admin/parties/${partyId}/hierarchy`),
  assignPartyUnit: (partyId, payload) =>
    apiCall(`/api/admin/parties/${partyId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  unassignPartyUnit: (partyId, payload) =>
    apiCall(`/api/admin/parties/${partyId}/unassign`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  setPartyChair: (partyId, userId) =>
    apiCall(`/api/admin/parties/${partyId}/chair`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  // Email
  sendTestEmail: ({ to, subject, text, html } = {}) =>
    apiCall('/api/admin/mail/test', {
      method: 'POST',
      body: JSON.stringify({ to, subject, text, html }),
    }),

  getMailSettings: () => apiCall('/api/admin/mail/settings'),
  updateMailSettings: (payload = {}) =>
    apiCall('/api/admin/mail/settings', {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    }),
};

// ============================================
// NOTIFICATIONS API
// ============================================
export const notifications = {
  list: (params = {}) => {
    const query = toQueryString(params);
    return apiCall(`/api/notifications${query ? `?${query}` : ''}`);
  },
  unreadCount: () => apiCall('/api/notifications/unread-count'),
  markRead: (id) =>
    apiCall(`/api/notifications/${id}`, {
      method: 'POST',
    }),
  markAllRead: () =>
    apiCall('/api/notifications/read-all', {
      method: 'POST',
    }),
  delete: (id) =>
    apiCall(`/api/notifications/${id}`, {
      method: 'DELETE',
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
      debugError('Parties API error:', error);
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
  notifications,
};
