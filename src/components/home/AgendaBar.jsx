import { useNavigate } from 'react-router-dom';
import { formatPolitScore } from '../../utils/formatters';

export const AgendaBar = ({ agendas = [] }) => {
  const navigate = useNavigate();
  
  if (!agendas || agendas.length === 0) return null;
  
  // Birinci satır: 6 gündem, İkinci satır: 5 gündem + TÜM GÜNDEME BAK butonu
  const trendingAgendas = agendas.slice(0, 11); // 11 gündem
  const firstRow = trendingAgendas.slice(0, 6);
  const secondRow = trendingAgendas.slice(6, 11);
  
  const AgendaButton = ({ agenda, index }) => {
    // İlk 3 gündem için sıcak gündem efekti
    let hotEffect = '';
    if (index === 0) {
      // 1. sıcak gündem - en güçlü (kırmızı ton, glow)
      hotEffect = 'border-red-500 bg-red-50 shadow-lg shadow-red-200';
    } else if (index === 1) {
      // 2. sıcak gündem - orta (turuncu ton)
      hotEffect = 'border-orange-400 bg-orange-50 shadow-md shadow-orange-100';
    } else if (index === 2) {
      // 3. sıcak gündem - hafif (sarı ton)
      hotEffect = 'border-yellow-400 bg-yellow-50 shadow-md shadow-yellow-100';
    }
    
    return (
      <button
        key={agenda.agenda_id}
        onClick={() => navigate(`/agenda/${agenda.agenda_slug}`)}
        className={`flex items-center gap-2 px-4 py-2 ${hotEffect || 'bg-white border-2 border-gray-300'} hover:border-primary-blue hover:bg-primary-blue hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0`}
      >
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
      <div className="space-y-2 overflow-hidden">
        {/* İlk Satır - 6 gündem, buton yok */}
        <div className="flex gap-2 pb-2 flex-wrap">
          {firstRow.map((agenda, index) => (
            <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index} />
          ))}
        </div>
        
        {/* İkinci Satır - 5 gündem + TÜM GÜNDEME BAK butonu */}
        {secondRow.length > 0 && (
          <div className="flex gap-2 pb-2 flex-wrap">
            {secondRow.map((agenda, index) => (
              <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index + 6} />
            ))}
            <AllAgendasButton />
          </div>
        )}
      </div>
    </div>
  );
};
