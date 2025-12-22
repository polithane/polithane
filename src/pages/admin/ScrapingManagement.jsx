import { useState } from 'react';
import { Globe, Play, Pause, RefreshCw, Settings, TrendingUp, AlertCircle, Check } from 'lucide-react';

export const ScrapingManagement = () => {
  const mockScrapers = [
    {
      id: 1,
      name: 'Twitter Tarayıcı',
      source: 'Twitter/X',
      status: 'active',
      last_run: '5 dakika önce',
      next_run: '10 dakika sonra',
      success_rate: 98.5,
      items_collected: 1247,
      errors: 2,
    },
    {
      id: 2,
      name: 'Instagram Tarayıcı',
      source: 'Instagram',
      status: 'active',
      last_run: '8 dakika önce',
      next_run: '7 dakika sonra',
      success_rate: 96.2,
      items_collected: 856,
      errors: 5,
    },
    {
      id: 3,
      name: 'Haber RSS Akışı',
      source: 'Haber Siteleri',
      status: 'paused',
      last_run: '2 saat önce',
      next_run: '-',
      success_rate: 99.1,
      items_collected: 2341,
      errors: 1,
    },
    {
      id: 4,
      name: 'YouTube Tarayıcı',
      source: 'YouTube',
      status: 'error',
      last_run: '1 saat önce',
      next_run: '5 dakika sonra',
      success_rate: 87.3,
      items_collected: 423,
      errors: 28,
    },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', icon: Check, text: 'Aktif' },
      paused: { color: 'bg-yellow-100 text-yellow-700', icon: Pause, text: 'Duraklatıldı' },
      error: { color: 'bg-red-100 text-red-700', icon: AlertCircle, text: 'Hata' },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Tarama Yönetimi</h1>
        <p className="text-gray-600">İçerik toplama botlarını yönetin ve izleyin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Aktif Tarayıcı</div>
          <div className="text-2xl font-black text-green-700">2</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Bugün Toplanan</div>
          <div className="text-2xl font-black text-blue-700">4,867</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Ortalama Başarı</div>
          <div className="text-2xl font-black text-purple-700">95.3%</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-sm text-red-600 mb-1">Toplam Hata</div>
          <div className="text-2xl font-black text-red-700">36</div>
        </div>
      </div>

      {/* Scrapers List */}
      <div className="space-y-4">
        {mockScrapers.map((scraper) => (
          <div key={scraper.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-blue/10 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{scraper.name}</h3>
                  <p className="text-sm text-gray-600">{scraper.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(scraper.status)}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Son Çalışma</span>
                <span className="text-sm font-semibold text-gray-900">{scraper.last_run}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Sonraki Çalışma</span>
                <span className="text-sm font-semibold text-gray-900">{scraper.next_run}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Başarı Oranı</span>
                <span className="text-sm font-semibold text-green-600">{scraper.success_rate}%</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Toplanan İçerik</span>
                <span className="text-sm font-semibold text-blue-600">{scraper.items_collected.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Hatalar</span>
                <span className="text-sm font-semibold text-red-600">{scraper.errors}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {scraper.status === 'active' ? (
                <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-semibold">
                  <Pause className="w-6 h-6 sm:w-5 sm:h-5" />
                  Duraklat
                </button>
              ) : (
                <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                  <Play className="w-6 h-6 sm:w-5 sm:h-5" />
                  Başlat
                </button>
              )}
              <button className="flex items-center gap-2 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                <RefreshCw className="w-6 h-6 sm:w-5 sm:h-5" />
                Şimdi Çalıştır
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold">
                <TrendingUp className="w-6 h-6 sm:w-5 sm:h-5" />
                Kayıtları Gör
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Son Aktiviteler</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Twitter Tarayıcı: 247 yeni içerik toplandı</span>
            <span className="text-xs text-gray-500 ml-auto">5 dk önce</span>
          </div>
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Instagram Tarayıcı: 156 yeni içerik toplandı</span>
            <span className="text-xs text-gray-500 ml-auto">8 dk önce</span>
          </div>
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-700">YouTube Tarayıcı: API limiti aşıldı</span>
            <span className="text-xs text-gray-500 ml-auto">1 saat önce</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Haber RSS Akışı: Manuel olarak duraklatıldı</span>
            <span className="text-xs text-gray-500 ml-auto">2 saat önce</span>
          </div>
        </div>
      </div>
    </div>
  );
};
