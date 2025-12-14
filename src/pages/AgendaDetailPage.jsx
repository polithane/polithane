import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { formatNumber, formatPolitScore } from '../utils/formatters';
import { mockAgendas } from '../mock/agendas';
import { mockPosts } from '../mock/posts';
import api from '../utils/api';

export const AgendaDetailPage = () => {
  const { agendaSlug } = useParams();
  const [agenda, setAgenda] = useState(null);
  const [agendaPosts, setAgendaPosts] = useState([]);
  const [category, setCategory] = useState('all');
  
  useEffect(() => {
    const foundAgenda = mockAgendas.find(a => a.agenda_slug === agendaSlug);
    setAgenda(foundAgenda);
    
    (async () => {
      // Prefer DB posts if available; fallback to mock
      if (foundAgenda?.agenda_title) {
        const dbPosts = await api.posts.getAll({ agenda_tag: foundAgenda.agenda_title, limit: 60, order: 'polit_score.desc' }).catch(() => []);
        if (dbPosts?.length) {
          const posts = dbPosts.map((p) => ({
            post_id: p.id,
            user_id: p.user_id,
            content_type: p.content_type || 'text',
            content_text: p.content_text ?? p.content ?? '',
            media_url: p.media_urls ?? [],
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
            user: p.user
              ? {
                  ...p.user,
                  user_id: p.user.id,
                  profile_image: p.user.avatar_url,
                  verification_badge: p.user.is_verified ?? false,
                  party_id: p.user.party_id,
                }
              : null,
          }));
          setAgendaPosts(posts);
          return;
        }
      }
      const posts = mockPosts.filter(p => p.agenda_tag === foundAgenda?.agenda_title);
      setAgendaPosts(posts);
    })();
  }, [agendaSlug]);
  
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{agenda.agenda_title}</h1>
            <Button variant="outline">Takip Et</Button>
          </div>
          
          <div className="flex gap-8">
            <div>
              <div className="text-2xl font-bold">{formatNumber(agenda.post_count)}</div>
              <div className="text-sm text-gray-500">Paylaşım</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-blue">{formatPolitScore(agenda.total_polit_score)}</div>
              <div className="text-sm text-gray-500">Toplam Polit Puan</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatNumber(agenda.participant_count)}</div>
              <div className="text-sm text-gray-500">Katılımcı</div>
            </div>
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
            <PostCardHorizontal key={post.post_id} post={post} fullWidth={true} />
          ))}
        </div>
      </div>
    </div>
  );
};
