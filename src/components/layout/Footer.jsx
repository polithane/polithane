import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiCall } from '../../utils/api';

export const Footer = () => {
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
    <footer className="bg-neutral-anthracite text-white py-8 mt-16">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">POLITHANE</h3>
            <p className="text-gray-400 text-sm">
              Özgür, açık, şeffaf siyaset, bağımsız medya!
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Hakkımızda</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-white">Hakkımızda</Link></li>
              <li><Link to="/mission" className="hover:text-white">Misyonumuz</Link></li>
              <li><Link to="/contact" className="hover:text-white">İletişim</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Yasal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/terms" className="hover:text-white">Kullanım Şartları</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white">Gizlilik Politikası</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-white">Çerez Politikası</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">İletişim</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>E-posta: {contactEmail}</li>
              <li>Telefon: +90 (212) 123 45 67</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>&copy; 2025 Polithane. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
};
