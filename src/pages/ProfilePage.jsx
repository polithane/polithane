import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { MoreVertical, Ban, AlertCircle, MessageCircle, Settings, Edit } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { FollowButton } from '../components/common/FollowButton';
import { FollowListModal } from '../components/common/FollowListModal';
import { BlockUserModal } from '../components/common/BlockUserModal';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { formatNumber, formatPolitScore } from '../utils/formatters';
import { getUserTitle } from '../utils/titleHelpers';
import { getFollowStats, mockBlockedUsers } from '../mock/follows';
import { useAuth } from '../contexts/AuthContext';
import { users, posts } from '../utils/api';
import { CITY_CODES, FEATURE_FLAGS } from '../utils/constants';
import { normalizeUsername } from '../utils/validators';
import { getProfilePath } from '../utils/paths';

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

const CITY_NAME_TO_CODE = (() => {
  const m = new Map();
  Object.entries(CITY_CODES).forEach(([code, cityName]) => {
    m.set(normalizeCityName(cityName), code);
  });
  return m;
})();

export const ProfilePage = () => {
  const { userId, username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState('followers');
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const isOwnProfile = currentUser && (
    userId === 'me' || 
    String(userId || '') === String(currentUser.id || '') ||
    normalizeUsername(username || '') === normalizeUsername(currentUser.username || '')
  );
  
  const isBlocked = mockBlockedUsers.some(b => 
    (b.blocker_id === 'currentUser' && b.blocked_id === user?.id) ||
    (b.blocked_id === 'currentUser' && b.blocker_id === user?.id)
  );
  
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      
      try {
        let profileData;
        const normalizeUser = (u) => {
          if (!u) return null;
          return {
            ...u,
            user_id: u.user_id ?? u.id,
            username: normalizeUsername(u.username || ''),
            verification_badge: u.verification_badge ?? u.is_verified ?? false,
            profile_image: u.profile_image ?? u.avatar_url,
            party: u.party
              ? {
                  party_id: u.party.party_id ?? u.party.id,
                  party_slug: u.party.party_slug ?? u.party.slug,
                  party_short_name: u.party.party_short_name ?? u.party.short_name,
                  party_logo: u.party.party_logo ?? u.party.logo_url,
                  party_color: u.party.party_color ?? u.party.color,
                }
              : null,
          };
        };

        const mapDbPostToUi = (p) => {
          if (!p) return null;
          return {
            post_id: p.post_id ?? p.id,
            user_id: p.user_id,
            content_type: p.content_type,
            content_text: p.content_text,
            media_url: p.media_url ?? p.media_urls,
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
            user: p.user ? normalizeUser(p.user) : null,
          };
        };
        
        // /@username route'u kullanılmışsa
        if (username) {
          try {
            profileData = await users.getByUsername(username);
          } catch (e) {
            console.error('User fetch by username failed:', e);
          }

          if (!profileData) {
            setError('Kullanıcı bulunamadı');
            setLoading(false);
            return;
          }
        } 
        // /profile/:userId route'u kullanılmışsa
        else if (userId) {
          try {
            profileData = await users.getById(userId);
          } catch (e) {
            console.error('User fetch by id failed:', e);
          }

          if (!profileData) {
            setError('Kullanıcı bulunamadı');
            setLoading(false);
            return;
          }
        }
        
        const resolvedProfileData = profileData?.data ? profileData.data : profileData;
        const normalizedProfile = normalizeUser(resolvedProfileData);
        setUser(normalizedProfile);

        // Canonicalize URL: if user has a username, always prefer /:username
        const canonicalPath = getProfilePath(normalizedProfile);
        const isProfileRoute = location.pathname.startsWith('/profile/') || location.pathname.startsWith('/@');
        if (canonicalPath && isProfileRoute && location.pathname !== canonicalPath) {
          navigate(canonicalPath, { replace: true });
        }
        
        // Posts: DB'den çek
        const profileDbId = resolvedProfileData?.id ?? resolvedProfileData?.user_id;
        if (profileDbId) {
          const dbPosts = await posts.getAll({
            user_id: profileDbId,
            limit: 50,
            order: 'polit_score.desc',
          });
          setUserPosts((dbPosts || []).map(mapDbPostToUi).filter(Boolean));
        } else {
          setUserPosts([]);
        }
        
        const stats = getFollowStats(resolvedProfileData?.id || userId);
        setFollowStats(stats);
      } catch (err) {
        console.error('Profile load error:', err);
        setError('Profil yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [userId, username]);
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Kullanıcı Bulunamadı</h2>
          <p className="text-gray-600 mb-6">{error || 'Aradığınız profil bulunamadı.'}</p>
          <Link to="/" className="text-primary-blue hover:underline font-semibold">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }
  
  const handleBlock = (userId) => {
    // TODO: API çağrısı - kullanıcıyı engelle
    console.log('Kullanıcı engellendi:', userId);
    mockBlockedUsers.push({
      blocker_id: 'currentUser',
      blocked_id: userId,
      created_at: new Date().toISOString()
    });
  };
  
  const handleReport = () => {
    // TODO: Şikayet sistemi
    console.log('Kullanıcı şikayet edildi:', userId);
    alert('Şikayetiniz alındı, incelenecektir.');
    setShowMenu(false);
  };
  
  if (!user) {
    return (
      <div className="container-main py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container-main py-8">
          {/* Profil Header */}
          <div className="flex items-start gap-6">
            <Avatar 
              src={user.avatar_url || user.profile_image} 
              size="120px" 
              verified={user.verification_badge || user.is_verified}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold break-words">{user.full_name}</h1>
                {user.verification_badge && <Badge variant="primary">Doğrulanmış</Badge>}
                {user.party_id && user.party?.party_logo && (
                  <Link
                    to={`/party/${user.party.party_slug || user.party.party_id || user.party_id}`}
                    className="inline-flex items-center justify-center w-9 h-9 bg-white rounded-full border border-gray-200 shadow-sm"
                    title={user.party.party_short_name || 'Parti'}
                  >
                    <img
                      src={user.party.party_logo}
                      alt={user.party.party_short_name || 'Parti'}
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </Link>
                )}
                {(() => {
                  const plateCode =
                    user.city_code ||
                    (user.province ? CITY_NAME_TO_CODE.get(normalizeCityName(user.province)) : null);
                  const plateText = plateCode ? String(parseInt(plateCode, 10)) : null;
                  if (!plateCode) return null;
                  return (
                    <Link
                      to={`/city/${plateCode}`}
                      className="w-9 h-9 rounded-full bg-gray-900 hover:bg-primary-blue text-white text-xs font-bold flex items-center justify-center transition-colors"
                      title={user.province || 'Şehir'}
                    >
                      {plateText}
                    </Link>
                  );
                })()}
              </div>
              {getUserTitle(user) && (
                <p className="text-primary-blue font-semibold text-lg mb-2">
                  {getUserTitle(user)}
                </p>
              )}
              <p className="text-gray-600 mb-2 break-words">@{user.username}</p>
              {user.bio && <p className="text-gray-800 mb-4 break-words">{user.bio}</p>}
              
              {/* Otomatik Profil Uyarısı */}
              {user.is_automated && !isOwnProfile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 mb-2">
                        Bu üyelik sitemiz tarafından otomatik olarak oluşturulmuştur ve paylaşımlar yapay zeka tarafından yapılmaktadır.
                      </p>
                      {FEATURE_FLAGS.ENABLE_PROFILE_CLAIM_FLOW && (
                        <p className="text-sm text-blue-800 font-medium">
                          Bu profil size ait mi?{' '}
                          <Link
                            to={`/register-new?mode=claim&claimUserId=${user.user_id}`}
                            className="text-primary-blue hover:underline font-semibold"
                          >
                            Buraya tıklayın ve profilinizin sahipliğini alın →
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* İstatistikler */}
              <div className="flex gap-8 mt-4">
                <div
                  onClick={() => {
                    setFollowModalTab('followers');
                    setShowFollowModal(true);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="text-xl font-bold">{formatNumber(followStats.followers_count)}</div>
                  <div className="text-sm text-gray-500">Takipçi</div>
                </div>
                <div
                  onClick={() => {
                    setFollowModalTab('following');
                    setShowFollowModal(true);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="text-xl font-bold">{formatNumber(followStats.following_count)}</div>
                  <div className="text-sm text-gray-500">Takip</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{formatNumber(user.post_count)}</div>
                  <div className="text-sm text-gray-500">Paylaşım</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary-blue">{formatPolitScore(user.polit_score)}</div>
                  <div className="text-sm text-gray-500">Polit Puan</div>
                </div>
              </div>
            </div>
            
            {/* Aksiyon Butonları */}
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <>
                  <Link to="/settings/profile">
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Profili Düzenle
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Ayarlar
                    </Button>
                  </Link>
                </>
              ) : isBlocked ? (
                <Button variant="outline" disabled>Engellenmiş</Button>
              ) : (
                <>
                  <FollowButton targetUserId={user?.user_id || userId} size="md" />
                  <button
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-2 transition-colors"
                    title="Mesaj Gönder"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  
                  {/* Menü */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-2 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-20">
                        <button
                          onClick={() => {
                            setShowBlockModal(true);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 font-medium flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          Engelle
                        </button>
                        <button
                          onClick={handleReport}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Şikayet Et
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Modals */}
          <FollowListModal
            isOpen={showFollowModal}
            onClose={() => setShowFollowModal(false)}
            userId={userId}
            tab={followModalTab}
          />
          <BlockUserModal
            isOpen={showBlockModal}
            onClose={() => setShowBlockModal(false)}
            user={user}
            onConfirm={handleBlock}
          />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="container-main py-6">
        <div className="flex gap-4 border-b mb-6">
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
          <button
            className={`pb-3 px-4 font-medium ${
              activeTab === 'comments' 
                ? 'text-primary-blue border-b-2 border-primary-blue' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            Yorumlar
          </button>
          <button
            className={`pb-3 px-4 font-medium ${
              activeTab === 'likes' 
                ? 'text-primary-blue border-b-2 border-primary-blue' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('likes')}
          >
            Beğendikleri
          </button>
        </div>
        
        {/* Tab İçerikleri */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userPosts.map(post => (
              <PostCardHorizontal key={post.post_id} post={post} fullWidth={true} />
            ))}
          </div>
        )}
        {activeTab === 'comments' && (
          <div className="text-center text-gray-500 py-8">Yorumlar yakında...</div>
        )}
        {activeTab === 'likes' && (
          <div className="text-center text-gray-500 py-8">Beğeniler yakında...</div>
        )}
      </div>
    </div>
  );
};
