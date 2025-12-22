import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getPartyFlagPath } from '../../utils/imagePaths';
import { PartyDetailPopup } from '../common/PartyDetailPopup';
import { CityDetailPopup } from '../common/CityDetailPopup';
import { CITY_CODES } from '../../utils/constants';

export const ParliamentBar = ({ parliamentData = [], totalSeats = 600 }) => {
  const navigate = useNavigate();
  const [hoveredParty, setHoveredParty] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const closeTimeoutRef = useRef(null);
  const isMouseOverPopup = useRef(false);
  const platesScrollRef = useRef(null);
  
  const cityNamesList = Object.entries(CITY_CODES).map(([code, name]) => ({
    code,
    name
  })).sort((a, b) => a.code.localeCompare(b.code));

  if (!parliamentData || parliamentData.length === 0) return null;

  const shortNameToPartySlug = (shortName) => {
    const v = String(shortName || '').trim().toUpperCase('tr-TR');
    if (v === 'AK PARTİ' || v === 'AK PARTI') return 'akp';
    if (v === 'CHP') return 'chp';
    if (v === 'MHP') return 'mhp';
    if (v === 'DEM PARTİ' || v === 'DEM PARTI' || v === 'DEM') return 'dem';
    if (v === 'İYİ PARTİ' || v === 'IYI PARTI' || v === 'IYI PARTİ') return 'iyi';
    if (v === 'YENİ YOL') return 'yeni-yol';
    if (v === 'YRP' || v === 'YENİDEN REFAH') return 'yrp';
    if (v === 'HÜRDAVA' || v === 'HÜDAPAR' || v === 'HUDA PAR' || v === 'HÜDA PAR') return 'hurdava';
    if (v === 'TİP' || v === 'TIP') return 'tip';
    if (v === 'BAĞIMSIZ' || v === 'BAGIMSIZ') return 'bagimsiz';
    if (v === 'DBP') return 'dbp';
    if (v === 'EMEP') return 'emep';
    if (v === 'SAADET' || v === 'SP' || v === 'SAADET PARTİSİ' || v === 'SAADET PARTISI') return 'saadet';
    if (v === 'DSP') return 'dsp';
    if (v === 'DP') return 'dp';
    return null;
  };
  
  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };
  
  const handlePopupMouseEnter = () => {
    isMouseOverPopup.current = true;
    clearCloseTimeout();
  };
  
  const handlePopupMouseLeave = () => {
    isMouseOverPopup.current = false;
    closeTimeoutRef.current = setTimeout(() => {
      if (!isMouseOverPopup.current) {
        setHoveredParty(null);
        setHoveredCity(null);
      }
    }, 200);
  };

  const scrollPlates = (dir) => {
    const el = platesScrollRef.current;
    if (!el) return;
    // Scroll one plate at a time (button-sized step)
    const step = 16;
    try {
      el.scrollBy({ left: dir * step, behavior: 'smooth' });
    } catch {
      el.scrollLeft += dir * step;
    }
  };
  
  return (
    <div className="mb-4">
      {/* Desktop Parliament Bar (hidden on mobile) */}
      <div className="hidden md:block">
        <div className="flex h-24 overflow-hidden rounded-t-lg border border-gray-300 w-full">
        {parliamentData.map((party, index) => {
          const seats = Math.max(0, Number(party.seats || 0) || 0);
          const flagPath = getPartyFlagPath(party.shortName, index + 1);
          const partySlug = shortNameToPartySlug(party.shortName) || String(index + 1);
          
          const logoMap = {
            'AK PARTİ': 'ak_parti.png',
            'AK PARTI': 'ak_parti.png',
            'CHP': 'chp.png',
            'MHP': 'mhp.png',
            'DEM PARTİ': 'dem_parti.png',
            'DEM PARTI': 'dem_parti.png',
            'İYİ PARTİ': 'iyi_parti.png',
            'IYI PARTI': 'iyi_parti.png',
            'YRP': 'yrp.png',
            'YENİ YOL': 'yeni_yol.png',
            'HÜRDAVA': 'hurdava.png',
            'HÜDAPAR': 'hurdava.png',
            'TİP': 'tip.png',
            'TIP': 'tip.png',
            'BAĞIMSIZ': 'bagimsiz.png',
            'BAGIMSIZ': 'bagimsiz.png',
            'DBP': 'dbp.png',
            'EMEP': 'emep.png',
            'SAADET': 'saadet.png',
            'DSP': 'dsp.png',
            'DP': 'dp.png',
          };
          
          const partyShortKey = String(party.shortName || '').trim().toUpperCase('tr-TR');
          const partyData = {
            party_id: partySlug,
            party_name: party.name,
            party_short_name: party.shortName,
            party_logo: `/assets/parties/logos/${logoMap[partyShortKey] || 'bagimsiz.png'}`,
            party_color: party.color,
            seats: party.seats,
            mp_count: party.seats,
            metropolitan_count: Math.floor(Math.random() * 15) + 1,
            district_count: Math.floor(Math.random() * 200) + 10,
            agenda_contribution: Math.floor(Math.random() * 5000) + 100
          };
          
          return (
            <div
              key={`${party.shortName}-${index}`}
              className="h-full cursor-pointer transition-all hover:opacity-90 hover:brightness-110 relative"
              style={{
                // Use flex-grow instead of percentage widths to avoid rounding gaps.
                flexGrow: seats || 0,
                flexBasis: 0,
                backgroundColor: party.color,
                backgroundImage: `url(${flagPath})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              onClick={() => navigate(`/party/${partySlug}`)}
              onMouseEnter={(e) => {
                clearCloseTimeout();
                isMouseOverPopup.current = false;
                const rect = e.currentTarget.getBoundingClientRect();
                setPopupPosition({ x: rect.left, y: rect.bottom });
                setHoveredCity(null);
                setHoveredParty(partyData);
              }}
              onMouseLeave={() => {
                if (!isMouseOverPopup.current) {
                  closeTimeoutRef.current = setTimeout(() => {
                    if (!isMouseOverPopup.current) {
                      setHoveredParty(null);
                    }
                  }, 200);
                }
              }}
            >
              {seats > 0 && (seats / totalSeats) * 100 > 5 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span 
                    className="text-white text-xs font-bold drop-shadow-lg px-1 text-center"
                    style={{
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)'
                    }}
                  >
                    {party.shortName}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        </div>
      
        <div className="bg-gray-50 px-2 py-2 rounded-b-lg border border-t-0 border-gray-300">
          <div className="flex items-center gap-0">
            <button
              type="button"
              aria-label="Sola kaydır"
              onClick={() => scrollPlates(-1)}
              className="w-5 h-5 rounded-full bg-primary-blue hover:bg-[#0088bb] text-white shadow flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={3} />
            </button>

            <div
              ref={platesScrollRef}
              className="overflow-x-auto scrollbar-hide flex-1"
            >
              <div className="flex gap-0 w-max">
          {Array.from({ length: 81 }, (_, i) => {
            const code = i + 1;
            const cityCode = code.toString().padStart(2, '0');
            const cityNames = {
              '01': 'Adana', '02': 'Adıyaman', '03': 'Afyonkarahisar', '04': 'Ağrı', '05': 'Amasya',
              '06': 'Ankara', '07': 'Antalya', '08': 'Artvin', '09': 'Aydın', '10': 'Balıkesir',
              '11': 'Bilecik', '12': 'Bingöl', '13': 'Bitlis', '14': 'Bolu', '15': 'Burdur',
              '16': 'Bursa', '17': 'Çanakkale', '18': 'Çankırı', '19': 'Çorum', '20': 'Denizli',
              '21': 'Diyarbakır', '22': 'Edirne', '23': 'Elazığ', '24': 'Erzincan', '25': 'Erzurum',
              '26': 'Eskişehir', '27': 'Gaziantep', '28': 'Giresun', '29': 'Gümüşhane', '30': 'Hakkâri',
              '31': 'Hatay', '32': 'Isparta', '33': 'Mersin', '34': 'İstanbul', '35': 'İzmir',
              '36': 'Kars', '37': 'Kastamonu', '38': 'Kayseri', '39': 'Kırklareli', '40': 'Kırşehir',
              '41': 'Kocaeli', '42': 'Konya', '43': 'Kütahya', '44': 'Malatya', '45': 'Manisa',
              '46': 'Kahramanmaraş', '47': 'Mardin', '48': 'Muğla', '49': 'Muş', '50': 'Nevşehir',
              '51': 'Niğde', '52': 'Ordu', '53': 'Rize', '54': 'Sakarya', '55': 'Samsun',
              '56': 'Siirt', '57': 'Sinop', '58': 'Sivas', '59': 'Tekirdağ', '60': 'Tokat',
              '61': 'Trabzon', '62': 'Tunceli', '63': 'Şanlıurfa', '64': 'Uşak', '65': 'Van',
              '66': 'Yozgat', '67': 'Zonguldak', '68': 'Aksaray', '69': 'Bayburt', '70': 'Karaman',
              '71': 'Kırıkkale', '72': 'Batman', '73': 'Şırnak', '74': 'Bartın', '75': 'Ardahan',
              '76': 'Iğdır', '77': 'Yalova', '78': 'Karabük', '79': 'Kilis', '80': 'Osmaniye', '81': 'Düzce'
            };
            
            return (
              <button
                key={code}
                onClick={() => navigate(`/city/${cityCode}`)}
                className="w-[16px] h-[16px] rounded-full bg-gray-900 hover:bg-primary-blue text-white text-[7px] font-bold flex items-center justify-center transition-colors flex-shrink-0 leading-none"
                onMouseEnter={(e) => {
                  clearCloseTimeout();
                  isMouseOverPopup.current = false;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopupPosition({ x: rect.left, y: rect.bottom });
                  setHoveredParty(null);
                  setHoveredCity({ code: cityCode, name: cityNames[cityCode] });
                }}
                onMouseLeave={() => {
                  if (!isMouseOverPopup.current) {
                    closeTimeoutRef.current = setTimeout(() => {
                      if (!isMouseOverPopup.current) {
                        setHoveredCity(null);
                      }
                    }, 200);
                  }
                }}
              >
                {code}
              </button>
            );
          })}
              </div>
            </div>

            <button
              type="button"
              aria-label="Sağa kaydır"
              onClick={() => scrollPlates(1)}
              className="w-5 h-5 rounded-full bg-primary-blue hover:bg-[#0088bb] text-white shadow flex items-center justify-center flex-shrink-0"
            >
              <ArrowRight className="w-[18px] h-[18px]" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile City Selector (visible only on mobile) */}
      <div className="md:hidden w-full bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
         <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
           İl Detaylarına Git
         </label>
         <div className="relative">
           {/* TR plate styling (visual only) */}
           <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 rounded-l-lg bg-[#0B3D91] flex items-center justify-center">
             <span className="text-[10px] font-black tracking-wide text-white">TR</span>
           </div>
           <select
             className="w-full appearance-none bg-white border-2 border-gray-900/80 text-gray-900 text-base font-black text-center [text-align-last:center] rounded-lg focus:ring-primary-blue focus:border-primary-blue block py-2.5 pr-12 pl-36 shadow-sm"
             onChange={(e) => {
               if(e.target.value) navigate(`/city/${e.target.value}`);
             }}
             defaultValue=""
           >
             <option value="" disabled>PLAKA SEÇ</option>
             {cityNamesList.map((city) => (
               <option key={city.code} value={city.code}>
                 {city.code} - {city.name}
               </option>
             ))}
           </select>
           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
           </div>
         </div>
      </div>
      
      {hoveredParty && (
        <PartyDetailPopup 
          party={hoveredParty}
          position={popupPosition}
          onClose={() => {
            setHoveredParty(null);
            clearCloseTimeout();
          }}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
      
      {hoveredCity && (
        <CityDetailPopup 
          cityCode={hoveredCity.code}
          cityName={hoveredCity.name}
          position={popupPosition}
          onClose={() => {
            setHoveredCity(null);
            clearCloseTimeout();
          }}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
    </div>
  );
};
