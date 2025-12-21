import { useState } from 'react';
import { Mail, Edit, Trash2, Eye, Plus, Send } from 'lucide-react';

export const EmailTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const mockTemplates = [
    {
      id: 1,
      name: 'Hoş Geldin Email',
      subject: 'Polithane\'e Hoş Geldiniz!',
      type: 'welcome',
      content: '<h1>Merhaba {{user_name}}</h1><p>Polithane ailesine hoş geldiniz...</p>',
      last_updated: '2024-01-15',
      usage_count: 1247,
    },
    {
      id: 2,
      name: 'Şifre Sıfırlama',
      subject: 'Şifre Sıfırlama Talebi',
      type: 'password_reset',
      content: '<h1>Şifre Sıfırlama</h1><p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın...</p>',
      last_updated: '2024-01-14',
      usage_count: 342,
    },
    {
      id: 3,
      name: 'Email Doğrulama',
      subject: 'Email Adresinizi Doğrulayın',
      type: 'email_verification',
      content: '<h1>Email Doğrulama</h1><p>Hesabınızı aktifleştirmek için email adresinizi doğrulayın...</p>',
      last_updated: '2024-01-13',
      usage_count: 896,
    },
    {
      id: 4,
      name: 'Haftalık Özet',
      subject: 'Bu Haftanın Öne Çıkanları',
      type: 'weekly_digest',
      content: '<h1>Haftalık Özet</h1><p>Bu hafta platformda neler oldu...</p>',
      last_updated: '2024-01-12',
      usage_count: 5432,
    },
  ];

  const getTypeBadge = (type) => {
    const badges = {
      welcome: { color: 'bg-green-100 text-green-700', text: 'Hoş Geldin' },
      password_reset: { color: 'bg-red-100 text-red-700', text: 'Şifre' },
      email_verification: { color: 'bg-blue-100 text-blue-700', text: 'Doğrulama' },
      weekly_digest: { color: 'bg-purple-100 text-purple-700', text: 'Özet' },
    };
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-700', text: 'Diğer' };
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Email Şablonları</h1>
          <p className="text-gray-600">Otomatik email şablonlarını düzenleyin</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
          <Plus className="w-5 h-5" />
          Yeni Şablon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Şablon</div>
          <div className="text-2xl font-black text-gray-900">24</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Aktif Şablon</div>
          <div className="text-2xl font-black text-blue-700">18</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Bu Ay Gönderilen</div>
          <div className="text-2xl font-black text-green-700">12,453</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Açılma Oranı</div>
          <div className="text-2xl font-black text-purple-700">68.4%</div>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Şablon Adı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Konu</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tür</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kullanım</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Son Güncelleme</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockTemplates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary-blue" />
                    </div>
                    <span className="font-semibold text-gray-900">{template.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{template.subject}</span>
                </td>
                <td className="px-6 py-4">{getTypeBadge(template.type)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-700">{template.usage_count.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{template.last_updated}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => setSelectedTemplate(template)}
                      title="Görüntüle"
                    >
                      <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Düzenle">
                      <Edit className="w-6 h-6 sm:w-5 sm:h-5 text-primary-blue" />
                    </button>
                    <button className="p-2 hover:bg-green-50 rounded-lg transition-colors" title="Test Gönder">
                      <Send className="w-6 h-6 sm:w-5 sm:h-5 text-green-600" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                      <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">{selectedTemplate.name}</h3>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Konu: {selectedTemplate.subject}</p>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                {/* Render in a sandboxed iframe to avoid XSS in admin context */}
                <iframe
                  title="Email Preview"
                  sandbox=""
                  className="w-full h-[420px] bg-white rounded-lg border border-gray-200"
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:16px;font-family:Arial,sans-serif;line-height:1.6;color:#111827;">${String(
                    selectedTemplate.content || ''
                  )}</body></html>`}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold">
                Düzenle
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold">
                Test Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
