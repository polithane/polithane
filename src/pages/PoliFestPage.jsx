import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoriesBar } from '../components/home/StoriesBar';
import { apiCall } from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';

export const PoliFestPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [userIds, setUserIds] = useState([]);

  const [feedPosts, setFeedPosts] = useState([]);
  const [feedOffset, setFeedOffset] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const sentinelRef = useRef(null);

  useEffect(() => {
    (async () => {
      const polifestUsers = await apiCall(
        `/api/users?user_type=mp,party_official,media&limit=80&order=polit_score.desc`
      ).catch(() => []);
      const list = (polifestUsers || []).map((u) => ({
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        profile_image: u.avatar_url,
        story_count: Math.max(1, Math.min(6, Math.floor((u.post_count || 1) / 3) || 1)),
      }));
      setItems(list);
      setUserIds(list.map((x) => x.user_id).filter(Boolean));
    })();
  }, []);

  const idsParam = useMemo(() => {
    // Safety: limit to first 500 IDs to keep query size reasonable.
    const ids = (userIds || []).slice(0, 500).map(String).filter(Boolean);
    return ids.join(',');
  }, [userIds]);

  const loadMore = async (reset = false) => {
    if (!idsParam) return;
    if (feedLoading) return;
    if (!reset && !feedHasMore) return;
    setFeedLoading(true);
    try {
      const nextOffset = reset ? 0 : feedOffset;
      const r = await apiCall(
        `/api/posts?user_ids=${encodeURIComponent(idsParam)}&limit=20&offset=${encodeURIComponent(nextOffset)}&order=created_at.desc`
      ).catch(() => []);
      const rows = Array.isArray(r) ? r : r?.data || [];
      const list = Array.isArray(rows) ? rows : [];
      setFeedPosts((prev) => (reset ? list : [...(prev || []), ...list]));
      setFeedOffset(nextOffset + list.length);
      setFeedHasMore(list.length >= 20);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    if (!idsParam) return;
    setFeedPosts([]);
    setFeedOffset(0);
    setFeedHasMore(true);
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!feedHasMore) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore(false);
        }
      },
      { root: null, rootMargin: '600px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedHasMore, idsParam, feedOffset, feedLoading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-black text-gray-900">PoliFest</div>
            <div className="text-sm text-gray-600">Kısa ve hızlı politik içerikler.</div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Geri
          </button>
        </div>

        <div className="card">
          <StoriesBar stories={items} />
        </div>

        {/* Instagram-like feed */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-black text-gray-900">Akış</div>
            <button
              type="button"
              onClick={() => loadMore(true)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50"
              disabled={feedLoading}
            >
              Yenile
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {feedPosts.map((p) => (
              <PostCardHorizontal key={p.post_id ?? p.id} post={p} fullWidth={true} />
            ))}
          </div>

          {feedLoading && (
            <div className="mt-4 text-center text-sm text-gray-600">Yükleniyor…</div>
          )}
          {!feedLoading && feedPosts.length === 0 && (
            <div className="mt-6 card text-sm text-gray-600">Henüz akış içeriği bulunmuyor.</div>
          )}
          {!feedLoading && !feedHasMore && feedPosts.length > 0 && (
            <div className="mt-4 text-center text-xs text-gray-500">Hepsi bu kadar.</div>
          )}

          <div ref={sentinelRef} className="h-1" />
        </div>
      </div>
    </div>
  );
};

