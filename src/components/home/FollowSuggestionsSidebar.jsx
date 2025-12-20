import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { FollowButton } from '../common/FollowButton';
import { apiCall } from '../../utils/api';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export const FollowSuggestionsSidebar = ({ limit = 8 }) => {
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsById, setDetailsById] = useState({});
  const [hoverId, setHoverId] = useState(null);
  const hoverTimerRef = useRef(null);

  const safeId = (u) => String(u?.id ?? u?.user_id ?? '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [candidatesRaw, followingRes] = await Promise.all([
          apiCall('/api/users?limit=40&order=polit_score.desc').catch(() => []),
          isAuthenticated && user?.id ? api.users.getFollowing(user.id).catch(() => null) : Promise.resolve(null),
        ]);

        const candidates = Array.isArray(candidatesRaw) ? candidatesRaw : (candidatesRaw?.data || []);
        const followingList = Array.isArray(followingRes?.data) ? followingRes.data : Array.isArray(followingRes) ? followingRes : [];
        const followingIds = new Set((followingList || []).map((u) => safeId(u)).filter(Boolean));
        const myId = isAuthenticated && user?.id ? String(user.id) : null;

        const filtered = (candidates || [])
          .filter((u) => u && u.is_active !== false)
          .filter((u) => {
            const id = safeId(u);
            if (!id) return false;
            if (myId && id === myId) return false;
            if (followingIds.has(id)) return false;
            return true;
          })
          .slice(0, Math.max(1, Number(limit) || 8));

        if (!cancelled) setUsers(filtered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, limit]);

  const ensureDetails = async (id) => {
    const sid = String(id || '');
    if (!sid) return;
    if (detailsById[sid]) return;
    try {
      const res = await apiCall(`/api/users/${sid}`).catch(() => null);
      const data = res?.data || res?.user || res || null;
      if (!data) return;
      setDetailsById((prev) => ({ ...(prev || {}), [sid]: data }));
    } catch {
      // ignore
    }
  };

  const onEnter = (id) => {
    setHoverId(id);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => ensureDetails(id), 60);
  };
  const onLeave = () => {
    setHoverId(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };

  return (
    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-black text-gray-900">TAKİP ÖNERİLERİ</div>
        <Link to="/search" className="text-[11px] font-black text-primary-blue hover:underline">
          Keşfet
        </Link>
      </div>

      {loading ? <div className="text-xs text-gray-600">Yükleniyor…</div> : null}
      {!loading && users.length === 0 ? <div className="text-xs text-gray-600">Öneri bulunamadı.</div> : null}

      <div className="space-y-2">
        {users.map((u) => {
          const id = safeId(u);
          const name = u?.full_name || u?.username || 'Kullanıcı';
          const username = u?.username ? `@${u.username}` : null;
          return (
            <div
              key={id}
              className="relative"
              onMouseEnter={() => onEnter(id)}
              onMouseLeave={onLeave}
            >
              <div className="flex items-center justify-between gap-2">
                <Link to={`/profile/${id}`} className="flex items-center gap-2 min-w-0">
                  <Avatar src={u?.avatar_url} alt={name} size="34px" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-gray-900 truncate">{name}</div>
                    {username ? <div className="text-[11px] text-gray-500 truncate">{username}</div> : null}
                  </div>
                </Link>
                <FollowButton userId={id} size="sm" />
              </div>

              {/* Hover card (desktop) */}
              {hoverId && String(hoverId) === id ? (
                <div className="hidden lg:block absolute right-full top-0 mr-3 w-[260px] z-20">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u?.avatar_url} alt={name} size="54px" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-gray-900 truncate">{name}</div>
                        {username ? <div className="text-xs text-gray-600 truncate">{username}</div> : null}
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-700">
                          <span className="font-black">
                            {(detailsById[id]?.follower_count ?? '—')} <span className="font-semibold text-gray-500">Takipçi</span>
                          </span>
                          <span className="font-black">
                            {(detailsById[id]?.following_count ?? '—')} <span className="font-semibold text-gray-500">Takip</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <FollowButton userId={id} size="md" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

