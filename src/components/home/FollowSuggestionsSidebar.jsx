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
  const [myFollowing, setMyFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsById, setDetailsById] = useState({});
  const [socialById, setSocialById] = useState({});
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
        if (!cancelled) setMyFollowing(followingList || []);
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

  const myFollowingIds = useMemo(() => new Set((myFollowing || []).map((u) => safeId(u)).filter(Boolean)), [myFollowing]);

  const getDisplayName = (u) => String(u?.full_name || u?.username || 'Kullanıcı').trim();

  // Fetch "arkadaşların takip ediyor" context for each suggestion (best-effort, limited concurrency)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (!users || users.length === 0) return;
    let cancelled = false;

    const fetchFriendFollowers = async (targetUserId) => {
      const tid = String(targetUserId || '');
      if (!tid) return;
      if (socialById[tid]?.friends_loaded) return;
      try {
        const res = await apiCall(`/api/users/${encodeURIComponent(tid)}/followers?limit=200`).catch(() => null);
        const followers = Array.isArray(res?.data) ? res.data : [];
        const friends = (followers || []).filter((f) => myFollowingIds.has(safeId(f)));
        const names = friends
          .slice(0, 2)
          .map((f) => getDisplayName(f))
          .filter(Boolean);
        const count = friends.length;
        if (!cancelled) {
          setSocialById((prev) => ({
            ...(prev || {}),
            [tid]: { friends_loaded: true, friend_names: names, friend_count: count },
          }));
        }
      } catch {
        if (!cancelled) {
          setSocialById((prev) => ({ ...(prev || {}), [tid]: { friends_loaded: true, friend_names: [], friend_count: 0 } }));
        }
      }
    };

    const run = async () => {
      const ids = users.map((u) => safeId(u)).filter(Boolean);
      const concurrency = 2;
      for (let i = 0; i < ids.length; i += concurrency) {
        if (cancelled) break;
        const slice = ids.slice(i, i + concurrency);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(slice.map((id) => fetchFriendFollowers(id)));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, isAuthenticated, user?.id, myFollowingIds]);

  const ensureDetails = async (id) => {
    const sid = String(id || '');
    if (!sid) return;
    if (detailsById[sid]) return;
    try {
      const res = await api.users.getById(sid).catch(() => null);
      const data = res?.data || null;
      if (!data) return;
      setDetailsById((prev) => ({ ...(prev || {}), [sid]: data }));
    } catch {
      // ignore
    }
  };

  const ensureFollowStats = async (id) => {
    const sid = String(id || '');
    if (!sid) return;
    if (detailsById[sid]?.__followStatsLoaded) return;
    try {
      const res = await api.users.getFollowStats(sid).catch(() => null);
      const stats = res?.data || null;
      if (!stats) return;
      setDetailsById((prev) => ({
        ...(prev || {}),
        [sid]: { ...(prev?.[sid] || {}), __followStatsLoaded: true, followStats: stats },
      }));
    } catch {
      // ignore
    }
  };

  const onEnter = (id) => {
    setHoverId(id);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      ensureDetails(id);
      ensureFollowStats(id);
    }, 60);
  };
  const onLeave = () => {
    setHoverId(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };

  return (
    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-lg p-2 shadow-sm text-[10px] leading-tight">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-black text-gray-900">TAKİP ÖNERİLERİ</div>
        <Link to="/hit?mode=profiles" className="text-[10px] font-black text-primary-blue hover:underline">
          Keşfet
        </Link>
      </div>

      {loading ? <div className="text-[10px] text-gray-600">Yükleniyor…</div> : null}
      {!loading && users.length === 0 ? <div className="text-[10px] text-gray-600">Öneri bulunamadı.</div> : null}

      <div className="space-y-2">
        {users.map((u) => {
          const id = safeId(u);
          const name = getDisplayName(u);
          const username = u?.username ? `@${u.username}` : null;
          const social = socialById?.[id] || null;
          const friendCount = Number(social?.friend_count || 0) || 0;
          const friendNames = Array.isArray(social?.friend_names) ? social.friend_names : [];
          return (
            <div
              key={id}
              className="relative"
              onMouseEnter={() => onEnter(id)}
              onMouseLeave={onLeave}
            >
              <div className="flex items-start justify-between gap-2">
                <Link to={`/profile/${id}`} className="flex items-center gap-2 min-w-0">
                  <Avatar src={u?.avatar_url || u?.profile_image} alt={name} size="34px" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-gray-900 truncate leading-4">{name}</div>
                    {username ? <div className="text-[9px] text-gray-500 truncate leading-4">{username}</div> : null}
                    {isAuthenticated ? (
                      friendCount > 0 ? (
                        <div className="text-[9px] text-gray-600 leading-4 mt-0.5 line-clamp-2">
                          <span className="font-black">{friendNames.join(', ')}</span>
                          {friendCount > friendNames.length ? (
                            <span className="font-semibold"> ve {friendCount - friendNames.length} kişi daha</span>
                          ) : null}
                          <span className="font-semibold"> takip ediyor</span>
                        </div>
                      ) : social?.friends_loaded ? null : (
                        <div className="text-[9px] text-gray-400 leading-4 mt-0.5">Arkadaşların kontrol ediliyor…</div>
                      )
                    ) : null}
                  </div>
                </Link>
                <div className="flex-shrink-0">
                  <FollowButton targetUserId={id} size="sm" iconOnly={true} />
                </div>
              </div>

              {/* Hover card (desktop) */}
              {hoverId && String(hoverId) === id ? (
                <div className="hidden lg:block absolute right-full top-0 mr-3 w-[260px] z-20">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u?.avatar_url || u?.profile_image} alt={name} size="54px" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-black text-gray-900 truncate">{name}</div>
                        {username ? <div className="text-[10px] text-gray-600 truncate">{username}</div> : null}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-700">
                          <span className="font-black">
                            {(detailsById[id]?.followStats?.followers_count ?? '—')}{' '}
                            <span className="font-semibold text-gray-500">Takipçi</span>
                          </span>
                          <span className="font-black">
                            {(detailsById[id]?.followStats?.following_count ?? '—')}{' '}
                            <span className="font-semibold text-gray-500">Takip</span>
                          </span>
                          <span className="font-black">
                            {(detailsById[id]?.followStats?.posts_count ?? '—')}{' '}
                            <span className="font-semibold text-gray-500">Polit</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <FollowButton targetUserId={id} size="md" />
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

