import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPartyFlagPath } from '../../utils/imagePaths';
import { PartyDetailPopup } from '../common/PartyDetailPopup';
import { CityDetailPopup } from '../common/CityDetailPopup';

export const ParliamentBar = ({ parliamentData = [], totalSeats = 600 }) => {
  const navigate = useNavigate();
  const [hoveredParty, setHoveredParty] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const partyHoverTimeout = useRef(null);
  const cityHoverTimeout = useRef(null);
  
  if (!parliamentData || parliamentData.length === 0) return null;
  
  return (
    <div className="mb-4 hidden md:block">
      <div className="flex h-24 overflow-hidden rounded-t-lg border border-gray-300 w-full">
        {parliamentData.map((party, index) => {
          // Genişlik yüzdesi = (sandalye sayısı / toplam sandalye) * 100
          const widthPercentage = (party.seats / totalSeats) * 100;
          
          // Parti bayrağı/logosu path'i
          const flagPath = getPartyFlagPath(party.shortName, index + 1);
          
          // Logo path düzeltmesi - kısa isimlere göre mapping
          const logoMap = {
            'AK PARTİ': 'ak_parti.png',
            'CHP': 'chp.png',
            'MHP': 'mhp.png',
            'DEM': 'dem_parti.png',
            'İYİ PARTİ': 'iyi_parti.png',
            'YRP': 'yrp.png',
            'Bağımsız': 'bagimsiz.png'
          };
          
          const partyData = {
            party_id: index + 1,
            party_name: party.name,
            party_short_name: party.shortName,
            party_logo: `/assets/parties/logos/${logoMap[party.shortName] || 'bagimsiz.png'}`,
            party_color: party.color,
            seats: party.seats,
            mp_count: party.seats,
            metropolitan_count: Math.floor(Math.random() * 15) + 1, // Mock data
            district_count: Math.floor(Math.random() * 200) + 10, // Mock data
            agenda_contribution: Math.floor(Math.random() * 5000) + 100 // Mock data
          };
          
          return (
            <div
              key={`${party.shortName}-${index}`}
              className="h-full cursor-pointer transition-all hover:opacity-90 hover:brightness-110 relative"
              style={{
                width: `${widthPercentage}%`,
                backgroundColor: party.color,
                backgroundImage: `url(${flagPath})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minWidth: '20px', // Çok küçük partiler için minimum genişlik
                flexShrink: 0
              }}
              title={`${party.name} - ${party.seats} sandalye (${widthPercentage.toFixed(1)}%)`}
              onClick={() => navigate(`/party/${index + 1}`)}
              onMouseEnter={(e) => {
                // Önceki timeout'ları temizle
                if (partyHoverTimeout.current) {
                  clearTimeout(partyHoverTimeout.current);
                }
                const rect = e.currentTarget.getBoundingClientRect();
                setPopupPosition({ x: rect.left, y: rect.bottom });
                setHoveredParty(partyData);
              }}
              onMouseLeave={() => {
                // Popup'a geçiş için 100ms delay
                partyHoverTimeout.current = setTimeout(() => {
                  setHoveredParty(null);
                }, 100);
              }}
            >
              {/* Parti kısa adı - sadece yeterince geniş alanlarda göster (yazı sığıyorsa) */}
              {widthPercentage > 5 && (
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
      
      {/* Plaka Kodları - 1'den 81'e kadar (TEK SATIR - TAMAMEN BİTİŞİK) */}
      <div className="bg-gray-50 px-2 py-2 rounded-b-lg border border-t-0 border-gray-300 overflow-x-auto">
        <div className="flex gap-0 justify-center">
          {Array.from({ length: 81 }, (_, i) => {
            const code = i + 1;
            const cityCode = code.toString().padStart(2, '0');
            // Şehir isimleri - basit mapping
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
                className="w-[15px] h-[15px] rounded-full bg-gray-900 hover:bg-primary-blue text-white text-[7px] font-bold flex items-center justify-center transition-colors flex-shrink-0 leading-none"
                onMouseEnter={(e) => {
                  // Önceki timeout'ları temizle
                  if (cityHoverTimeout.current) {
                    clearTimeout(cityHoverTimeout.current);
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopupPosition({ x: rect.left, y: rect.bottom });
                  setHoveredCity({ code: cityCode, name: cityNames[cityCode] });
                }}
                onMouseLeave={() => {
                  // Popup'a geçiş için 100ms delay
                  cityHoverTimeout.current = setTimeout(() => {
                    setHoveredCity(null);
                  }, 100);
                }}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Parti Detay Popup */}
      {hoveredParty && (
        <div
          onMouseEnter={() => {
            if (partyHoverTimeout.current) {
              clearTimeout(partyHoverTimeout.current);
            }
          }}
          onMouseLeave={() => {
            // Hemen kapat
            setHoveredParty(null);
            if (partyHoverTimeout.current) {
              clearTimeout(partyHoverTimeout.current);
            }
          }}
        >
          <PartyDetailPopup 
            party={hoveredParty}
            position={popupPosition}
            onClose={() => setHoveredParty(null)}
          />
        </div>
      )}
      
      {/* İl Detay Popup */}
      {hoveredCity && (
        <div
          onMouseEnter={() => {
            if (cityHoverTimeout.current) {
              clearTimeout(cityHoverTimeout.current);
            }
          }}
          onMouseLeave={() => {
            // Hemen kapat
            setHoveredCity(null);
            if (cityHoverTimeout.current) {
              clearTimeout(cityHoverTimeout.current);
            }
          }}
        >
          <CityDetailPopup 
            cityCode={hoveredCity.code}
            cityName={hoveredCity.name}
            position={popupPosition}
            onClose={() => setHoveredCity(null)}
          />
        </div>
      )}
    </div>
  );
};
