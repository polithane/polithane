import { useState, useEffect } from 'react';
import { Save, Globe, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const SiteSettings = () => {
  const fromSettingBool = (v, fallback = false) => {
    if (typeof v === 'boolean') return v;
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return fallback;
  };

  const tryParseJson = (v) => {
    if (v && typeof v === 'object') return v;
    const s = String(v ?? '').trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const [settings, setSettings] = useState({
    siteName: 'Polithane.',
    siteSlogan: 'Özgür, açık, şeffaf siyaset, bağımsız medya!',
    siteDescription: 'Özgür, açık, şeffaf siyaset platformu',
    contactEmail: 'info@polithane.com',
    supportEmail: 'support@polithane.com',
    maintenanceMode: false,
    allowRegistration: true,
    allowComments: true,
    allowMessages: true,
    homePostsPerRow: 2, // Eski uyumluluk için
    // Yeni detaylı grid ayarları
    gridSettings: {
      home_desktop: 5,
      home_mobile: 2,
      profile_desktop: 5,
      profile_mobile: 2,
      city_desktop: 5,
      city_mobile: 2,
      agenda_desktop: 5,
      agenda_mobile: 2,
      category_desktop: 5,
      category_mobile: 2,
    },
    socialLinks: {
      twitter: 'https://twitter.com/polithane',
      facebook: 'https://facebook.com/polithane',
      instagram: 'https://instagram.com/polithane',
      youtube: 'https://youtube.com/@polithane',
    }
  });

  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [schemaSql, setSchemaSql] = useState('');

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiCall('/api/settings', {
          method: 'GET',
        });
        if (response?.schemaMissing && response?.requiredSql) {
          setSchemaSql(String(response.requiredSql || ''));
        }
        if (response.success) {
          const d = response.data && typeof response.data === 'object' ? response.data : {};
          const social = tryParseJson(d.social_links);
          setSettings(prev => ({
            ...prev,
            siteName: d.site_name ?? prev.siteName,
            siteSlogan: d.site_slogan ?? prev.siteSlogan,
            siteDescription: d.site_description ?? prev.siteDescription,
            contactEmail: d.contact_email ?? prev.contactEmail,
            supportEmail: d.support_email ?? prev.supportEmail,
            maintenanceMode: fromSettingBool(d.maintenance_mode, prev.maintenanceMode),
            allowRegistration: fromSettingBool(d.allow_registration, prev.allowRegistration),
            allowComments: fromSettingBool(d.allow_comments, prev.allowComments),
            allowMessages: fromSettingBool(d.allow_messages, prev.allowMessages),
            homePostsPerRow: Math.max(1, Math.min(3, parseInt(String(d.home_posts_per_row ?? prev.homePostsPerRow), 10) || prev.homePostsPerRow)),

            // Grid settings'leri yükle
            gridSettings: d.grid_settings && typeof d.grid_settings === 'object' ? {
              home_desktop: Math.max(1, Math.min(8, parseInt(d.grid_settings.home_desktop, 10) || prev.gridSettings.home_desktop)),
              home_mobile: Math.max(1, Math.min(8, parseInt(d.grid_settings.home_mobile, 10) || prev.gridSettings.home_mobile)),
              profile_desktop: Math.max(1, Math.min(8, parseInt(d.grid_settings.profile_desktop, 10) || prev.gridSettings.profile_desktop)),
              profile_mobile: Math.max(1, Math.min(8, parseInt(d.grid_settings.profile_mobile, 10) || prev.gridSettings.profile_mobile)),
              city_desktop: Math.max(1, Math.min(8, parseInt(d.grid_settings.city_desktop, 10) || prev.gridSettings.city_desktop)),
              city_mobile: Math.max(1, Math.min(8, parseInt(d.grid_settings.city_mobile, 10) || prev.gridSettings.city_mobile)),
              agenda_desktop: Math.max(1, Math.min(8, parseInt(d.grid_settings.agenda_desktop, 10) || prev.gridSettings.agenda_desktop)),
              agenda_mobile: Math.max(1, Math.min(8, parseInt(d.grid_settings.agenda_mobile, 10) || prev.gridSettings.agenda_mobile)),
              category_desktop: Math.max(1, Math.min(8, parseInt(d.grid_settings.category_desktop, 10) || prev.gridSettings.category_desktop)),
              category_mobile: Math.max(1, Math.min(8, parseInt(d.grid_settings.category_mobile, 10) || prev.gridSettings.category_mobile)),
            } : prev.gridSettings,

            socialLinks: social && typeof social === 'object' ? { ...prev.socialLinks, ...social } : prev.socialLinks,
          }));
        }
      } catch (error) {
        console.error('Settings yüklenemedi:', error);
      }
    };
    
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform, value) => {
    setSettings(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value }
    }));
  };

  const handleGridChange = (gridKey, value) => {
    setSettings(prev => ({
      ...prev,
      gridSettings: { ...prev.gridSettings, [gridKey]: Math.max(1, Math.min(8, parseInt(value, 10) || 2)) }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage('');
    
    try {
      const response = await apiCall('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          site_name: settings.siteName,
          site_slogan: settings.siteSlogan,
          site_description: settings.siteDescription,
          contact_email: settings.contactEmail,
          support_email: settings.supportEmail,
          maintenance_mode: !!settings.maintenanceMode,
          allow_registration: !!settings.allowRegistration,
          allow_comments: !!settings.allowComments,
          allow_messages: !!settings.allowMessages,
          home_posts_per_row: Math.max(1, Math.min(3, Number(settings.homePostsPerRow) || 2)),
          social_links: settings.socialLinks || {},
          grid_settings: settings.gridSettings || {},
        })
      });
      
      if (response.success) {
        setSaveMessage('✅ Ayarlar başarıyla kaydedildi!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        if (response?.schemaMissing && response?.requiredSql) setSchemaSql(String(response.requiredSql || ''));
        setSaveMessage('❌ ' + (response.error || 'Kaydetme başarısız'));
      }
    } catch (error) {
      setSaveMessage('❌ ' + (error.message || 'Bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Site Ayarları</h1>
          <p className="text-gray-600">Genel platform ayarları</p>
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
        {/* Home feed layout */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-blue" />
            Grid Görünüm Ayarları
          </h3>
          
          <div className="space-y-6">
            {/* Ana Sayfa */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary-blue rounded-full"></span>
                Ana Sayfa
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💻 Bilgisayar (PC)
                  </label>
                  <select
                    value={String(settings.gridSettings.home_desktop)}
                    onChange={(e) => handleGridChange('home_desktop', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Mobil
                  </label>
                  <select
                    value={String(settings.gridSettings.home_mobile)}
                    onChange={(e) => handleGridChange('home_mobile', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Profil Detay */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                Profil Detay Sayfası
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💻 Bilgisayar (PC)
                  </label>
                  <select
                    value={String(settings.gridSettings.profile_desktop)}
                    onChange={(e) => handleGridChange('profile_desktop', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Mobil
                  </label>
                  <select
                    value={String(settings.gridSettings.profile_mobile)}
                    onChange={(e) => handleGridChange('profile_mobile', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Şehir Detay */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                Şehir Detay Sayfası
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💻 Bilgisayar (PC)
                  </label>
                  <select
                    value={String(settings.gridSettings.city_desktop)}
                    onChange={(e) => handleGridChange('city_desktop', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Mobil
                  </label>
                  <select
                    value={String(settings.gridSettings.city_mobile)}
                    onChange={(e) => handleGridChange('city_mobile', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Gündem */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                Gündem Sayfası
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💻 Bilgisayar (PC)
                  </label>
                  <select
                    value={String(settings.gridSettings.agenda_desktop)}
                    onChange={(e) => handleGridChange('agenda_desktop', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Mobil
                  </label>
                  <select
                    value={String(settings.gridSettings.agenda_mobile)}
                    onChange={(e) => handleGridChange('agenda_mobile', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Kategori */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                Kategori Sayfaları
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💻 Bilgisayar (PC)
                  </label>
                  <select
                    value={String(settings.gridSettings.category_desktop)}
                    onChange={(e) => handleGridChange('category_desktop', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Mobil
                  </label>
                  <select
                    value={String(settings.gridSettings.category_mobile)}
                    onChange={(e) => handleGridChange('category_mobile', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} Polit / Satır</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bilgi Notu */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Not:</strong> Her sayfa için PC ve mobil görünümde ayrı ayrı polit kart sayısı ayarlayabilirsiniz. 
                Kart boyutları otomatik olarak seçilen sayıya göre ayarlanır. SVG ikonlar da dinamik olarak boyutlandırılır.
              </p>
            </div>
          </div>
        </div>

        {/* Not: Mail ayarları ayrı sayfada yönetilir */}

        {/* General Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Genel Bilgiler</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Site Adı</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleChange('siteName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Site Sloganı</label>
              <input
                type="text"
                value={settings.siteSlogan}
                onChange={(e) => handleChange('siteSlogan', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Site Açıklaması (SEO)</label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) => handleChange('siteDescription', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">İletişim E-postası</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Destek E-postası</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Social Media Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Sosyal Medya Linkleri</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Twitter className="w-5 h-5 text-blue-400" />
              <input
                type="url"
                value={settings.socialLinks.twitter}
                onChange={(e) => handleSocialChange('twitter', e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="https://twitter.com/polithane"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Facebook className="w-5 h-5 text-blue-600" />
              <input
                type="url"
                value={settings.socialLinks.facebook}
                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="https://facebook.com/polithane"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-pink-500" />
              <input
                type="url"
                value={settings.socialLinks.instagram}
                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="https://instagram.com/polithane"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Youtube className="w-5 h-5 text-red-500" />
              <input
                type="url"
                value={settings.socialLinks.youtube}
                onChange={(e) => handleSocialChange('youtube', e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                placeholder="https://youtube.com/@polithane"
              />
            </div>
          </div>
        </div>
        
        {/* Feature Toggles */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Özellik Ayarları</h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-semibold text-gray-900">Bakım Modu</div>
                <div className="text-sm text-gray-600">Site bakımda mesajı göster</div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                className="w-5 h-5 text-primary-blue rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-semibold text-gray-900">Yeni Kayıtlar</div>
                <div className="text-sm text-gray-600">Kullanıcı kaydına izin ver</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => handleChange('allowRegistration', e.target.checked)}
                className="w-5 h-5 text-primary-blue rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-semibold text-gray-900">Yorumlar</div>
                <div className="text-sm text-gray-600">Yorum yapılmasına izin ver</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allowComments}
                onChange={(e) => handleChange('allowComments', e.target.checked)}
                className="w-5 h-5 text-primary-blue rounded"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-semibold text-gray-900">Mesajlaşma</div>
                <div className="text-sm text-gray-600">Kullanıcı mesajlaşmasına izin ver</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allowMessages}
                onChange={(e) => handleChange('allowMessages', e.target.checked)}
                className="w-5 h-5 text-primary-blue rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
