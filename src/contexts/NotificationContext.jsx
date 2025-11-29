import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      // TODO: API call
      // Mock notifications
      const mockNotifs = [
        {
          notification_id: 1,
          type: 'like',
          title: 'Paylaşımınız beğenildi',
          message: 'Ahmet Yılmaz paylaşımınızı beğendi',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          notification_id: 2,
          type: 'comment',
          title: 'Yeni yorum',
          message: 'Mehmet Demir paylaşımınıza yorum yaptı',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
      
      setNotifications(mockNotifs);
      setUnreadCount(mockNotifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark as read
  const markAsRead = async (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
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
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

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
