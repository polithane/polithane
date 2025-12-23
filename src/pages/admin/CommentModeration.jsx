import { useState } from 'react';
import { Search, Eye, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const CommentModeration = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComments, setSelectedComments] = useState([]);

  // NOTE: This screen used to show mock comments. We intentionally show no fake moderation data.
  // Backend integration (admin comments listing + approve/delete/report workflows) will be wired here later.
  const comments = [];

  const filteredComments = comments.filter(comment => {
    const matchesSearch = comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         comment.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || comment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      reported: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Şikayet Edildi' },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Yorum Moderasyonu</h1>
        <p className="text-gray-600">Kullanıcı yorumlarını yönetin ve moderasyonu yapın</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Yorum</div>
          <div className="text-2xl font-black text-gray-900">{comments.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Onaylanmış</div>
          <div className="text-2xl font-black text-green-700">—</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="text-sm text-yellow-600 mb-1">Bekleyen</div>
          <div className="text-2xl font-black text-yellow-700">—</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-sm text-red-600 mb-1">Şikayet Edilen</div>
          <div className="text-2xl font-black text-red-700">—</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="font-black">Bu modül henüz canlı backend’e bağlı değil</div>
        <div className="text-sm mt-1">
          Güvenlik ve doğruluk için sahte yorum/moderasyon verisi göstermiyoruz. Moderasyon iş akışları backend’e bağlanınca bu ekran aktifleşecek.
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
            <option value="reported">Şikayet Edilen</option>
          </select>
        </div>

        {selectedComments.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">
              {selectedComments.length} yorum seçildi
            </span>
            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
              Onayla
            </button>
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold">
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
                    className="w-4 h-4 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
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
                      className="w-4 h-4 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={comment.user.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="font-semibold text-gray-900">{comment.user.name}</div>
                        <div className="text-sm text-gray-500">@{comment.user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{comment.post_title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-md line-clamp-2">{comment.content}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(comment.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-700">{comment.likes}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{comment.created_at}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Görüntüle">
                        <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
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
    </div>
  );
};
