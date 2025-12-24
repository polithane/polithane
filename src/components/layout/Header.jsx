import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Bell, MessageCircle, LogIn, Settings, User, Shield, LogOut, ChevronDown, X, CheckCheck, Trash2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { AnimatedSlogan } from '../common/AnimatedSlogan';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { apiCall } from '../../utils/api';
import { getProfilePath } from '../../utils/paths';
import { isUiVerifiedUser } from '../../utils/titleHelpers';
// NOTE: Message compose modal removed from header (messages icon exists in ActionBar)

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount, notifications, loading: notifLoading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifLimit, setNotifLimit] = useState(10);

  const [q, setQ] = useState('');
  const [results, setResults] = useState({ users: [], posts: [], parties: [] });
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    // Case-insensitive + Turkish-safe: normalize to lowercase (İ/ı) before sending to API
    const term = q.trim().toLocaleLowerCase('tr-TR');
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

  // Allow ActionBar to focus the header search input.
  useEffect(() => {
    const handler = () => {
      try {
        searchInputRef.current?.focus?.();
        if (q.trim().length >= 3) setShowResults(true);
      } catch {
        // noop
      }
    };
    window.addEventListener('polithane:focus-search', handler);
    return () => window.removeEventListener('polithane:focus-search', handler);
  }, [q]);

  // NOTE: Messages icon + compose modal removed from header (exists in ActionBar).

  const notifItems = useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    return list.slice(0, Math.max(1, notifLimit));
  }, [notifications, notifLimit]);

  const getNotifTitle = (n) => {
    if (n?.title) return String(n.title);
    const t = String(n?.type || 'system');
    if (t === 'like') return 'Beğeni';
    if (t === 'comment') return 'Yorum';
    if (t === 'share') return 'Paylaşım';
    if (t === 'follow') return 'Takip';
    if (t === 'mention') return 'Bahsedilme';
    if (t === 'message') return 'Mesaj';
    if (t === 'approval') return 'Üyelik Onayı';
    return 'Bildirim';
  };
  const getNotifMessage = (n) => {
    if (n?.message) return String(n.message);
    if (String(n?.type || '') === 'approval') {
      return 'Üyeliğiniz onay bekliyor. Admin onayı gelene kadar Polit Atamazsınız.';
    }
    if (n?.post?.content_text || n?.post?.content) return String(n.post.content_text ?? n.post.content);
    return '';
  };
  const onOpenNotif = async () => {
    setShowNotifMenu((v) => !v);
    setNotifLimit(10);
    // only fetch when opening
    if (!showNotifMenu) {
      await fetchNotifications?.();
    }
  };
  
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 sm:h-[60px] py-2 sm:py-0">
      <div className="container-main flex flex-wrap items-center gap-3 sm:h-full sm:flex-nowrap sm:justify-between">
        {/* Sol: Logo + Slogan */}
        <div className="order-1 cursor-pointer flex items-center flex-shrink min-w-0" onClick={() => navigate('/')}>
          <AnimatedSlogan />
        </div>

        {/* Orta: Geniş Arama Barı */}
        <div className="order-3 w-full sm:order-2 sm:w-auto relative sm:flex-1 sm:max-w-[520px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
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
                <X className="w-6 h-6 sm:w-5 sm:h-5" />
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
                          <Avatar src={u.avatar_url} size="36px" verified={isUiVerifiedUser(u)} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">{u.full_name}</div>
                            <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                          </div>
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
        <div className="order-2 ml-auto sm:order-3 sm:ml-0 flex items-center gap-4 flex-shrink-0">
          {isAuthenticated ? (
            <>
              {/* Bildirimler */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={onOpenNotif}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Bildirimler"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <Badge variant="danger" size="small" className="absolute -top-1 -right-1">
                      {unreadCount}
                    </Badge>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 top-12 w-[360px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="font-black text-gray-900">Bildirimler</div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              await markAllAsRead?.();
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-black"
                            title="Tümünü okundu yap"
                          >
                            <CheckCheck className="w-6 h-6 sm:w-5 sm:h-5" />
                            Okundu
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {notifLoading && (
                        <div className="px-4 py-6 text-sm text-gray-600">Bildirimler yükleniyor…</div>
                      )}

                      {!notifLoading && notifItems.length === 0 && (
                        <div className="px-4 py-8 text-sm text-gray-600">Henüz bildirim yok.</div>
                      )}

                      {!notifLoading &&
                        notifItems.map((n) => {
                          const id = n?.id ?? n?.notification_id;
                          const isRead = !!n?.is_read;
                          const actor = n?.actor || null;
                          const title = getNotifTitle(n);
                          const msg = getNotifMessage(n);
                          const targetPostId = n?.post_id ?? n?.post?.id ?? null;

                          return (
                            <button
                              key={String(id)}
                              type="button"
                              onClick={async () => {
                                if (id) await markAsRead?.(id);
                                setShowNotifMenu(false);
                                if (targetPostId) {
                                  navigate(`/post/${targetPostId}`);
                                  return;
                                }
                                if (actor) {
                                  navigate(getProfilePath(actor));
                                }
                              }}
                              className={`w-full px-4 py-3 flex items-start gap-3 text-left border-b border-gray-100 hover:bg-gray-50 ${
                                isRead ? '' : 'bg-blue-50/60'
                              }`}
                            >
                              <Avatar src={actor?.avatar_url} size="40px" verified={isUiVerifiedUser(actor)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className={`text-sm ${isRead ? 'font-semibold text-gray-900' : 'font-black text-gray-900'} truncate`}>
                                    {title}
                                  </div>
                                  {!isRead && <span className="w-3 h-3 rounded-full bg-primary-blue flex-shrink-0" />}
                                </div>
                                {msg && <div className="text-xs text-gray-600 line-clamp-2 mt-0.5">{msg}</div>}
                              </div>

                              <button
                                type="button"
                                className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-700"
                                title="Sil"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (id) await deleteNotification?.(id);
                                }}
                              >
                                <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
                              </button>
                            </button>
                          );
                        })}
                    </div>

                    {Array.isArray(notifications) && notifications.length > 10 && (
                      <div className="p-3 border-t border-gray-100 bg-white">
                        <button
                          type="button"
                          onClick={() => setNotifLimit((v) => (v >= 50 ? 10 : 50))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-black"
                        >
                          {notifLimit >= 50 ? 'Daha az göster' : 'Diğerlerini göster'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Mesaj ikonu header'dan kaldırıldı (sol bar + mobil alt bar var) */}
              
              {/* Kullanıcı Menü */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Avatar src={user?.avatar_url || user?.profile_image} size="36px" />
                  <ChevronDown className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
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
                          <span className="text-sm font-bold text-primary-blue">Admin Paneli</span>
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
                <LogIn className="w-6 h-6 sm:w-5 sm:h-5" />
                <span>Giriş Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Header'daki "Yeni Mesaj" modalı kaldırıldı */}
    </header>
  );
};
