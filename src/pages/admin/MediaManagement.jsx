import { useState } from 'react';
import { Upload, Image as ImageIcon, Video, File, Trash2, Download, Eye, Search, Grid, List } from 'lucide-react';

export const MediaManagement = () => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // NOTE: This screen used to show mock media files. We intentionally show no fake data.
  // Backend integration (list from storage + delete/download + usage count) will be wired here later.
  const mediaItems = [];

  const filteredMedia = mediaItems.filter(media => {
    const matchesType = filterType === 'all' || media.type === filterType;
    const matchesSearch = media.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getMediaIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-6 h-6 text-blue-500" />;
      case 'video': return <Video className="w-6 h-6 text-purple-500" />;
      case 'document': return <File className="w-6 h-6 text-gray-500" />;
      default: return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Medya Yönetimi</h1>
          <p className="text-gray-600">Resim, video ve dokümanları yönetin</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
          <Upload className="w-5 h-5" />
          Dosya Yükle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Toplam Resim</div>
          <div className="text-2xl font-black text-blue-700">—</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Toplam Video</div>
          <div className="text-2xl font-black text-purple-700">—</div>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Toplam Doküman</div>
          <div className="text-2xl font-black text-gray-700">—</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Toplam Boyut</div>
          <div className="text-2xl font-black text-green-700">—</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="font-black">Bu modül henüz canlı backend’e bağlı değil</div>
        <div className="text-sm mt-1">
          Güvenlik ve doğruluk için sahte medya verisi göstermiyoruz. Depolama listesi/silme/indirme entegrasyonu bağlanınca bu ekran aktifleşecek.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Dosya ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
          >
            <option value="all">Tüm Dosyalar</option>
            <option value="image">Resimler</option>
            <option value="video">Videolar</option>
            <option value="document">Dokümanlar</option>
          </select>

          <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary-blue text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary-blue text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-4 gap-4">
          {filteredMedia.map((media) => (
            <div key={media.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {media.type === 'image' ? (
                  <img src={media.url} alt={media.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {getMediaIcon(media.type)}
                    <span className="text-xs text-gray-500">{media.size}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{media.filename}</h3>
                <p className="text-xs text-gray-500 mb-3">{media.usage_count} kez kullanıldı</p>
                <div className="flex items-center gap-2">
                  <button className="flex-1 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Görüntüle">
                    <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 mx-auto" />
                  </button>
                  <button className="flex-1 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="İndir">
                    <Download className="w-6 h-6 sm:w-5 sm:h-5 text-primary-blue mx-auto" />
                  </button>
                  <button className="flex-1 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                    <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredMedia.length === 0 ? (
            <div className="col-span-4 bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-600">
              Henüz dosya yok.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Dosya</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Boyut</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Yükleyen</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kullanım</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMedia.map((media) => (
                <tr key={media.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getMediaIcon(media.type)}
                      <span className="font-semibold text-gray-900">{media.filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 capitalize">{media.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{media.size}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{media.uploaded_by}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{media.uploaded_at}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-700">{media.usage_count} kez</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                        <Download className="w-6 h-6 sm:w-5 sm:h-5 text-primary-blue" />
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
          {filteredMedia.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-600">Henüz dosya yok.</div>
          ) : null}
        </div>
      )}
    </div>
  );
};
