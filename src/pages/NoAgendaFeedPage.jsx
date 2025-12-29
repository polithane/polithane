import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';

export const NoAgendaFeedPage = () => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const PAGE_SIZE = 24;

  const cacheKey = useMemo(() => 'noagenda', []);
  const initialCache = useMemo(() => readSessionCache(cacheKey, { maxAgeMs: 10 * 60_000 }), [cacheKey]);

  useEffect(() => {
    if (!initialCache) return;
    try {
      if (Array.isArray(initialCache.posts)) setPosts(initialCache.posts);
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

  const fetchPage = async ({ nextOffset, replace }) => {
    const rows = await api.posts
      .getAll({
        agenda_tag: '__null__',
        limit: PAGE_SIZE,
        offset: nextOffset,
        order: 'polit_score.desc',
      })
      .catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
    setPosts((prev) => (replace ? list : [...(prev || []), ...list]));
    setHasMore(list.length >= PAGE_SIZE);
    setOffset(nextOffset + list.length);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasCached = !!initialCache;
      if (hasCached) setRefreshing(true);
      else {
        setLoading(true);
        setPosts([]);
        setHasMore(true);
        setOffset(0);
      }
      try {
        if (!cancelled) await fetchPage({ nextOffset: 0, replace: true });
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const e = entries?.[0];
        if (!e?.isIntersecting) return;
        if (loadingMoreRef.current) return;
        if (loading || loadingMore) return;
        if (!hasMore) return;
        (async () => {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          try {
            await fetchPage({ nextOffset: offset, replace: false });
          } finally {
            setLoadingMore(false);
            loadingMoreRef.current = false;
          }
        })();
      },
      { root: null, rootMargin: '250px', threshold: 0.01 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect?.();
  }, [offset, hasMore, loading, loadingMore]);

  useEffect(() => {
    const save = () => {
      writeSessionCache(cacheKey, {
        posts,
        offset,
        hasMore,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      });
    };
    return () => save();
  }, [cacheKey, posts, offset, hasMore]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 break-words">GÜNDEM DIŞI POLİTLER</div>
            <div className="text-sm text-gray-600 mt-1">Gündem eklenmemiş paylaşımlar (Polit Puan’a göre)</div>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
            onClick={() => navigate('/')}
          >
            Ana Sayfa
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p) => (
            <PostCardHorizontal key={p.post_id ?? p.id} post={p} fullWidth={true} />
          ))}
        </div>

        {loading && <div className="mt-6 text-center text-sm text-gray-600">Yükleniyor…</div>}
        {!loading && posts.length === 0 && <div className="mt-6 text-center text-sm text-gray-600">Henüz paylaşım yok.</div>}

        <div ref={sentinelRef} className="h-8" />
        {loadingMore && <div className="mt-2 text-center text-sm text-gray-600">Daha fazla yükleniyor…</div>}
        {!loading && !loadingMore && !hasMore && posts.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-500">Hepsi bu kadar.</div>
        )}
      </div>
    </div>
  );
};

