import { useState, useRef, useEffect } from 'react';
import { Search, Bell, MessageCircle, LogIn, Settings, User, Shield, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { AnimatedSlogan } from '../common/AnimatedSlogan';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

export const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[60px]">
      <div className="container-main h-full flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer flex items-center" onClick={() => navigate('/')}>
          <AnimatedSlogan />
        </div>
        
        {/* Sağ Aksiyonlar */}
        <div className="flex items-center gap-4">
          {/* Arama */}
          <button onClick={() => navigate('/search')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          
          {isAuthenticated ? (
            <>
              {/* Bildirimler */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <Badge variant="danger" size="small" className="absolute -top-1 -right-1">
                    {unreadCount}
                  </Badge>
                )}
              </button>
              
              {/* Mesajlar */}
              <button onClick={() => navigate('/messages')} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Kullanıcı Menü */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Avatar src={user?.avatar_url || user?.profile_image} size="36px" />
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
                
                {/* Dropdown Menü */}
                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-xl border border-gray-200 shadow-xl py-2">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-bold text-gray-900">{user?.full_name}</div>
                      <div className="text-sm text-gray-500">@{user?.username || user?.user_id}</div>
                    </div>
                    
                    {/* Menu Items */}
                    <Link
                      to={`/profile/${user?.user_id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-700">Profilim</span>
                    </Link>
                    
                    <Link
                      to="/settings/profile"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-700">Ayarlar</span>
                    </Link>
                    
                    <Link
                      to="/messages"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-700">Mesajlar</span>
                    </Link>
                    
                    {/* Admin Panel Link (Sadece Admin'e görünür) */}
                    {isAdmin() && (
                      <>
                        <div className="border-t border-gray-100 my-2"></div>
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors bg-blue-50"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="w-5 h-5 text-primary-blue" />
                          <span className="text-sm font-bold text-primary-blue">Admin Panel</span>
                        </Link>
                      </>
                    )}
                    
                    {/* Çıkış */}
                    <div className="border-t border-gray-100 my-2"></div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-red-600"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-sm font-semibold">Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/register-new')}
                className="px-4 py-2 text-primary-blue font-semibold hover:bg-blue-50 rounded-lg transition-colors"
              >
                Üye Ol
              </button>
              <button
                onClick={() => navigate('/login-new')}
                className="flex items-center gap-2 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Giriş Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
