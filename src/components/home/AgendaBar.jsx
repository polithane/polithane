import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { formatPolitScore } from '../../utils/formatters';

export const AgendaBar = ({ agendas = [] }) => {
  const navigate = useNavigate();
  
  if (!agendas || agendas.length === 0) return null;
  
  // Birinci satır: 5 gündem, İkinci satır: 4 gündem + TÜM GÜNDEME BAK butonu
  const trendingAgendas = agendas.slice(0, 9); // 9 gündem
  const firstRow = trendingAgendas.slice(0, 5);
  const secondRow = trendingAgendas.slice(5, 9);
  
  const AgendaButton = ({ agenda, index }) => {
    // İlk 3 gündem için ateş ikonu
    let fireIcon = null;
    if (index === 0) {
      // 1. en sıcak - büyük ateş
      fireIcon = <Flame className="w-5 h-5 text-red-500 animate-pulse" fill="currentColor" />;
    } else if (index === 1) {
      // 2. orta sıcak - orta ateş
      fireIcon = <Flame className="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" />;
    } else if (index === 2) {
      // 3. hafif sıcak - küçük ateş
      fireIcon = <Flame className="w-3 h-3 text-yellow-500 animate-pulse" fill="currentColor" />;
    }
    
    return (
      <button
        key={agenda.agenda_id}
        onClick={() => navigate(`/agenda/${agenda.agenda_slug}`)}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 hover:border-primary-blue hover:bg-primary-blue hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
      >
        {fireIcon && <span className="flex-shrink-0">{fireIcon}</span>}
        <span className="text-sm font-medium whitespace-nowrap text-left">
          {agenda.agenda_title}
        </span>
        <span className="text-xs bg-gray-100 hover:bg-white hover:text-primary-blue px-2 py-0.5 rounded-full font-semibold transition-colors flex-shrink-0">
          {formatPolitScore(agenda.total_polit_score)}
        </span>
      </button>
    );
  };
  
  // "TÜM GÜNDEME BAK" butonu - Kurumsal mavi renk
  const AllAgendasButton = () => (
    <button
      onClick={() => navigate('/agendas')}
      className="flex items-center justify-center px-6 py-2 bg-primary-blue hover:bg-[#0088bb] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 font-bold text-sm"
    >
      TÜM GÜNDEME BAK
    </button>
  );
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">GÜNDEM</h3>
      </div>
      <div className="space-y-2">
        {/* İlk Satır - 5 gündem, buton yok */}
        <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
          {firstRow.map((agenda, index) => (
            <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index} />
          ))}
        </div>
        
        {/* İkinci Satır - 4 gündem + TÜM GÜNDEME BAK butonu */}
        {secondRow.length > 0 && (
          <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
            {secondRow.map((agenda, index) => (
              <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index + 5} />
            ))}
            <AllAgendasButton />
          </div>
        )}
      </div>
    </div>
  );
};
