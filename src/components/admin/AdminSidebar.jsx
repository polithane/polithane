import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, TrendingUp, Settings, Palette, 
  Shield, Search, DollarSign, Megaphone, Bot, BarChart3, Mail, 
  Globe, Image, Bell, Database, Code, Zap, Flag, Flame, Send, Landmark
} from 'lucide-react';

export const AdminSidebar = () => {
  const location = useLocation();
  const [logoFailed, setLogoFailed] = useState(false);
  
  const menuSections = [
    {
      title: 'Genel',
      items: [
        { path: '/admin', icon: LayoutDashboard, label: 'Genel Bakış' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Analitik & Raporlar' },
      ]
    },
    {
      title: 'İçerik Yönetimi',
      items: [
        { path: '/admin/users', icon: Users, label: 'Kullanıcı Yönetimi' },
        { path: '/admin/parliament', icon: Landmark, label: 'Meclis Yönetimi' },
        { path: '/admin/parties', icon: Flag, label: 'Parti Yönetimi' },
        { path: '/admin/agendas', icon: Flame, label: 'Gündem Yönetimi' },
        { path: '/admin/posts', icon: FileText, label: 'Post Moderasyonu' },
        { path: '/admin/comments', icon: FileText, label: 'Yorum Moderasyonu' },
        { path: '/admin/media', icon: Image, label: 'Medya Yönetimi' },
      ]
    },
    {
      title: 'Platform Ayarları',
      items: [
        { path: '/admin/algorithm', icon: TrendingUp, label: 'Polit Puan Algoritması' },
        { path: '/admin/site-settings', icon: Settings, label: 'Site Ayarları' },
        { path: '/admin/theme', icon: Palette, label: 'Tasarım & Tema' },
        { path: '/admin/seo', icon: Search, label: 'SEO Ayarları' },
        { path: '/admin/email', icon: Mail, label: 'E-posta Şablonları' },
        { path: '/admin/email-test', icon: Send, label: 'E-posta Testi' },
        { path: '/admin/notifications', icon: Bell, label: 'Bildirim Kuralları' },
      ]
    },
    {
      title: 'Otomasyon',
      items: [
        { path: '/admin/automation', icon: Bot, label: 'Otomasyon Kontrol' },
        { path: '/admin/scraping', icon: Zap, label: 'Tarama Yönetimi' },
        { path: '/admin/sources', icon: Globe, label: 'Kaynak Yönetimi' },
      ]
    },
    {
      title: 'Gelir & Reklam',
      items: [
        { path: '/admin/ads', icon: Megaphone, label: 'Reklam Yönetimi' },
        { path: '/admin/payments', icon: DollarSign, label: 'Ödeme Sistemi' },
        { path: '/admin/revenue', icon: DollarSign, label: 'Gelir Analizi' },
      ]
    },
    {
      title: 'Sistem',
      items: [
        { path: '/admin/security', icon: Shield, label: 'Güvenlik' },
        { path: '/admin/database', icon: Database, label: 'Veritabanı Yönetimi' },
        { path: '/admin/api', icon: Code, label: 'API Ayarları' },
      ]
    }
  ];
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto sticky top-0">
      <div className="p-6 border-b border-gray-200">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" aria-label="Ana sayfaya git">
          {!logoFailed ? (
            <img
              src="/favicon.ico"
              alt="Polithane"
              className="w-12 h-12 rounded-2xl object-contain drop-shadow"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="w-12 h-12 bg-primary-blue rounded-2xl flex items-center justify-center shadow">
              <span className="text-2xl font-black text-white">P</span>
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-black text-gray-900 truncate">Polithane</h2>
            <p className="text-xs text-gray-500 truncate">Admin Paneli</p>
          </div>
        </Link>
      </div>
      
      <nav className="p-4">
        {menuSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-blue text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
};
