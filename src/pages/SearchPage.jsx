import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../components/common/Input';
import { PostCard } from '../components/post/PostCard';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { getUserTitle, isUiVerifiedUser } from '../utils/titleHelpers';
import { apiCall } from '../utils/api';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = String(query || '').trim();
    if (q.length < 2) {
      setUsers([]);
      setPosts([]);
      setAgendas([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const [searchRes, agendaRes] = await Promise.all([
          apiCall(`/api/search?q=${encodeURIComponent(q)}`).catch(() => null),
          apiCall(`/api/agendas?limit=30&search=${encodeURIComponent(q)}`).catch(() => null),
        ]);
        const data = searchRes?.data || searchRes?.data?.data || searchRes || {};
        const nextUsers = Array.isArray(data?.users) ? data.users : [];
        const nextPosts = Array.isArray(data?.posts) ? data.posts : [];
        const nextAgendas = Array.isArray(agendaRes?.data) ? agendaRes.data : Array.isArray(agendaRes?.data?.data) ? agendaRes.data.data : [];
        setUsers(nextUsers);
        setPosts(nextPosts);
        setAgendas(nextAgendas);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Input
              placeholder="Kullanıcı, paylaşım, gündem ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg"
            />
          </div>
          
          <div className="flex gap-2 mb-6">
            {['all', 'posts', 'users', 'agendas'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === f
                    ? 'bg-primary-blue text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f === 'all' ? 'Tümü' : f === 'posts' ? 'Paylaşımlar' : f === 'users' ? 'Kullanıcılar' : 'Gündemler'}
              </button>
            ))}
          </div>
          
          {(filter === 'all' || filter === 'users') && users.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Kullanıcılar</h2>
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id || user.user_id} className="card flex items-center gap-4">
                    <Avatar src={user.avatar_url || user.profile_image} size="48px" verified={isUiVerifiedUser(user)} />
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      <p className="text-xs text-gray-500">{getUserTitle(user, true) || 'Üye'}</p>
                    </div>
                    <Badge variant="primary">Takip Et</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(filter === 'all' || filter === 'posts') && posts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Paylaşımlar</h2>
              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard key={post.post_id ?? post.id} post={post} />
                ))}
              </div>
            </div>
          )}
          
          {(filter === 'all' || filter === 'agendas') && agendas.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Gündemler</h2>
              <div className="space-y-3">
                {agendas.map(agenda => (
                  <div key={agenda.id || agenda.slug || agenda.title} className="card">
                    <h3 className="font-semibold text-lg">{agenda.title}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>{agenda.post_count ?? 0} paylaşım</span>
                      <span>{agenda.total_polit_score ?? 0} polit puan</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-10 text-gray-600">Aranıyor…</div>
          )}

          {query && !loading && users.length === 0 && posts.length === 0 && agendas.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Sonuç bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
