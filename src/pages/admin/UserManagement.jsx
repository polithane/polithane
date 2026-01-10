import { useState, useEffect } from 'react';
import { Search, Filter, Ban, CheckCircle, Eye, Edit, FileText, X, ExternalLink, Save } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { Avatar } from '../../components/common/Avatar';

// API URL for file links
// In production on Vercel, call same-origin /api/* (no localhost).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    user_type: '',
    is_verified: '',
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  // Verification Settings
  const [verificationSettings, setVerificationSettings] = useState({
    email_verification_enabled: 'false',
    sms_verification_enabled: 'false',
  });
  const [verificationSaving, setVerificationSaving] = useState(false);

  // Password Change Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordChangeSaving, setPasswordChangeSaving] = useState(false);
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    email: '',
    user_type: '',
    politician_type: '',
    party_id: '',
    province: '',
    district_name: '',
    avatar_url: '',
    is_active: true,
    is_verified: false,
    is_admin: false,
    email_verified: false,
    metadata_json: '',
  });

  // Duplicate users (same name + avatar)
  const [dupLoading, setDupLoading] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchVerificationSettings();
  }, [pagination.page, filters, searchQuery]);

  const fetchVerificationSettings = async () => {
    try {
      const response = await adminApi.getMailSettings();
      if (response?.success) {
        setVerificationSettings({
          email_verification_enabled: String(response.data?.email_verification_enabled || 'false'),
          sms_verification_enabled: String(response.data?.sms_verification_enabled || 'false'),
        });
      }
    } catch (error) {
      console.error('Verification settings load error:', error);
    }
  };

  const handleSaveVerificationSettings = async () => {
    setVerificationSaving(true);
    try {
      const response = await adminApi.updateMailSettings({
        email_verification_enabled: verificationSettings.email_verification_enabled,
        sms_verification_enabled: verificationSettings.sms_verification_enabled,
      });
      if (!response?.success) throw new Error(response?.error || 'Kaydedilemedi');
      alert('✅ Doğrulama ayarları kaydedildi!');
    } catch (error) {
      alert('❌ Hata: ' + error.message);
    } finally {
      setVerificationSaving(false);
    }
  };

  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async () => {
    if (!selectedUser?.id) return;
    if (!newPassword || newPassword.length < 6) {
      alert('❌ Şifre en az 6 karakter olmalı');
      return;
    }
    if (!confirm(`${selectedUser.full_name} için şifreyi değiştirmek istediğinize emin misiniz?`)) return;
    setPasswordChangeSaving(true);
    try {
      const response = await adminApi.changeUserPassword(selectedUser.id, { newPassword });
      if (!response?.success) throw new Error(response?.error || 'Şifre değiştirilemedi');
      alert('✅ Şifre başarıyla değiştirildi!');
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (error) {
      alert('❌ Hata: ' + error.message);
    } finally {
      setPasswordChangeSaving(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters,
      };
      if (searchQuery) params.search = searchQuery;

      const response = await adminApi.getUsers(params);
      if (!response?.success) throw new Error(response?.error || 'Kullanıcılar yüklenemedi.');
      if (response.success) {
        setUsers(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      setUsers([]);
      setPagination((p) => ({ ...p, totalPages: 1, total: 0 }));
      setError(String(error?.message || 'Kullanıcılar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setIsEditMode(false);
    setEditError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    const u = user || null;
    if (!u) return;
    const meta = u?.metadata && typeof u.metadata === 'object' ? u.metadata : null;
    setSelectedUser(u);
    setEditForm({
      full_name: String(u?.full_name || ''),
      username: String(u?.username || ''),
      email: String(u?.email || ''),
      user_type: String(u?.user_type || ''),
      politician_type: String(u?.politician_type || ''),
      party_id: u?.party_id == null ? '' : String(u.party_id),
      province: String(u?.province || u?.city_code || ''),
      district_name: String(u?.district_name || ''),
      avatar_url: String(u?.avatar_url || ''),
      is_active: u?.is_active !== false,
      is_verified: !!u?.is_verified,
      is_admin: !!u?.is_admin,
      email_verified: !!u?.email_verified,
      metadata_json: meta ? JSON.stringify(meta, null, 2) : '',
    });
    setIsEditMode(true);
    setEditError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditSaving(false);
    setEditError('');
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

  const handleSaveUser = async () => {
    if (!selectedUser?.id) return;
    setEditSaving(true);
    setEditError('');
    try {
      let metadata = undefined;
      const metaStr = String(editForm.metadata_json || '').trim();
      if (metaStr) {
        try {
          metadata = JSON.parse(metaStr);
        } catch {
          throw new Error('metadata JSON geçersiz.');
        }
      }
      const payload = {
        full_name: editForm.full_name,
        username: editForm.username,
        email: editForm.email,
        user_type: editForm.user_type,
        politician_type: editForm.politician_type || null,
        party_id: String(editForm.party_id || '').trim() ? String(editForm.party_id).trim() : null,
        province: String(editForm.province || '').trim() ? String(editForm.province).trim() : null,
        district_name: String(editForm.district_name || '').trim() ? String(editForm.district_name).trim() : null,
        avatar_url: String(editForm.avatar_url || '').trim() ? String(editForm.avatar_url).trim() : null,
        is_active: !!editForm.is_active,
        is_verified: !!editForm.is_verified,
        is_admin: !!editForm.is_admin,
        email_verified: !!editForm.email_verified,
        ...(metadata !== undefined ? { metadata } : {}),
      };
      const r = await adminApi.updateUser(selectedUser.id, payload).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Kullanıcı güncellenemedi.');
      const updated = r?.data || null;
      if (updated) {
        setUsers((prev) => prev.map((u) => (String(u?.id) === String(selectedUser.id) ? { ...u, ...updated } : u)));
        setSelectedUser((p) => (p ? { ...p, ...updated } : p));
      } else {
        await fetchUsers();
      }
      setIsEditMode(false);
      handleCloseModal();
    } catch (e) {
      setEditError(String(e?.message || 'Kullanıcı güncellenemedi.'));
    } finally {
      setEditSaving(false);
    }
  };

  const loadDuplicates = async () => {
    try {
      setDupLoading(true);
      const r = await adminApi.getDuplicateUsers({ limit: 5000 }).catch(() => null);
      const list = r?.data || r?.data?.data || [];
      setDuplicateGroups(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setDuplicateGroups([]);
    } finally {
      setDupLoading(false);
    }
  };

  const dedupeGroup = async (group) => {
    const arr = Array.isArray(group?.users) ? group.users : [];
    if (arr.length < 2) return;
    // Choose primary: active + highest polit_score
    const sorted = [...arr].sort((a, b) => {
      const aActive = a?.is_active === false ? 0 : 1;
      const bActive = b?.is_active === false ? 0 : 1;
      if (aActive !== bActive) return bActive - aActive;
      return (Number(b?.polit_score || 0) || 0) - (Number(a?.polit_score || 0) || 0);
    });
    const primary = sorted[0];
    const dupIds = sorted.slice(1).map((u) => u.id).filter(Boolean);
    if (!primary?.id || dupIds.length === 0) return;
    if (!confirm(`Bu gruptaki ${dupIds.length} mükerrer hesabı pasife almak istiyor musunuz?\n\nPrimary: ${primary.full_name} (@${primary.username})`)) return;
    try {
      await adminApi.dedupeUsers({ primaryId: primary.id, duplicateIds: dupIds, dryRun: false });
      alert('Mükerrer hesaplar pasife alındı.');
      await loadDuplicates();
      await fetchUsers();
    } catch (e) {
      alert('İşlem başarısız: ' + (e?.message || 'Bilinmeyen hata'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600">Toplam {pagination.total || 0} kullanıcı</p>
        </div>
        <button
          type="button"
          onClick={loadDuplicates}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50"
        >
          Mükerrerleri Bul
        </button>
      </div>

      {/* VERIFICATION SETTINGS (Mail/SMS Onayı) */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">📧 Kullanıcı Doğrulama Ayarları</h2>
            <p className="text-sm text-gray-600">Yeni üyelerin email ve SMS doğrulama zorunluluğunu belirleyin.</p>
          </div>
          <button
            type="button"
            onClick={handleSaveVerificationSettings}
            disabled={verificationSaving}
            className="px-4 py-2 rounded-lg bg-primary-blue text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {verificationSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Verification */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📧 Email Doğrulama
            </label>
            <select
              value={verificationSettings.email_verification_enabled}
              onChange={(e) => setVerificationSettings((p) => ({ ...p, email_verification_enabled: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            >
              <option value="false">❌ Kapalı (Mail doğrulamaya gerek yok)</option>
              <option value="true">✅ Açık (Yeni üyeler mail doğrulamalı)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {verificationSettings.email_verification_enabled === 'true'
                ? '✅ Yeni üyeler mail adreslerini doğrulayana kadar etkileşim yapamaz (post, beğeni, yorum, mesaj, takip).'
                : '❌ Yeni üyeler kayıt sonrası hemen tüm özellikleri kullanabilir.'}
            </p>
          </div>

          {/* SMS Verification */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📱 SMS Doğrulama
            </label>
            <select
              value={verificationSettings.sms_verification_enabled}
              onChange={(e) => setVerificationSettings((p) => ({ ...p, sms_verification_enabled: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            >
              <option value="false">❌ Kapalı (SMS doğrulamaya gerek yok)</option>
              <option value="true">✅ Açık (Yeni üyeler SMS doğrulamalı)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {verificationSettings.sms_verification_enabled === 'true'
                ? '✅ Yeni üyeler telefon numaralarını doğrulayana kadar etkileşim yapamaz.'
                : '❌ SMS doğrulama şu an devre dışı. (Gelecekte eklenecek)'}
            </p>
          </div>
        </div>
      </div>

      {dupLoading && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          Mükerrer hesaplar aranıyor…
        </div>
      )}
      {!dupLoading && duplicateGroups.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-black text-gray-900">Mükerrer Hesaplar</div>
            <div className="text-xs text-gray-500">{duplicateGroups.length} grup</div>
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {duplicateGroups.slice(0, 20).map((g) => (
              <div key={g.key} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {g.users?.[0]?.full_name || 'Aynı kişi'} ({g.count})
                  </div>
                  <button
                    type="button"
                    onClick={() => dedupeGroup(g)}
                    className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-black"
                  >
                    Teke Düşür
                  </button>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {(g.users || []).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      <Avatar src={u.avatar_url} size="28px" />
                      <div className="text-xs text-gray-800 font-semibold whitespace-nowrap">@{u.username || u.id}</div>
                      {u.is_active === false && <span className="text-[10px] text-gray-500">(pasif)</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  Not: Bu işlem mükerrer hesapları pasife alır ve rollerini primary kullanıcıya metadata olarak ekler.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
          {error}
        </div>
      ) : null}
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Ad, e-posta veya kullanıcı adı..." 
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
            <option value="true">Onaylı</option>
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
                            {user.is_verified && <CheckCircle className="w-6 h-6 sm:w-5 sm:h-5 text-blue-500" />}
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
                          <CheckCircle className="w-6 h-6 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Detaylar">
                          <Eye className="w-6 h-6 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={() => handleOpenEdit(user)} className="p-2 text-gray-700 hover:bg-gray-100 rounded" title="Düzenle">
                          <Edit className="w-6 h-6 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={() => handleBanUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Sil/Yasakla">
                          <Ban className="w-6 h-6 sm:w-5 sm:h-5" />
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
              <div>
                <h2 className="text-xl font-bold text-gray-900">{isEditMode ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Detayı'}</h2>
                {editError ? <div className="mt-1 text-sm text-red-600 font-semibold">{editError}</div> : null}
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {isEditMode ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Ad Soyad</label>
                      <input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                      <input
                        value={editForm.username}
                        onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">E-posta</label>
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">user_type</label>
                      <input
                        value={editForm.user_type}
                        onChange={(e) => setEditForm((p) => ({ ...p, user_type: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                        placeholder="citizen / politician / mp / party_official / media / ..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">politician_type</label>
                      <input
                        value={editForm.politician_type}
                        onChange={(e) => setEditForm((p) => ({ ...p, politician_type: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">party_id</label>
                      <input
                        value={editForm.party_id}
                        onChange={(e) => setEditForm((p) => ({ ...p, party_id: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                        placeholder="(boş bırakılabilir)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">İl</label>
                      <input
                        value={editForm.province}
                        onChange={(e) => setEditForm((p) => ({ ...p, province: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">İlçe</label>
                      <input
                        value={editForm.district_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, district_name: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">avatar_url</label>
                      <input
                        value={editForm.avatar_url}
                        onChange={(e) => setEditForm((p) => ({ ...p, avatar_url: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                        placeholder="(boş bırakılabilir)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">metadata (JSON)</label>
                      <textarea
                        value={editForm.metadata_json}
                        onChange={(e) => setEditForm((p) => ({ ...p, metadata_json: e.target.value }))}
                        className="mt-1 w-full min-h-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none font-mono text-xs"
                        placeholder='{"key":"value"}'
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={!!editForm.is_active}
                        onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                        className="w-5 h-5 accent-primary-blue"
                      />
                      Aktif (is_active)
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={!!editForm.is_verified}
                        onChange={(e) => setEditForm((p) => ({ ...p, is_verified: e.target.checked }))}
                        className="w-5 h-5 accent-primary-blue"
                      />
                      Onaylı (is_verified)
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={!!editForm.is_admin}
                        onChange={(e) => setEditForm((p) => ({ ...p, is_admin: e.target.checked }))}
                        className="w-5 h-5 accent-primary-blue"
                      />
                      Admin (is_admin)
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={!!editForm.email_verified}
                        onChange={(e) => setEditForm((p) => ({ ...p, email_verified: e.target.checked }))}
                        className="w-5 h-5 accent-primary-blue"
                      />
                      Email doğrulandı (email_verified)
                    </label>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black"
                      disabled={editSaving}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveUser}
                      className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-black disabled:opacity-60"
                      disabled={editSaving}
                    >
                      {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar src={selectedUser.avatar_url} size="80px" />
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser.full_name}</h3>
                    <p className="text-gray-500">@{selectedUser.username || 'user'}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {selectedUser.user_type === 'mp' ? 'Milletvekili' :
                         selectedUser.user_type === 'party_official' ? 'Teşkilat Görevlisi' :
                         selectedUser.user_type === 'politician' ? 'Siyasetçi' :
                         selectedUser.user_type === 'media' ? 'Medya' :
                         selectedUser.user_type === 'party_member' ? 'Parti Üyesi' :
                         selectedUser.user_type === 'citizen' ? 'Vatandaş' :
                         (selectedUser.user_type || 'Kullanıcı')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedUser.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selectedUser.is_verified ? 'Onaylı Hesap' : 'Onay Bekliyor'}
                      </span>
                    </div>
                  </div>
                </div>
                <a 
                  href={`/profile/${selectedUser.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <ExternalLink className="w-6 h-6 sm:w-5 sm:h-5" />
                  Profili Görüntüle
                </a>
              </div>

              {/* Metadata / Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">E-posta</label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Kayıt Tarihi</label>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                {selectedUser.party_id && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Parti</label>
                    <p className="font-medium">{selectedUser.party?.name || selectedUser.party?.party_name || selectedUser.party_id}</p>
                  </div>
                )}
                {(selectedUser.province || selectedUser.city_code) && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">İl</label>
                    <p className="font-medium">{selectedUser.province || selectedUser.city_code}</p>
                  </div>
                )}
                {selectedUser.district_name && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">İlçe</label>
                    <p className="font-medium">{selectedUser.district_name}</p>
                  </div>
                )}
                {selectedUser.bio && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Biyografi</label>
                    <p className="font-medium whitespace-pre-wrap">{selectedUser.bio}</p>
                  </div>
                )}
              </div>

              {/* Role-specific details */}
              {(() => {
                const meta = selectedUser.metadata && typeof selectedUser.metadata === 'object' ? selectedUser.metadata : {};
                const blocks = [];

                // Teşkilat / görev bilgileri
                if (selectedUser.user_type === 'party_official' || selectedUser.user_type === 'mp' || selectedUser.user_type === 'politician') {
                  const startDate = meta.start_date || meta.startDate || null;
                  const orgPosition = meta.org_position || meta.orgPosition || null;
                  const previousRoles = meta.previous_roles || null;
                  const bio = meta.bio || null;

                  blocks.push(
                    <div key="role" className="bg-white border border-gray-200 rounded-2xl p-6">
                      <div className="font-black text-gray-900 mb-3">Görev Bilgileri</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.politician_type && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Görev (Tip)</div>
                            <div className="font-medium">{selectedUser.politician_type}</div>
                          </div>
                        )}
                        {orgPosition && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Görev Ünvanı</div>
                            <div className="font-medium">{String(orgPosition)}</div>
                          </div>
                        )}
                        {startDate && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Göreve Başlama</div>
                            <div className="font-medium">{String(startDate)}</div>
                          </div>
                        )}
                        {previousRoles && (
                          <div className="md:col-span-2">
                            <div className="text-xs font-bold text-gray-500 uppercase">Önceki Görevler</div>
                            <div className="font-medium whitespace-pre-wrap">{String(previousRoles)}</div>
                          </div>
                        )}
                        {bio && (
                          <div className="md:col-span-2">
                            <div className="text-xs font-bold text-gray-500 uppercase">Ek Biyografi</div>
                            <div className="font-medium whitespace-pre-wrap">{String(bio)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Medya bilgileri
                if (selectedUser.user_type === 'media') {
                  const title = meta.media_title || null;
                  const outlet = meta.media_outlet || null;
                  const website = meta.media_website || null;
                  const mediaBio = meta.media_bio || null;
                  blocks.push(
                    <div key="media" className="bg-white border border-gray-200 rounded-2xl p-6">
                      <div className="font-black text-gray-900 mb-3">Medya Bilgileri</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {title && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Ünvan</div>
                            <div className="font-medium">{String(title)}</div>
                          </div>
                        )}
                        {outlet && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Kurum</div>
                            <div className="font-medium">{String(outlet)}</div>
                          </div>
                        )}
                        {website && (
                          <div className="md:col-span-2">
                            <div className="text-xs font-bold text-gray-500 uppercase">Web</div>
                            <div className="font-medium break-all">{String(website)}</div>
                          </div>
                        )}
                        {mediaBio && (
                          <div className="md:col-span-2">
                            <div className="text-xs font-bold text-gray-500 uppercase">Biyografi</div>
                            <div className="font-medium whitespace-pre-wrap">{String(mediaBio)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Remaining metadata (safe, primitive only)
                const hiddenKeys = new Set([
                  'document_path',
                  'document_original_name',
                  'start_date',
                  'startDate',
                  'org_position',
                  'orgPosition',
                  'previous_roles',
                  'media_title',
                  'media_outlet',
                  'media_website',
                  'media_bio',
                  'bio',
                  'roles',
                ]);
                const extra = Object.entries(meta || {}).filter(([k, v]) => !hiddenKeys.has(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'));
                if (extra.length > 0) {
                  blocks.push(
                    <div key="meta" className="bg-white border border-gray-200 rounded-2xl p-6">
                      <div className="font-black text-gray-900 mb-3">Diğer Bilgiler</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extra.map(([k, v]) => (
                          <div key={k}>
                            <div className="text-xs font-bold text-gray-500 uppercase">{k.replace(/_/g, ' ')}</div>
                            <div className="font-medium">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Roles array
                if (Array.isArray(meta.roles) && meta.roles.length > 0) {
                  blocks.push(
                    <div key="roles" className="bg-white border border-gray-200 rounded-2xl p-6">
                      <div className="font-black text-gray-900 mb-3">Roller</div>
                      <div className="flex flex-wrap gap-2">
                        {meta.roles.map((r, idx) => (
                          <span key={`${r}-${idx}`} className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-800">
                            {String(r)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                return blocks.length > 0 ? <div className="space-y-4">{blocks}</div> : null;
              })()}

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
                      <Eye className="w-6 h-6 sm:w-5 sm:h-5" />
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
              <div className="border-t pt-6 flex justify-between items-center gap-3">
                <button 
                  onClick={() => handleOpenPasswordModal(selectedUser)}
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
                >
                  🔑 Şifre Değiştir
                </button>
                <div className="flex gap-3">
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
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">🔑 Şifre Değiştir</h2>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{selectedUser.full_name}</strong> için yeni şifre belirleyin.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Yeni Şifre
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Admin olarak şifre kuralları zorunlu değildir. Kullanıcı istediği şifreyi belirleyebilir.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-bold"
                  disabled={passwordChangeSaving}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold disabled:opacity-50"
                  disabled={passwordChangeSaving || !newPassword}
                >
                  {passwordChangeSaving ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
