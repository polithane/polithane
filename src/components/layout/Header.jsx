import { useState, useRef, useEffect } from 'react';
import { Search, Bell, MessageCircle, LogIn, Settings, User, Shield, LogOut, ChevronDown, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { AnimatedSlogan } from '../common/AnimatedSlogan';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { apiCall } from '../../utils/api';
import { getProfilePath } from '../../utils/paths';

export const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const [q, setQ] = useState('');
  const [results, setResults] = useState({ users: [], posts: [], parties: [] });
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef(null);

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

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const term = q.trim();
    if (term.length < 3) {
      setResults({ users: [], posts: [], parties: [] });
      setShowResults(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const r = await apiCall(`/api/search?q=${encodeURIComponent(term)}`);
        if (r?.success) {
          setResults(r.data || { users: [], posts: [], parties: [] });
          setShowResults(true);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(searchTimerRef.current);
  }, [q]);
  
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[60px]">
      <div className="container-main h-full flex items-center justify-between gap-3">
        {/* Sol: Logo + Slogan */}
        <div className="cursor-pointer flex items-center flex-shrink min-w-0" onClick={() => navigate('/')}>
          <AnimatedSlogan />
        </div>

        {/* Orta: Geniş Arama Barı */}
        <div className="relative flex-1 max-w-[520px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => q.trim().length >= 3 && setShowResults(true)}
              placeholder="Siyasetçi, Gündem, Medya, Polit Ara!"
              className="w-full h-[40px] pl-11 pr-10 rounded-full border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all text-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                title="Temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showResults && (results.users.length > 0 || results.posts.length > 0 || results.parties.length > 0) && (
            <div className="absolute top-[46px] left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="max-h-[420px] overflow-y-auto">
                {results.users?.length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-xs font-black text-gray-500 uppercase mb-2">Kullanıcılar</div>
                    <div className="space-y-2">
                      {results.users.slice(0, 6).map((u) => (
                        <button
                          key={u.id}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left"
                          onClick={() => {
                            setShowResults(false);
                            setQ('');
                            navigate(getProfilePath(u));
                          }}
                        >
                          <Avatar src={u.avatar_url} size="36px" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">{u.full_name}</div>
                            <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                          </div>
                          {u.is_verified && <Badge variant="primary" size="small">Doğr.</Badge>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {results.parties?.length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-xs font-black text-gray-500 uppercase mb-2">Partiler</div>
                    <div className="space-y-2">
                      {results.parties.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left"
                          onClick={() => {
                            setShowResults(false);
                            setQ('');
                            navigate(`/party/${p.slug || p.id}`);
                          }}
                        >
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                            {p.logo_url ? <img src={p.logo_url} alt={p.short_name} className="w-7 h-7 object-contain" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 truncate">{p.short_name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {results.posts?.length > 0 && (
                  <div className="p-3">
                    <div className="text-xs font-black text-gray-500 uppercase mb-2">Politler</div>
                    <div className="space-y-2">
                      {results.posts.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          className="w-full p-2 rounded-xl hover:bg-gray-50 text-left"
                          onClick={() => {
                            setShowResults(false);
                            setQ('');
                            navigate(`/post/${p.id}`);
                          }}
                        >
                          <div className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {(p.content_text ?? p.content ?? '').slice(0, 120)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {p.user?.full_name ? `${p.user.full_name} • ` : ''}#{p.category || 'genel'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Aksiyonlar */}
        <div className="flex items-center gap-4 flex-shrink-0">
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
                      <div className="text-sm text-gray-500">@{user?.username || user?.id}</div>
                    </div>
                    
                    {/* Menu Items */}
                    <Link
                      to={getProfilePath(user)}
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
              {/* Bildirim çanı (girişsiz: login'e yönlendir) */}
              <button
                onClick={() => navigate('/login-new')}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Bildirimler"
              >
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => navigate('/register-new')}
                className="px-3 sm:px-4 py-2 text-primary-blue font-semibold hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                Üye Ol
              </button>
              <button
                onClick={() => navigate('/login-new')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
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
