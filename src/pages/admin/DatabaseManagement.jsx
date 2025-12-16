import { Database, HardDrive, Activity, RefreshCw, Download, Archive } from 'lucide-react';

export const DatabaseManagement = () => {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Database Yönetimi</h1>
        <p className="text-gray-600">Veritabanı performansını izleyin ve optimize edin</p>
      </div>

      {/* Database Health */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600">Veritabanı Durumu</div>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-black text-green-700">Sağlıklı</div>
          <div className="text-xs text-green-600 mt-1">100% Uptime</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600">Toplam Boyut</div>
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">12.4 GB</div>
          <div className="text-xs text-blue-600 mt-1">/ 50 GB</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-purple-600">Toplam Kayıt</div>
            <Database className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">1.2M</div>
          <div className="text-xs text-purple-600 mt-1">Tüm tablolar</div>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-orange-600">Bağlantı Havuzu</div>
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-700">23/100</div>
          <div className="text-xs text-orange-600 mt-1">Aktif bağlantı</div>
        </div>
      </div>

      {/* Database Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Veritabanı Bilgileri</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Tür:</span>
              <span className="text-sm font-semibold text-gray-900">PostgreSQL 15</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Host:</span>
              <span className="text-sm font-semibold text-gray-900">Supabase (Managed)</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Bölge:</span>
              <span className="text-sm font-semibold text-gray-900">eu-central-1 (Frankfurt)</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Son Yedekleme:</span>
              <span className="text-sm font-semibold text-gray-900">2 saat önce</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Otomatik Yedekleme:</span>
              <span className="text-sm font-semibold text-green-600">Aktif (Günlük)</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Yedek Saklama:</span>
              <span className="text-sm font-semibold text-gray-900">30 gün</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Overview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Tablo İstatistikleri</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tablo Adı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kayıt Sayısı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Boyut</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Son Güncelleme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4"><span className="font-mono text-sm text-gray-900">users</span></td>
              <td className="px-6 py-4"><span className="text-sm font-semibold text-gray-900">124,567</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-700">2.4 GB</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-500">5 dk önce</span></td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4"><span className="font-mono text-sm text-gray-900">posts</span></td>
              <td className="px-6 py-4"><span className="text-sm font-semibold text-gray-900">456,789</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-700">5.8 GB</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-500">1 dk önce</span></td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4"><span className="font-mono text-sm text-gray-900">comments</span></td>
              <td className="px-6 py-4"><span className="text-sm font-semibold text-gray-900">789,123</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-700">3.2 GB</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-500">2 dk önce</span></td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4"><span className="font-mono text-sm text-gray-900">notifications</span></td>
              <td className="px-6 py-4"><span className="text-sm font-semibold text-gray-900">234,456</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-700">890 MB</span></td>
              <td className="px-6 py-4"><span className="text-sm text-gray-500">30 sn önce</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button className="flex items-center justify-center gap-3 px-6 py-4 bg-primary-blue text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold">
          <Download className="w-5 h-5" />
          Manuel Yedekleme Al
        </button>
        <button className="flex items-center justify-center gap-3 px-6 py-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-semibold">
          <RefreshCw className="w-5 h-5" />
          Veritabanını Optimize Et
        </button>
        <button className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold">
          <Archive className="w-5 h-5" />
          Eski Verileri Arşivle
        </button>
      </div>

      {/* Query Performance */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Yavaş Sorgular (Son 1 Saat)</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <Activity className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-mono text-xs text-gray-700 mb-1">SELECT * FROM posts WHERE...</div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>Süre: 2.4s</span>
                <span>Çağrı: 247</span>
                <span>Son: 5 dk önce</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <Activity className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-mono text-xs text-gray-700 mb-1">SELECT COUNT(*) FROM users JOIN...</div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>Süre: 1.8s</span>
                <span>Çağrı: 89</span>
                <span>Son: 12 dk önce</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
