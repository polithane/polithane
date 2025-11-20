import { Users, Building2, MapPin, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CityDetailPopup = ({ cityCode, cityName, onClose, position }) => {
  const navigate = useNavigate();
  
  if (!cityCode) return null;
  
  const handleNavigation = (path, e) => {
    e.stopPropagation();
    navigate(path);
    onClose();
  };
  
  // Mock data - gerçek data ile değiştirilecek
  const cityData = {
    mp_count: Math.floor(Math.random() * 20) + 1,
    metropolitan_mayor: Math.random() > 0.7 ? 'Var' : 'Yok',
    district_count: Math.floor(Math.random() * 30) + 5,
    post_count: Math.floor(Math.random() * 5000) + 100
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-gray-200 p-4 w-80"
        style={{
          left: position?.x ? `${Math.min(position.x, window.innerWidth - 340)}px` : '50%',
          top: position?.y ? `${position.y + 10}px` : '50%',
          transform: !position?.x ? 'translate(-50%, -50%)' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
              {cityCode}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{cityName}</h3>
              <p className="text-xs text-gray-500">Plaka: {cityCode}</p>
            </div>
          </div>
        </div>
        
        {/* Detaylar */}
        <div className="space-y-3">
          {/* Milletvekili Sayısı */}
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=mps`, e)}
            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-blue rounded-full p-2">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Milletvekili Sayısı</span>
            </div>
            <span className="text-lg font-bold text-primary-blue group-hover:scale-110 transition-transform">
              {cityData.mp_count}
            </span>
          </button>
          
          {/* Büyükşehir Belediyesi */}
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=metropolitan`, e)}
            className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-green rounded-full p-2">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Büyükşehir Belediyesi</span>
            </div>
            <span className="text-sm font-bold text-primary-green group-hover:scale-110 transition-transform">
              {cityData.metropolitan_mayor}
            </span>
          </button>
          
          {/* İlçe Sayısı */}
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=districts`, e)}
            className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-accent-mustard rounded-full p-2">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700">İlçe Sayısı</span>
            </div>
            <span className="text-lg font-bold text-accent-mustard group-hover:scale-110 transition-transform">
              {cityData.district_count}
            </span>
          </button>
          
          {/* Paylaşım Sayısı */}
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=posts`, e)}
            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 rounded-full p-2">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Paylaşım Sayısı</span>
            </div>
            <span className="text-lg font-bold text-purple-600 group-hover:scale-110 transition-transform">
              {cityData.post_count}
            </span>
          </button>
        </div>
        
        {/* Ana Profil Butonu */}
        <button
          onClick={(e) => handleNavigation(`/city/${cityCode}`, e)}
          className="w-full mt-4 bg-primary-blue hover:bg-[#0088bb] text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          İl Detayları
        </button>
      </div>
    </>
  );
};
