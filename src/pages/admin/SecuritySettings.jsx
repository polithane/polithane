import { Shield, Lock, AlertTriangle, CheckCircle, Key, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../utils/api';

export const SecuritySettings = () => {
  const [loading, setLoading] = useState(true);
  const [envPresent, setEnvPresent] = useState(null);
  const [dbCounts, setDbCounts] = useState(null);
  const [settings, setSettings] = useState({
    admin_mfa_enabled: 'false',
    admin_mfa_require_new_device: 'false',
  });

  useEffect(() => {
    (async () => {
      try {
        const [res, env, dbo] = await Promise.all([
          api.admin.getSettings().catch(() => null),
          api.admin.envCheck().catch(() => null),
          api.admin.getDbOverview().catch(() => null),
        ]);
        if (res?.success && res?.data && typeof res.data === 'object') setSettings((prev) => ({ ...prev, ...res.data }));
        if (env?.success) setEnvPresent(env?.data?.present || null);
        if (dbo?.success) setDbCounts(dbo?.data?.counts || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const score = (() => {
    const p = envPresent || {};
    const checks = [
      !!p.JWT_SECRET,
      !!p.SUPABASE_URL && !!p.SUPABASE_KEY_OK,
      !!p.PUBLIC_APP_URL || !!p.APP_URL,
      !!p.SMTP_OK || !!p.MAIL_RELAY_OK,
    ];
    const ok = checks.filter(Boolean).length;
    return Math.round((ok / checks.length) * 100);
  })();

  const toggle = async (key) => {
    const nextValue = String(settings[key]) === 'true' ? 'false' : 'true';
    setSettings((prev) => ({ ...prev, [key]: nextValue }));
    try {
      // Update only the changed key to avoid overwriting other settings.
      await api.admin.updateSettings({ [key]: nextValue });
    } catch (e) {
      console.error(e);
      // Best-effort rollback
      setSettings((prev) => ({ ...prev, [key]: String(prev[key]) === 'true' ? 'false' : 'true' }));
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Güvenlik Ayarları</h1>
        <p className="text-gray-600">Platform güvenliğini yönetin ve izleyin</p>
      </div>

      {/* Admin / Manager MFA (feature-ready, default off) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Yönetici Mobil Doğrulama</h3>
            <p className="text-sm text-gray-600">Şimdilik pasif. Açıldığında yeni cihazdan girişte doğrulama istenir.</p>
          </div>
          {loading ? (
            <span className="text-xs text-gray-400">Yükleniyor...</span>
          ) : (
            <span className="text-xs font-bold text-gray-700">
              {String(settings.admin_mfa_enabled) === 'true' ? 'Açık' : 'Kapalı'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => toggle('admin_mfa_enabled')}
            className={`px-4 py-3 rounded-lg border font-semibold text-sm transition-colors ${
              String(settings.admin_mfa_enabled) === 'true'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50'
            }`}
          >
            Mobil doğrulamayı {String(settings.admin_mfa_enabled) === 'true' ? 'kapat' : 'aç'}
          </button>
          <button
            type="button"
            onClick={() => toggle('admin_mfa_require_new_device')}
            className={`px-4 py-3 rounded-lg border font-semibold text-sm transition-colors ${
              String(settings.admin_mfa_require_new_device) === 'true'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50'
            }`}
          >
            Yeni cihaz zorunluluğu {String(settings.admin_mfa_require_new_device) === 'true' ? 'kapat' : 'aç'}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Not: SMS/2FA akışı sonraki adımda eklenecek. Bu ekran ayarları şimdiden saklar.
        </div>
      </div>

      {/* Security Score */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-8 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black mb-2">Güvenlik Skoru</h2>
            <p className="text-green-100 mb-4">Mevcut yapılandırma (env + temel kontroller)</p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">JWT / Supabase / App URL / Mail durumu</span>
            </div>
          </div>
          <div className="text-center">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <div className="text-6xl font-black">{Number.isFinite(score) ? score : '—'}</div>
            </div>
            <div className="text-sm opacity-90">/ 100</div>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary-blue" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">SSL/TLS Sertifikası</h3>
                <p className="text-sm text-gray-600">Vercel/edge tarafından yönetilir</p>
              </div>
            </div>
            <span className="text-green-600 font-semibold text-sm">Aktif</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Sertifika Türü:</span>
              <span className="text-sm font-semibold text-gray-900">Edge Managed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Geçerlilik:</span>
              <span className="text-sm font-semibold text-gray-900">Panelden takip edilir</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">DDoS Koruması</h3>
                <p className="text-sm text-gray-600">Vercel/edge temel korumalar</p>
              </div>
            </div>
            <span className="text-green-600 font-semibold text-sm">Aktif</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Not:</span>
              <span className="text-sm font-semibold text-gray-900">Detaylı sayaç/log bu sürümde yok</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Koruma Seviyesi:</span>
              <span className="text-sm font-semibold text-primary-blue">Edge default</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Key className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">API Güvenliği</h3>
                <p className="text-sm text-gray-600">Hız sınırı & JWT</p>
              </div>
            </div>
            <span className="text-green-600 font-semibold text-sm">Aktif</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Hız Sınırı:</span>
              <span className="text-sm font-semibold text-gray-900">Endpoint bazlı (best-effort)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Token Süresi:</span>
              <span className="text-sm font-semibold text-gray-900">7 gün</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Güvenlik Duvarı</h3>
                <p className="text-sm text-gray-600">WAF (Web Uygulama Güvenlik Duvarı)</p>
              </div>
            </div>
            <span className="text-green-600 font-semibold text-sm">Aktif</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Engellenen IP:</span>
              <span className="text-sm font-semibold text-gray-900">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Kara Liste:</span>
              <span className="text-sm font-semibold text-gray-900">—</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Son Güvenlik Olayları</h3>
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-600">
            Bu sürümde güvenlik olayları için ayrı bir log tablosu tutulmuyor. Detaylı izleme (WAF log, audit log, rate-limit metrikleri)
            “Mode 1+” aşamasında eklenebilir.
            {dbCounts && typeof dbCounts.users === 'number' ? (
              <div className="mt-3 text-xs text-gray-500">
                DB hızlı özet: users={dbCounts.users.toLocaleString('tr-TR')}, posts=
                {typeof dbCounts.posts === 'number' ? dbCounts.posts.toLocaleString('tr-TR') : '—'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Password Policy */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Şifre Politikası</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">Minimum 8 karakter</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">Büyük ve küçük harf zorunlu</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">En az 1 rakam</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">Özel karakter zorunlu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
