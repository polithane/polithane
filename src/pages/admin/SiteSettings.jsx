import { useState, useEffect } from 'react';
import { Save, Globe, Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const SiteSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'Polithane',
    siteSlogan: 'Türkiye Siyasetinin Dijital Meydanı',
    siteDescription: 'Şeffaf, demokratik ve etkileşimli siyaset platformu',
    contactEmail: 'info@polithane.com',
    supportEmail: 'support@polithane.com',
    maintenanceMode: false,
    allowRegistration: true,
    allowComments: true,
    allowMessages: true,
    // Email ayarları
    email_verification_enabled: 'true',
    email_service_provider: 'gmail',
    email_from_address: 'noreply@polithane.com',
    email_from_name: 'Polithane',
    email_smtp_user: '',
    email_smtp_password: '',
    socialLinks: {
      twitter: 'https://twitter.com/polithane',
      facebook: 'https://facebook.com/polithane',
      instagram: 'https://instagram.com/polithane',
      youtube: 'https://youtube.com/@polithane',
    }
  });

  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiCall('/api/settings', {
          method: 'GET',
        });
        
        if (response.success) {
          setSettings(prev => ({
            ...prev,
            ...response.data
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

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage('');
    
    try {
      const response = await apiCall('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          email_verification_enabled: settings.email_verification_enabled,
          email_service_provider: settings.email_service_provider,
          email_from_address: settings.email_from_address,
          email_from_name: settings.email_from_name,
          email_smtp_user: settings.email_smtp_user,
          email_smtp_password: settings.email_smtp_password,
        })
      });
      
      if (response.success) {
        setSaveMessage('✅ Ayarlar başarıyla kaydedildi!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
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
            <Save className="w-4 h-4" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Email Ayarları */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-blue" />
            Email Doğrulama Ayarları
          </h3>
          
          <div className="space-y-4">
            {/* Email Doğrulama Aktif/Pasif */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Email Doğrulama Sistemi</p>
                <p className="text-sm text-gray-600">Yeni kullanıcılar email doğrulaması yapmalı mı?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_verification_enabled === 'true'}
                  onChange={(e) => handleChange('email_verification_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-blue"></div>
              </label>
            </div>

            {/* Email Ayarları (sadece email doğrulama açıksa göster) */}
            {settings.email_verification_enabled === 'true' && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Email Servisi Yapılandırması</p>
                
                {/* Service Provider */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email Servis Sağlayıcısı</label>
                  <select
                    value={settings.email_service_provider}
                    onChange={(e) => handleChange('email_service_provider', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="aws-ses">AWS SES</option>
                  </select>
                </div>

                {/* Gmail ayarları */}
                {settings.email_service_provider === 'gmail' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Gmail Adresi</label>
                      <input
                        type="email"
                        value={settings.email_smtp_user}
                        onChange={(e) => handleChange('email_smtp_user', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="sizin-gmail@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Gmail App Password</label>
                      <input
                        type="password"
                        value={settings.email_smtp_password}
                        onChange={(e) => handleChange('email_smtp_password', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="abcd efgh ijkl mnop"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">
                          Gmail App Password oluşturmak için tıklayın
                        </a>
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">📝 Gmail App Password Nasıl Oluşturulur?</p>
                      <ol className="text-xs text-yellow-700 space-y-1 ml-4 list-decimal">
                        <li>Google hesabınıza gidin</li>
                        <li>Security → 2-Step Verification (Aktif edin)</li>
                        <li>Security → App passwords</li>
                        <li>"Select app" → "Mail" seçin</li>
                        <li>"Select device" → "Other" → "Polithane" yazın</li>
                        <li>Generate → 16 haneli şifreyi yukarıya yapıştırın</li>
                      </ol>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

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
                <label className="block text-sm font-semibold text-gray-700 mb-2">İletişim Email</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Destek Email</label>
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
