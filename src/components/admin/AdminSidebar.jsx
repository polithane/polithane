import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, TrendingUp, Settings, Palette, 
  Shield, Search, DollarSign, Megaphone, Bot, BarChart3, Mail, 
  Globe, Image, Bell, Database, Code, Zap, Flag, Flame, Send, Landmark, Wrench, ListChecks, PartyPopper
} from 'lucide-react';

export const AdminSidebar = ({ onNavigate, onClose, showCloseButton = false }) => {
  const location = useLocation();
  const [logoFailed, setLogoFailed] = useState(false);
  
  const menuSections = [
    {
      title: 'Genel',
      items: [
        { path: '/adminyonetim', icon: LayoutDashboard, label: 'Genel Bakış' },
        { path: '/adminyonetim/analytics', icon: BarChart3, label: 'Analitik & Raporlar' },
      ]
    },
    {
      title: 'İçerik Yönetimi',
      items: [
        { path: '/adminyonetim/users', icon: Users, label: 'Kullanıcı Yönetimi' },
        { path: '/adminyonetim/parliament', icon: Landmark, label: 'Meclis Yönetimi' },
        { path: '/adminyonetim/parties', icon: Flag, label: 'Parti Yönetimi' },
        { path: '/adminyonetim/agendas', icon: Flame, label: 'Gündem Yönetimi' },
        { path: '/adminyonetim/posts', icon: FileText, label: 'Post Moderasyonu' },
        { path: '/adminyonetim/comments', icon: FileText, label: 'Yorum Moderasyonu' },
        { path: '/adminyonetim/media', icon: Image, label: 'Medya Yönetimi' },
      ]
    },
    {
      title: 'Platform Ayarları',
      items: [
        { path: '/adminyonetim/algorithm', icon: TrendingUp, label: 'Polit Puan Algoritması' },
        { path: '/adminyonetim/site-settings', icon: Settings, label: 'Site Ayarları' },
        { path: '/adminyonetim/theme', icon: Palette, label: 'Tasarım & Tema' },
        { path: '/adminyonetim/seo', icon: Search, label: 'SEO Ayarları' },
        { path: '/adminyonetim/welcome-content', icon: PartyPopper, label: 'Karşılama Sayfası' },
        { path: '/adminyonetim/email', icon: Mail, label: 'E-posta Şablonları' },
        { path: '/adminyonetim/mail-settings', icon: Send, label: 'Mail Ayarları' },
        { path: '/adminyonetim/notifications', icon: Bell, label: 'Bildirim Kuralları' },
      ]
    },
    {
      title: 'Otomasyon',
      items: [
        { path: '/adminyonetim/automation', icon: Bot, label: 'Otomasyon Kontrol' },
        { path: '/adminyonetim/scraping', icon: Zap, label: 'Tarama Yönetimi' },
        { path: '/adminyonetim/sources', icon: Globe, label: 'Kaynak Yönetimi' },
      ]
    },
    {
      title: 'Gelir & Reklam',
      items: [
        { path: '/adminyonetim/ads', icon: Megaphone, label: 'Reklam Yönetimi' },
        { path: '/adminyonetim/payments', icon: DollarSign, label: 'Ödeme & Gelir' },
      ]
    },
    {
      title: 'Sistem',
      items: [
        { path: '/adminyonetim/security', icon: Shield, label: 'Güvenlik' },
        { path: '/adminyonetim/database', icon: Database, label: 'Veritabanı Yönetimi' },
        { path: '/adminyonetim/api', icon: Code, label: 'API Ayarları' },
        { path: '/adminyonetim/jobs', icon: ListChecks, label: 'Job Kuyruğu' },
        { path: '/adminyonetim/system', icon: Wrench, label: 'Sistem Dönüşümleri' },
      ]
    }
  ];
  
  return (
    <div className="w-full bg-white border-r border-gray-200 h-[100dvh] overflow-y-auto lg:h-screen">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" aria-label="Ana sayfaya git">
          {!logoFailed ? (
            <img
              src="/logo.png"
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
        {showCloseButton ? (
          <button
            type="button"
            onClick={() => onClose?.()}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            aria-label="Menüyü kapat"
          >
            <span className="text-xl font-black text-gray-700">×</span>
          </button>
        ) : null}
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
                  onClick={() => onNavigate?.()}
                >
                  <item.icon className="w-6 h-6" />
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
