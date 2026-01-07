import { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, Eye, Lock, Users, Globe, Save, AlertCircle, CheckCircle, Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

export const PrivacySettings = () => {
  const { user, updateUser } = useAuth();

  const choices = useMemo(
    () => [
      { value: 'everyone', label: 'Herkes' },
      { value: 'following', label: 'Sadece takip ettiklerim' },
      { value: 'none', label: 'Hiç kimse' },
    ],
    []
  );

  const normalizeTri = (v, fallback = 'everyone') => {
    const raw = v === undefined || v === null ? '' : v;
    const s = String(raw).trim().toLowerCase();
    if (s === 'everyone' || s === 'public') return 'everyone';
    if (s === 'following') return 'following';
    if (s === 'followers') return 'following'; // legacy mapping
    if (s === 'none' || s === 'private') return 'none';
    if (typeof raw === 'boolean') return raw ? 'everyone' : 'none';
    return fallback;
  };

  const normalizePrivacySettings = (ps) => {
    const o = ps && typeof ps === 'object' ? ps : {};
    return {
      fastVisibility: normalizeTri(o.fastVisibility ?? o.fast_visibility, 'everyone'),
      profileVisibility: normalizeTri(o.profileVisibility ?? o.profile_visibility ?? o.profileVisibilityRule, 'everyone'),
      showEmail: normalizeTri(o.showEmail, 'none'),
      showPhone: normalizeTri(o.showPhone, 'none'),
      showBirthday: normalizeTri(o.showBirthday, 'none'),
      allowMessages: normalizeTri(o.allowMessages, 'following'),
      allowComments: normalizeTri(o.allowComments, 'everyone'),
      allowTagging: normalizeTri(o.allowTagging, 'following'),
      showOnlineStatus: normalizeTri(o.showOnlineStatus, 'following'),
      showActivity: normalizeTri(o.showActivity, 'following'),
      showFollowers: normalizeTri(o.showFollowers, 'everyone'),
      showFollowing: normalizeTri(o.showFollowing, 'everyone'),
      indexProfile: normalizeTri(o.indexProfile, 'everyone'),
    };
  };

  const [settings, setSettings] = useState({
    fastVisibility: 'everyone',
    profileVisibility: 'everyone',
    showEmail: 'none',
    showPhone: 'none',
    showBirthday: 'none',
    allowMessages: 'following',
    allowComments: 'everyone',
    allowTagging: 'following',
    showOnlineStatus: 'following',
    showActivity: 'following',
    showFollowers: 'everyone',
    showFollowing: 'everyone',
    indexProfile: 'everyone',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const autoSaveTimer = useRef(null);
  const didMount = useRef(false);

  const savedPrivacy = useMemo(() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    if (meta.privacy_settings && typeof meta.privacy_settings === 'object') return meta.privacy_settings;
    const local = localStorage.getItem('polithane_privacy_settings');
    if (!local) return null;
    try {
      return JSON.parse(local);
    } catch {
      return null;
    }
  }, [user]);

  useEffect(() => {
    if (!savedPrivacy) return;
    setSettings((prev) => ({ ...prev, ...normalizePrivacySettings(savedPrivacy) }));
  }, [savedPrivacy]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    localStorage.setItem('polithane_privacy_settings', JSON.stringify(settings));
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

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
      setError(
        e?.message ||
          "Kaydedilemedi. Bu cihazda kaydedildi. Kalıcı çözüm için Supabase'de `users.metadata` sütunu olmalı."
      );
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

      {/* Fast Visibility (most important) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
            <Flame className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="font-black text-gray-900">Fast’lerimi kimler görebilir?</h3>
            <p className="text-sm text-gray-600">Bu ayar, Fast alanını tamamen etkiler.</p>
          </div>
        </div>
        <select
          value={settings.fastVisibility}
          onChange={(e) => handleSelectChange('fastVisibility', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
        >
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

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
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
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
        <div className="space-y-4">
          {[
            { key: 'showEmail', label: 'E-posta Adresi', desc: 'Profilimde e-posta adresimi göster' },
            { key: 'showPhone', label: 'Telefon Numarası', desc: 'Profilimde telefon numaramı göster' },
            { key: 'showBirthday', label: 'Doğum Tarihi', desc: 'Profilimde doğum tarihimi göster' },
          ].map((row) => (
            <div key={row.key}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{row.label}</label>
              <div className="text-xs text-gray-500 mb-2">{row.desc}</div>
              <select
                value={settings[row.key]}
                onChange={(e) => handleSelectChange(row.key, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
              >
                {choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
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
              {choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
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
              {choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
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
              {choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
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
        <div className="space-y-4">
          {[
            { key: 'showOnlineStatus', label: 'Çevrimiçi Durumu', desc: 'Çevrimiçi olduğunuzda gösterilsin mi?' },
            { key: 'showActivity', label: 'Aktivite Geçmişi', desc: 'Beğeni ve yorum aktiviteleri görünsün mü?' },
            { key: 'showFollowers', label: 'Takipçi Listesi', desc: 'Takipçilerimi kimler görebilir?' },
            { key: 'showFollowing', label: 'Takip Ettiklerim', desc: 'Takip ettiklerimi kimler görebilir?' },
          ].map((row) => (
            <div key={row.key}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{row.label}</label>
              <div className="text-xs text-gray-500 mb-2">{row.desc}</div>
              <select
                value={settings[row.key]}
                onChange={(e) => handleSelectChange(row.key, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
              >
                {choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Arama Motorları */}
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">Arama motorlarında görünürlük</label>
        <div className="text-xs text-gray-500 mb-2">Not: “Sadece takip ettiklerim” seçilirse arama motorları için “hiç kimse” gibi davranır.</div>
        <select
          value={settings.indexProfile}
          onChange={(e) => handleSelectChange('indexProfile', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
        >
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-6 h-6 sm:w-5 sm:h-5" />
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
};
