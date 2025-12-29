import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { formatNumber, formatPolitScore } from '../utils/formatters';
import api from '../utils/api';
import { apiCall } from '../utils/api';

export const AgendaDetailPage = () => {
  const { agendaSlug } = useParams();
  const navigate = useNavigate();
  const [agenda, setAgenda] = useState(null);
  const [agendaPosts, setAgendaPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [resolvedAgendaTitle, setResolvedAgendaTitle] = useState('');
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const PAGE_SIZE = 24;

  const agendaTitle = String(agenda?.title || agenda?.agenda_title || '').trim();
  const agendaScore = Number(agenda?.total_polit_score ?? agenda?.polit_score ?? 0);
  const agendaPostCount = Number(agenda?.post_count ?? 0);
  // Some older mock data used `participant_count`; API doesn't guarantee it.
  const agendaParticipantCount = Number(agenda?.participant_count ?? 0);
  
  // Detail pages should always start at top.
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  }, [agendaSlug]);

  useEffect(() => {
    (async () => {
      // Resolve agenda from admin list (by slug first, fallback to title)
      const agendaRes = await apiCall('/api/agendas?limit=200').catch(() => null);
      const list = agendaRes?.data || [];
      const found =
        (Array.isArray(list) ? list : []).find((a) => String(a?.slug || '') === String(agendaSlug || '')) ||
        (Array.isArray(list) ? list : []).find((a) => String(a?.title || '').toLowerCase().replace(/\s+/g, '-') === String(agendaSlug || ''));

      setAgenda(found || null);
      const title = String(found?.title || found?.agenda_title || '').trim();
      setResolvedAgendaTitle(title);
    })();
  }, [agendaSlug]);

  const fetchPostsPage = async ({ nextOffset, replace }) => {
    const title = String(resolvedAgendaTitle || '').trim();
    if (!title) {
      setAgendaPosts([]);
      setHasMore(false);
      return;
    }
    const params = {
      agenda_tag: title,
      limit: PAGE_SIZE,
      offset: nextOffset,
      order: 'polit_score.desc',
    };
    if (category && category !== 'all') params.category = category;

    const dbPosts = await api.posts.getAll(params).catch(() => []);
    // Agenda feeds show Polits (topic posts). Fast copies live in the Fast viewer.
    const rows = (Array.isArray(dbPosts) ? dbPosts : []).filter((p) => !p?.is_trending);
    setAgendaPosts((prev) => (replace ? rows : [...(prev || []), ...rows]));
    setHasMore(rows.length >= PAGE_SIZE);
    setOffset(nextOffset + rows.length);
  };

  // Initial load + when category changes: reset and fetch first page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const title = String(resolvedAgendaTitle || '').trim();
      if (!title) return;
      setLoadingPosts(true);
      setHasMore(true);
      setOffset(0);
      try {
        if (!cancelled) await fetchPostsPage({ nextOffset: 0, replace: true });
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAgendaTitle, category]);

  // Infinite scroll: observe sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const e = entries?.[0];
        if (!e?.isIntersecting) return;
        if (loadingPosts || loadingMore) return;
        if (!hasMore) return;
        // Load next page
        (async () => {
          setLoadingMore(true);
          try {
            await fetchPostsPage({ nextOffset: offset, replace: false });
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { root: null, rootMargin: '250px', threshold: 0.01 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, loadingPosts, loadingMore, resolvedAgendaTitle, category]);
  
  if (!agenda) {
    return (
      <div className="container-main py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        {/* Gündem Header */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2 min-w-0">
              <h1 className="text-3xl font-bold break-words">{agendaTitle}</h1>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline">Takip Et</Button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/gundem-disi')}
              className="md:col-span-1 w-full h-full min-h-[52px] rounded-2xl bg-gray-900 hover:bg-black text-white font-black px-4 py-3 transition-colors"
              title="Gündem dışı tüm politlere git"
            >
              Gündem Dışı Politler
            </button>
          </div>
          
          <div className="flex gap-8">
            <div>
              <div className="text-2xl font-bold">{formatNumber(agendaPostCount)}</div>
              <div className="text-sm text-gray-500">Paylaşım</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-blue">{formatPolitScore(agendaScore)}</div>
              <div className="text-sm text-gray-500">Toplam Polit Puan</div>
            </div>
            {agendaParticipantCount > 0 && (
              <div>
                <div className="text-2xl font-bold">{formatNumber(agendaParticipantCount)}</div>
                <div className="text-sm text-gray-500">Katılımcı</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Kategori Tabs */}
        <div className="flex gap-4 border-b mb-6">
          {['all', 'mps', 'organization', 'citizens', 'experience', 'media'].map(cat => (
            <button
              key={cat}
              className={`pb-3 px-4 font-medium capitalize ${
                category === cat 
                  ? 'text-primary-blue border-b-2 border-primary-blue' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'Tümü' : 
               cat === 'mps' ? 'Vekiller' :
               cat === 'organization' ? 'Teşkilat' :
               cat === 'citizens' ? 'Vatandaş' :
               cat === 'experience' ? 'Deneyim' : 'Medya'}
            </button>
          ))}
        </div>
        
        {/* Paylaşımlar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agendaPosts.map(post => (
            <PostCardHorizontal key={post.post_id ?? post.id} post={post} fullWidth={true} />
          ))}
        </div>

        {loadingPosts && <div className="mt-6 text-center text-sm text-gray-600">Yükleniyor…</div>}
        {!loadingPosts && agendaPosts.length === 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">Bu gündemde henüz paylaşım yok.</div>
        )}

        <div ref={sentinelRef} className="h-8" />
        {loadingMore && <div className="mt-2 text-center text-sm text-gray-600">Daha fazla yükleniyor…</div>}
        {!loadingPosts && !loadingMore && !hasMore && agendaPosts.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-500">Hepsi bu kadar.</div>
        )}
      </div>
    </div>
  );
};
