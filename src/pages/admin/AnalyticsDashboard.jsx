import { useState } from 'react';
import { TrendingUp, Users, FileText, Eye, Calendar } from 'lucide-react';

export const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('7days');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Analitik & Raporlar</h1>
          <p className="text-gray-600">Detaylı platform analitiği</p>
        </div>
        
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="today">Bugün</option>
          <option value="7days">Son 7 Gün</option>
          <option value="30days">Son 30 Gün</option>
          <option value="90days">Son 90 Gün</option>
        </select>
      </div>
      
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <Users className="w-8 h-8 text-blue-500 mb-2" />
          <div className="text-3xl font-black text-gray-900">12,543</div>
          <div className="text-sm text-gray-600">Toplam Kullanıcı</div>
          <div className="text-xs text-green-500 mt-1">+12% bu hafta</div>
        </div>
        
        <div className="bg-white rounded-xl border p-6">
          <FileText className="w-8 h-8 text-green-500 mb-2" />
          <div className="text-3xl font-black text-gray-900">45,678</div>
          <div className="text-sm text-gray-600">Toplam Paylaşım</div>
          <div className="text-xs text-green-500 mt-1">+8% bu hafta</div>
        </div>
        
        <div className="bg-white rounded-xl border p-6">
          <Eye className="w-8 h-8 text-purple-500 mb-2" />
          <div className="text-3xl font-black text-gray-900">1.2M</div>
          <div className="text-sm text-gray-600">Sayfa Görüntüleme</div>
          <div className="text-xs text-green-500 mt-1">+25% bu hafta</div>
        </div>
        
        <div className="bg-white rounded-xl border p-6">
          <TrendingUp className="w-8 h-8 text-orange-500 mb-2" />
          <div className="text-3xl font-black text-gray-900">125M</div>
          <div className="text-sm text-gray-600">Toplam Polit Puan</div>
          <div className="text-xs text-green-500 mt-1">+15% bu hafta</div>
        </div>
      </div>
      
      {/* Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Kullanıcı Büyümesi</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Grafik (Recharts ile eklenecek)</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">En Popüler Gündemler</h3>
          <div className="space-y-3">
            {['Seçim 2028', 'Ekonomi Politikaları', 'Dış Politika', 'Eğitim Reformu', 'Sağlık Sistemi'].map((agenda, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">{agenda}</span>
                <span className="text-primary-blue font-bold">{(15234 - i * 2000).toLocaleString('tr-TR')} P.</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Kullanıcı Dağılımı</h3>
          <div className="space-y-3">
            {[
              { label: 'Vatandaş', count: 8234, color: 'blue' },
              { label: 'Siyasetçi', count: 2145, color: 'green' },
              { label: 'Medya', count: 892, color: 'purple' },
              { label: 'Parti Üyesi', count: 1272, color: 'orange' },
            ].map((type, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-700">{type.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className={`bg-${type.color}-500 h-2 rounded-full`} style={{ width: `${(type.count / 8234) * 100}%` }}></div>
                  </div>
                  <span className="font-bold text-gray-900 w-16 text-right">{type.count.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
