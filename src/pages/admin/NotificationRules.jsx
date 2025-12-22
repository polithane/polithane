import { useState } from 'react';
import { Bell, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export const NotificationRules = () => {
  const [rules, setRules] = useState([
    {
      id: 1,
      name: 'Yeni Takipçi',
      description: 'Kullanıcı yeni bir takipçi kazandığında bildirim gönder',
      trigger: 'new_follower',
      enabled: true,
      channels: ['in_app', 'push'],
      priority: 'normal',
    },
    {
      id: 2,
      name: 'Post Beğenildi',
      description: 'Kullanıcının paylaşımı beğenildiğinde bildirim gönder',
      trigger: 'post_liked',
      enabled: true,
      channels: ['in_app'],
      priority: 'low',
    },
    {
      id: 3,
      name: 'Yeni Yorum',
      description: 'Paylaşıma yeni yorum yapıldığında bildirim gönder',
      trigger: 'new_comment',
      enabled: true,
      channels: ['in_app', 'push', 'email'],
      priority: 'high',
    },
    {
      id: 4,
      name: 'Bahsetme',
      description: 'Kullanıcı bir paylaşımda etiketlendiğinde bildirim gönder',
      trigger: 'mentioned',
      enabled: true,
      channels: ['in_app', 'push'],
      priority: 'high',
    },
    {
      id: 5,
      name: 'Günün Gündemi',
      description: 'Günlük gündem özeti gönder',
      trigger: 'daily_agenda',
      enabled: false,
      channels: ['email'],
      priority: 'low',
    },
  ]);

  const toggleRule = (id) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { color: 'bg-red-100 text-red-700', text: 'Yüksek' },
      normal: { color: 'bg-yellow-100 text-yellow-700', text: 'Normal' },
      low: { color: 'bg-gray-100 text-gray-700', text: 'Düşük' },
    };
    const badge = badges[priority];
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getChannelBadges = (channels) => {
    const channelNames = {
      in_app: 'Uygulama İçi',
      push: 'Anlık Bildirim',
      email: 'E-posta',
      sms: 'SMS',
    };
    return (
      <div className="flex flex-wrap gap-2">
        {channels.map(channel => (
          <span key={channel} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
            {channelNames[channel]}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Bildirim Kuralları</h1>
          <p className="text-gray-600">Otomatik bildirim kurallarını yönetin</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
          <Plus className="w-5 h-5" />
          Yeni Kural
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Kural</div>
          <div className="text-2xl font-black text-gray-900">{rules.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Aktif Kural</div>
          <div className="text-2xl font-black text-green-700">{rules.filter(r => r.enabled).length}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Bu Ay Gönderilen</div>
          <div className="text-2xl font-black text-blue-700">45,678</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Tıklanma Oranı</div>
          <div className="text-2xl font-black text-purple-700">42.3%</div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{rule.name}</h3>
                  {getPriorityBadge(rule.priority)}
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`ml-auto ${rule.enabled ? 'text-green-500' : 'text-gray-400'}`}
                  >
                    {rule.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">{rule.description}</p>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Tetikleyici:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{rule.trigger}</code>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Kanallar:</span>
                    {getChannelBadges(rule.channels)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit className="w-5 h-5 text-primary-blue" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Channels Configuration */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Bildirim Kanalları Ayarları</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Uygulama İçi</h4>
              <ToggleRight className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-600">Platform içinde anlık bildirimler</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Anlık Bildirim</h4>
              <ToggleRight className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-600">Mobil ve masaüstü anlık bildirimler</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">E-posta</h4>
              <ToggleRight className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-600">E-posta ile bildirim gönderimi</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">SMS</h4>
              <ToggleLeft className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">SMS bildirimleri (Yakında)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
