import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

export const AdsManagement = () => {
  const [ads, setAds] = useState([
    { id: 1, title: 'YusufBANK Banner', position: 'agenda_bar', status: 'active', clicks: 1245, impressions: 45678, ctr: '2.73%' },
    { id: 2, title: 'Sponsorlu İçerik 1', position: 'post_card', status: 'active', clicks: 892, impressions: 67234, ctr: '1.33%' },
    { id: 3, title: 'Header Banner', position: 'header', status: 'paused', clicks: 345, impressions: 23456, ctr: '1.47%' },
  ]);

  const handleToggleStatus = (id) => {
    setAds(prev => prev.map(ad => 
      ad.id === id ? { ...ad, status: ad.status === 'active' ? 'paused' : 'active' } : ad
    ));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Reklam Yönetimi</h1>
          <p className="text-gray-600">Reklam alanlarını yönetin</p>
        </div>
        
        <button className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Plus className="w-6 h-6 sm:w-5 sm:h-5" />
          Yeni Reklam
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">3</div>
          <div className="text-sm text-gray-600">Aktif Reklam</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">2,482</div>
          <div className="text-sm text-gray-600">Toplam Tıklama</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">136K</div>
          <div className="text-sm text-gray-600">Toplam Gösterim</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">1.82%</div>
          <div className="text-sm text-gray-600">Ort. Tıklama Oranı</div>
        </div>
      </div>
      
      {/* Ads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Reklam</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Pozisyon</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Durum</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Tıklama</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Gösterim</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Tıklama Oranı</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {ads.map(ad => (
              <tr key={ad.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">{ad.title}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                    {ad.position}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ad.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {ad.status === 'active' ? 'Aktif' : 'Durakladı'}
                  </span>
                </td>
                <td className="px-6 py-4">{ad.clicks.toLocaleString('tr-TR')}</td>
                <td className="px-6 py-4">{ad.impressions.toLocaleString('tr-TR')}</td>
                <td className="px-6 py-4 font-semibold">{ad.ctr}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleStatus(ad.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                      {ad.status === 'active' ? <EyeOff className="w-6 h-6 sm:w-5 sm:h-5" /> : <Eye className="w-6 h-6 sm:w-5 sm:h-5" />}
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                      <Edit className="w-6 h-6 sm:w-5 sm:h-5" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
