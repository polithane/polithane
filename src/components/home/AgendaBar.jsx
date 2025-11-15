import { useNavigate } from 'react-router-dom';
import { formatNumber } from '../../utils/formatters';

export const AgendaBar = ({ agendas = [] }) => {
  const navigate = useNavigate();
  
  if (!agendas || agendas.length === 0) return null;
  
  const trendingAgendas = agendas.slice(0, 10);
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">GÜNDEM</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {trendingAgendas.map((agenda) => (
          <button
            key={agenda.agenda_id}
            onClick={() => navigate(`/agenda/${agenda.agenda_slug}`)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 hover:border-primary-blue hover:bg-primary-blue hover:text-white rounded-lg whitespace-nowrap transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-sm font-medium">
              {agenda.agenda_title}
            </span>
            <span className="text-xs bg-gray-100 hover:bg-white hover:text-primary-blue px-2 py-0.5 rounded-full font-semibold transition-colors">
              {formatNumber(agenda.total_polit_score)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
