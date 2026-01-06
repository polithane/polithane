import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Bell, LogIn, Settings, User, Shield, LogOut, ChevronDown, X, CheckCheck, Trash2 } from 'lucide-react';
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
  const { unreadCount, notifications, loading: notifLoading, fetchNotifications, loadMore, hasMore, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const notifBtnRef = useRef(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifMenuTop, setNotifMenuTop] = useState(64);

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

  const notifItems = useMemo(() => (Array.isArray(notifications) ? notifications : []), [notifications]);

  const getNotifTitle = (n) => {
    if (n?.title) return String(n.title);
    const t0 = String(n?.type || 'system');
    const t = t0.trim().toLowerCase();
    // Be tolerant: deployments may use slightly different type strings.
    if (t === 'approval' || t.includes('approval') || t.includes('verified')) return 'Üyelik Onayı';
    if (t === 'welcome' || t.includes('welcome') || t.includes('hosgeldin') || t.includes('hoşgeldin')) return 'Hoş geldiniz';
    if (t === 'profile_reminder' || (t.includes('profile') && t.includes('reminder')) || t.includes('profil')) return 'Profilinizi tamamlayın';
    if (t === 'message' || t.includes('message') || t.includes('dm')) return 'Mesaj';
    if (t === 'follow' || t.includes('follow')) return 'Takip';
    if (t === 'mention' || t.includes('mention') || t.includes('tag')) return 'Bahsedilme';
    if (t === 'share' || t.includes('share') || t.includes('repost')) return 'Paylaşım';
    // comment-like must be checked before comment
    if (t === 'comment_like' || (t.includes('comment') && t.includes('like'))) return 'Yorum beğenisi';
    if (t === 'comment' || t.includes('comment') || t.includes('reply')) return 'Yorum';
    if (t === 'like' || t.includes('like') || t.includes('heart')) return 'Beğeni';
    return 'Bildirim';
  };
  const getNotifMessage = (n) => {
    if (n?.message) return String(n.message);
    if (String(n?.type || '') === 'approval') {
      return 'Üyeliğiniz onay bekliyor. Admin onayı gelene kadar Polit Atamazsınız.';
    }
    if (String(n?.type || '') === 'comment_like') {
      return 'Yorumunuz beğenildi.';
    }
    if (String(n?.type || '') === 'mention') {
      return 'Sizi bir içerikte etiketledi.';
    }
    if (n?.post?.content_text || n?.post?.content) return String(n.post.content_text ?? n.post.content);
    return '';
  };
  const onOpenNotif = async () => {
    // Position dropdown relative to viewport, not the bell's container.
    try {
      const r = notifBtnRef.current?.getBoundingClientRect?.();
      const top = Number(r?.bottom || 56) + 8;
      setNotifMenuTop(Math.max(8, Math.min(top, window.innerHeight - 140)));
    } catch {
      setNotifMenuTop(64);
    }
    setShowNotifMenu((v) => !v);
    // only fetch when opening
    if (!showNotifMenu) {
      await fetchNotifications?.({ limit: 10, offset: 0, reset: true });
    }
  };

  // Keep dropdown anchored on resize/orientation changes while open.
  useEffect(() => {
    if (!showNotifMenu) return;
    const update = () => {
      try {
        const r = notifBtnRef.current?.getBoundingClientRect?.();
        const top = Number(r?.bottom || 56) + 8;
        setNotifMenuTop(Math.max(8, Math.min(top, window.innerHeight - 140)));
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [showNotifMenu]);
  
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
                  ref={notifBtnRef}
                  type="button"
                  onClick={onOpenNotif}
                  className={[
                    'relative p-2 hover:bg-gray-100 rounded-lg transition-colors',
                    unreadCount > 0 ? 'animate-[pulse_0.9s_ease-in-out_infinite]' : '',
                  ].join(' ')}
                  title="Bildirimler"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <Badge variant="danger" size="small" className="absolute -top-1 -right-1 animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </button>

                {showNotifMenu && (
                  <div
                    className="fixed right-2 w-[92vw] max-w-[360px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-50"
                    style={{ top: notifMenuTop }}
                  >
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
                          // Messages already have their own UX entry points; don't show them in bell notifications.
                          const typ = String(n?.type || '').toLowerCase();
                          if (typ === 'message' || typ.includes('dm')) return null;
                          const id = n?.id ?? n?.notification_id;
                          const isRead = !!n?.is_read;
                          const actor = n?.actor || null;
                          const title = getNotifTitle(n);
                          const msg = getNotifMessage(n);
                          const targetPostId = n?.post_id ?? n?.post?.id ?? null;
                          const headerLine = title;

                          return (
                            <button
                              key={String(id)}
                              type="button"
                              onClick={async () => {
                                if (id) await markAsRead?.(id);
                                setShowNotifMenu(false);
                                if (targetPostId) {
                                  const t = String(n?.type || '');
                                  const isCommentShortcut = t === 'comment' || t === 'comment_like';
                                  navigate(`/post/${targetPostId}${isCommentShortcut ? '?comment=1' : ''}`);
                                  return;
                                }
                                if (actor) {
                                  navigate(getProfilePath(actor));
                                }
                              }}
                              className={`w-full px-4 py-2 flex items-start gap-2 text-left border-b border-gray-100 hover:bg-gray-50 ${
                                isRead ? '' : 'bg-blue-50/60'
                              }`}
                            >
                              <Avatar src={actor?.avatar_url} size="28px" verified={isUiVerifiedUser(actor)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className={`text-[13px] leading-4 ${isRead ? 'font-semibold text-gray-900' : 'font-black text-gray-900'} truncate`}>
                                    {headerLine}
                                  </div>
                                </div>
                                {msg ? (
                                  <div className="mt-0.5 text-[12px] leading-4 text-gray-600 line-clamp-2">
                                    {msg}
                                  </div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                className="p-1 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-700 mt-0.5"
                                title="Sil"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (id) await deleteNotification?.(id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </button>
                          );
                        })}
                    </div>

                    {hasMore && (
                      <div className="p-3 border-t border-gray-100 bg-white">
                        <button
                          type="button"
                          onClick={async () => {
                            await loadMore?.({ limit: 10 });
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-black"
                        >
                          Diğerleri
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
                    
                    {/* Admin Panel Link (Sadece Admin'e görünür) */}
                    {isAdmin() && (
                      <>
                        <div className="border-t border-gray-100 my-2"></div>
                        <Link
                          to="/adminyonetim"
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
