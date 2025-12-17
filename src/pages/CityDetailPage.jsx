import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Users, Building2, Briefcase, ArrowLeft, TrendingUp } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { CITY_CODES } from '../utils/constants';
import { getUserTitle, isUiVerifiedUser } from '../utils/titleHelpers';
import { formatPolitScore } from '../utils/formatters';
import { apiCall } from '../utils/api';
import { getProfilePath } from '../utils/paths';

export const CityDetailPage = () => {
  const { cityCode } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mps'); // mps, provincial_chairs, district_chairs, metropolitan_mayors, district_mayors, members
  const [activePartyId, setActivePartyId] = useState(null);
  const [districtFilter, setDistrictFilter] = useState(''); // only for district_* tabs
  const [cityData, setCityData] = useState(null);
  
  useEffect(() => {
    const load = async () => {
      const cityName = CITY_CODES[cityCode] || cityCode;
      const provinceQuery = String(cityName || '').toLocaleUpperCase('tr-TR');

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
      // NOTE: We fetch by province name (city name).
      const dbUsers = await apiCall(
        `/api/users?province=${encodeURIComponent(provinceQuery)}&limit=2000`
      ).catch(() => []);

      const cityUsers = (dbUsers || []).map(normalizeUser).filter(Boolean);

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

      // Parties in city
      const partiesInCity = [...new Set(cityUsers.map(p => p.party_id).filter(Boolean))];
      const partyData = partiesInCity.map(partyId => {
        const party = normalizeParty((cityUsers.find(u => u.party_id === partyId)?.party) || null);
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

  const currentListForPartySelector = useMemo(() => {
    if (!cityData) return [];
    if (activeTab === 'mps') return cityData.mps || [];
    if (activeTab === 'provincial_chairs') return cityData.provincialChairs || [];
    if (activeTab === 'district_chairs') return cityData.districtChairs || [];
    if (activeTab === 'metropolitan_mayors') return cityData.metroMayors || [];
    if (activeTab === 'district_mayors') return cityData.districtMayors || [];
    if (activeTab === 'members') return cityData.members || [];
    return [];
  }, [cityData, activeTab]);

  const partyOptions = useMemo(() => {
    if (!cityData) return [];
    const map = new Map();
    (currentListForPartySelector || []).forEach((u) => {
      if (!u?.party_id) return;
      const pid = String(u.party_id);
      const prev = map.get(pid) || { partyId: pid, party: u.party || null, count: 0 };
      map.set(pid, { ...prev, party: prev.party || u.party || null, count: prev.count + 1 });
    });
    const out = Array.from(map.values())
      .filter((x) => x.party?.party_logo) // show only parties with a logo
      .sort((a, b) => b.count - a.count);
    return out;
  }, [cityData, currentListForPartySelector]);

  useEffect(() => {
    // When switching tabs, default to the party with the most profiles (fair + deterministic).
    setActivePartyId(partyOptions[0]?.partyId || null);
  }, [activeTab, partyOptions]);

  useEffect(() => {
    // District filter only applies to district chair/mayor tabs
    if (activeTab !== 'district_chairs' && activeTab !== 'district_mayors') {
      setDistrictFilter('');
    }
  }, [activeTab]);

  const districtOptions = useMemo(() => {
    if (!cityData) return [];
    if (activeTab !== 'district_chairs' && activeTab !== 'district_mayors') return [];
    const selectedPartyId = activePartyId ? String(activePartyId) : null;
    const list =
      activeTab === 'district_chairs' ? cityData.districtChairs || [] : cityData.districtMayors || [];
    const filteredByParty = selectedPartyId
      ? (list || []).filter((u) => String(u.party_id || '') === selectedPartyId)
      : list || [];
    const set = new Set();
    (filteredByParty || []).forEach((u) => {
      const d = String(u?.district_name || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [cityData, activeTab, activePartyId]);
  
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
    const selectedPartyId = activePartyId ? String(activePartyId) : null;
    const filterByParty = (list = []) => {
      if (!selectedPartyId) return list;
      return (list || []).filter((u) => String(u.party_id || '') === selectedPartyId);
    };
    const filterByDistrict = (list = []) => {
      if (!districtFilter) return list;
      const d = String(districtFilter || '').trim();
      if (!d) return list;
      return (list || []).filter((u) => String(u?.district_name || '').trim() === d);
    };

    const groupByParty = (list = []) => {
      const groups = new Map();
      (list || []).forEach((u) => {
        const partyId = u.party_id || 'no_party';
        if (!groups.has(partyId)) {
          groups.set(partyId, {
            partyId,
            party: u.party || null,
            list: [],
          });
        }
        groups.get(partyId).list.push(u);
      });
      const out = Array.from(groups.values()).map((g) => ({
        ...g,
        totalPolit: (g.list || []).reduce((sum, u) => sum + (u?.polit_score || 0), 0),
      }));
      out.sort((a, b) => (b.totalPolit || 0) - (a.totalPolit || 0));
      // sort inside party
      out.forEach((g) => g.list.sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0)));
      return out;
    };

    if (activeTab === 'mps') {
      const selectedPartyData = selectedPartyId
        ? (cityData.partyData || []).filter((x) => String(x.party?.party_id || x.party?.id || '') === selectedPartyId)
        : cityData.partyData;
      return (
        <div className="space-y-6">
          {selectedPartyData.map(({ party, mps }) => {
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
                      to={getProfilePath(mp)}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <Avatar 
                        src={mp.profile_image} 
                        size="56px"
                        verified={isUiVerifiedUser(mp)}
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
                            {formatPolitScore(mp.polit_score)}
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
    
    const renderPartyGroupedUserGrid = (groups, emptyIcon, emptyText, options = {}) => {
      const { showDistrictGroups = false } = options;
      if (!groups || groups.length === 0) {
        const Icon = emptyIcon;
        return (
          <div className="text-center py-12">
            <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{emptyText}</p>
          </div>
        );
      }
      return (
        <div className="space-y-6">
          {groups.map((g) => {
            const party = g.party;
            const partyKey = g.partyId || party?.party_id || party?.id || 'no_party';

            if (!showDistrictGroups) {
              return (
                <div key={partyKey} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    {party?.party_logo && (
                      <img src={party.party_logo} alt={party.party_short_name || 'Parti'} className="w-12 h-12 object-contain" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{party?.party_short_name || 'Partisiz'}</h3>
                      <p className="text-sm text-gray-500">{g.list.length} profil</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {g.list.map((u) => (
                      <Link
                        key={u.user_id}
                        to={getProfilePath(u)}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <Avatar
                          src={u.avatar_url || u.profile_image}
                          size="56px"
                          verified={isUiVerifiedUser(u)}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary-blue transition-colors truncate">
                            {u.full_name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                            {getUserTitle(u) && <span className="font-medium text-primary-blue">{getUserTitle(u)}</span>}
                            {u.city_code && (
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full">
                                {u.city_code}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-primary-blue whitespace-nowrap">{formatPolitScore(u.polit_score)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            // district grouping inside party
            const byDistrict = new Map();
            (g.list || []).forEach((u) => {
              const dn = (u.district_name || 'Bilinmiyor').toString();
              if (!byDistrict.has(dn)) byDistrict.set(dn, []);
              byDistrict.get(dn).push(u);
            });
            const districtGroups = Array.from(byDistrict.entries()).sort((a, b) => a[0].localeCompare(b[0], 'tr-TR'));

            return (
              <div key={partyKey} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  {party?.party_logo && (
                    <img src={party.party_logo} alt={party.party_short_name || 'Parti'} className="w-12 h-12 object-contain" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{party?.party_short_name || 'Partisiz'}</h3>
                    <p className="text-sm text-gray-500">{g.list.length} ilçe başkanı</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {districtGroups.map(([districtName, list]) => (
                    <div key={districtName}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-black text-gray-900">{districtName}</div>
                        <div className="text-xs text-gray-500">{list.length}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list
                          .slice()
                          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0))
                          .map((u) => (
                            <Link
                              key={u.user_id}
                              to={getProfilePath(u)}
                              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                            >
                              <Avatar
                                src={u.avatar_url || u.profile_image}
                                size="56px"
                                verified={isUiVerifiedUser(u)}
                                className="flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 group-hover:text-primary-blue transition-colors truncate">
                                  {u.full_name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                                  {getUserTitle(u) && <span className="font-medium text-primary-blue">{getUserTitle(u)}</span>}
                                  {u.city_code && (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full">
                                      {u.city_code}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs font-bold text-primary-blue whitespace-nowrap">{formatPolitScore(u.polit_score)}</div>
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    if (activeTab === 'provincial_chairs') {
      return renderPartyGroupedUserGrid(
        groupByParty(filterByParty(cityData.provincialChairs)),
        Briefcase,
        'Bu şehirden il başkanı bulunamadı'
      );
    }

    if (activeTab === 'district_chairs') {
      return renderPartyGroupedUserGrid(
        groupByParty(filterByDistrict(filterByParty(cityData.districtChairs))),
        Briefcase,
        'Bu şehirden ilçe başkanı bulunamadı',
        { showDistrictGroups: true }
      );
    }

    if (activeTab === 'metropolitan_mayors') {
      return renderPartyGroupedUserGrid(
        groupByParty(filterByParty(cityData.metroMayors)),
        Building2,
        'Bu şehirden il belediye başkanı bulunamadı'
      );
    }

    if (activeTab === 'district_mayors') {
      return renderPartyGroupedUserGrid(
        groupByParty(filterByDistrict(filterByParty(cityData.districtMayors))),
        Building2,
        'Bu şehirden ilçe belediye başkanı bulunamadı'
      );
    }

    if (activeTab === 'members') {
      return renderPartyGroupedUserGrid(
        groupByParty(filterByParty(cityData.members)),
        Users,
        'Bu şehirden üye bulunamadı'
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
                <div className="text-2xl font-bold">{cityData.stats.totalProvincialChairs}</div>
                <div className="text-xs text-white/80">İl Başkanı</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <Building2 className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold">{cityData.stats.totalMetroMayors}</div>
                <div className="text-xs text-white/80">İl Bel. Bşk.</div>
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
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {[
              { id: 'mps', label: `Milletvekilleri (${cityData.stats.totalMps})`, Icon: Users },
              { id: 'provincial_chairs', label: `İl Başkanları (${cityData.stats.totalProvincialChairs})`, Icon: Briefcase },
              { id: 'district_chairs', label: `İlçe Başkanları (${cityData.stats.totalDistrictChairs})`, Icon: Briefcase },
              { id: 'metropolitan_mayors', label: `İl Bel. Bşk. (${cityData.stats.totalMetroMayors})`, Icon: Building2 },
              { id: 'district_mayors', label: `İlçe Bel. Bşk. (${cityData.stats.totalDistrictMayors})`, Icon: Building2 },
              { id: 'members', label: `Üyeler (${cityData.stats.totalMembers})`, Icon: Users },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm border transition-colors ${
                  activeTab === id
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Party selector (fair display): logos sorted by count for current tab */}
          {partyOptions.length > 0 && (
            <div className="pb-3 -mt-1">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {partyOptions.map((p) => {
                  const isActive = String(activePartyId || '') === String(p.partyId);
                  return (
                    <button
                      key={p.partyId}
                      type="button"
                      onClick={() => setActivePartyId(p.partyId)}
                      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
                        isActive ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                      title={`${p.party?.party_short_name || ''} (${p.count})`}
                    >
                      <img
                        src={p.party.party_logo}
                        alt={p.party.party_short_name || 'Parti'}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>{p.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* İçerik */}
      <div className="container-main py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Kolon - Siyasetçiler */}
          <div className="lg:col-span-2">
            {(activeTab === 'district_chairs' || activeTab === 'district_mayors') && districtOptions.length > 0 && (
              <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-gray-900 whitespace-nowrap">İlçe Filtresi</div>
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none text-sm"
                  >
                    <option value="">Tümü</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
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
                    key={post.post_id ?? post.id}
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
