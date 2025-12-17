import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../components/common/Input';
import { PostCard } from '../components/post/PostCard';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { mockPosts } from '../mock/posts';
import { mockUsers } from '../mock/users';
import { mockAgendas } from '../mock/agendas';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  
  const filteredPosts = mockPosts.filter(p => 
    p.content_text?.toLowerCase().includes(query.toLowerCase()) ||
    p.user?.full_name?.toLowerCase().includes(query.toLowerCase())
  );
  
  const filteredUsers = mockUsers.filter(u =>
    u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    u.username?.toLowerCase().includes(query.toLowerCase())
  );
  
  const filteredAgendas = mockAgendas.filter(a =>
    a.agenda_title?.toLowerCase().includes(query.toLowerCase())
  );
  
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
          
          {(filter === 'all' || filter === 'users') && filteredUsers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Kullanıcılar</h2>
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div key={user.user_id} className="card flex items-center gap-4">
                    <Avatar src={user.avatar_url || user.profile_image} size="48px" verified={user.verification_badge} />
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                    <Badge variant="primary">Takip Et</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(filter === 'all' || filter === 'posts') && filteredPosts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Paylaşımlar</h2>
              <div className="space-y-4">
                {filteredPosts.map(post => (
                  <PostCard key={post.post_id ?? post.id} post={post} />
                ))}
              </div>
            </div>
          )}
          
          {(filter === 'all' || filter === 'agendas') && filteredAgendas.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Gündemler</h2>
              <div className="space-y-3">
                {filteredAgendas.map(agenda => (
                  <div key={agenda.agenda_id} className="card">
                    <h3 className="font-semibold text-lg">{agenda.agenda_title}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>{agenda.post_count} paylaşım</span>
                      <span>{agenda.total_polit_score} polit puan</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {query && filteredPosts.length === 0 && filteredUsers.length === 0 && filteredAgendas.length === 0 && (
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
