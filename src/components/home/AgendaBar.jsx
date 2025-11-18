import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { formatPolitScore } from '../../utils/formatters';

export const AgendaBar = ({ agendas = [] }) => {
  const navigate = useNavigate();
  
  if (!agendas || agendas.length === 0) return null;
  
  // Birinci satır: 5 gündem, İkinci satır: 5 gündem + TÜM GÜNDEME BAK butonu
  const trendingAgendas = agendas.slice(0, 10); // 10 gündem
  const firstRow = trendingAgendas.slice(0, 5);
  const secondRow = trendingAgendas.slice(5, 10);
  
  const AgendaButton = ({ agenda, index }) => {
    // İlk 3 gündem için ateş ikonu - FARKLI HIZ ANİMASYONLARI
    let fireIcon = null;
    if (index === 0) {
      // 1. en sıcak - büyük ateş - ÇOK HIZLI yanıp sönme (0.5s)
      fireIcon = <Flame className="w-5 h-5 text-red-500" fill="currentColor" style={{animation: 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    } else if (index === 1) {
      // 2. orta sıcak - orta ateş - ORTA HIZLI (1s)
      fireIcon = <Flame className="w-[17px] h-[17px] text-red-500" fill="currentColor" style={{animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    } else if (index === 2) {
      // 3. hafif sıcak - küçük ateş - YAVAŞ (1.5s)
      fireIcon = <Flame className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" style={{animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    }
    
    return (
      <button
        key={agenda.agenda_id}
        onClick={() => navigate(`/agenda/${agenda.agenda_slug}`)}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 hover:border-primary-blue hover:bg-primary-blue hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-1 min-w-0"
      >
        {fireIcon && <span className="flex-shrink-0">{fireIcon}</span>}
        <span className="text-sm font-medium truncate text-left flex-1">
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
      
      {/* MOBİL İÇİN: Yatay kaydırılabilir tek satır */}
      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {trendingAgendas.map((agenda, index) => (
            <div key={agenda.agenda_id} className="snap-start flex-shrink-0 w-[85%]">
              <AgendaButton agenda={agenda} index={index} />
            </div>
          ))}
          <div className="snap-start flex-shrink-0">
            <AllAgendasButton />
          </div>
        </div>
      </div>
      
      {/* DESKTOP İÇİN: 2 satır grid */}
      <div className="hidden md:block space-y-2">
        {/* İlk Satır - 5 gündem */}
        <div className="flex gap-2 pb-2">
          {firstRow.map((agenda, index) => (
            <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index} />
          ))}
        </div>
        
        {/* İkinci Satır - 5 gündem + TÜM GÜNDEME BAK butonu */}
        {secondRow.length > 0 && (
          <div className="flex gap-2 pb-2">
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
