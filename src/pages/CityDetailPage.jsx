import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Users, Building2, Briefcase, ArrowLeft, TrendingUp } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { mockUsers } from '../mock/users';
import { mockParties } from '../mock/parties';
import { mockPosts, generateMockPosts } from '../mock/posts';
import { CITY_CODES } from '../utils/constants';
import { getUserTitle } from '../utils/titleHelpers';
import { formatPolitScore } from '../utils/formatters';

export const CityDetailPage = () => {
  const { cityCode } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mps'); // mps, party_leaders, mayors
  const [cityData, setCityData] = useState(null);
  
  useEffect(() => {
    // Şehir ismini al
    const cityName = CITY_CODES[cityCode] || cityCode;
    
    // O şehirden tüm siyasetçileri bul
    const cityPoliticians = mockUsers.filter(u => 
      u.user_type === 'politician' && 
      u.city_code === cityCode
    );
    
    // Milletvekilleri (partilere göre grupla)
    const mps = cityPoliticians
      .filter(u => u.politician_type === 'mp')
      .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
    
    // Parti yöneticileri (il başkanları, ilçe başkanları)
    const partyLeaders = cityPoliticians
      .filter(u => ['provincial_chair', 'district_chair'].includes(u.politician_type))
      .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
    
    // Belediye başkanları (büyükşehir + ilçe)
    const mayors = cityPoliticians
      .filter(u => ['metropolitan_mayor', 'district_mayor'].includes(u.politician_type))
      .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
    
    // O şehirden paylaşımlar
    const allPosts = generateMockPosts(400, mockUsers, mockParties);
    const cityPosts = allPosts
      .filter(p => p.user?.city_code === cityCode)
      .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0))
      .slice(0, 10);
    
    // Partilere göre grupla
    const partiesInCity = [...new Set(cityPoliticians.map(p => p.party_id).filter(Boolean))];
    const partyData = partiesInCity.map(partyId => {
      const party = mockParties.find(p => p.party_id === partyId);
      const partyMps = mps.filter(m => m.party_id === partyId);
      const partyLeader = partyLeaders.find(l => l.party_id === partyId && l.politician_type === 'provincial_chair');
      const partyMayor = mayors.find(m => m.party_id === partyId && m.politician_type === 'metropolitan_mayor');
      
      return {
        party,
        mps: partyMps,
        leader: partyLeader,
        mayor: partyMayor,
        totalPolit: partyMps.reduce((sum, mp) => sum + (mp.polit_score || 0), 0) +
                    (partyLeader?.polit_score || 0) +
                    (partyMayor?.polit_score || 0)
      };
    }).sort((a, b) => b.totalPolit - a.totalPolit);
    
    setCityData({
      cityName,
      cityCode,
      mps,
      partyLeaders,
      mayors,
      posts: cityPosts,
      partyData,
      stats: {
        totalMps: mps.length,
        totalPartyLeaders: partyLeaders.length,
        totalMayors: mayors.length,
        totalParties: partiesInCity.length
      }
    });
  }, [cityCode]);
  
  if (!cityData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  // Tab içeriği
  const renderTabContent = () => {
    if (activeTab === 'mps') {
      return (
        <div className="space-y-6">
          {cityData.partyData.map(({ party, mps }) => {
            if (mps.length === 0) return null;
            return (
              <div key={party.party_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  <img 
                    src={party.party_logo} 
                    alt={party.party_short_name}
                    className="w-12 h-12 object-contain"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{party.party_short_name}</h3>
                    <p className="text-sm text-gray-500">{mps.length} Milletvekili</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mps.map(mp => (
                    <Link
                      key={mp.user_id}
                      to={`/profile/${mp.username}`}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <Avatar 
                        src={mp.profile_image} 
                        size="56px"
                        verified={mp.verification_badge}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 group-hover:text-primary-blue transition-colors truncate">
                          {mp.full_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                          <span className="font-medium text-primary-blue">{getUserTitle(mp)}</span>
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full">
                            {mp.city_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-semibold text-gray-700">
                            {formatPolitScore(mp.polit_score)} PP
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {cityData.mps.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Bu şehirden milletvekili bulunamadı</p>
            </div>
          )}
        </div>
      );
    }
    
    if (activeTab === 'party_leaders') {
      return (
        <div className="space-y-6">
          {cityData.partyData.map(({ party, leader }) => {
            if (!leader) return null;
            return (
              <div key={party.party_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={party.party_logo} 
                    alt={party.party_short_name}
                    className="w-16 h-16 object-contain"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{party.party_short_name} İl Başkanlığı</h3>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    to={`/profile/${leader.username}`}
                    className="flex items-center gap-4 p-5 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:shadow-md transition-all group border border-gray-200"
                  >
                    <Avatar 
                      src={leader.profile_image} 
                      size="72px"
                      verified={leader.verification_badge}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 group-hover:text-primary-blue transition-colors">
                        {leader.full_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="primary" size="sm">{getUserTitle(leader)}</Badge>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-900 text-white text-xs font-bold rounded-full">
                          {leader.city_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          {formatPolitScore(leader.polit_score)} PP
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="flex-shrink-0">
                      Profili Gör
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
          {cityData.partyLeaders.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Bu şehirden parti yöneticisi bulunamadı</p>
            </div>
          )}
        </div>
      );
    }
    
    if (activeTab === 'mayors') {
      return (
        <div className="space-y-6">
          {cityData.partyData.map(({ party, mayor }) => {
            if (!mayor) return null;
            return (
              <div key={party.party_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={party.party_logo} 
                    alt={party.party_short_name}
                    className="w-16 h-16 object-contain"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{party.party_short_name} Belediye Başkanlığı</h3>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    to={`/profile/${mayor.username}`}
                    className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 to-white rounded-lg hover:shadow-md transition-all group border border-blue-200"
                  >
                    <Avatar 
                      src={mayor.profile_image} 
                      size="72px"
                      verified={mayor.verification_badge}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 group-hover:text-primary-blue transition-colors">
                        {mayor.full_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="success" size="sm">{getUserTitle(mayor)}</Badge>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-900 text-white text-xs font-bold rounded-full">
                          {mayor.city_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          {formatPolitScore(mayor.polit_score)} PP
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="flex-shrink-0">
                      Profili Gör
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
          {cityData.mayors.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Bu şehirden belediye başkanı bulunamadı</p>
            </div>
          )}
        </div>
      );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-blue to-[#0088bb] text-white">
        <div className="container-main py-8 md:py-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Geri Dön</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MapPin className="w-10 h-10 md:w-12 md:h-12" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                  {cityData.cityName}
                </h1>
                <p className="text-white/80 text-sm md:text-base">
                  İl Kodu: {cityData.cityCode}
                </p>
              </div>
            </div>
            
            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalMps}</div>
                <div className="text-xs text-white/80">Milletvekili</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <Briefcase className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalPartyLeaders}</div>
                <div className="text-xs text-white/80">Parti Yön.</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <Building2 className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalMayors}</div>
                <div className="text-xs text-white/80">Belediye Bşk.</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalParties}</div>
                <div className="text-xs text-white/80">Parti</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container-main">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('mps')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'mps'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Milletvekilleri ({cityData.stats.totalMps})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('party_leaders')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'party_leaders'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>Parti Yönetimi ({cityData.stats.totalPartyLeaders})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mayors')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'mayors'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Belediye Başkanları ({cityData.stats.totalMayors})</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* İçerik */}
      <div className="container-main py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Kolon - Siyasetçiler */}
          <div className="lg:col-span-2">
            {renderTabContent()}
          </div>
          
          {/* Sağ Kolon - Son Paylaşımlar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-blue" />
                {cityData.cityName}'den Son Paylaşımlar
              </h2>
              <div className="space-y-4">
                {cityData.posts.slice(0, 5).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id}
                    post={post}
                    showCity={false}
                    showPartyLogo={true}
                    fullWidth={true}
                  />
                ))}
                {cityData.posts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Henüz paylaşım bulunmuyor
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
