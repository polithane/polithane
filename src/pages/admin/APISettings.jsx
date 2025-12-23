import { useState } from 'react';
import { Key, Code, Copy, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

export const APISettings = () => {
  const [showKey, setShowKey] = useState(false);
  // NOTE: This screen used to show mock data. We intentionally show no fake keys.
  // Backend integration (real API keys table + management endpoints) will be wired here later.
  const apiKeys = [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">API Ayarları</h1>
          <p className="text-gray-600">API anahtarlarını ve uç noktaları yönetin</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
          <Plus className="w-5 h-5" />
          Yeni API Anahtarı
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Toplam İstek (Bugün)</div>
          <div className="text-2xl font-black text-blue-700">—</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Başarılı İstek</div>
          <div className="text-2xl font-black text-green-700">—</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Aktif API Anahtarı</div>
          <div className="text-2xl font-black text-purple-700">{apiKeys.length}</div>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <div className="text-sm text-orange-600 mb-1">Ort. Yanıt Süresi</div>
          <div className="text-2xl font-black text-orange-700">—</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="font-black">Bu modül henüz canlı backend’e bağlı değil</div>
        <div className="text-sm mt-1">
          Güvenlik için sahte API anahtarı göstermiyoruz. Backend entegrasyonu (anahtar üretme/iptal etme ve kullanım istatistikleri) bu ekrana
          bağlanınca burada listelenecek.
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">API Anahtarları</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{apiKey.name}</h4>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-3 py-1 rounded text-gray-700">
                      {showKey ? apiKey.key : apiKey.key.substring(0, 20) + '••••••••••'}
                    </code>
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {showKey ? <EyeOff className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" /> : <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />}
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <Copy className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    {apiKey.status === 'active' ? 'Aktif' : apiKey.status}
                  </span>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Oluşturulma:</span>
                  <span className="ml-2 font-semibold text-gray-900">{apiKey.created}</span>
                </div>
                <div>
                  <span className="text-gray-500">Son Kullanım:</span>
                  <span className="ml-2 font-semibold text-gray-900">{apiKey.last_used}</span>
                </div>
                <div>
                  <span className="text-gray-500">Toplam İstek:</span>
                  <span className="ml-2 font-semibold text-gray-900">{apiKey.requests.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
          {apiKeys.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">Henüz API anahtarı yok.</div>
          ) : null}
        </div>
      </div>

      {/* API Uç Noktaları */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">API Uç Noktaları</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">GET</span>
              <code className="flex-1 text-sm text-gray-700">/api/v1/posts</code>
              <span className="text-xs text-gray-500">Tüm paylaşımları getir</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">POST</span>
              <code className="flex-1 text-sm text-gray-700">/api/v1/posts</code>
              <span className="text-xs text-gray-500">Yeni paylaşım oluştur</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">GET</span>
              <code className="flex-1 text-sm text-gray-700">/api/v1/users/:id</code>
              <span className="text-xs text-gray-500">Kullanıcı bilgisi getir</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">PUT</span>
              <code className="flex-1 text-sm text-gray-700">/api/v1/users/:id</code>
              <span className="text-xs text-gray-500">Kullanıcı güncelle</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">DELETE</span>
              <code className="flex-1 text-sm text-gray-700">/api/v1/posts/:id</code>
              <span className="text-xs text-gray-500">Paylaşım sil</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hız Sınırı */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Hız Sınırı</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Ücretsiz Plan</div>
            <div className="text-2xl font-black text-gray-900 mb-1">100</div>
            <div className="text-xs text-gray-500">istek / dakika</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Ücretli Plan</div>
            <div className="text-2xl font-black text-gray-900 mb-1">1,000</div>
            <div className="text-xs text-gray-500">istek / dakika</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Kurumsal</div>
            <div className="text-2xl font-black text-gray-900 mb-1">Sınırsız</div>
            <div className="text-xs text-gray-500">Özel limit</div>
          </div>
        </div>
      </div>
    </div>
  );
};
