import { useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Link as LinkIcon, CheckCircle } from 'lucide-react';

export const SourceManagement = () => {
  const [sources, setSources] = useState([
    {
      id: 1,
      name: 'Sözcü',
      type: 'news',
      url: 'https://www.sozcu.com.tr',
      rss_feed: 'https://www.sozcu.com.tr/feed',
      enabled: true,
      priority: 'high',
      items_collected: 1247,
      last_fetch: '10 dakika önce',
    },
    {
      id: 2,
      name: 'Cumhuriyet',
      type: 'news',
      url: 'https://www.cumhuriyet.com.tr',
      rss_feed: 'https://www.cumhuriyet.com.tr/rss',
      enabled: true,
      priority: 'high',
      items_collected: 1089,
      last_fetch: '15 dakika önce',
    },
    {
      id: 3,
      name: 'Recep Tayyip Erdoğan',
      type: 'politician_twitter',
      url: 'https://twitter.com/RTErdogan',
      rss_feed: null,
      enabled: true,
      priority: 'high',
      items_collected: 423,
      last_fetch: '5 dakika önce',
    },
    {
      id: 4,
      name: 'Kemal Kılıçdaroğlu',
      type: 'politician_twitter',
      url: 'https://twitter.com/kilicdarogluk',
      rss_feed: null,
      enabled: true,
      priority: 'high',
      items_collected: 367,
      last_fetch: '7 dakika önce',
    },
    {
      id: 5,
      name: 'T24',
      type: 'news',
      url: 'https://t24.com.tr',
      rss_feed: 'https://t24.com.tr/rss',
      enabled: false,
      priority: 'medium',
      items_collected: 845,
      last_fetch: '2 saat önce',
    },
  ]);

  const toggleSource = (id) => {
    setSources(sources.map(source => 
      source.id === id ? { ...source, enabled: !source.enabled } : source
    ));
  };

  const getTypeBadge = (type) => {
    const badges = {
      news: { color: 'bg-blue-100 text-blue-700', text: 'Haber Sitesi' },
      politician_twitter: { color: 'bg-purple-100 text-purple-700', text: 'Siyasetçi Twitter' },
      politician_instagram: { color: 'bg-pink-100 text-pink-700', text: 'Siyasetçi Instagram' },
      media_twitter: { color: 'bg-cyan-100 text-cyan-700', text: 'Medya Twitter' },
    };
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-700', text: 'Diğer' };
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { color: 'bg-red-100 text-red-700', text: 'Yüksek' },
      medium: { color: 'bg-yellow-100 text-yellow-700', text: 'Orta' },
      low: { color: 'bg-gray-100 text-gray-700', text: 'Düşük' },
    };
    const badge = badges[priority];
    return (
      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kaynak Yönetimi</h1>
          <p className="text-gray-600">İçerik kaynaklarını yönetin ve ekleyin</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
          <Plus className="w-5 h-5" />
          Yeni Kaynak Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Kaynak</div>
          <div className="text-2xl font-black text-gray-900">{sources.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Aktif Kaynak</div>
          <div className="text-2xl font-black text-green-700">{sources.filter(s => s.enabled).length}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Haber Kaynağı</div>
          <div className="text-2xl font-black text-blue-700">{sources.filter(s => s.type === 'news').length}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Siyasetçi</div>
          <div className="text-2xl font-black text-purple-700">{sources.filter(s => s.type.includes('politician')).length}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 bg-primary-blue text-white rounded-lg font-semibold">
          Tümü ({sources.length})
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">
          Haber Siteleri
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">
          Siyasetçiler
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">
          Medya Mensupları
        </button>
      </div>

      {/* Sources List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kaynak</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tür</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">URL</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Öncelik</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Toplanan</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Son Çekme</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Durum</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sources.map((source) => (
              <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{source.name}</div>
                </td>
                <td className="px-6 py-4">{getTypeBadge(source.type)}</td>
                <td className="px-6 py-4">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-blue hover:underline">
                    <LinkIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="max-w-xs truncate">{source.url}</span>
                  </a>
                </td>
                <td className="px-6 py-4">{getPriorityBadge(source.priority)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-700">{source.items_collected}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{source.last_fetch}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleSource(source.id)} className={source.enabled ? 'text-green-500' : 'text-gray-400'}>
                    {source.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit className="w-6 h-6 sm:w-5 sm:h-5 text-primary-blue" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hızlı Kaynak Ekle */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Hızlı Kaynak Ekle</h3>
        <div className="grid grid-cols-3 gap-4">
          <input type="text" placeholder="Kaynak Adı" className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none" />
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none">
            <option>Kaynak Türü</option>
            <option value="news">Haber Sitesi</option>
            <option value="politician_twitter">Siyasetçi Twitter</option>
            <option value="politician_instagram">Siyasetçi Instagram</option>
            <option value="media_twitter">Medya Twitter</option>
          </select>
          <input type="url" placeholder="URL" className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none" />
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
            Kaynak Ekle
          </button>
        </div>
      </div>
    </div>
  );
};
