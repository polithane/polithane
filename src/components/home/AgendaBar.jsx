import { useNavigate } from 'react-router-dom';
import { Badge } from '../common/Badge';
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
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full whitespace-nowrap transition-colors"
          >
            <span className="text-sm font-medium text-gray-800">
              #{agenda.agenda_title}
            </span>
            <Badge variant="primary" size="small">
              {formatNumber(agenda.total_polit_score)}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
};
