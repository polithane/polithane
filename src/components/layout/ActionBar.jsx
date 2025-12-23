import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, PenTool, Zap, Search, Compass, MessageCircle } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../common/Badge';

export const ActionBar = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const { isAuthenticated } = useAuth();
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // Close hover labels on scroll (desktop nicety)
  useEffect(() => {
    const onScroll = () => setHovered(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Poll unread message count for sidebar/bottombar badge
  useEffect(() => {
    if (!isAuthenticated) {
      setMessageUnreadCount(0);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        if (document?.hidden) return;
        const r = await apiCall('/api/messages/conversations').catch(() => null);
        const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
        const total = (list || []).reduce((sum, c) => sum + (Number(c?.unread_count || 0) || 0), 0);
        if (!cancelled) setMessageUnreadCount(total);
      } catch {
        if (!cancelled) setMessageUnreadCount(0);
      }
    };
    tick();
    const t = setInterval(tick, 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isAuthenticated]);

  const items = [
    {
      key: 'home',
      label: 'Ana Sayfa',
      onClick: () => navigate('/'),
      icon: Home,
      iconClass: 'text-white',
      bgClass: 'bg-gradient-to-br from-gray-700 to-gray-900',
    },
    {
      key: 'polit',
      label: 'Polit At',
      onClick: () => navigate('/polit-at'),
      icon: PenTool,
      iconClass: 'text-white',
      bgClass: 'bg-gradient-to-br from-primary-blue to-blue-700',
    },
    {
      key: 'fast',
      label: 'Fast At',
      onClick: () => navigate('/fast-at'),
      // Use lightning icon as requested.
      icon: Zap,
      iconClass: 'text-white',
      bgClass: 'bg-gradient-to-br from-red-500 to-rose-600',
      pulse: true,
    },
    {
      key: 'search',
      label: 'Ara',
      onClick: () => {
        try {
          window.dispatchEvent(new CustomEvent('polithane:focus-search'));
        } catch {
          // noop
        }
      },
      icon: Search,
      iconClass: 'text-white',
      bgClass: 'bg-gradient-to-br from-emerald-500 to-green-600',
    },
    {
      key: 'explore',
      label: 'Keşfet',
      onClick: () => navigate('/hit'),
      icon: Compass,
      iconClass: 'text-white',
      bgClass: 'bg-gradient-to-br from-amber-400 to-orange-500',
    },
    {
      key: 'messages',
      label: 'Mesajlar',
      onClick: () => navigate('/messages'),
      icon: MessageCircle,
      iconClass: 'text-white',
      bgClass: 'bg-gradient-to-br from-slate-700 to-slate-900',
    },
  ];

  return (
    <>
      {/* Desktop: left vertical bar */}
      <div
        className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-4"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {items.map((it) => {
          const Icon = it.icon;
          const showBadge = it.key === 'messages' && messageUnreadCount > 0;
          return (
            <button
              key={it.key}
              type="button"
              onClick={it.onClick}
              className="group relative flex items-center"
              title={it.label}
            >
              <span
                className={[
                  'w-14 h-14 rounded-full shadow-xl flex items-center justify-center',
                  'transition-transform duration-200',
                  'group-hover:scale-110',
                  it.bgClass,
                  it.pulse ? 'animate-[pulse_0.35s_ease-in-out_infinite]' : '',
                  showBadge ? 'animate-[pulse_0.9s_ease-in-out_infinite]' : '',
                ].join(' ')}
              >
                <Icon className={['w-7 h-7', it.iconClass].join(' ')} />
                {showBadge ? (
                  <Badge variant="danger" size="small" className="absolute -top-1 -right-1">
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </Badge>
                ) : null}
              </span>

              <span
                className={[
                  'absolute left-full ml-3 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black whitespace-nowrap shadow-xl',
                  hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 pointer-events-none',
                  'transition-all duration-150',
                ].join(' ')}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-gray-200">
        <div className="container-main py-2">
          <div className="flex items-center justify-between">
            {items.map((it) => {
              const Icon = it.icon;
              const showBadge = it.key === 'messages' && messageUnreadCount > 0;
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={it.onClick}
                  className="flex flex-col items-center justify-center px-2 py-1"
                  title={it.label}
                >
                  <span
                    className={[
                      'relative w-9 h-9 rounded-full flex items-center justify-center shadow-md',
                      it.bgClass,
                      it.key === 'fast' ? 'animate-[pulse_0.35s_ease-in-out_infinite]' : '',
                      showBadge ? 'animate-[pulse_0.9s_ease-in-out_infinite]' : '',
                    ].join(' ')}
                  >
                    <Icon className={['w-5 h-5', it.iconClass].join(' ')} />
                    {showBadge ? (
                      <Badge variant="danger" size="small" className="absolute -top-1 -right-1">
                        {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-1 text-[10px] font-black text-gray-700">{it.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

