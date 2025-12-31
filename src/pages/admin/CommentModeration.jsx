import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Trash2, CheckCircle, AlertTriangle, RefreshCw, Edit, X, Save } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { Avatar } from '../../components/common/Avatar';

export const CommentModeration = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComments, setSelectedComments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDeleted, setEditDeleted] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getComments({ status: statusFilter === 'all' ? 'all' : statusFilter, limit: 200 }).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Yorumlar yüklenemedi.');
      setComments(Array.isArray(r.data) ? r.data : []);
      setSelectedComments([]);
    } catch (e) {
      setError(String(e?.message || 'Yorumlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredComments = useMemo(() => {
    const q = String(searchQuery || '').trim().toLocaleLowerCase('tr-TR');
    const list = Array.isArray(comments) ? comments : [];
    if (!q) return list;
    return list.filter((c) => {
      const content = String(c?.content || '').toLocaleLowerCase('tr-TR');
      const u = c?.user || {};
      const name = String(u?.full_name || u?.name || '').toLocaleLowerCase('tr-TR');
      const username = String(u?.username || '').toLocaleLowerCase('tr-TR');
      return content.includes(q) || name.includes(q) || username.includes(q);
    });
  }, [comments, searchQuery]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedComments(filteredComments.map(c => c.id));
    } else {
      setSelectedComments([]);
    }
  };

  const handleSelectComment = (id) => {
    if (selectedComments.includes(id)) {
      setSelectedComments(selectedComments.filter(cid => cid !== id));
    } else {
      setSelectedComments([...selectedComments, id]);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Onaylandı' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, text: 'Bekliyor' },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-5 h-5" />
        {badge.text}
      </span>
    );
  };

  const statusOf = (c) => (c?.is_deleted ? 'pending' : 'approved');

  const approveOne = async (id) => {
    const rid = String(id || '');
    if (!rid) return;
    const r = await adminApi.approveComment(rid).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Onaylanamadı.');
      return;
    }
    await load();
  };

  const deleteOne = async (id) => {
    const rid = String(id || '');
    if (!rid) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu yorum silinsin mi?')) return;
    const r = await adminApi.deleteComment(rid).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  const approveSelected = async () => {
    const ids = selectedComments.map(String).filter(Boolean);
    if (!ids.length) return;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await adminApi.approveComment(id).catch(() => null);
    }
    await load();
  };

  const deleteSelected = async () => {
    const ids = selectedComments.map(String).filter(Boolean);
    if (!ids.length) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`${ids.length} yorumu silmek istiyor musunuz?`)) return;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await adminApi.deleteComment(id).catch(() => null);
    }
    await load();
  };

  const openEdit = (comment) => {
    if (!comment?.id) return;
    setEditing(comment);
    setEditText(String(comment?.content ?? ''));
    setEditDeleted(!!comment?.is_deleted);
    setEditError('');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setEditText('');
    setEditDeleted(false);
    setEditSaving(false);
    setEditError('');
  };

  const saveEdit = async () => {
    const id = editing?.id;
    if (!id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const payload = { content: editText, is_deleted: !!editDeleted };
      const r = await adminApi.updateComment(id, payload).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Yorum güncellenemedi.');
      const updated = r?.data || null;
      if (updated) {
        setComments((prev) => prev.map((c) => (String(c?.id) === String(id) ? { ...c, ...updated } : c)));
      } else {
        await load();
      }
      closeEdit();
    } catch (e) {
      setEditError(String(e?.message || 'Yorum güncellenemedi.'));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Yorum Moderasyonu</h1>
          <p className="text-gray-600">Kullanıcı yorumlarını yönetin</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black inline-flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Yenile
        </button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Yorum</div>
          <div className="text-2xl font-black text-gray-900">{comments.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Onaylanmış</div>
          <div className="text-2xl font-black text-green-700">{comments.filter((c) => !c?.is_deleted).length}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="text-sm text-yellow-600 mb-1">Bekleyen</div>
          <div className="text-2xl font-black text-yellow-700">{comments.filter((c) => !!c?.is_deleted).length}</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-sm text-red-600 mb-1">Seçili</div>
          <div className="text-2xl font-black text-red-700">{selectedComments.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Yorum veya kullanıcı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="approved">Onaylanmış</option>
            <option value="pending">Bekleyen</option>
          </select>
        </div>

        {selectedComments.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">
              {selectedComments.length} yorum seçildi
            </span>
            <button
              type="button"
              onClick={approveSelected}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
            >
              Onayla
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
            >
              Sil
            </button>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedComments.length === filteredComments.length}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue cursor-pointer accent-primary-blue"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kullanıcı</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Paylaşım</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Yorum</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Beğeni</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredComments.map((comment) => (
                <tr key={comment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedComments.includes(comment.id)}
                      onChange={() => handleSelectComment(comment.id)}
                      className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue cursor-pointer accent-primary-blue"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={comment?.user?.avatar_url} alt="" size={40} />
                      <div>
                        <div className="font-semibold text-gray-900">{comment?.user?.full_name || '—'}</div>
                        <div className="text-sm text-gray-500">@{comment?.user?.username || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{String(comment?.post?.content || '').slice(0, 80) || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-md line-clamp-2">{comment.content}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(statusOf(comment))}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-700">{Number(comment.like_count || 0)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{String(comment.created_at || '').slice(0, 19) || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Görüntüle"
                        onClick={() => window.open(`/post/${comment?.post_id}`, '_blank')}
                      >
                        <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Düzenle"
                        onClick={() => openEdit(comment)}
                      >
                        <Edit className="w-6 h-6 sm:w-5 sm:h-5 text-gray-700" />
                      </button>
                      {comment?.is_deleted ? (
                        <button
                          type="button"
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Onayla"
                          onClick={() => approveOne(comment.id)}
                        >
                          <CheckCircle className="w-6 h-6 sm:w-5 sm:h-5 text-green-600" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                        onClick={() => deleteOne(comment.id)}
                      >
                        <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-600">
                    Henüz yorum yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {editOpen && editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-lg font-black text-gray-900">Yorumu Düzenle</div>
                <div className="text-xs text-gray-500">ID: {String(editing?.id)}</div>
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
              <div>
                <label className="text-xs font-black text-gray-600 uppercase">Yorum</label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="mt-1 w-full min-h-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                  placeholder="Yorum…"
                />
                <div className="mt-1 text-xs text-gray-500">{String(editText || '').length}/500</div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={!!editDeleted}
                  onChange={(e) => setEditDeleted(e.target.checked)}
                  className="w-5 h-5 accent-primary-blue"
                />
                Bekleyen/Silinmiş (is_deleted)
              </label>
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
