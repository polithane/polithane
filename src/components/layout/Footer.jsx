export const Footer = () => {
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
              <li><a href="#" className="hover:text-white">Hakkımızda</a></li>
              <li><a href="#" className="hover:text-white">Misyonumuz</a></li>
              <li><a href="#" className="hover:text-white">İletişim</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Yasal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Kullanım Şartları</a></li>
              <li><a href="#" className="hover:text-white">Gizlilik Politikası</a></li>
              <li><a href="#" className="hover:text-white">Çerez Politikası</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">İletişim</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Email: info@polithane.com</li>
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
