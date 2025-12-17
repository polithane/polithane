import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import api from '../utils/api';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { apiCall } from '../utils/api';

export const AgendasPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [agendas, setAgendas] = useState([]);

  useEffect(() => {
    (async () => {
      const agendaRes = await apiCall('/api/agendas?limit=120').catch(() => null);
      const list = agendaRes?.data || [];
      setAgendas(Array.isArray(list) ? list : []);

      const data = await api.posts.getAll({ limit: 500, order: 'polit_score.desc' }).catch(() => []);
      setPosts(Array.isArray(data) ? data : []);
    })();
  }, []);

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

  // Use admin-managed agendas as ordered list of topics, but fill with real posts
  const agendaSections = useMemo(() => {
    const seen = new Set();
    const out = [];

    // 1) prefer admin order
    for (const a of agendas || []) {
      const title = a?.title || '';
      if (!title || seen.has(title)) continue;
      const list = postsByAgenda.get(title) || [];
      out.push({ title, slug: a?.slug || String(title).toLowerCase().replace(/\s+/g, '-'), posts: list.slice(0, 12) });
      seen.add(title);
    }

    // 2) append any real agenda tags not in mock
    for (const [tag, list] of postsByAgenda.entries()) {
      if (seen.has(tag)) continue;
      out.push({ title: tag, slug: String(tag).toLowerCase().replace(/\s+/g, '-'), posts: list.slice(0, 12) });
      seen.add(tag);
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
        </div>
      </div>
    </div>
  );
};

