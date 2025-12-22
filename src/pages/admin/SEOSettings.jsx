import { useState } from 'react';
import { Save, Search, Globe, Image } from 'lucide-react';

export const SEOSettings = () => {
  const [seo, setSeo] = useState({
    metaTitle: 'Polithane - Türkiye Siyasetinin Dijital Meydanı',
    metaDescription: 'Şeffaf, demokratik ve etkileşimli siyaset platformu. Polit Puan sistemi ile siyaseti takip edin.',
    metaKeywords: 'polithane, siyaset, türkiye, polit puan, demokratik platform',
    ogTitle: 'Polithane',
    ogDescription: 'Türkiye siyasetinin dijital meydanı',
    ogImage: '/og-image.png',
    twitterCard: 'summary_large_image',
    twitterSite: '@polithane',
    favicon: '/favicon.ico',
    robots: 'index, follow',
    canonicalURL: 'https://polithane.com',
    googleAnalyticsID: '',
    googleAdsenseID: '',
  });

  const handleChange = (field, value) => {
    setSeo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    alert('SEO ayarları kaydedildi!');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">SEO Ayarları</h1>
          <p className="text-gray-600">Arama motoru optimizasyonu</p>
        </div>
        
        <button onClick={handleSave} className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Save className="w-6 h-6 sm:w-5 sm:h-5" />
          Kaydet
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Meta Tags */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Meta Etiketleri</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Başlık</label>
              <input
                type="text"
                value={seo.metaTitle}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="60-70 karakter ideal"
              />
              <p className="text-xs text-gray-500 mt-1">{seo.metaTitle.length} karakter</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Açıklama</label>
              <textarea
                value={seo.metaDescription}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="150-160 karakter ideal"
              />
              <p className="text-xs text-gray-500 mt-1">{seo.metaDescription.length} karakter</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Anahtar Kelimeler (virgülle ayırın)</label>
              <input
                type="text"
                value={seo.metaKeywords}
                onChange={(e) => handleChange('metaKeywords', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              />
            </div>
          </div>
        </div>
        
        {/* Open Graph */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Open Graph (Facebook)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">OG Başlık</label>
              <input
                type="text"
                value={seo.ogTitle}
                onChange={(e) => handleChange('ogTitle', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">OG Açıklama</label>
              <textarea
                value={seo.ogDescription}
                onChange={(e) => handleChange('ogDescription', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">OG Görsel Bağlantısı</label>
              <input
                type="url"
                value={seo.ogImage}
                onChange={(e) => handleChange('ogImage', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="https://polithane.com/og-image.png"
              />
              <p className="text-xs text-gray-500 mt-1">Önerilen: 1200x630px</p>
            </div>
          </div>
        </div>
        
        {/* Analytics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Analitik Kodları</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Google Analytics Kimliği</label>
              <input
                type="text"
                value={seo.googleAnalyticsID}
                onChange={(e) => handleChange('googleAnalyticsID', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="G-XXXXXXXXXX"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Google AdSense Kimliği</label>
              <input
                type="text"
                value={seo.googleAdsenseID}
                onChange={(e) => handleChange('googleAdsenseID', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
