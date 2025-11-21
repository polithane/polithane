import { useState } from 'react';
import { Save, Bell, Mail, MessageCircle } from 'lucide-react';

export const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
    weeklyDigest: true,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    alert('Bildirim ayarları kaydedildi!');
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Bildirim Ayarları</h2>
      
      {/* Notification Channels */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Bildirim Kanalları</h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-semibold text-gray-900">Email Bildirimleri</div>
                <div className="text-sm text-gray-600">Email ile bildirim al</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
              className="w-5 h-5 text-primary-blue rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-500" />
              <div>
                <div className="font-semibold text-gray-900">Push Bildirimleri</div>
                <div className="text-sm text-gray-600">Tarayıcı bildirimleri</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={() => handleToggle('pushNotifications')}
              className="w-5 h-5 text-primary-blue rounded"
            />
          </label>
        </div>
      </div>
      
      {/* Notification Types */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Bildirim Tipleri</h3>
        
        <div className="space-y-3">
          {[
            { key: 'likes', label: 'Beğeniler', desc: 'Paylaşımlarınız beğenildiğinde' },
            { key: 'comments', label: 'Yorumlar', desc: 'Paylaşımlarınıza yorum yapıldığında' },
            { key: 'follows', label: 'Takipler', desc: 'Sizi takip ettiklerinde' },
            { key: 'mentions', label: 'Bahsetmeler', desc: 'Sizi etiketlediklerinde' },
            { key: 'messages', label: 'Mesajlar', desc: 'Yeni mesaj aldığınızda' },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-semibold text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={() => handleToggle(item.key)}
                className="w-5 h-5 text-primary-blue rounded"
              />
            </label>
          ))}
        </div>
      </div>
      
      <button onClick={handleSave} className="flex items-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600">
        <Save className="w-4 h-4" />
        Kaydet
      </button>
    </div>
  );
};
