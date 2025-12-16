import { Link, Outlet, useLocation } from 'react-router-dom';
import { User, Lock, Shield, Bell, Palette, Globe, Download, Trash2, UserX } from 'lucide-react';

export const SettingsLayout = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/settings/profile', icon: User, label: 'Profil Düzenle' },
    { path: '/settings/account', icon: Lock, label: 'Hesap' },
    { path: '/settings/security', icon: Shield, label: 'Güvenlik' },
    { path: '/settings/notifications', icon: Bell, label: 'Bildirimler' },
    { path: '/settings/privacy', icon: Globe, label: 'Gizlilik' },
    { path: '/settings/blocked', icon: UserX, label: 'Engellenenler' },
    { path: '/settings/appearance', icon: Palette, label: 'Görünüm' },
    { path: '/settings/data', icon: Download, label: 'Verilerim' },
    { path: '/settings/delete', icon: Trash2, label: 'Hesabı Sil' },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Ayarlar</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit">
            <nav className="space-y-1">
              {menuItems.map(item => (
                <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-primary-blue text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <item.icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          
          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
