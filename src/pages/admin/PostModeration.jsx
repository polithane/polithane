import { useState, useEffect } from 'react';
import { Search, Eye, Trash2 } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { formatPolitScore, formatTimeAgo } from '../../utils/formatters';

export const PostModeration = () => {
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    content_type: 'all',
    flagged: 'all',
  });
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await adminApi.getPosts({ page: pagination.page, limit: 50, search: searchQuery || undefined });
        if (r?.success) {
          setPosts(r.data || []);
          setPagination(r.pagination || pagination);
        }
      } catch (e) {
        console.error('Admin posts load error:', e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const filteredPosts = posts.filter(post => {
    if (filters.content_type !== 'all' && post.content_type !== filters.content_type) {
      return false;
    }
    return true;
  });

  const handleDeletePost = (postId) => {
    if (confirm('Bu postu silmek istediğinize emin misiniz?')) {
      adminApi.deletePost(postId)
        .then(() => setPosts((prev) => prev.filter((p) => (p.id || p.post_id) !== postId)))
        .catch((e) => alert('İşlem başarısız: ' + (e?.message || '')));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Post Moderasyonu</h1>
        <p className="text-gray-600">{filteredPosts.length} post bulundu</p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Post içeriğinde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            />
          </div>
          
          <select
            value={filters.content_type}
            onChange={(e) => setFilters(prev => ({ ...prev, content_type: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
          >
            <option value="all">Tüm Tipler</option>
            <option value="text">Metin</option>
            <option value="image">Resim</option>
            <option value="video">Video</option>
            <option value="audio">Ses</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="published">Yayında</option>
            <option value="pending">Beklemede</option>
            <option value="flagged">Şikayetli</option>
          </select>
        </div>
      </div>
      
      {/* Posts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Post</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Tip</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Polit Puan</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Etkileşim</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Tarih</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
              ) : filteredPosts.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Post bulunamadı.</td></tr>
              ) : filteredPosts.slice(0, 50).map(post => (
                <tr key={post.id || post.post_id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="text-sm text-gray-900 line-clamp-2">{post.content_text ?? post.content ?? ''}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img src={post.user?.avatar_url || post.user?.profile_image} alt="" className="w-8 h-8 rounded-full" />
                      <span className="text-sm font-semibold text-gray-900">{post.user?.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {post.content_type || 'text'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-primary-blue">{formatPolitScore(post.polit_score)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600">
                      <div>👁️ {post.view_count}</div>
                      <div>❤️ {post.like_count}</div>
                      <div>💬 {post.comment_count}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {formatTimeAgo(post.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Görüntüle">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePost(post.id || post.post_id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Sil">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
