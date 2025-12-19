import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';

export const NoAgendaFeedPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const PAGE_SIZE = 24;

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
      setLoading(true);
      setPosts([]);
      setHasMore(true);
      setOffset(0);
      try {
        if (!cancelled) await fetchPage({ nextOffset: 0, replace: true });
      } finally {
        if (!cancelled) setLoading(false);
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
        if (loading || loadingMore) return;
        if (!hasMore) return;
        (async () => {
          setLoadingMore(true);
          try {
            await fetchPage({ nextOffset: offset, replace: false });
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { root: null, rootMargin: '250px', threshold: 0.01 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect?.();
  }, [offset, hasMore, loading, loadingMore]);

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

