import { useNavigate } from 'react-router-dom';
import { getPartyFlagPath } from '../../utils/imagePaths';

export const ParliamentBar = ({ parliamentData = [], totalSeats = 600 }) => {
  const navigate = useNavigate();
  
  if (!parliamentData || parliamentData.length === 0) return null;
  
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">MECLİS DAĞILIMI</h3>
      <div className="flex h-24 overflow-hidden rounded-lg border border-gray-300 w-full">
        {parliamentData.map((party, index) => {
          // Genişlik yüzdesi = (sandalye sayısı / toplam sandalye) * 100
          const widthPercentage = (party.seats / totalSeats) * 100;
          
          // Parti bayrağı/logosu path'i
          const flagPath = getPartyFlagPath(party.shortName, index + 1);
          
          return (
            <div
              key={`${party.shortName}-${index}`}
              className="h-full cursor-pointer transition-all hover:opacity-90 relative"
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
              title={`${party.name} - ${party.seats} sandalye (${widthPercentage.toFixed(1)}%) - Tıklayın`}
              onClick={() => navigate(`/party/${index + 1}`)}
            >
                {/* Parti kısa adı - sadece yeterince geniş alanlarda göster */}
                {widthPercentage > 3 && (
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
    </div>
  );
};
