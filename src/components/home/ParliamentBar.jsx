import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPartyFlagPath } from '../../utils/imagePaths';
import { PartyDetailPopup } from '../common/PartyDetailPopup';

export const ParliamentBar = ({ parliamentData = [], totalSeats = 600 }) => {
  const navigate = useNavigate();
  const [hoveredParty, setHoveredParty] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  
  if (!parliamentData || parliamentData.length === 0) return null;
  
  return (
    <div className="mb-4 hidden md:block">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">MECLİS DAĞILIMI</h3>
      <div className="flex h-24 overflow-hidden rounded-t-lg border border-gray-300 w-full">
        {parliamentData.map((party, index) => {
          // Genişlik yüzdesi = (sandalye sayısı / toplam sandalye) * 100
          const widthPercentage = (party.seats / totalSeats) * 100;
          
          // Parti bayrağı/logosu path'i
          const flagPath = getPartyFlagPath(party.shortName, index + 1);
          
          const partyData = {
            party_id: index + 1,
            party_name: party.name,
            party_short_name: party.shortName,
            party_logo: `/assets/parties/logos/${party.shortName.toLowerCase().replace(/\s+/g, '_')}.png`,
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
                const rect = e.currentTarget.getBoundingClientRect();
                setPopupPosition({ x: rect.left, y: rect.bottom });
                setHoveredParty(partyData);
              }}
              onMouseLeave={() => {
                setHoveredParty(null);
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
      
      {/* Plaka Kodları - 1'den 81'e kadar */}
      <div className="flex flex-wrap gap-1 bg-gray-50 p-2 rounded-b-lg border border-t-0 border-gray-300">
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
              className="w-5 h-5 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-[9px] font-bold flex items-center justify-center transition-colors"
              title={cityNames[cityCode] || `${code} plaka kodu`}
            >
              {code}
            </button>
          );
        })}
      </div>
      
      {/* Parti Detay Popup */}
      {hoveredParty && (
        <PartyDetailPopup 
          party={hoveredParty}
          position={popupPosition}
          onClose={() => setHoveredParty(null)}
        />
      )}
    </div>
  );
};
