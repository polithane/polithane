import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Trash2, Edit, X, Save } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { formatPolitScore, formatTimeAgo } from '../../utils/formatters';
import { Avatar } from '../../components/common/Avatar';

export const PostModeration = () => {
  const [posts, setPosts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editDraft, setEditDraft] = useState({
    content: '',
    content_text: '',
    category: 'general',
    agenda_tag: '',
    content_type: 'text',
    thumbnail_url: '',
    media_urls_text: '',
    is_trending: false,
    is_deleted: false,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    content_type: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page: pagination.page, limit: 50, include_deleted: 'true' };
        const q = String(searchQuery || '').trim();
        if (q) params.search = q;
        if (filters.status === 'published') params.is_deleted = 'false';
        if (filters.status === 'deleted') params.is_deleted = 'true';
        const r = await adminApi.getPosts(params);
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
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchQuery, filters.status]);

  const filteredPosts = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    if (filters.content_type === 'all') return list;
    return list.filter((p) => String(p?.content_type || '') === String(filters.content_type));
  }, [posts, filters.content_type]);

  const handleDeletePost = (postId) => {
    if (confirm('Bu paylaşımı silmek istediğinize emin misiniz?')) {
      adminApi.deletePost(postId)
        .then(() => setPosts((prev) => prev.filter((p) => String(p.id || p.post_id) !== String(postId))))
        .catch((e) => alert('İşlem başarısız: ' + (e?.message || '')));
    }
  };

  const openEdit = (post) => {
    const id = post?.id || post?.post_id;
    if (!id) return;
    setEditingPost(post);
    const content = String(post?.content ?? '').trim();
    const contentText = String(post?.content_text ?? post?.content ?? '').trim();
    const mediaUrls = Array.isArray(post?.media_urls) ? post.media_urls : [];
    setEditDraft({
      content,
      content_text: contentText,
      category: String(post?.category || 'general'),
      agenda_tag: String(post?.agenda_tag || ''),
      content_type: String(post?.content_type || 'text'),
      thumbnail_url: String(post?.thumbnail_url || ''),
      media_urls_text: (mediaUrls || []).map((u) => String(u || '').trim()).filter(Boolean).join('\n'),
      is_trending: !!post?.is_trending,
      is_deleted: !!post?.is_deleted,
    });
    setEditError('');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingPost(null);
    setEditSaving(false);
    setEditError('');
  };

  const saveEdit = async () => {
    const id = editingPost?.id || editingPost?.post_id;
    if (!id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const media_urls = String(editDraft.media_urls_text || '')
        .split('\n')
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 12);
      const payload = {
        content: editDraft.content,
        content_text: editDraft.content_text,
        category: editDraft.category,
        agenda_tag: editDraft.agenda_tag ? editDraft.agenda_tag : null,
        content_type: String(editDraft.content_type || '').trim() || 'text',
        thumbnail_url: String(editDraft.thumbnail_url || '').trim() ? String(editDraft.thumbnail_url).trim() : null,
        ...(media_urls.length > 0 ? { media_urls } : { media_urls: [] }),
        is_trending: !!editDraft.is_trending,
        is_deleted: !!editDraft.is_deleted,
      };
      const r = await adminApi.updatePost(id, payload).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Paylaşım güncellenemedi.');
      const updated = r?.data || null;
      if (updated) {
        setPosts((prev) => prev.map((p) => (String(p?.id || p?.post_id) === String(id) ? { ...p, ...updated } : p)));
        setEditingPost((p) => (p ? { ...p, ...updated } : p));
      }
      closeEdit();
    } catch (e) {
      setEditError(String(e?.message || 'Paylaşım güncellenemedi.'));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Paylaşım Moderasyonu</h1>
        <p className="text-gray-600">{filteredPosts.length} paylaşım bulundu</p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Paylaşım içeriğinde ara..."
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
            <option value="deleted">Silinmiş</option>
          </select>
        </div>
      </div>
      
      {/* Posts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Paylaşım</th>
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
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Paylaşım bulunamadı.</td></tr>
              ) : filteredPosts.slice(0, 50).map(post => (
                <tr key={post.id || post.post_id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="text-sm text-gray-900 line-clamp-2">{post.content_text ?? post.content ?? ''}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar src={post.user?.avatar_url || post.user?.profile_image} alt="" size={32} />
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
                      <button
                        type="button"
                        onClick={() => window.open(`/post/${post.id || post.post_id}`, '_blank')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Görüntüle"
                      >
                        <Eye className="w-6 h-6 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                        title="Düzenle"
                      >
                        <Edit className="w-6 h-6 sm:w-5 sm:h-5" />
                      </button>
                      <button onClick={() => handleDeletePost(post.id || post.post_id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Sil">
                        <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editOpen && editingPost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-lg font-black text-gray-900">Paylaşımı Düzenle</div>
                <div className="text-xs text-gray-500">ID: {String(editingPost.id || editingPost.post_id)}</div>
              </div>
              <button type="button" onClick={closeEdit} className="p-2 hover:bg-gray-100 rounded-full" title="Kapat">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {editError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
                  {editError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase">Kategori</label>
                  <input
                    value={editDraft.category}
                    onChange={(e) => setEditDraft((p) => ({ ...p, category: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                    placeholder="general"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase">Gündem etiketi (agenda_tag)</label>
                  <input
                    value={editDraft.agenda_tag}
                    onChange={(e) => setEditDraft((p) => ({ ...p, agenda_tag: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                    placeholder="(boş bırakılabilir)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase">İçerik tipi (content_type)</label>
                  <select
                    value={editDraft.content_type}
                    onChange={(e) => setEditDraft((p) => ({ ...p, content_type: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none bg-white"
                  >
                    <option value="text">text</option>
                    <option value="image">image</option>
                    <option value="video">video</option>
                    <option value="audio">audio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase">Thumbnail URL (ops.)</label>
                  <input
                    value={editDraft.thumbnail_url}
                    onChange={(e) => setEditDraft((p) => ({ ...p, thumbnail_url: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 uppercase">İçerik</label>
                <textarea
                  value={editDraft.content_text}
                  onChange={(e) => setEditDraft((p) => ({ ...p, content_text: e.target.value, content: e.target.value }))}
                  className="mt-1 w-full min-h-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                  placeholder="Paylaşım metni…"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 uppercase">Medya URL’leri (media_urls) — satır satır</label>
                <textarea
                  value={editDraft.media_urls_text}
                  onChange={(e) => setEditDraft((p) => ({ ...p, media_urls_text: e.target.value }))}
                  className="mt-1 w-full min-h-[110px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none font-mono text-xs"
                  placeholder="https://...\nhttps://..."
                />
                <div className="mt-1 text-xs text-gray-500">Maks 12 URL.</div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={!!editDraft.is_trending}
                    onChange={(e) => setEditDraft((p) => ({ ...p, is_trending: e.target.checked }))}
                    className="w-5 h-5 accent-primary-blue"
                  />
                  Fast/Trend (is_trending)
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={!!editDraft.is_deleted}
                    onChange={(e) => setEditDraft((p) => ({ ...p, is_deleted: e.target.checked }))}
                    className="w-5 h-5 accent-primary-blue"
                  />
                  Silinmiş (is_deleted)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black"
                  disabled={editSaving}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-black inline-flex items-center gap-2 disabled:opacity-60"
                  disabled={editSaving}
                >
                  <Save className="w-5 h-5" />
                  {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
