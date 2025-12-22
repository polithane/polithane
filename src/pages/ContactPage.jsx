import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, HelpCircle } from 'lucide-react';
import { apiCall } from '../utils/api';

export const ContactPage = () => {
  const [contactEmail, setContactEmail] = useState('info@polithane.com');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await apiCall('/api/public/site', { method: 'GET' }).catch(() => null);
        const email = String(r?.data?.contactEmail || '').trim();
        if (mounted && email) setContactEmail(email);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">İletişim</h1>
              <p className="text-sm text-gray-600">Öneri, hata bildirimi ve destek için bize ulaşın.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Mail className="w-5 h-5 text-emerald-600" /> E‑posta
              </div>
              <div className="text-sm text-gray-700 mt-2">{contactEmail}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Phone className="w-5 h-5 text-emerald-600" /> Telefon
              </div>
              <div className="text-sm text-gray-700 mt-2">+90 (212) 123 45 67</div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <MapPin className="w-5 h-5 text-emerald-600" /> Konum
              </div>
              <div className="text-sm text-gray-700 mt-2">Türkiye</div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 p-6">
            <div className="font-black text-gray-900">Hızlı Not</div>
            <div className="text-sm text-gray-700 mt-2">
              Hesap/üyelik süreçleri, içerik raporları ve güvenlik bildirimleri için mümkünse profil linkinizi ve ekran
              görüntüsünü ekleyin. Böylece daha hızlı yardımcı olabiliriz.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

