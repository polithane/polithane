import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notifications as notificationsApi } from '../utils/api';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const notifSettings = (() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    return meta.notification_settings && typeof meta.notification_settings === 'object' ? meta.notification_settings : {};
  })();
  const typeAllowed = (n) => {
    const t = String(n?.type || 'system');
    if (t === 'like') return notifSettings.likes !== false;
    if (t === 'comment_like') return notifSettings.likes !== false;
    if (t === 'comment') return notifSettings.comments !== false;
    if (t === 'follow') return notifSettings.follows !== false;
    if (t === 'mention') return notifSettings.mentions !== false;
    if (t === 'message') return notifSettings.messages !== false;
    // system/unknown -> always show
    return true;
  };

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const r = await notificationsApi.unreadCount().catch(() => null);
      const n = Number(r?.data?.unread ?? r?.data?.data?.unread ?? 0) || 0;
      setUnreadCount(Math.max(0, n));
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  // Fetch notifications (paged). reset=true loads from start; reset=false appends.
  const fetchNotifications = useCallback(
    async ({ limit = 10, offset = 0, reset = true } = {}) => {
      if (!isAuthenticated) return;
      if (typeof document !== 'undefined' && document?.hidden) return;
      setLoading(true);
      try {
        const r = await notificationsApi.list({ limit, offset });
        if (r?.success) {
          const page = (r.data || []).filter(typeAllowed);
          setHasMore(Array.isArray(page) && page.length >= limit);
          setNotifications((prev) => {
            if (reset) return page;
            const prevList = Array.isArray(prev) ? prev : [];
            // De-dupe by id
            const seen = new Set(prevList.map((n) => String(n?.id ?? n?.notification_id ?? '')).filter(Boolean));
            const merged = prevList.slice();
            for (const n of page) {
              const id = String(n?.id ?? n?.notification_id ?? '').trim();
              if (!id || seen.has(id)) continue;
              seen.add(id);
              merged.push(n);
            }
            return merged;
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Bildirimler yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, typeAllowed]
  );

  const loadMore = useCallback(async ({ limit = 10 } = {}) => {
    const off = Array.isArray(notifications) ? notifications.length : 0;
    await fetchNotifications({ limit, offset: off, reset: false });
  }, [fetchNotifications, notifications]);

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationsApi.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId || n.notification_id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationsApi.delete(notificationId);
    } catch (e) {
      console.error(e);
    }
    setNotifications((prev) => prev.filter((n) => (n.id || n.notification_id) !== notificationId));
  };

  // Add notification (for real-time)
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      // initial
      refreshUnreadCount();
      fetchNotifications({ limit: 10, offset: 0, reset: true });
      
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document?.hidden) return;
        refreshUnreadCount();
        fetchNotifications({ limit: 10, offset: 0, reset: true });
      }, 30000);
      
      return () => clearInterval(interval);
    }
    // If logged out, clear state
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(true);
    }
  }, [isAuthenticated, fetchNotifications, refreshUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    loadMore,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
