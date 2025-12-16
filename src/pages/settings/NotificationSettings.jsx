import { useState } from 'react';
import { Save, Bell, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

export const NotificationSettings = () => {
  const { user, updateUser } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const save = async () => {
      setSaving(true);
      setSuccess(false);
      setError('');
      try {
        const baseMeta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
        const res = await apiCall('/api/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            metadata: {
              ...baseMeta,
              notification_settings: settings,
            },
          }),
        });
        if (!res?.success) throw new Error(res?.error || 'Kaydedilemedi.');
        if (res.data) updateUser(res.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        setError(e?.message || 'Kaydedilemedi.');
      } finally {
        setSaving(false);
      }
    };
    save();
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Bildirim Ayarları</h2>
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" />
          Kaydedildi.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
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
      
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
};
