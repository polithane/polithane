import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Users, Building2, Briefcase, ArrowLeft, TrendingUp } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { mockUsers } from '../mock/users';
import { mockParties } from '../mock/parties';
import { generateMockPosts } from '../mock/posts';
import { CITY_CODES } from '../utils/constants';
import { getUserTitle } from '../utils/titleHelpers';
import { formatPolitScore } from '../utils/formatters';
import { apiCall } from '../utils/api';

export const CityDetailPage = () => {
  const { cityCode } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mps'); // mps, provincial_chairs, district_chairs, metropolitan_mayors, district_mayors, members
  const [cityData, setCityData] = useState(null);
  
  useEffect(() => {
    const load = async () => {
      const cityName = CITY_CODES[cityCode] || cityCode;

      const normalizeParty = (p) => {
        if (!p) return null;
        return {
          ...p,
          party_id: p.party_id ?? p.id,
          party_short_name: p.party_short_name ?? p.short_name,
          party_logo: p.party_logo ?? p.logo_url,
          party_color: p.party_color ?? p.color,
        };
      };

      const normalizeUser = (u) => {
        if (!u) return null;
        const partyObj = u.party ? normalizeParty(u.party) : null;
        return {
          ...u,
          user_id: u.user_id ?? u.id,
          profile_image: u.profile_image ?? u.avatar_url,
          verification_badge: u.verification_badge ?? u.is_verified ?? false,
          party_id: u.party_id ?? null,
          party: partyObj,
        };
      };

      const mapDbPostToUi = (p) => {
        if (!p) return null;
        return {
          post_id: p.id,
          user_id: p.user_id,
          content_type: p.content_type,
          content_text: p.content_text,
          media_url: p.media_urls,
          thumbnail_url: p.thumbnail_url,
          media_duration: p.media_duration,
          agenda_tag: p.agenda_tag,
          polit_score: p.polit_score,
          view_count: p.view_count,
          like_count: p.like_count,
          dislike_count: p.dislike_count,
          comment_count: p.comment_count,
          share_count: p.share_count,
          is_featured: p.is_featured,
          created_at: p.created_at,
          user: p.user ? normalizeUser(p.user) : null,
        };
      };

      // Users in city (DB)
      // NOTE: public.users doesn't have city_code in production DB; it uses "province" (city name).
      const dbUsers = await apiCall(
        `/api/users?province=${encodeURIComponent(cityName)}&is_active=true&limit=2000`
      ).catch(() => []);

      const cityUsers = (dbUsers && dbUsers.length > 0)
        ? dbUsers.map(normalizeUser).filter(Boolean)
        : mockUsers.filter(u => u.city_code === cityCode);

      // Derive lists from user_type + politician_type (backfilled in DB)
      const mps = cityUsers
        .filter(u => u.user_type === 'mp')
        .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
      const provincialChairs = cityUsers
        .filter(u => u.user_type === 'party_official' && u.politician_type === 'provincial_chair')
        .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
      const districtChairs = cityUsers
        .filter(u => u.user_type === 'party_official' && u.politician_type === 'district_chair')
        .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
      const metroMayors = cityUsers
        .filter(u => u.user_type === 'party_official' && u.politician_type === 'metropolitan_mayor')
        .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
      const districtMayors = cityUsers
        .filter(u => u.user_type === 'party_official' && u.politician_type === 'district_mayor')
        .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));
      const members = cityUsers.filter(u => u.user_type === 'party_member' || u.user_type === 'normal').sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

      // Posts in city (DB) - via user_id list
      const userIds = cityUsers.map(u => u.user_id).filter(Boolean).slice(0, 2000);
      let cityPosts = [];
      if (userIds.length > 0) {
        const dbPosts = await apiCall(
          `/api/posts?user_ids=${encodeURIComponent(userIds.join(','))}&limit=20&order=polit_score.desc`
        ).catch(() => []);
        if (dbPosts && dbPosts.length > 0) cityPosts = dbPosts.map(mapDbPostToUi).filter(Boolean);
      }
      if (cityPosts.length === 0) {
        const all = generateMockPosts(200, cityUsers, mockParties);
        cityPosts = all
          .filter(p => p.user?.city_code === cityCode)
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0))
          .slice(0, 10);
      }

      // Parties in city
      const partiesInCity = [...new Set(cityUsers.map(p => p.party_id).filter(Boolean))];
      const partyData = partiesInCity.map(partyId => {
        const party = normalizeParty((cityUsers.find(u => u.party_id === partyId)?.party) || mockParties.find(p => p.party_id === partyId));
        const partyMps = mps.filter(m => m.party_id === partyId);
        const leader = provincialChairs.find(l => l.party_id === partyId);
        const mayor = metroMayors.find(m => m.party_id === partyId);
        return {
          party,
          mps: partyMps,
          leader,
          mayor,
          totalPolit: partyMps.reduce((sum, mp) => sum + (mp.polit_score || 0), 0) + (leader?.polit_score || 0) + (mayor?.polit_score || 0)
        };
      }).sort((a, b) => b.totalPolit - a.totalPolit);

      setCityData({
        cityName,
        cityCode,
        mps,
        provincialChairs,
        districtChairs,
        metroMayors,
        districtMayors,
        members,
        posts: cityPosts,
        partyData,
        stats: {
          totalMps: mps.length,
          totalProvincialChairs: provincialChairs.length,
          totalDistrictChairs: districtChairs.length,
          totalMetroMayors: metroMayors.length,
          totalDistrictMayors: districtMayors.length,
          totalMembers: members.length,
          totalParties: partiesInCity.length
        }
      });
    };

    load();
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
    
    const renderUserGrid = (list, emptyIcon, emptyText) => {
      if (!list || list.length === 0) {
        const Icon = emptyIcon;
        return (
          <div className="text-center py-12">
            <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{emptyText}</p>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(u => (
            <Link
              key={u.user_id}
              to={`/profile/${u.user_id}`}
              className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all group"
            >
              <Avatar src={u.avatar_url || u.profile_image} size="56px" verified={u.verification_badge} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 group-hover:text-primary-blue transition-colors truncate">{u.full_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {getUserTitle(u) && <Badge variant="primary" size="sm">{getUserTitle(u)}</Badge>}
                  {u.city_code && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-900 text-white text-xs font-bold rounded-full">
                      {u.city_code}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs font-bold text-primary-blue whitespace-nowrap">{formatPolitScore(u.polit_score)}</div>
            </Link>
          ))}
        </div>
      );
    };

    if (activeTab === 'provincial_chairs') {
      return renderUserGrid(cityData.provincialChairs, Briefcase, 'Bu şehirden il başkanı bulunamadı');
    }

    if (activeTab === 'district_chairs') {
      return renderUserGrid(cityData.districtChairs, Briefcase, 'Bu şehirden ilçe başkanı bulunamadı');
    }

    if (activeTab === 'metropolitan_mayors') {
      return renderUserGrid(cityData.metroMayors, Building2, 'Bu şehirden büyükşehir belediye başkanı bulunamadı');
    }

    if (activeTab === 'district_mayors') {
      return renderUserGrid(cityData.districtMayors, Building2, 'Bu şehirden ilçe belediye başkanı bulunamadı');
    }

    if (activeTab === 'members') {
      return renderUserGrid(cityData.members, Users, 'Bu şehirden üye bulunamadı');
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
                <div className="text-2xl font-bold">{cityData.stats.totalProvincialChairs}</div>
                <div className="text-xs text-white/80">İl Başkanı</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <Building2 className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalMetroMayors}</div>
                <div className="text-xs text-white/80">Büyükşehir Bşk.</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalMembers}</div>
                <div className="text-xs text-white/80">Üye</div>
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
              onClick={() => setActiveTab('provincial_chairs')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'provincial_chairs'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>İl Başkanları ({cityData.stats.totalProvincialChairs})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('district_chairs')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'district_chairs'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>İlçe Başkanları ({cityData.stats.totalDistrictChairs})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('metropolitan_mayors')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'metropolitan_mayors'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Büyükşehir Bşk. ({cityData.stats.totalMetroMayors})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('district_mayors')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'district_mayors'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>İlçe Bşk. ({cityData.stats.totalDistrictMayors})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'members'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Üyeler ({cityData.stats.totalMembers})</span>
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
