import { useNavigate } from 'react-router-dom';
import { Tooltip } from '../common/Tooltip';

export const ParliamentBar = ({ parties = [], totalSeats = 600 }) => {
  const navigate = useNavigate();
  
  if (!parties || parties.length === 0) return null;
  
  const sortedParties = [...parties].sort((a, b) => b.parliament_seats - a.parliament_seats);
  
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">MECLİS DAĞILIMI</h3>
      <div className="flex h-12 rounded-lg overflow-hidden border border-gray-300">
        {sortedParties.map((party) => {
          const widthPercentage = (party.parliament_seats / totalSeats) * 100;
          
          return (
            <Tooltip
              key={party.party_id}
              content={`${party.party_name} - ${party.parliament_seats} sandalye`}
              position="top"
            >
              <div
                className="h-full cursor-pointer transition-all hover:opacity-80 flex items-center justify-center"
                style={{
                  width: `${widthPercentage}%`,
                  backgroundColor: party.party_color || '#gray'
                }}
                onClick={() => navigate(`/party/${party.party_id}`)}
              >
                {widthPercentage > 5 && (
                  <span className="text-white text-xs font-semibold px-1 truncate">
                    {party.party_short_name}
                  </span>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
