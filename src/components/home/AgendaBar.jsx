import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { formatPolitScore } from '../../utils/formatters';

export const AgendaBar = ({ agendas = [] }) => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(4); // Başlangıçta 4 gündem (3 gündem + 1 reklam)
  
  if (!agendas || agendas.length === 0) return null;

  const getAgendaId = (a) => a?.agenda_id ?? a?.id ?? a?.slug ?? a?.agenda_slug ?? a?.title ?? a?.agenda_title;
  const getAgendaTitle = (a) => a?.agenda_title ?? a?.title ?? '';
  const getAgendaSlug = (a) => a?.agenda_slug ?? a?.slug ?? '';
  const getAgendaScore = (a) => a?.total_polit_score ?? a?.polit_score ?? 0;
  
  const showMore = () => {
    setVisibleCount(prev => Math.min(prev + 10, agendas.length));
  };
  
  const visibleAgendas = agendas.slice(0, visibleCount);
  
  // Birinci satır: 3 gündem + REKLAM + 1 gündem, İkinci satır: 5 gündem + TÜM GÜNDEME BAK butonu
  const trendingAgendas = agendas.slice(0, 10); // 10 gündem
  const firstRow = trendingAgendas.slice(0, 4); // İlk 4 gündem (3. sonrası reklam)
  const secondRow = trendingAgendas.slice(4, 9);
  
  const AgendaButton = ({ agenda, index }) => {
    // İlk 3 gündem için ateş ikonu - FARKLI HIZ ANİMASYONLARI (Flash efekti)
    let fireIcon = null;
    if (index === 0) {
      // 1. en sıcak - büyük ateş - ÇOK HIZLI yanıp sönme (0.3s - çok hızlı flash)
      fireIcon = <Flame className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" fill="currentColor" style={{animation: 'pulse 0.3s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    } else if (index === 1) {
      // 2. orta sıcak - orta ateş - ORTA HIZLI (0.6s - orta hız flash)
      fireIcon = <Flame className="w-6 h-6 sm:w-5 sm:h-5 text-orange-500" fill="currentColor" style={{animation: 'pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    } else if (index === 2) {
      // 3. hafif sıcak - küçük ateş - YAVAŞ (1s - yavaş flash)
      fireIcon = <Flame className="w-6 h-6 sm:w-5 sm:h-5 text-yellow-500" fill="currentColor" style={{animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    }
    
    return (
      <button
        key={getAgendaId(agenda)}
        onClick={() => navigate(`/agenda/${getAgendaSlug(agenda)}`)}
        className="group flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-gray-300 hover:border-primary-blue hover:bg-primary-blue hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-1 min-w-0 h-[36px]"
      >
        {fireIcon && <span className="flex-shrink-0">{fireIcon}</span>}
        <span className="text-xs font-medium truncate text-left flex-1">
          {getAgendaTitle(agenda)}
        </span>
        <span
          className={[
            'text-[10px] px-1.5 py-0.5 rounded-full font-black transition-colors flex-shrink-0',
            // Always high-contrast
            'bg-gray-900 text-white',
            // When hovering the agenda button, invert for contrast on blue
            'group-hover:bg-white group-hover:text-primary-blue',
            // When hovering the score itself, keep contrast regardless
            'hover:bg-black hover:text-white',
          ].join(' ')}
        >
          {formatPolitScore(getAgendaScore(agenda))}
        </span>
      </button>
    );
  };
  
  // REKLAM ALANI - 4. sırada (180px genişlik x 36px yükseklik)
  const AdSpace = () => (
    <div className="flex-1 min-w-[180px] max-w-[220px]">
      <div
        className="h-[36px] px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center"
        onClick={() => window.open('https://yusufbank.com', '_blank')}
      >
        <div className="text-center">
          <p className="text-xs font-bold text-white drop-shadow-md">🏦 YusufBANK</p>
        </div>
      </div>
    </div>
  );
  
  // "TÜM GÜNDEME BAK" butonu - Kurumsal mavi renk
  const AllAgendasButton = () => (
    <button
      onClick={() => navigate('/agendas')}
      className="flex items-center justify-center px-4 py-1.5 bg-primary-blue hover:bg-[#0088bb] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 font-bold text-xs h-[36px]"
    >
      TÜM GÜNDEME BAK
    </button>
  );
  
  return (
    <div className="mb-4">
      {/* MOBİL İÇİN: Compact ve Sticky - 3 gündem başlangıç */}
      <div className="md:hidden sticky top-0 z-20 bg-gray-50 pb-3 -mx-4 px-4 pt-2">
        
        {/* Gündem Pills - İlk 3 Gündem + Reklam */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3">
          <div className="flex gap-2 w-max min-w-full">
          {/* İlk 3 Gündem */}
          {visibleAgendas.slice(0, 3).map((agenda, index) => (
            <button
              key={getAgendaId(agenda)}
              onClick={() => navigate(`/agenda/${getAgendaSlug(agenda)}`)}
              className="group flex-shrink-0 px-3 py-1.5 bg-white border-2 border-primary-blue text-primary-blue rounded-full text-xs font-semibold shadow-sm whitespace-nowrap flex items-center gap-1 transition-colors hover:bg-primary-blue hover:text-white"
            >
              <Flame 
                className={
                  index === 0 ? "w-6 h-6 text-red-600" : 
                  index === 1 ? "w-6 h-6 text-orange-500" : 
                  "w-6 h-6 text-yellow-500"
                } 
                fill="currentColor"
                style={{
                  animation: `pulse ${index === 0 ? '0.3s' : index === 1 ? '0.6s' : '1s'} cubic-bezier(0.4, 0, 0.6, 1) infinite`
                }}
              />
              <span className="truncate max-w-[140px]">{getAgendaTitle(agenda)}</span>
              <span className="text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded-full font-black transition-colors group-hover:bg-white group-hover:text-primary-blue hover:bg-black hover:text-white">
                {formatPolitScore(getAgendaScore(agenda))}
              </span>
            </button>
          ))}
          
          {/* 4. Pozisyon - REKLAM (MOBİL) */}
          <button
            onClick={() => window.open('https://yusufbank.com', '_blank')}
            className="flex-shrink-0 px-4 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-full text-xs font-bold shadow-md whitespace-nowrap"
          >
            🏦 YusufBANK
          </button>
          </div>
        </div>
        
        {/* Expanded Agendas - Grid Layout (eğer 4'ten fazla gösteriliyorsa) */}
        {visibleCount > 4 && (
          <div className="space-y-2">
            {visibleAgendas.slice(4).map((agenda, index) => (
              <button
                key={getAgendaId(agenda)}
                onClick={() => navigate(`/agenda/${getAgendaSlug(agenda)}`)}
                className="group w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-primary-blue hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {index + 4 < 3 && (
                    <Flame 
                      className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0 text-yellow-500" 
                      fill="currentColor"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {getAgendaTitle(agenda)}
                  </span>
                </div>
                <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded-full font-black flex-shrink-0 ml-2 transition-colors group-hover:bg-white group-hover:text-primary-blue hover:bg-black hover:text-white">
                  {formatPolitScore(getAgendaScore(agenda))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* DESKTOP İÇİN: 2 satır grid */}
      <div className="hidden md:block">
        <div className="space-y-1.5">
          {/* İlk Satır - 3 gündem + REKLAM + 1 gündem */}
          <div className="flex gap-2">
            {firstRow.slice(0, 3).map((agenda, index) => (
              <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index} />
            ))}
            {/* REKLAM ALANI - 4. pozisyon */}
            <AdSpace />
            {firstRow.slice(3, 4).map((agenda, index) => (
              <AgendaButton key={agenda.agenda_id} agenda={agenda} index={3} />
            ))}
          </div>
          
          {/* İkinci Satır - 5 gündem + TÜM GÜNDEME BAK butonu */}
          {secondRow.length > 0 && (
            <div className="flex gap-2">
              {secondRow.map((agenda, index) => (
                <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index + 4} />
              ))}
              <AllAgendasButton />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
