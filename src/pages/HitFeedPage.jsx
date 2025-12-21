import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { filterConsecutiveTextAudio } from '../utils/postFilters';

export const HitFeedPage = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const PAGE_SIZE = 120;

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

  const fetchPage = async ({ nextOffset, replace, pm }) => {
    const rows = await api.posts.getAll({ limit: PAGE_SIZE, offset: nextOffset, order: 'created_at.desc' }).catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
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
      setLoading(true);
      setPool([]);
      setHasMore(true);
      setOffset(0);
      try {
        const partiesData = await api.parties.getAll().catch(() => []);
        const nextParties = Array.isArray(partiesData) ? partiesData : [];
        const pm = new Map((nextParties || []).map((p) => [p.id, p]));
        if (!cancelled) setParties(nextParties);
        if (!cancelled) await fetchPage({ nextOffset: 0, replace: true, pm });
      } catch {
        const pm = new Map();
        if (!cancelled) setParties([]);
        if (!cancelled) await fetchPage({ nextOffset: 0, replace: true, pm });
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
      { root: null, rootMargin: '350px', threshold: 0.01 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, loading, loadingMore]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 break-words">HİT PAYLAŞIMLAR</div>
            <div className="text-sm text-gray-600 mt-1">Algoritmik seçim (Polit Puan + etkileşim + tazelik)</div>
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
          {hitPosts.map((p) => (
            <PostCardHorizontal key={p.post_id ?? p.id} post={p} fullWidth={true} />
          ))}
        </div>

        {loading && <div className="mt-6 text-center text-sm text-gray-600">Yükleniyor…</div>}
        {!loading && hitPosts.length === 0 && <div className="mt-6 text-center text-sm text-gray-600">Henüz paylaşım yok.</div>}

        <div ref={sentinelRef} className="h-8" />
        {loadingMore && <div className="mt-2 text-center text-sm text-gray-600">Daha fazla yükleniyor…</div>}
        {!loading && !loadingMore && !hasMore && hitPosts.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-500">Hepsi bu kadar.</div>
        )}
      </div>
    </div>
  );
};

