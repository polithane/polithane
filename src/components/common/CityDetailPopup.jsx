import { Users, Building2, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CityDetailPopup = ({ cityCode, cityName, onClose, position, onMouseEnter, onMouseLeave }) => {
  const navigate = useNavigate();
  
  if (!cityCode) return null;
  
  const handleNavigation = (path, e) => {
    e.stopPropagation();
    navigate(path);
    onClose();
  };
  
  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        style={{ pointerEvents: 'none' }}
      />
      
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-gray-900 p-3 w-72 animate-fadeIn"
        style={{
          left: position?.x ? `${Math.min(position.x, window.innerWidth - 320)}px` : '50%',
          top: position?.y ? `${position.y + 10}px` : '50%',
          transform: !position?.x ? 'translate(-50%, -50%)' : 'none',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
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
        
        <div className="space-y-2">
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=mps`, e)}
            className="w-full flex items-center justify-between py-1.5 px-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-blue rounded-full p-1">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-[12px] font-semibold text-gray-700">Milletvekilleri</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
          
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=metropolitan`, e)}
            className="w-full flex items-center justify-between py-1.5 px-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-green rounded-full p-1">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-[12px] font-semibold text-gray-700">Büyükşehir</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
          
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=districts`, e)}
            className="w-full flex items-center justify-between py-1.5 px-2 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-accent-mustard rounded-full p-1">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-[12px] font-semibold text-gray-700">İlçeler</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
          
          <button
            onClick={(e) => handleNavigation(`/city/${cityCode}?tab=posts`, e)}
            className="w-full flex items-center justify-between py-1.5 px-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 rounded-full p-1">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-[12px] font-semibold text-gray-700">Paylaşımlar</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        </div>
        
        <button
          onClick={(e) => handleNavigation(`/city/${cityCode}`, e)}
          className="w-full mt-3 bg-primary-blue hover:bg-[#0088bb] text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          İl Detayları
        </button>
      </div>
    </>
  );
};
