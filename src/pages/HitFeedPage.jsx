import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { filterConsecutiveTextAudio } from '../utils/postFilters';
import { Avatar } from '../components/common/Avatar';
import { formatPolitScore } from '../utils/formatters';
import { getProfilePath } from '../utils/paths';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';
import { ApiNotice } from '../components/common/ApiNotice';

export const HitFeedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const [parties, setParties] = useState([]);
  const [pool, setPool] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const PAGE_SIZE = 120;

  const mode = useMemo(() => {
    const q = new URLSearchParams(location.search || '');
    return String(q.get('mode') || '').trim();
  }, [location.search]);
  const isProfilesMode = mode === 'profiles';

  const cacheKey = useMemo(() => `hit:${mode || 'posts'}`, [mode]);
  const initialCache = useMemo(() => readSessionCache(cacheKey, { maxAgeMs: 10 * 60_000 }), [cacheKey]);

  useEffect(() => {
    if (!initialCache) return;
    try {
      if (Array.isArray(initialCache.parties)) setParties(initialCache.parties);
      if (Array.isArray(initialCache.pool)) setPool(initialCache.pool);
      if (Array.isArray(initialCache.profiles)) setProfiles(initialCache.profiles);
      if (typeof initialCache.offset === 'number') setOffset(Number(initialCache.offset || 0) || 0);
      if (typeof initialCache.hasMore === 'boolean') setHasMore(!!initialCache.hasMore);
      setLoading(false);
      setRefreshing(true);
      if (navType === 'POP' && typeof initialCache.scrollY === 'number') {
        setTimeout(() => {
          try {
            window.scrollTo(0, Math.max(0, Number(initialCache.scrollY) || 0));
          } catch {
            // ignore
          }
        }, 0);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const partyMap = useMemo(() => new Map((parties || []).map((p) => [p.id, p])), [parties]);

  const normalizeMediaUrls = (value) => {
    const raw = Array.isArray(value) ? value : value ? [value] : [];
    const isPlaceholderPostAsset = (s) =>
      s.startsWith('/assets/posts/') || s === '/assets/default/post_image.jpg' || s === '/assets/default/post.jpg';
    return raw
      .map((v) => String(v || '').trim())
      .filter((s) => s && !isPlaceholderPostAsset(s));
  };

  const mapDbPostToUi = (p, pm = partyMap) => ({
    post_id: p.id,
    user_id: p.user_id,
    content_type: p.content_type || 'text',
    content_text: p.content_text ?? p.content ?? '',
    media_url: normalizeMediaUrls(p.media_urls),
    thumbnail_url: p.thumbnail_url ?? null,
    media_duration: p.media_duration ?? null,
    agenda_tag: p.agenda_tag ?? null,
    polit_score: p.polit_score ?? 0,
    view_count: p.view_count ?? 0,
    like_count: p.like_count ?? 0,
    dislike_count: p.dislike_count ?? 0,
    comment_count: p.comment_count ?? 0,
    share_count: p.share_count ?? 0,
    is_featured: p.is_featured ?? false,
    created_at: p.created_at,
    source_url: p.source_url,
    category: p.category,
    user: p.user
      ? {
          ...p.user,
          user_id: p.user.id,
          profile_image: p.user.avatar_url,
          verification_badge: false,
          party_id: p.user.party_id,
          party: p.user.party_id && pm.get(p.user.party_id)
            ? {
                party_id: pm.get(p.user.party_id).id,
                party_slug: pm.get(p.user.party_id).slug,
                party_short_name: pm.get(p.user.party_id).short_name,
                party_logo: pm.get(p.user.party_id).logo_url,
                party_color: pm.get(p.user.party_id).color,
              }
            : null,
        }
      : null,
  });

  const computeHitPosts = (input = [], limit = 72) => {
    const now = Date.now();
    const candidates = (Array.isArray(input) ? input : [])
      .filter((p) => p && (p.post_id ?? p.id))
      .map((p) => {
        const createdAt = new Date(p.created_at || 0).getTime();
        const hours = Math.max(0, (now - (Number.isFinite(createdAt) ? createdAt : now)) / 36e5);
        const recency = 1 / (1 + hours / 12);
        const engagement =
          (Number(p.like_count || 0) || 0) +
          (Number(p.comment_count || 0) || 0) * 2 +
          (Number(p.share_count || 0) || 0) * 5 +
          (Number(p.view_count || 0) || 0) * 0.05;
        const engagementBoost = Math.log1p(Math.max(0, engagement));
        const base = Number(p.polit_score || 0) || 0;
        const score = base * (0.75 + 0.25 * recency) + engagementBoost * 12;
        return { p, score, recency };
      })
      .sort((a, b) => (b.score - a.score) || (b.recency - a.recency));

    const out = [];
    const perUser = new Map();
    const perUserType = new Map();
    let lastType = '';
    const maxPerUser = 3;

    for (const c of candidates) {
      if (out.length >= limit) break;
      const p = c.p;
      const postType = String(p.content_type || 'text');
      const userType = String(p?.user?.user_type || '');
      const uid = String(p.user_id ?? p?.user?.user_id ?? p?.user?.id ?? '');

      if (uid) {
        const n = perUser.get(uid) || 0;
        if (n >= maxPerUser) continue;
      }
      if (userType) {
        const n = perUserType.get(userType) || 0;
        if (n >= Math.ceil(limit * 0.5)) continue;
      }
      if ((postType === 'text' || postType === 'audio') && postType === lastType) continue;

      out.push(p);
      lastType = postType;
      if (uid) perUser.set(uid, (perUser.get(uid) || 0) + 1);
      if (userType) perUserType.set(userType, (perUserType.get(userType) || 0) + 1);
    }

    return filterConsecutiveTextAudio(out, true).slice(0, limit);
  };

  const hitPosts = useMemo(() => computeHitPosts(pool, Math.max(36, pool.length > 0 ? 72 : 0)), [pool]);

  const fetchProfilesPage = async ({ nextOffset, replace } = {}) => {
    const lim = 60;
    const res = await api.users.getAll({ limit: lim, offset: nextOffset ?? 0, order: 'polit_score.desc' });
    const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

    setProfiles((prev) => {
      const base = replace ? [] : (Array.isArray(prev) ? prev : []);
      const seen = new Set(base.map((u) => String(u?.id ?? u?.user_id ?? '')));
      const next = base.slice();
      for (const u of list) {
        const id = String(u?.id ?? u?.user_id ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        next.push(u);
      }
      return next;
    });
    setHasMore(list.length >= lim);
    setOffset((nextOffset ?? 0) + list.length);
  };

  const fetchPage = async ({ nextOffset, replace, pm }) => {
    const rows = await api.posts.getAll({ limit: PAGE_SIZE, offset: nextOffset, order: 'created_at.desc' });
    // Keep Hit feed as "Polit" content; Fast copies live in the Fast viewer.
    const list = (Array.isArray(rows) ? rows : []).filter((p) => !p?.is_trending);
    const mapperMap = pm instanceof Map ? pm : partyMap;
    const mapped = list.map((r) => mapDbPostToUi(r, mapperMap));
    setPool((prev) => {
      const base = replace ? [] : (Array.isArray(prev) ? prev : []);
      const seen = new Set(base.map((p) => String(p?.post_id ?? p?.id ?? '')));
      const next = base.slice();
      for (const p of mapped) {
        const id = String(p?.post_id ?? p?.id ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        next.push(p);
      }
      return next;
    });
    setHasMore(list.length >= PAGE_SIZE);
    setOffset(nextOffset + list.length);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasCached = !!initialCache;
      if (hasCached) setRefreshing(true);
      else setLoading(true);
      if (!cancelled) {
        setError('');
        setSchemaSql('');
      }
      setPool([]);
      setProfiles([]);
      setHasMore(true);
      setOffset(0);
      try {
        if (isProfilesMode) {
          if (!cancelled) await fetchProfilesPage({ nextOffset: 0, replace: true });
        } else {
          const partiesData = await api.parties.getAll();
          const nextParties = Array.isArray(partiesData) ? partiesData : [];
          const pm = new Map((nextParties || []).map((p) => [p.id, p]));
          if (!cancelled) setParties(nextParties);
          if (!cancelled) await fetchPage({ nextOffset: 0, replace: true, pm });
        }
      } catch (e) {
        if (!cancelled) setParties([]);
        if (!cancelled) {
          const msg = e?.message || 'Veriler yüklenemedi.';
          setError(msg);
          const p = e?.payload && typeof e.payload === 'object' ? e.payload : null;
          if (p?.schemaMissing && p?.requiredSql) setSchemaSql(String(p.requiredSql || ''));
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfilesMode]);

  useEffect(() => {
    const save = () => {
      writeSessionCache(cacheKey, {
        parties,
        pool,
        profiles,
        offset,
        hasMore,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      });
    };
    return () => save();
  }, [cacheKey, parties, pool, profiles, offset, hasMore]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const e = entries?.[0];
        // Don't waste bandwidth unless user scrolls.
        if (!hasUserScrolledRef.current) return;
        if (!e?.isIntersecting) return;
        if (loadingMoreRef.current) return;
        if (loading || loadingMore) return;
        if (!hasMore) return;
        (async () => {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          try {
            if (isProfilesMode) {
              await fetchProfilesPage({ nextOffset: offset, replace: false });
            } else {
              await fetchPage({ nextOffset: offset, replace: false });
            }
          } finally {
            setLoadingMore(false);
            loadingMoreRef.current = false;
          }
        })();
      },
      { root: null, rootMargin: '350px', threshold: 0.01 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, loading, loadingMore, isProfilesMode]);

  useEffect(() => {
    const onScroll = () => {
      if (hasUserScrolledRef.current) return;
      hasUserScrolledRef.current = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        {error ? (
          <div className="mb-5">
            <ApiNotice
              title={schemaSql ? 'Schema eksik' : 'Veriler yüklenemedi'}
              message={error}
              schemaSql={schemaSql}
              onRetry={() => {
                try {
                  window.location.reload();
                } catch {
                  // ignore
                }
              }}
              compact={true}
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            {isProfilesMode ? (
              <>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 break-words">KEŞFET PROFİLLER</div>
                <div className="text-sm text-gray-600 mt-1">En yüksek Polit Puanlı profiller</div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 break-words">HİT PAYLAŞIMLAR</div>
                <div className="text-sm text-gray-600 mt-1">Algoritmik seçim (Polit Puan + etkileşim + tazelik)</div>
              </>
            )}
          </div>
          {isProfilesMode ? (
            <Link to="/hit" className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black">
              Hit Politler
            </Link>
          ) : (
            <Link
              to="/hit?mode=profiles"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
            >
              Profilleri Keşfet
            </Link>
          )}
        </div>

        {isProfilesMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(profiles || []).map((u) => {
              const id = String(u?.id ?? u?.user_id ?? '');
              if (!id) return null;
              const name = String(u?.full_name || u?.username || 'Kullanıcı').trim();
              const username = u?.username ? `@${u.username}` : null;
              const path = getProfilePath({ ...(u || {}), user_id: id });
              return (
                <div key={id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={u?.avatar_url || u?.profile_image} size="56px" verified={isUiVerifiedUser(u)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-gray-900 truncate">{name}</div>
                      {username ? <div className="text-sm text-gray-600 truncate">{username}</div> : null}
                      <div className="mt-2 text-sm text-gray-700 font-semibold">
                        Polit Puan:{' '}
                        <span className="font-black text-primary-blue">{formatPolitScore(u?.polit_score || 0)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-primary-blue text-white font-black hover:opacity-90"
                        onClick={() => navigate(path)}
                      >
                        Profil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hitPosts.map((p) => (
              <PostCardHorizontal key={p.post_id ?? p.id} post={p} fullWidth={true} />
            ))}
          </div>
        )}

        {loading && <div className="mt-6 text-center text-sm text-gray-600">Yükleniyor…</div>}
        {!loading && isProfilesMode && profiles.length === 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">Henüz profil yok.</div>
        )}
        {!loading && !isProfilesMode && hitPosts.length === 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">Henüz paylaşım yok.</div>
        )}

        <div ref={sentinelRef} className="h-8" />
        {loadingMore && <div className="mt-2 text-center text-sm text-gray-600">Daha fazla yükleniyor…</div>}
        {!loading && !loadingMore && !hasMore && (isProfilesMode ? profiles.length > 0 : hitPosts.length > 0) && (
          <div className="mt-6 text-center text-xs text-gray-500">Hepsi bu kadar.</div>
        )}
      </div>
    </div>
  );
};

