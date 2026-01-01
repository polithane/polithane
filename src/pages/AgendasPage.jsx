import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { Flame } from 'lucide-react';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { apiCall } from '../utils/api';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';

export const AgendasPage = () => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const [posts, setPosts] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cacheKey = useMemo(() => 'agendas', []);
  const initialCache = useMemo(() => readSessionCache(cacheKey, { maxAgeMs: 10 * 60_000 }), [cacheKey]);

  useEffect(() => {
    if (!initialCache) return;
    try {
      if (Array.isArray(initialCache.agendas)) setAgendas(initialCache.agendas);
      if (Array.isArray(initialCache.posts)) setPosts(initialCache.posts);
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

  useEffect(() => {
    (async () => {
      const hasCached = !!initialCache;
      if (hasCached) setRefreshing(true);
      else setLoading(true);
      const agendaRes = await apiCall('/api/agendas?limit=120').catch(() => null);
      const list = agendaRes?.data || [];
      setAgendas(Array.isArray(list) ? list : []);

      const data = await api.posts.getAll({ limit: 250, order: 'polit_score.desc' }).catch(() => []);
      // Agendas page is a Polit page; exclude Fast copies (is_trending).
      const rows = (Array.isArray(data) ? data : []).filter((p) => !p?.is_trending);
      setPosts(rows);

      setLoading(false);
      setRefreshing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const save = () => {
      writeSessionCache(cacheKey, {
        agendas,
        posts,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      });
    };
    return () => save();
  }, [cacheKey, agendas, posts]);

  const postsByAgenda = useMemo(() => {
    const m = new Map();
    for (const p of posts || []) {
      const tag = (p.agenda_tag || '').toString().trim();
      if (!tag) continue;
      if (!m.has(tag)) m.set(tag, []);
      m.get(tag).push(p);
    }
    // sort each tag by polit score desc
    for (const [k, list] of m.entries()) {
      m.set(
        k,
        [...list].sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0))
      );
    }
    return m;
  }, [posts]);

  // Use admin-managed agendas as ordered list of topics, and fill with real posts
  const agendaSections = useMemo(() => {
    const seen = new Set();
    const out = [];

    // 1) prefer admin order
    for (const a of agendas || []) {
      const title = a?.title || '';
      if (!title || seen.has(title)) continue;
      const list = postsByAgenda.get(title) || [];
      out.push({ title, slug: a?.slug || String(title).toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''), posts: list.slice(0, 12) });
      seen.add(title);
    }

    return out.filter((s) => (s.posts || []).length > 0);
  }, [postsByAgenda, agendas]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-black text-gray-900">Tüm Gündem</div>
            <div className="text-sm text-gray-600">Gündem başlıkları ve seçme politler</div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Geri
          </button>
        </div>

        <div className="space-y-8">
          {refreshing ? <div className="text-xs text-gray-500">Güncelleniyor…</div> : null}
          {agendaSections.map((section, idx) => (
            <div key={section.slug || section.title} className="card">
              <button
                onClick={() => navigate(`/agenda/${section.slug}`)}
                className="w-full flex items-center justify-between gap-3 mb-4"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Flame className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" />
                  <div className="text-lg font-black text-gray-900 truncate">{section.title}</div>
                </div>
                <div className="text-xs font-semibold text-primary-blue hover:underline flex-shrink-0">Detayı gör</div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.posts.map((post) => (
                  <PostCardHorizontal key={post.post_id || post.id} post={post} fullWidth={true} />
                ))}
              </div>
            </div>
          ))}

          {agendaSections.length === 0 && (
            <div className="card text-sm text-gray-600">Henüz gündem içeriği bulunmuyor.</div>
          )}
          {loading ? <div className="text-center text-sm text-gray-600">Yükleniyor…</div> : null}
        </div>
      </div>
    </div>
  );
};

