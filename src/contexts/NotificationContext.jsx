import { createContext, useContext, useState, useEffect } from 'react';
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

  const notifSettings = (() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    return meta.notification_settings && typeof meta.notification_settings === 'object' ? meta.notification_settings : {};
  })();
  const pushEnabled = notifSettings.pushNotifications !== false;
  const typeAllowed = (n) => {
    const t = String(n?.type || 'system');
    if (t === 'like') return notifSettings.likes !== false;
    if (t === 'comment') return notifSettings.comments !== false;
    if (t === 'follow') return notifSettings.follows !== false;
    if (t === 'mention') return notifSettings.mentions !== false;
    if (t === 'message') return notifSettings.messages !== false;
    // system/unknown -> always show
    return true;
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated || !pushEnabled) return;
    if (typeof document !== 'undefined' && document?.hidden) return;
    
    setLoading(true);
    try {
      const r = await notificationsApi.list({ limit: 50 });
      if (r?.success) {
        const list = (r.data || []).filter(typeAllowed);
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.is_read).length);
      }
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (isAuthenticated && pushEnabled) {
      fetchNotifications();
      
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document?.hidden) return;
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
    // If push disabled, clear state
    if (isAuthenticated && !pushEnabled) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, pushEnabled]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
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
