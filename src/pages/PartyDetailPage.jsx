import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { formatNumber, formatPolitScore, formatDate } from '../utils/formatters';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { getPoliticianTitle, getUserTitle, isUiVerifiedUser } from '../utils/titleHelpers';
import { getProfilePath } from '../utils/paths';
import { normalizeUsername } from '../utils/validators';
import { CITY_CODES } from '../utils/constants';
import api from '../utils/api';
import { apiCall } from '../utils/api';

export const PartyDetailPage = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [mainTab, setMainTab] = useState('mps'); // mps | org | members | provincial | district | metro_mayor | district_mayor
  const [subTab, setSubTab] = useState('profiles'); // profiles | posts
  const [postSortMode, setPostSortMode] = useState('polit'); // polit | daily
  const [partyMPs, setPartyMPs] = useState([]);
  const [partyOfficials, setPartyOfficials] = useState([]);
  const [partyMembers, setPartyMembers] = useState([]);
  const [partyPosts, setPartyPosts] = useState([]);
  const [filterProvince, setFilterProvince] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterRole, setFilterRole] = useState(''); // for org tab (party officials)
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
        // Party (DB) - via Vercel /api (service role)
        const partiesData = await api.parties.getAll();
        const dbParty = (partiesData || []).find((p) => String(p.id) === String(partyId) || String(p.slug) === String(partyId));

        const partyObj = normalizeParty(dbParty);
        if (!partyObj) {
          setError('Parti bulunamadı');
          setParty(null);
          return;
        }
        setParty(partyObj);

        // Users in party (DB)
        // IMPORTANT: large parties hit a 1000-row cap. Fetch paginated by type.
        const fetchAllUsers = async ({ party_id, user_type, order }) => {
          const pageSize = 1000;
          const maxPages = 10; // safety guard
          let out = [];
          for (let page = 0; page < maxPages; page++) {
            // eslint-disable-next-line no-await-in-loop
            const chunk = await apiCall(
              `/api/users?party_id=${party_id}&user_type=${encodeURIComponent(user_type)}&limit=${pageSize}&offset=${page * pageSize}&order=${encodeURIComponent(order)}`
            ).catch(() => []);
            if (Array.isArray(chunk) && chunk.length > 0) out = out.concat(chunk);
            if (!Array.isArray(chunk) || chunk.length < pageSize) break;
          }
          return out;
        };

        const [dbMps, dbOfficials, dbMembers] = await Promise.all([
          fetchAllUsers({ party_id: partyObj.party_id, user_type: 'mp', order: 'full_name.asc' }),
          fetchAllUsers({ party_id: partyObj.party_id, user_type: 'party_official', order: 'polit_score.desc' }),
          fetchAllUsers({ party_id: partyObj.party_id, user_type: 'party_member', order: 'polit_score.desc' }),
        ]);

        const mps = (dbMps || []).map((u) => normalizeUser(u, partyObj)).filter(Boolean);
        const officials = (dbOfficials || []).map((u) => normalizeUser(u, partyObj)).filter(Boolean);
        const members = (dbMembers || []).map((u) => normalizeUser(u, partyObj)).filter(Boolean);

        setPartyMPs(mps);
        setPartyOfficials(officials);
        setPartyMembers(members);

        // Posts in party (DB)
        const dbPosts = await api.posts.getAll({ party_id: partyObj.party_id, limit: 50, order: 'polit_score.desc' }).catch(() => []);

        setPartyPosts((dbPosts || []).map(mapDbPostToUi).filter(Boolean));
      } catch (e) {
        console.error(e);
        setError('Parti verileri yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [partyId]);

  // IMPORTANT: Hooks must run on every render in same order.
  // These memos must be ABOVE any early returns (loading/error) to avoid React hook-order crashes.
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

  const groupByProvince = (list = []) => {
    const groups = new Map();
    (list || []).forEach((u) => {
      const prov = (u?.province || 'Bilinmiyor').toString();
      if (!groups.has(prov)) groups.set(prov, []);
      groups.get(prov).push(u);
    });
    const entries = Array.from(groups.entries());
    entries.sort((a, b) => {
      const aCode = getPlateCodeFromProvince(a[0]);
      const bCode = getPlateCodeFromProvince(b[0]);
      if (aCode && bCode) return Number(aCode) - Number(bCode);
      if (aCode) return -1;
      if (bCode) return 1;
      return a[0].localeCompare(b[0], 'tr-TR');
    });
    // sort within province
    return entries.map(([prov, items]) => [
      prov,
      [...items].sort((x, y) => (y?.polit_score || 0) - (x?.polit_score || 0)),
    ]);
  };
  
  // NOTE: Detailed official roles are mapped via politician_type (backfilled in DB).
  const provincialChairs = useMemo(
    () => (partyOfficials || []).filter((u) => u?.politician_type === 'provincial_chair'),
    [partyOfficials]
  );
  const districtChairs = useMemo(
    () => (partyOfficials || []).filter((u) => u?.politician_type === 'district_chair'),
    [partyOfficials]
  );
  const metroMayors = useMemo(
    () => (partyOfficials || []).filter((u) => u?.politician_type === 'metropolitan_mayor'),
    [partyOfficials]
  );
  const districtMayors = useMemo(
    () => (partyOfficials || []).filter((u) => u?.politician_type === 'district_mayor'),
    [partyOfficials]
  );

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

  // Reset filters when switching main tab
  useEffect(() => {
    setFilterProvince('');
    setFilterDistrict('');
    setFilterRole('');
  }, [mainTab]);

  const getDistrictName = (u) => String(u?.district_name || u?.district || '').trim();
  const filteredProfilesForTab = useMemo(() => {
    let list = Array.isArray(profilesForTab) ? profilesForTab : [];
    if (filterProvince) {
      const p = String(filterProvince || '').trim();
      list = list.filter((u) => String(u?.province || '').trim() === p);
    }
    if ((mainTab === 'members' || mainTab === 'district' || mainTab === 'district_mayor') && filterDistrict) {
      const d = String(filterDistrict || '').trim();
      list = list.filter((u) => getDistrictName(u) === d);
    }
    if (mainTab === 'org' && filterRole) {
      const r = String(filterRole || '').trim();
      list = list.filter((u) => String(u?.politician_type || '').trim() === r);
    }
    return list;
  }, [profilesForTab, filterProvince, filterDistrict, filterRole, mainTab]);

  const userIdsForTab = new Set((filteredProfilesForTab || []).map((u) => u.user_id));
  const postsForTab = (partyPosts || []).filter((p) => userIdsForTab.has(p.user_id));
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

  const profileGroups = useMemo(() => {
    if (mainTab === 'mps') {
      if (!filterProvince) return mpsByProvince;
      const p = String(filterProvince || '').trim();
      return (mpsByProvince || []).filter(([prov]) => String(prov || '').trim() === p);
    }
    return groupByProvince(filteredProfilesForTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, filteredProfilesForTab, mpsByProvince, filterProvince]);

  const provinceOptions = useMemo(() => {
    const set = new Set();
    (profilesForTab || []).forEach((u) => {
      const p = String(u?.province || '').trim();
      if (p) set.add(p);
    });
    const list = Array.from(set.values());
    list.sort((a, b) => {
      const aCode = getPlateCodeFromProvince(a);
      const bCode = getPlateCodeFromProvince(b);
      if (aCode && bCode) return Number(aCode) - Number(bCode);
      if (aCode) return -1;
      if (bCode) return 1;
      return a.localeCompare(b, 'tr-TR');
    });
    return list;
  }, [profilesForTab, cityNameToCode]);

  const districtOptions = useMemo(() => {
    if (!(mainTab === 'members' || mainTab === 'district' || mainTab === 'district_mayor')) return [];
    const list = Array.isArray(profilesForTab) ? profilesForTab : [];
    const byProvince = filterProvince
      ? list.filter((u) => String(u?.province || '').trim() === String(filterProvince || '').trim())
      : list;
    const set = new Set();
    byProvince.forEach((u) => {
      const d = getDistrictName(u);
      if (d) set.add(d);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [profilesForTab, mainTab, filterProvince]);

  const roleOptions = useMemo(() => {
    if (mainTab !== 'org') return [];
    const set = new Set();
    (profilesForTab || []).forEach((u) => {
      const r = String(u?.politician_type || '').trim();
      if (r) set.add(r);
    });
    const list = Array.from(set.values());
    list.sort((a, b) => a.localeCompare(b, 'tr-TR'));
    return list.map((code) => ({
      code,
      label: getPoliticianTitle(code, null, null, true) || code,
    }));
  }, [profilesForTab, mainTab]);

  const postGroups = useMemo(() => {
    // group posts by province of post.user (or fallback to party user map by user_id)
    const provByUserId = new Map();
    [...partyMPs, ...partyOfficials, ...partyMembers].forEach((u) => {
      if (u?.user_id) provByUserId.set(u.user_id, u.province || null);
    });
    const groups = new Map();
    (sortedPosts || []).forEach((p) => {
      const prov = (p?.user?.province || provByUserId.get(p.user_id) || 'Bilinmiyor').toString();
      if (!groups.has(prov)) groups.set(prov, []);
      groups.get(prov).push(p);
    });
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
  }, [sortedPosts, partyMPs, partyOfficials, partyMembers, cityNameToCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="h-32 bg-gray-200 animate-pulse" />
          <div className="container-main py-6">
            <div className="flex items-start gap-6">
              <div className="w-52 h-52 bg-white rounded-xl border-2 border-gray-200 shadow-md flex items-center justify-center p-4 flex-shrink-0">
                <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-10 bg-gray-100 rounded-xl w-2/3 animate-pulse" />
                <div className="h-5 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                  <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                  <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                  <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container-main py-8">
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
            <div className="h-5 bg-gray-100 rounded-full w-1/3 animate-pulse" />
            <div className="mt-4 space-y-3">
              <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
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
  const computedMpCount = partyMPs.length;
  const computedOrgCount = partyOfficials.length;
  const computedMemberCount = partyMembers.length;

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
            <div className="text-3xl font-bold">{computedMpCount}</div>
            <div className="text-sm text-gray-500 mt-1">Milletvekili</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold">{computedOrgCount}</div>
            <div className="text-sm text-gray-500 mt-1">Teşkilat Görevlisi</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold">{formatNumber(computedMemberCount)}</div>
            <div className="text-sm text-gray-500 mt-1">Üye</div>
          </div>
        </div>
        
        {/* ÜST SEKMELER */}
        <div className="border-b mb-4">
          <div className="flex justify-center">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full pb-3">
              {[
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
                    setSubTab('profiles');
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                    mainTab === t.id ? 'bg-primary-blue text-white' : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ALT SEKMELER (sadece listelerde) */}
        {(
          <div className="flex justify-center mb-6">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full">
              <button
                onClick={() => setSubTab('profiles')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-colors ${
                  subTab === 'profiles'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50'
                }`}
              >
                Profiller
              </button>
              <button
                onClick={() => setSubTab('posts')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-colors ${
                  subTab === 'posts'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50'
                }`}
              >
                Paylaşımlar
              </button>
            </div>
          </div>
        )}

        {/* 4. Satır: Filtreler (sekme bazlı) */}
        {subTab === 'profiles' && (
          <div className="mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="text-sm font-black text-gray-900 whitespace-nowrap">Filtre</div>

                {['mps', 'org', 'members', 'provincial', 'district', 'metro_mayor', 'district_mayor'].includes(mainTab) && (
                  <select
                    value={filterProvince}
                    onChange={(e) => setFilterProvince(e.target.value)}
                    className="w-full md:w-[260px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none text-sm"
                  >
                    <option value="">İl (Tümü)</option>
                    {provinceOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}

                {(mainTab === 'members' || mainTab === 'district' || mainTab === 'district_mayor') && (
                  <select
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                    className="w-full md:w-[260px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none text-sm"
                  >
                    <option value="">İlçe (Tümü)</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}

                {mainTab === 'org' && (
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full md:w-[260px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none text-sm"
                  >
                    <option value="">Görev (Tümü)</option>
                    {roleOptions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}

                {(filterProvince || filterDistrict || filterRole) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterProvince('');
                      setFilterDistrict('');
                      setFilterRole('');
                    }}
                    className="md:ml-auto px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold text-sm"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Tab İçerikleri */}
        {false && (
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
                                verified={isUiVerifiedUser(u)}
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
          <div className="space-y-6">
            {profileGroups.map(([provinceName, list]) => {
              const plateCode = getPlateCodeFromProvince(provinceName);
              const plateText = plateCode ? String(parseInt(plateCode, 10)) : null;
              return (
                <div key={provinceName} className="card">
                  <div className="flex items-center gap-2 mb-4">
                    {plateCode && (
                      <Link
                        to={`/city/${plateCode}`}
                        className="w-7 h-7 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-xs font-bold flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        {plateText}
                      </Link>
                    )}
                    <div className="font-black text-gray-900 truncate">{provinceName}</div>
                    <div className="text-xs text-gray-500">{list.length}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((u) => (
                      <div
                        key={u.user_id}
                        className="card cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3"
                        onClick={() => navigate(getProfilePath(u))}
                      >
                        <Avatar src={u.avatar_url || u.profile_image} size="56px" verified={isUiVerifiedUser(u)} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{u.full_name}</div>
                          <div className="text-xs text-gray-600 truncate">@{normalizeUsername(u.username) || '-'}</div>
                          {getUserTitle(u) && (
                            <div className="text-[11px] font-semibold text-primary-blue mt-0.5 truncate">
                              {getUserTitle(u)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-primary-blue">{formatPolitScore(u.polit_score)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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

            <div className="space-y-6">
              {postGroups.map(([provinceName, list]) => {
                const plateCode = getPlateCodeFromProvince(provinceName);
                const plateText = plateCode ? String(parseInt(plateCode, 10)) : null;
                return (
                  <div key={provinceName} className="card">
                    <div className="flex items-center gap-2 mb-4">
                      {plateCode && (
                        <Link
                          to={`/city/${plateCode}`}
                          className="w-7 h-7 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-xs font-bold flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          {plateText}
                        </Link>
                      )}
                      <div className="font-black text-gray-900 truncate">{provinceName}</div>
                      <div className="text-xs text-gray-500">{list.length}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {list.map((post) => (
                        <PostCardHorizontal key={post.post_id ?? post.id} post={post} fullWidth={true} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
