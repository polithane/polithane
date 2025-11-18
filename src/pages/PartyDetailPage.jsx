import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { formatNumber, formatPolitScore, formatDate } from '../utils/formatters';
import { mockParties } from '../mock/parties';
import { mockUsers } from '../mock/users';
import { PostCard } from '../components/post/PostCard';
import { mockPosts } from '../mock/posts';

export const PartyDetailPage = () => {
  const { partyId } = useParams();
  const [party, setParty] = useState(null);
  const [activeTab, setActiveTab] = useState('mps');
  const [partyMPs, setPartyMPs] = useState([]);
  const [partyPosts, setPartyPosts] = useState([]);
  
  useEffect(() => {
    const foundParty = mockParties.find(p => p.party_id === parseInt(partyId));
    setParty(foundParty);
    
    const mps = mockUsers.filter(u => 
      u.user_type === 'politician' && 
      u.politician_type === 'mp' && 
      u.party_id === parseInt(partyId)
    );
    setPartyMPs(mps);
    
    const posts = mockPosts.filter(p => p.user?.party_id === parseInt(partyId));
    setPartyPosts(posts);
  }, [partyId]);
  
  if (!party) {
    return (
      <div className="container-main py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }
  
  const seatPercentage = ((party.parliament_seats / 600) * 100).toFixed(1);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Parti Header */}
      <div className="bg-white border-b">
        <div 
          className="h-32"
          style={{ backgroundColor: party.party_color }}
        />
        <div className="container-main py-6">
          <div className="flex items-start gap-6">
            {/* Parti Logosu - TAM BOYUT 200x200px */}
            <div className="w-52 h-52 bg-white rounded-xl border-2 border-gray-200 shadow-md flex items-center justify-center p-4 flex-shrink-0">
              <img 
                src={party.party_logo} 
                alt={party.party_name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-gray-400 text-center text-sm">Logo yüklenemedi</div>';
                }}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">{party.party_name}</h1>
              <p className="text-gray-600 mb-6 text-2xl md:text-3xl font-semibold">({party.party_short_name})</p>
              <div className="space-y-2">
                <p className="text-lg text-gray-600">
                  <span className="font-semibold">Kuruluş:</span> {formatDate(party.foundation_date)}
                </p>
                <p className="text-lg text-gray-600">
                  <span className="font-semibold">Meclis Sandalyesi:</span> {party.parliament_seats}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* İstatistikler */}
      <div className="container-main py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-blue">{party.parliament_seats}</div>
            <div className="text-sm text-gray-500 mt-1">Meclis Sandalyesi</div>
            <div className="text-xs text-gray-400 mt-1">{seatPercentage}%</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold">{party.mp_count}</div>
            <div className="text-sm text-gray-500 mt-1">Milletvekili</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold">{party.organization_count}</div>
            <div className="text-sm text-gray-500 mt-1">Teşkilat Görevlisi</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold">{formatNumber(party.member_count)}</div>
            <div className="text-sm text-gray-500 mt-1">Üye</div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-4 border-b mb-6">
          <button
            className={`pb-3 px-4 font-medium ${
              activeTab === 'mps' 
                ? 'text-primary-blue border-b-2 border-primary-blue' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('mps')}
          >
            Milletvekilleri
          </button>
          <button
            className={`pb-3 px-4 font-medium ${
              activeTab === 'posts' 
                ? 'text-primary-blue border-b-2 border-primary-blue' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            Paylaşımlar
          </button>
        </div>
        
        {/* Tab İçerikleri */}
        {activeTab === 'mps' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {partyMPs.map(mp => (
              <div 
                key={mp.user_id}
                className="card text-center cursor-pointer hover:shadow-md transition-shadow"
              >
                <Avatar src={mp.profile_image} size="80px" verified={mp.verification_badge} />
                <h3 className="font-semibold mt-2">{mp.full_name}</h3>
                <p className="text-sm text-gray-500">{mp.city_code}</p>
                <Badge variant="primary" size="small" className="mt-2">
                  {formatPolitScore(mp.polit_score)}
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {partyPosts.map(post => (
              <PostCard key={post.post_id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
