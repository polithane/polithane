import { useState, useEffect } from 'react';
import { Search, Filter, Ban, CheckCircle, Eye, Edit, FileText, X } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { Avatar } from '../../components/common/Avatar';

// API URL for file links
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    user_type: '',
    is_verified: '',
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters,
      };
      if (searchQuery) params.search = searchQuery;

      const response = await adminApi.getUsers(params);
      if (response.success) {
        setUsers(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleBanUser = async (userId) => {
    if (confirm('Kullanıcıyı yasaklamak/silmek istediğinize emin misiniz?')) {
      try {
        await adminApi.deleteUser(userId);
        fetchUsers(); // Refresh
      } catch (error) {
        alert('İşlem başarısız: ' + error.message);
      }
    }
  };

  const handleVerifyUser = async (userId, currentStatus) => {
    if (confirm(`Kullanıcı doğrulama durumunu ${!currentStatus} yapmak istiyor musunuz?`)) {
      try {
        await adminApi.updateUser(userId, { is_verified: !currentStatus });
        fetchUsers();
      } catch (error) {
        alert('İşlem başarısız: ' + error.message);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600">Toplam {pagination.total || 0} kullanıcı</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Ad, email veya kullanıcı adı..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none" 
            />
          </div>
          
          <select 
            value={filters.user_type} 
            onChange={(e) => setFilters(prev => ({ ...prev, user_type: e.target.value }))} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue"
          >
            <option value="">Tüm Tipler</option>
            <option value="citizen">Vatandaş</option>
            <option value="politician">Siyasetçi</option>
            <option value="media">Medya</option>
            <option value="party_member">Parti Üyesi</option>
          </select>
          
          <select 
            value={filters.is_verified} 
            onChange={(e) => setFilters(prev => ({ ...prev, is_verified: e.target.value }))} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue"
          >
            <option value="">Doğrulama Durumu</option>
            <option value="true">Doğrulanmış</option>
            <option value="false">Bekleyen/Doğrulanmamış</option>
          </select>

          <button onClick={fetchUsers} className="bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
            Filtrele
          </button>
        </div>
      </div>
      
      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kayıt Tarihi</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Kullanıcı bulunamadı.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} alt={user.full_name} size="40px" />
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1">
                            {user.full_name}
                            {user.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="text-sm text-gray-500">@{user.username || 'user'} • {user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold 
                        ${user.user_type === 'politician' ? 'bg-purple-100 text-purple-700' : 
                          user.user_type === 'media' ? 'bg-green-100 text-green-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {user.user_type === 'politician' ? 'Siyasetçi' : 
                         user.user_type === 'media' ? 'Medya' : 
                         user.user_type === 'party_member' ? 'Parti Üyesi' : 'Vatandaş'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${user.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {user.is_verified ? 'Onaylı' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleVerifyUser(user.id, user.is_verified)} className="p-2 text-green-600 hover:bg-green-50 rounded" title={user.is_verified ? "Onayı Kaldır" : "Onayla"}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Detaylar">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBanUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Sil/Yasakla">
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button 
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Önceki
          </button>
          <span className="text-sm text-gray-600">
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>
          <button 
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>

      {/* User Detail Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Kullanıcı Detayı</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-start gap-4">
                <Avatar src={selectedUser.avatar_url} size="80px" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedUser.full_name}</h3>
                  <p className="text-gray-500">@{selectedUser.username || 'user'}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {selectedUser.user_type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedUser.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selectedUser.is_verified ? 'Onaylı Hesap' : 'Onay Bekliyor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata / Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Kayıt Tarihi</label>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                {selectedUser.metadata && Object.entries(selectedUser.metadata).map(([key, value]) => {
                  if (key === 'document_path' || key === 'document_original_name' || typeof value === 'object') return null;
                  return (
                    <div key={key}>
                      <label className="text-xs font-bold text-gray-500 uppercase">{key.replace(/_/g, ' ')}</label>
                      <p className="font-medium">{value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Document Download Section */}
              {selectedUser.metadata?.document_path && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Yüklenen Resmi Belge</h4>
                        <p className="text-sm text-gray-600">
                          {selectedUser.metadata.document_original_name || 'belge.pdf'}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={`${API_URL}${selectedUser.metadata.document_path}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Belgeyi Görüntüle
                    </a>
                  </div>
                </div>
              )}
              
              {!selectedUser.metadata?.document_path && selectedUser.user_type !== 'citizen' && (
                <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-xl">
                  <p className="text-gray-500">Bu kullanıcı herhangi bir belge yüklememiş.</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-6 flex justify-end gap-3">
                 {!selectedUser.is_verified && (
                   <button 
                     onClick={() => {
                        handleVerifyUser(selectedUser.id, false);
                        handleCloseModal();
                     }}
                     className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
                   >
                     Başvuruyu Onayla
                   </button>
                 )}
                 <button 
                   onClick={handleCloseModal}
                   className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
                 >
                   Kapat
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
