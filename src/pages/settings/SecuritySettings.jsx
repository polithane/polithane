import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

export const SecuritySettings = () => {
  const { user, updateUser, changePassword } = useAuth();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [twoFactor, setTwoFactor] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);
  const saveTimer = useRef(null);

  const PASSWORD_RULES = useMemo(
    () => [
      { id: 'length', label: 'En az 8 karakter', ok: (p) => String(p || '').length >= 8 },
      { id: 'max', label: 'En fazla 50 karakter', ok: (p) => String(p || '').length <= 50 },
      { id: 'letter', label: 'En az 1 harf', ok: (p) => /[a-zA-Z]/.test(String(p || '')) },
      { id: 'number', label: 'En az 1 rakam', ok: (p) => /[0-9]/.test(String(p || '')) },
    ],
    []
  );

  const newPassValid = PASSWORD_RULES.every((r) => r.ok(passwords.new));
  const confirmMatches = !passwords.confirm || passwords.new === passwords.confirm;

  useEffect(() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    const stored = localStorage.getItem('polithane_2fa_enabled');
    const fromMeta = meta.security_settings?.twoFactorEnabled;
    if (typeof fromMeta === 'boolean') setTwoFactor(fromMeta);
    else if (stored != null) setTwoFactor(stored === 'true');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTwoFactor = async (value) => {
    // Always persist locally so it doesn't reset on navigation
    localStorage.setItem('polithane_2fa_enabled', value ? 'true' : 'false');
    setSaving2fa(true);
    try {
      const baseMeta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
      const res = await apiCall('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          metadata: {
            ...baseMeta,
            security_settings: {
              ...(baseMeta.security_settings && typeof baseMeta.security_settings === 'object' ? baseMeta.security_settings : {}),
              twoFactorEnabled: !!value,
            },
          },
        }),
      });
      if (res?.success && res.data) updateUser(res.data);
    } catch (e) {
      // Keep Turkish + actionable
      setError(
        e?.message ||
          "2FA ayarı sunucuya kaydedilemedi. Bu cihazda kaydedildi. Kalıcı çözüm için Supabase'de `users.metadata` sütunu olmalı."
      );
    } finally {
      setSaving2fa(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (passwords.new !== passwords.confirm) {
      setError('Yeni şifreler eşleşmiyor!');
      return;
    }
    if (!passwords.current || !passwords.new) {
      setError('Lütfen mevcut şifre ve yeni şifreyi girin.');
      return;
    }
    if (!newPassValid) {
      setError('Yeni şifre kurallara uygun değil.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(passwords.current, passwords.new);
      if (!res?.success) throw new Error(res?.error || 'Şifre değiştirilemedi.');
      setSuccess(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (e2) {
      setError(e2?.message || 'Şifre değiştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Güvenlik Ayarları</h2>
      
      {/* Password Change */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Şifre Değiştir</h3>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Şifre başarıyla değiştirildi!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mevcut Şifre</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              maxLength={50}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.ok(passwords.new);
                return (
                  <span
                    key={rule.id}
                    className={`text-xs px-2 py-1 rounded-full flex items-center transition-colors ${
                      ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {ok ? <CheckCircle className="w-3 h-3 mr-1" /> : <div className="w-2 h-2 rounded-full bg-gray-400 mr-1" />}
                    {rule.label}
                  </span>
                );
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              maxLength={50}
            />
            {!confirmMatches && (
              <p className="text-sm text-red-600 mt-2">Şifreler eşleşmiyor.</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !passwords.current || !passwords.new || !passwords.confirm || !confirmMatches || !newPassValid}
            className="flex items-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>
        </form>
      </div>
      
      {/* Two-Factor Auth */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">İki Faktörlü Doğrulama</h3>
        
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary-blue" />
            <div>
              <div className="font-semibold text-gray-900">2FA Aktif</div>
              <div className="text-sm text-gray-600">Ek güvenlik katmanı</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={twoFactor}
            onChange={(e) => {
              const v = e.target.checked;
              setTwoFactor(v);
              if (saveTimer.current) clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(() => saveTwoFactor(v), 400);
            }}
            className="w-6 h-6 text-primary-blue rounded"
          />
        </label>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={() => saveTwoFactor(twoFactor)}
            disabled={saving2fa}
            className="px-5 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving2fa ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};
