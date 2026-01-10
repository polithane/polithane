/**
 * Teşkilat Yönetim Ana Sayfası
 * Tüm teşkilat modüllerin merkezi
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Calendar, ClipboardList, Megaphone, BarChart3, MessageSquare } from 'lucide-react';

export const OrganizationPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Erişim kontrolü
  const allowedUserTypes = ['party_member', 'party_official', 'mp'];
  const canAccess = allowedUserTypes.includes(user?.user_type) && user?.party_id;

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
          <div className="text-6xl mb-4">🏛️</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Teşkilat Modülüne Erişim Yok
          </h2>
          <p className="text-gray-600">
            Bu modüle sadece parti üyeleri erişebilir.
          </p>
        </div>
      </div>
    );
  }

  const modules = [
    {
      id: 'messages',
      name: 'Mesajlaşma',
      icon: MessageSquare,
      color: 'bg-blue-500',
      description: 'Teşkilat içi güvenli mesajlaşma',
      path: '/organization/messages',
    },
    {
      id: 'events',
      name: 'Etkinlikler',
      icon: Calendar,
      color: 'bg-green-500',
      description: 'Etkinlik yönetimi ve katılım',
      path: '/organization/events',
    },
    {
      id: 'tasks',
      name: 'Görevler',
      icon: ClipboardList,
      color: 'bg-orange-500',
      description: 'Görev atama ve takip',
      path: '/organization/tasks',
    },
    {
      id: 'announcements',
      name: 'Duyurular',
      icon: Megaphone,
      color: 'bg-purple-500',
      description: 'Önemli duyuru ve bildirimler',
      path: '/organization/announcements',
    },
    {
      id: 'polls',
      name: 'Anketler',
      icon: BarChart3,
      color: 'bg-pink-500',
      description: 'Parti içi anketler ve oylamalar',
      path: '/organization/polls',
    },
    {
      id: 'members',
      name: 'Üyeler',
      icon: Users,
      color: 'bg-indigo-500',
      description: 'Teşkilat üyelerini görüntüle',
      path: '/organization/members',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-4xl">🏛️</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black drop-shadow-lg">
                Teşkilat Yönetimi
              </h1>
              <p className="text-blue-100 text-sm md:text-base">
                {user?.party_name || 'Parti'} - İçişleri Sistemi
              </p>
            </div>
          </div>

          {/* Kullanıcı Bilgisi */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Hoş geldiniz,</p>
                <p className="text-lg font-bold">{user?.full_name}</p>
                <p className="text-sm text-blue-200">
                  {user?.politician_type || user?.user_type || 'Üye'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-200">İl</p>
                <p className="font-semibold">{user?.province || '-'}</p>
                {user?.district && (
                  <>
                    <p className="text-xs text-blue-200 mt-1">İlçe</p>
                    <p className="font-semibold">{user?.district}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modüller Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <a
                key={module.id}
                href={module.path}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-primary-blue transform hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className={`${module.color} w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-primary-blue transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {module.description}
                    </p>
                  </div>
                </div>

                {/* Modül Alt Bilgi */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Detayları Görüntüle</span>
                    <span className="text-primary-blue font-bold group-hover:translate-x-1 transition-transform inline-block">
                      →
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Yardım ve Destek */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h3 className="text-2xl font-black">Yardıma mı İhtiyacınız Var?</h3>
              <p className="text-blue-100">Teşkilat modülü kullanım kılavuzu</p>
            </div>
          </div>
          <p className="text-white/90 mb-4">
            Teşkilat modülü, parti içi iletişim ve organizasyon süreçlerini kolaylaştırmak için tasarlanmıştır.
            Hiyerarşik yapıya uygun mesajlaşma, etkinlik yönetimi, görev takibi ve daha fazlası...
          </p>
          <button className="bg-white text-blue-600 font-bold py-2 px-6 rounded-lg hover:bg-blue-50 transition-colors">
            Kullanım Kılavuzunu Görüntüle
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationPage;
