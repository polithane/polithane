import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCard } from '../components/post/PostCard';
import { formatNumber, formatPolitScore } from '../utils/formatters';
import { mockAgendas } from '../mock/agendas';
import { mockPosts } from '../mock/posts';

export const AgendaDetailPage = () => {
  const { agendaSlug } = useParams();
  const [agenda, setAgenda] = useState(null);
  const [agendaPosts, setAgendaPosts] = useState([]);
  const [category, setCategory] = useState('all');
  
  useEffect(() => {
    const foundAgenda = mockAgendas.find(a => a.agenda_slug === agendaSlug);
    setAgenda(foundAgenda);
    
    const posts = mockPosts.filter(p => p.agenda_tag === foundAgenda?.agenda_title);
    setAgendaPosts(posts);
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
        <div className="space-y-4">
          {agendaPosts.map(post => (
            <PostCard key={post.post_id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};
