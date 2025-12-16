import { useEffect, useMemo, useState } from 'react';
import { Shield, Eye, Lock, Users, Globe, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

export const PrivacySettings = () => {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showBirthday: false,
    allowMessages: 'everyone',
    allowComments: 'everyone',
    allowTagging: 'following',
    showOnlineStatus: true,
    showActivity: true,
    showFollowers: true,
    showFollowing: true,
    indexProfile: true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const savedPrivacy = useMemo(() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    return meta.privacy_settings && typeof meta.privacy_settings === 'object' ? meta.privacy_settings : null;
  }, [user]);

  useEffect(() => {
    if (!savedPrivacy) return;
    setSettings((prev) => ({ ...prev, ...savedPrivacy }));
  }, [savedPrivacy]);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError('');
    try {
      const baseMeta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
      const res = await apiCall('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          metadata: {
            ...baseMeta,
            privacy_settings: settings,
          },
        }),
      });
      if (!res?.success) throw new Error(res?.error || 'Kaydedilemedi.');
      if (res.data) updateUser(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e?.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Gizlilik Ayarları</h2>
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" />
          Kaydedildi.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Profile Visibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-primary-blue" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Profil Görünürlüğü</h3>
            <p className="text-sm text-gray-600">Profilinizi kimler görebilir?</p>
          </div>
        </div>
        <select
          value={settings.profileVisibility}
          onChange={(e) => handleSelectChange('profileVisibility', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
        >
          <option value="public">Herkese Açık</option>
          <option value="followers">Sadece Takipçilerim</option>
          <option value="private">Gizli (Kimse göremez)</option>
        </select>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Lock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Kişisel Bilgiler</h3>
            <p className="text-sm text-gray-600">Hangi bilgileriniz görünsün?</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Email Adresi</div>
              <div className="text-sm text-gray-600">Profilimde email adresimi göster</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showEmail}
              onChange={() => handleToggle('showEmail')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Telefon Numarası</div>
              <div className="text-sm text-gray-600">Profilimde telefon numaramı göster</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showPhone}
              onChange={() => handleToggle('showPhone')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Doğum Tarihi</div>
              <div className="text-sm text-gray-600">Profilimde doğum tarihimi göster</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showBirthday}
              onChange={() => handleToggle('showBirthday')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
        </div>
      </div>

      {/* Interaction Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Etkileşim Ayarları</h3>
            <p className="text-sm text-gray-600">Kimler sizinle etkileşime geçebilir?</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mesaj Gönderebilir
            </label>
            <select
              value={settings.allowMessages}
              onChange={(e) => handleSelectChange('allowMessages', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            >
              <option value="everyone">Herkes</option>
              <option value="following">Takip Ettiklerim</option>
              <option value="followers">Takipçilerim</option>
              <option value="none">Kimse</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Yorum Yapabilir
            </label>
            <select
              value={settings.allowComments}
              onChange={(e) => handleSelectChange('allowComments', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            >
              <option value="everyone">Herkes</option>
              <option value="following">Takip Ettiklerim</option>
              <option value="followers">Takipçilerim</option>
              <option value="none">Kimse</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Beni Etiketleyebilir
            </label>
            <select
              value={settings.allowTagging}
              onChange={(e) => handleSelectChange('allowTagging', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            >
              <option value="everyone">Herkes</option>
              <option value="following">Takip Ettiklerim</option>
              <option value="none">Kimse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity & Visibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Eye className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Aktivite ve Görünürlük</h3>
            <p className="text-sm text-gray-600">Aktivitelerinizi paylaşın</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Çevrimiçi Durumu Göster</div>
              <div className="text-sm text-gray-600">Çevrimiçi olduğunuzda gösterilsin mi?</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showOnlineStatus}
              onChange={() => handleToggle('showOnlineStatus')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Aktivite Geçmişi</div>
              <div className="text-sm text-gray-600">Beğeniler ve yorumları göster</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showActivity}
              onChange={() => handleToggle('showActivity')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Takipçi Listesi</div>
              <div className="text-sm text-gray-600">Takipçilerimi göster</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showFollowers}
              onChange={() => handleToggle('showFollowers')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Takip Ettiklerim Listesi</div>
              <div className="text-sm text-gray-600">Takip ettiklerimi göster</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showFollowing}
              onChange={() => handleToggle('showFollowing')}
              className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
          </label>
        </div>
      </div>

      {/* Search Engine */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Arama Motorları</h3>
            <p className="text-sm text-gray-600">Profilinizin arama motorlarında görünmesi</p>
          </div>
        </div>
        <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-semibold text-gray-900">Arama Motorlarına İzin Ver</div>
            <div className="text-sm text-gray-600">Google, Bing gibi arama motorlarında çıkmasını sağla</div>
          </div>
          <input
            type="checkbox"
            checked={settings.indexProfile}
            onChange={() => handleToggle('indexProfile')}
            className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
          />
        </label>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
};
