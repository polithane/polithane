import { useEffect, useState } from 'react';
import { Save, Search, Globe, Image } from 'lucide-react';
import { apiCall } from '../../utils/api';

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
    headHtml: '',
    bodyHtml: '',
  });

  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [schemaSql, setSchemaSql] = useState('');

  const keyMap = {
    metaTitle: 'seo_metaTitle',
    metaDescription: 'seo_metaDescription',
    metaKeywords: 'seo_metaKeywords',
    ogTitle: 'seo_ogTitle',
    ogDescription: 'seo_ogDescription',
    ogImage: 'seo_ogImage',
    twitterCard: 'seo_twitterCard',
    twitterSite: 'seo_twitterSite',
    favicon: 'seo_favicon',
    robots: 'seo_robots',
    canonicalURL: 'seo_canonicalURL',
    googleAnalyticsID: 'seo_googleAnalyticsID',
    googleAdsenseID: 'seo_googleAdsenseID',
    headHtml: 'seo_head_html',
    bodyHtml: 'seo_body_html',
  };

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiCall('/api/settings', { method: 'GET' });
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        if (r?.success && r?.data && typeof r.data === 'object') {
          setSeo((prev) => {
            const next = { ...prev };
            for (const [field, k] of Object.entries(keyMap)) {
              if (r.data[k] !== undefined && r.data[k] !== null) next[field] = String(r.data[k]);
            }
            return next;
          });
        }
      } catch {
        // ignore (best-effort)
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field, value) => {
    setSeo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage('');
    try {
      const payload = {};
      for (const [field, k] of Object.entries(keyMap)) {
        payload[k] = seo[field] ?? '';
      }
      const r = await apiCall('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      if (r?.success) {
        setSaveMessage('✅ SEO ayarları kaydedildi!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        setSaveMessage(`❌ ${r?.error || 'Kaydetme başarısız'}`);
      }
    } catch (e) {
      setSaveMessage(`❌ ${String(e?.message || 'Bir hata oluştu')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">SEO Ayarları</h1>
          <p className="text-gray-600">Arama motoru optimizasyonu</p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm font-medium ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-6 h-6 sm:w-5 sm:h-5" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {schemaSql ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-black">DB tablosu eksik: `site_settings`</div>
          <div className="text-sm mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}
      
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

        {/* Custom head/body injection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Özel Kod (Head / Body)</h3>
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            Uyarı: Buraya eklenen HTML/JS tüm ziyaretçilerde çalışır. Sadece güvenilir kod ekleyin (GA, GTM, doğrulama etiketleri vb.).
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Head içine eklenecek HTML/Script</label>
              <textarea
                value={seo.headHtml}
                onChange={(e) => handleChange('headHtml', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none font-mono text-xs"
                placeholder={'<script>/* ... */</script>'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Body sonuna eklenecek HTML/Script</label>
              <textarea
                value={seo.bodyHtml}
                onChange={(e) => handleChange('bodyHtml', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none font-mono text-xs"
                placeholder={'<noscript>...</noscript>'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
