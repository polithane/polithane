import { Users, Building2, User, Flag, Building, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PartyDetailPopup = ({ party, onClose, position, onMouseEnter, onMouseLeave }) => {
  const navigate = useNavigate();
  
  if (!party) return null;
  
  const handleNavigation = (path, e) => {
    e.stopPropagation();
    navigate(path);
    onClose();
  };

  const seatPct = (() => {
    const seats = Number(party.seats || 0) || 0;
    const total = Number(party.totalSeats || 600) || 600;
    if (!total) return '0.0%';
    return `${((seats / total) * 100).toFixed(1)}%`;
  })();

  const navItems = [
    { key: 'mps', label: 'Milletvekilleri', icon: Users, to: `/party/${party.party_id}?tab=mps` },
    { key: 'org', label: 'Teşkilat Görevlileri', icon: Building2, to: `/party/${party.party_id}?tab=org` },
    { key: 'members', label: 'Üyeler', icon: User, to: `/party/${party.party_id}?tab=members` },
    { key: 'provincial', label: 'İl Başkanları', icon: Flag, to: `/party/${party.party_id}?tab=provincial` },
    { key: 'metro', label: 'İl Belediye Başkanları', icon: Building, to: `/party/${party.party_id}?tab=metro_mayor` },
    { key: 'district_mayor', label: 'İlçe Belediye Başkanları', icon: MapPin, to: `/party/${party.party_id}?tab=district_mayor` },
  ];
  
  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        style={{ pointerEvents: 'none' }}
      />
      
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 p-3 w-72 animate-fadeIn"
        style={{
          left: position?.x ? `${Math.min(position.x, window.innerWidth - 320)}px` : '50%',
          top: position?.y ? `${position.y + 10}px` : '50%',
          transform: !position?.x ? 'translate(-50%, -50%)' : 'none',
          pointerEvents: 'auto',
          borderColor: String(party?.party_color || '').trim() || '#111827',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {party.party_logo && (
              <img 
                src={party.party_logo} 
                alt={party.party_short_name}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div>
              <h3 className="font-bold text-lg text-gray-900">{party.party_short_name}</h3>
              <p className="text-xs text-gray-500">{party.party_name}</p>
              <p className="mt-1 text-primary-blue font-black leading-tight">
                <span className="text-2xl">{party.seats}</span>
                <span className="text-sm font-black ml-1">Sandalye</span>{' '}
                <span className="text-xl">({seatPct})</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.key}
                onClick={(e) => handleNavigation(it.to, e)}
                className="w-full flex items-center gap-2.5 py-1.5 px-2 bg-white hover:bg-gray-50 transition-colors border-t border-gray-200 first:border-t-0"
              >
                <span className="w-6 h-6 rounded-md bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[12px] font-bold text-gray-800 flex-1 text-left leading-tight">{it.label}</span>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>
        
        <button
          onClick={(e) => handleNavigation(`/party/${party.party_id}`, e)}
          className="w-full mt-3 bg-primary-blue hover:bg-[#0088bb] text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Parti Profili
        </button>
      </div>
    </>
  );
};
