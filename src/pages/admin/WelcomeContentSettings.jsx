import { useState, useEffect } from 'react';
import { apiCall } from '../../utils/api';
import toast from 'react-hot-toast';
import { Save, Eye, RefreshCw } from 'lucide-react';

export const WelcomeContentSettings = () => {
  const [content, setContent] = useState({
    who_we_are: '',
    problem_we_solve: '',
    mission: '',
    vision: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/admin/welcome-content', { method: 'GET' });
      if (response?.success && response?.data) {
        setContent(response.data);
      }
    } catch (error) {
      toast.error('İçerik yüklenemedi');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiCall('/api/admin/welcome-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });

      if (response?.success) {
        toast.success('Karşılama içeriği güncellendi!');
      } else {
        throw new Error(response?.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      toast.error(error.message || 'Bir hata oluştu');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 mb-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">📝 Karşılama Sayfası İçeriği</h1>
        <p className="text-blue-100">
          Yeni kullanıcılara gösterilen "Hoş Geldiniz" modalındaki içerikleri düzenleyin
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Kaydet
            </>
          )}
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Düzenleme Moduna Dön' : 'Önizleme Görüntüle'}
        </button>

        <button
          onClick={fetchContent}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors ml-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {!showPreview ? (
        <>
          {/* Form */}
          <div className="space-y-6">
            {/* Biz Kimiz */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-900">👥 Biz Kimiz?</span>
                  <span className="text-sm text-gray-500">({content.who_we_are.length} karakter)</span>
                </div>
                <textarea
                  value={content.who_we_are}
                  onChange={(e) => setContent({ ...content, who_we_are: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Polithane'nin kim olduğunu açıklayın..."
                />
              </label>
            </div>

            {/* Hangi Sorunu Çözüyoruz */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-900">🎯 Hangi Sorunu Çözüyoruz?</span>
                  <span className="text-sm text-gray-500">({content.problem_we_solve.length} karakter)</span>
                </div>
                <textarea
                  value={content.problem_we_solve}
                  onChange={(e) => setContent({ ...content, problem_we_solve: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Çözmeye çalıştığınız problemi açıklayın..."
                />
              </label>
            </div>

            {/* Misyon */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-900">❤️ Misyonumuz</span>
                  <span className="text-sm text-gray-500">({content.mission.length} karakter)</span>
                </div>
                <textarea
                  value={content.mission}
                  onChange={(e) => setContent({ ...content, mission: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Polithane'nin misyonunu açıklayın..."
                />
              </label>
            </div>

            {/* Vizyon */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-900">👁️ Vizyonumuz</span>
                  <span className="text-sm text-gray-500">({content.vision.length} karakter)</span>
                </div>
                <textarea
                  value={content.vision}
                  onChange={(e) => setContent({ ...content, vision: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Polithane'nin vizyonunu açıklayın..."
                />
              </label>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Preview */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">📖 Önizleme</h2>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                  <span className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">👥</span>
                  Biz Kimiz?
                </h3>
                <p className="text-gray-700 leading-relaxed pl-12">{content.who_we_are || 'İçerik girilmedi...'}</p>
              </div>

              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                  <span className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">🎯</span>
                  Hangi Sorunu Çözüyoruz?
                </h3>
                <p className="text-gray-700 leading-relaxed pl-12">{content.problem_we_solve || 'İçerik girilmedi...'}</p>
              </div>

              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                  <span className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">❤️</span>
                  Misyonumuz
                </h3>
                <p className="text-gray-700 leading-relaxed pl-12">{content.mission || 'İçerik girilmedi...'}</p>
              </div>

              <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                  <span className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">👁️</span>
                  Vizyonumuz
                </h3>
                <p className="text-gray-700 leading-relaxed pl-12">{content.vision || 'İçerik girilmedi...'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>ℹ️ Not:</strong> Bu içerikler yeni kullanıcıların kayıt olduktan sonra gördüğü "Hoş Geldiniz" modalında görüntülenir. 
          Accordion şeklinde açılıp kapanabilen bölümler halinde sunulur.
        </p>
      </div>
    </div>
  );
};
