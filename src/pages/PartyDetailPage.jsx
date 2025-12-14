import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { formatNumber, formatPolitScore, formatDate } from '../utils/formatters';
import { PostCard } from '../components/post/PostCard';
import { supabase } from '../services/supabase';
import { generateMockPosts } from '../mock/posts';
import { mockParties } from '../mock/parties';
import { mockUsers } from '../mock/users';

export const PartyDetailPage = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [activeTab, setActiveTab] = useState('mps'); // mps | org | members | posts
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
      const pid = parseInt(partyId);

      const normalizeParty = (p) => {
        if (!p) return null;
        return {
          ...p,
          party_id: p.party_id ?? p.id,
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
          user: p.user ? normalizeUser(p.user, partyObj) : null,
        };
      };

      try {
        // Party (DB)
        const { data: dbParty, error: partyErr } = await supabase
          .from('parties')
          .select('*')
          .eq('id', pid)
          .maybeSingle();

        const partyObj = normalizeParty(dbParty) || normalizeParty(mockParties.find(p => p.party_id === pid));
        if (!partyObj) {
          setError('Parti bulunamadı');
          setParty(null);
          return;
        }
        setParty(partyObj);

        // Users in party (DB)
        const { data: dbUsers } = await supabase
          .from('users')
          .select('id,username,full_name,avatar_url,city_code,user_type,politician_type,party_id,is_verified,polit_score')
          .eq('party_id', pid)
          .eq('is_active', true)
          .limit(2000);

        const usersList = (dbUsers && dbUsers.length > 0)
          ? dbUsers.map(u => normalizeUser(u, partyObj))
          : mockUsers.filter(u => u.party_id === pid);

        const mps = usersList
          .filter(u => u.user_type === 'politician' && u.politician_type === 'mp')
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

        const officials = usersList
          .filter(u => u.user_type === 'politician' && u.politician_type && u.politician_type !== 'mp')
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

        const members = usersList
          .filter(u => u.user_type === 'party_member' || (u.user_type === 'normal' && u.party_id === pid))
          .sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0));

        setPartyMPs(mps);
        setPartyOfficials(officials);
        setPartyMembers(members);

        // Posts in party (DB)
        const { data: dbPosts } = await supabase
          .from('posts')
          .select('id,user_id,content_type,content_text,media_urls,thumbnail_url,media_duration,agenda_tag,polit_score,view_count,like_count,dislike_count,comment_count,share_count,is_featured,created_at, user:users(id,username,full_name,avatar_url,city_code,user_type,politician_type,party_id,is_verified), party:parties(id,short_name,logo_url,color)')
          .eq('party_id', pid)
          .eq('is_deleted', false)
          .order('polit_score', { ascending: false })
          .limit(50);

        if (dbPosts && dbPosts.length > 0) {
          setPartyPosts(dbPosts.map(mapDbPostToUi).filter(Boolean));
        } else {
          // Fallback: gerçek DB kullanıcılarıyla mock içerik üret (UI boş kalmasın)
          const allMock = generateMockPosts(200, usersList, [partyObj]);
          setPartyPosts(allMock.filter(p => p.user?.party_id === pid).slice(0, 30));
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
              activeTab === 'org' 
                ? 'text-primary-blue border-b-2 border-primary-blue' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('org')}
          >
            Teşkilat Görevlileri
          </button>
          <button
            className={`pb-3 px-4 font-medium ${
              activeTab === 'members' 
                ? 'text-primary-blue border-b-2 border-primary-blue' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Üyeler
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
                onClick={() => navigate(`/profile/${mp.user_id}`)}
              >
                <Avatar src={mp.avatar_url || mp.profile_image} size="80px" verified={mp.verification_badge || mp.is_verified} />
                <h3 className="font-semibold mt-2">{mp.full_name}</h3>
                <p className="text-sm text-gray-500">{mp.city_code}</p>
                <Badge variant="primary" size="small" className="mt-2">
                  {formatPolitScore(mp.polit_score)}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'org' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partyOfficials.map(u => (
              <div
                key={u.user_id}
                className="card cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3"
                onClick={() => navigate(`/profile/${u.user_id}`)}
              >
                <Avatar src={u.avatar_url || u.profile_image} size="56px" verified={u.verification_badge || u.is_verified} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{u.full_name}</div>
                  <div className="text-xs text-gray-600 truncate">{u.politician_type}</div>
                  <div className="text-xs text-gray-500">Plaka: {u.city_code || '-'}</div>
                </div>
                <div className="text-xs font-bold text-primary-blue">{formatPolitScore(u.polit_score)}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partyMembers.map(u => (
              <div
                key={u.user_id}
                className="card cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3"
                onClick={() => navigate(`/profile/${u.user_id}`)}
              >
                <Avatar src={u.avatar_url || u.profile_image} size="56px" verified={u.verification_badge || u.is_verified} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{u.full_name}</div>
                  <div className="text-xs text-gray-600 truncate">@{u.username}</div>
                  <div className="text-xs text-gray-500">Plaka: {u.city_code || '-'}</div>
                </div>
                <div className="text-xs font-bold text-primary-blue">{formatPolitScore(u.polit_score)}</div>
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
