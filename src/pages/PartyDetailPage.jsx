import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { formatNumber, formatPolitScore, formatDate } from '../utils/formatters';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { supabase } from '../services/supabase';
import { generateMockPosts } from '../mock/posts';
import { mockParties } from '../mock/parties';
import { mockUsers } from '../mock/users';
import { getProfilePath } from '../utils/paths';
import { normalizeUsername } from '../utils/validators';
import { CITY_CODES } from '../utils/constants';

export const PartyDetailPage = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [mainTab, setMainTab] = useState('distribution'); // distribution | mps | org | members | provincial | district | metro_mayor | district_mayor
  const [subTab, setSubTab] = useState('profiles'); // profiles | posts
  const [postSortMode, setPostSortMode] = useState('polit'); // polit | daily
  const [partyMPs, setPartyMPs] = useState([]);
  const [partyOfficials, setPartyOfficials] = useState([]);
  const [partyMembers, setPartyMembers] = useState([]);
  const [partyPosts, setPartyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      const normalizeParty = (p) => {
        if (!p) return null;
        return {
          ...p,
          party_id: p.party_id ?? p.id,
          party_slug: p.party_slug ?? p.slug,
          party_name: p.party_name ?? p.name,
          party_short_name: p.party_short_name ?? p.short_name,
          party_logo: p.party_logo ?? p.logo_url,
          party_flag: p.party_flag ?? p.flag_url,
          party_color: p.party_color ?? p.color,
        };
      };

      const normalizeUser = (u, partyObj) => {
        if (!u) return null;
        return {
          ...u,
          user_id: u.user_id ?? u.id,
          profile_image: u.profile_image ?? u.avatar_url,
          verification_badge: u.verification_badge ?? u.is_verified ?? false,
          party_id: u.party_id ?? partyObj?.party_id ?? null,
          party: partyObj || null,
        };
      };

      const mapDbPostToUi = (p) => {
        if (!p) return null;
        const partyObj = p.party
          ? normalizeParty(p.party)
          : party;
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
          source_url: p.source_url,
          user: p.user ? normalizeUser(p.user, partyObj) : null,
        };
      };

      try {
        // Party (DB) - IMPORTANT:
        // If we OR uuid(id) with slug, PostgREST will error for non-uuid values.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(partyId || ''));
        const partyQuery = supabase.from('parties').select('*');
        const { data: dbParty } = isUuid
          ? await partyQuery.eq('id', partyId).maybeSingle()
          : await partyQuery.eq('slug', partyId).maybeSingle();

        const partyObj =
          normalizeParty(dbParty) ||
          normalizeParty(
            mockParties.find((p) =>
              String(p.party_id) === String(partyId) ||
              String(p.slug || '') === String(partyId) ||
              String(p.party_short_name || '').toLowerCase() === String(partyId).toLowerCase()
            )
          );
        if (!partyObj) {
          setError('Parti bulunamadı');
          setParty(null);
          return;
        }
        setParty(partyObj);

        // Users in party (DB)
        const { data: dbUsers } = await supabase
          .from('users')
          .select('id,username,full_name,avatar_url,user_type,party_id,province,is_verified,polit_score')
          .eq('party_id', partyObj.party_id)
          .eq('is_active', true)
          .limit(2000);

        const usersList =
          dbUsers && dbUsers.length > 0
            ? dbUsers.map((u) => normalizeUser(u, partyObj))
            : mockUsers.filter((u) => String(u.party_id) === String(partyId));

        const mps = usersList
          .filter((u) => u.user_type === 'mp')
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

        const officials = usersList
          .filter((u) => u.user_type === 'party_official')
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

        const members = usersList
          .filter((u) => u.user_type === 'party_member')
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

        setPartyMPs(mps);
        setPartyOfficials(officials);
        setPartyMembers(members);

        // Posts in party (DB)
        const { data: dbPosts } = await supabase
          .from('posts')
          .select('id,user_id,content_type,content_text,media_urls,thumbnail_url,media_duration,agenda_tag,polit_score,view_count,like_count,dislike_count,comment_count,share_count,is_featured,created_at, source_url, user:users(id,username,full_name,avatar_url,user_type,party_id,province,is_verified), party:parties(id,slug,short_name,logo_url,color)')
          .eq('party_id', partyObj.party_id)
          .eq('is_deleted', false)
          .order('polit_score', { ascending: false })
          .limit(50);

        if (dbPosts && dbPosts.length > 0) {
          setPartyPosts(dbPosts.map(mapDbPostToUi).filter(Boolean));
        } else {
          // Fallback: gerçek DB kullanıcılarıyla mock içerik üret (UI boş kalmasın)
          const allMock = generateMockPosts(200, usersList, [partyObj]);
          setPartyPosts(allMock.filter((p) => String(p.user?.party_id) === String(partyObj.party_id)).slice(0, 30));
        }
      } catch (e) {
        console.error(e);
        setError('Parti verileri yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [partyId]);
  
  if (loading) {
    return (
      <div className="container-main py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="container-main py-8">
        <div className="text-center text-gray-700">{error || 'Parti bulunamadı'}</div>
      </div>
    );
  }
  
  const seatPercentage = ((party.parliament_seats / 600) * 100).toFixed(1);

  // NOTE: Detailed official roles are not yet mapped in DB for this page.
  const provincialChairs = [];
  const districtChairs = [];
  const metroMayors = [];
  const districtMayors = [];

  const cityNameToCode = useMemo(() => {
    const normalizeCityName = (name) =>
      String(name || '')
        .trim()
        .toLowerCase('tr-TR')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/\s+/g, ' ');

    const m = new Map();
    Object.entries(CITY_CODES).forEach(([code, cityName]) => {
      m.set(normalizeCityName(cityName), code);
    });
    return { normalizeCityName, map: m };
  }, []);

  const getPlateCodeFromProvince = (provinceName) => {
    const key = cityNameToCode.normalizeCityName(provinceName);
    return cityNameToCode.map.get(key) || null;
  };

  const mpsByProvince = useMemo(() => {
    const groups = new Map();
    (partyMPs || []).forEach((mp) => {
      const prov = (mp.province || 'Bilinmiyor').toString();
      if (!groups.has(prov)) groups.set(prov, []);
      groups.get(prov).push(mp);
    });
    // sort MPs within each province by polit_score desc
    for (const [prov, list] of groups.entries()) {
      groups.set(
        prov,
        [...list].sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0))
      );
    }
    // sort provinces by plate code if available, then alpha
    const entries = Array.from(groups.entries());
    entries.sort((a, b) => {
      const aCode = getPlateCodeFromProvince(a[0]);
      const bCode = getPlateCodeFromProvince(b[0]);
      if (aCode && bCode) return Number(aCode) - Number(bCode);
      if (aCode) return -1;
      if (bCode) return 1;
      return a[0].localeCompare(b[0], 'tr-TR');
    });
    return entries;
  }, [partyMPs, cityNameToCode]);

  const getProfilesForTab = () => {
    if (mainTab === 'mps') return partyMPs;
    if (mainTab === 'org') return partyOfficials;
    if (mainTab === 'members') return partyMembers;
    if (mainTab === 'provincial') return provincialChairs;
    if (mainTab === 'district') return districtChairs;
    if (mainTab === 'metro_mayor') return metroMayors;
    if (mainTab === 'district_mayor') return districtMayors;
    return [];
  };

  const profilesForTab = getProfilesForTab();
  const userIdsForTab = new Set((profilesForTab || []).map(u => u.user_id));

  const postsForTab = (partyPosts || []).filter(p => userIdsForTab.has(p.user_id));
  const dailyEngagementScore = (p) => {
    const likes = Number(p.like_count || 0);
    const comments = Number(p.comment_count || 0);
    const shares = Number(p.share_count || 0);
    const views = Number(p.view_count || 0);
    return likes * 5 + comments * 10 + shares * 20 + views * 0.1;
  };
  const sortedPosts = [...postsForTab].sort((a, b) => {
    if (postSortMode === 'daily') return dailyEngagementScore(b) - dailyEngagementScore(a);
    return (b.polit_score || 0) - (a.polit_score || 0);
  });
  
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
        
        {/* ÜST SEKMELER */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b mb-4">
          {[
            { id: 'distribution', label: 'Meclis Dağılımı' },
            { id: 'mps', label: `Milletvekili (${partyMPs.length})` },
            { id: 'org', label: `Teşkilat Görevlisi (${partyOfficials.length})` },
            { id: 'members', label: `Üye (${partyMembers.length})` },
            { id: 'provincial', label: `İl Başkanları (${provincialChairs.length})` },
            { id: 'district', label: `İlçe Başkanları (${districtChairs.length})` },
            { id: 'metro_mayor', label: `İl Belediye Bşk. (${metroMayors.length})` },
            { id: 'district_mayor', label: `İlçe Belediye Bşk. (${districtMayors.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setMainTab(t.id);
                if (t.id !== 'distribution') setSubTab('profiles');
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                mainTab === t.id ? 'bg-primary-blue text-white' : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ALT SEKMELER (sadece listelerde) */}
        {mainTab !== 'distribution' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSubTab('profiles')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm border ${
                subTab === 'profiles' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Profiller
            </button>
            <button
              onClick={() => setSubTab('posts')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm border ${
                subTab === 'posts' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Paylaşımlar
            </button>
          </div>
        )}
        
        {/* Tab İçerikleri */}
        {mainTab === 'distribution' && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-black text-gray-900 mb-2">Meclis Dağılımı</h3>
              <p className="text-sm text-gray-600">
                Bu partinin meclis dağılımı; <span className="font-bold">{party.parliament_seats}</span> sandalye üzerinden,
                <span className="font-semibold"> iller bazında vekiller</span> gösterilerek listelenir.
              </p>
            </div>

            {mpsByProvince.length === 0 ? (
              <div className="card text-sm text-gray-600">Bu parti için milletvekili bulunamadı.</div>
            ) : (
              <div className="space-y-6">
                {mpsByProvince.map(([provinceName, list]) => {
                  const plateCode = getPlateCodeFromProvince(provinceName);
                  const plateText = plateCode ? String(parseInt(plateCode, 10)) : null;
                  return (
                    <div key={provinceName} className="card">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {plateCode && (
                              <Link
                                to={`/city/${plateCode}`}
                                className="w-7 h-7 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-xs font-bold flex items-center justify-center transition-colors flex-shrink-0"
                              >
                                {plateText}
                              </Link>
                            )}
                            <h4 className="text-base font-black text-gray-900 truncate">{provinceName}</h4>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{list.length} milletvekili</div>
                        </div>
                        <button
                          className="text-xs font-semibold text-primary-blue hover:underline"
                          onClick={() => setMainTab('mps')}
                          type="button"
                        >
                          Tüm vekiller sekmesine git
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map((u) => {
                          const displayUsername = normalizeUsername(u.username);
                          const uPlateCode = getPlateCodeFromProvince(u.province);
                          const uPlateText = uPlateCode ? String(parseInt(uPlateCode, 10)) : null;
                          return (
                            <div
                              key={u.user_id}
                              className="card cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3"
                              onClick={() => navigate(getProfilePath(u))}
                            >
                              <Avatar
                                src={u.avatar_url || u.profile_image}
                                size="56px"
                                verified={u.verification_badge || u.is_verified}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold truncate">{u.full_name}</div>
                                <div className="text-xs text-gray-600 truncate">@{displayUsername || '-'}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {uPlateCode && (
                                  <Link
                                    to={`/city/${uPlateCode}`}
                                    className="w-6 h-6 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-[10px] font-bold flex items-center justify-center transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {uPlateText}
                                  </Link>
                                )}
                                <div className="text-xs font-bold text-primary-blue">{formatPolitScore(u.polit_score)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mainTab !== 'distribution' && subTab === 'profiles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profilesForTab.map(u => (
              <div
                key={u.user_id}
                className="card cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3"
                onClick={() => navigate(getProfilePath(u))}
              >
                <Avatar src={u.avatar_url || u.profile_image} size="56px" verified={u.verification_badge || u.is_verified} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{u.full_name}</div>
                  <div className="text-xs text-gray-600 truncate">@{normalizeUsername(u.username) || '-'}</div>
                </div>
                <div className="flex items-center gap-2">
                  {getPlateCodeFromProvince(u.province) && (
                    <Link
                      to={`/city/${getPlateCodeFromProvince(u.province)}`}
                      className="w-7 h-7 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-xs font-bold flex items-center justify-center transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {String(parseInt(getPlateCodeFromProvince(u.province), 10))}
                    </Link>
                  )}
                  <div className="text-xs font-bold text-primary-blue">{formatPolitScore(u.polit_score)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mainTab !== 'distribution' && subTab === 'posts' && (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPostSortMode('polit')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  postSortMode === 'polit' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Polit Puan
              </button>
              <button
                onClick={() => setPostSortMode('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  postSortMode === 'daily' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Günlük Etkileşim
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedPosts.map(post => (
                <PostCardHorizontal key={post.post_id} post={post} fullWidth={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
