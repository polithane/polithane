import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useNavigationType } from 'react-router-dom';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';
import { ApiNotice } from '../components/common/ApiNotice';

const CATEGORY_META = {
  all: { title: 'HİT PAYLAŞIMLAR', subtitle: 'Tüm kategorilerden (Polit Puan’a göre)', queryCategory: null },
  mps: { title: 'VEKİLLER GÜNDEMİ', subtitle: 'Milletvekilleri (Polit Puan’a göre)', queryCategory: 'mps' },
  organization: { title: 'TEŞKİLAT GÜNDEMİ', subtitle: 'Teşkilat (Polit Puan’a göre)', queryCategory: 'organization' },
  citizens: { title: 'VATANDAŞ GÜNDEMİ', subtitle: 'Vatandaş (Polit Puan’a göre)', queryCategory: 'citizens' },
  media: { title: 'MEDYA GÜNDEMİ', subtitle: 'Medya (Polit Puan’a göre)', queryCategory: 'media' },
  experience: { title: 'DENEYİM', subtitle: 'Deneyim (Polit Puan’a göre)', queryCategory: 'experience' },
};

export const CategoryFeedPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const navType = useNavigationType();

  const meta = CATEGORY_META[String(categoryId || 'all')] || CATEGORY_META.all;
  const [posts, setPosts] = useState([]);
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
  const PAGE_SIZE = 24;

  const cacheKey = useMemo(() => `cat:${String(categoryId || 'all')}`, [categoryId]);
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

  const paramsBase = useMemo(() => {
    const p = {
      limit: PAGE_SIZE,
      offset: 0,
      order: 'polit_score.desc',
    };
    if (meta.queryCategory) p.category = meta.queryCategory;
    return p;
  }, [meta.queryCategory]);

  const fetchPage = async ({ nextOffset, replace }) => {
    const p = { ...paramsBase, offset: nextOffset };
    const rows = await api.posts.getAll(p);
    // Category feeds are Polit feeds; exclude Fast copies (is_trending).
    const list = (Array.isArray(rows) ? rows : []).filter((x) => !x?.is_trending);
    setPosts((prev) => (replace ? list : [...(prev || []), ...list]));
    setHasMore(list.length >= PAGE_SIZE);
    setOffset(nextOffset + list.length);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasCached = !!initialCache;
      if (hasCached) setRefreshing(true);
      else setLoading(true);
      setError('');
      setSchemaSql('');
      if (!hasCached) {
        setPosts([]);
        setHasMore(true);
        setOffset(0);
      }
      try {
        if (!cancelled) await fetchPage({ nextOffset: 0, replace: true });
      } catch (e) {
        if (cancelled) return;
        const msg = e?.message || 'Paylaşımlar yüklenemedi.';
        setError(msg);
        const p = e?.payload && typeof e.payload === 'object' ? e.payload : null;
        if (p?.schemaMissing && p?.requiredSql) setSchemaSql(String(p.requiredSql || ''));
        if (!hasCached) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsBase, categoryId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, loading, loadingMore]);

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
        <div className="hidden sm:flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 break-words">{meta.title}</div>
            {meta.subtitle ? <div className="text-sm text-gray-600 mt-1">{meta.subtitle}</div> : null}
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

