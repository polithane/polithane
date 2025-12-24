import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { MoreVertical, Ban, AlertCircle, MessageCircle, Settings, Edit } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FollowButton } from '../components/common/FollowButton';
import { FollowListModal } from '../components/common/FollowListModal';
import { BlockUserModal } from '../components/common/BlockUserModal';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { formatNumber, formatPolitScore } from '../utils/formatters';
import { getUserTitle, isUiVerifiedUser } from '../utils/titleHelpers';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, users, posts } from '../utils/api';
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
  const [privacyBlocked, setPrivacyBlocked] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [blockedIds, setBlockedIds] = useState([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [userComments, setUserComments] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [hasFast, setHasFast] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  
  const isOwnProfile = currentUser && (
    userId === 'me' || 
    String(userId || '') === String(currentUser.id || '') ||
    normalizeUsername(username || '') === normalizeUsername(currentUser.username || '')
  );

  const canShowMessageButton = useMemo(() => {
    if (isOwnProfile) return false;
    if (!user) return false;
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    const ps = meta.privacy_settings && typeof meta.privacy_settings === 'object' ? meta.privacy_settings : {};
    const rule = String(ps.allowMessages || 'everyone');
    if (rule === 'none') return false;
    if (rule === 'everyone') return true;
    if (rule === 'followers') return !!followStats?.is_following;
    if (rule === 'following') return !!followStats?.is_followed_by;
    return true;
  }, [user, isOwnProfile, followStats?.is_following, followStats?.is_followed_by]);
  
  const isBlocked = useMemo(() => {
    if (!user?.id && !user?.user_id) return false;
    const tid = String(user.user_id || user.id);
    return (blockedIds || []).map(String).includes(tid);
  }, [blockedIds, user]);
  
  useEffect(() => {
    // Always start profile page from top (avoid mid-scroll starts)
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      // noop
    }

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      setPrivacyBlocked(false);
      setPrivacyMessage('');
      
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
        setHasFast(false);

        // Load my blocked user ids (for UI state)
        try {
          const r = await users.getBlocks().catch(() => null);
          const list = r?.data || r || [];
          setBlockedIds(Array.isArray(list) ? list.map((x) => String(x)) : []);
        } catch {
          setBlockedIds([]);
        }

        // Apply privacy settings (client-side enforcement)
        const ps =
          resolvedProfileData?.metadata && typeof resolvedProfileData.metadata === 'object'
            ? resolvedProfileData.metadata.privacy_settings
            : null;
        const visibility = ps?.profileVisibility || 'public';
        if (!isOwnProfile && (visibility === 'private' || visibility === 'followers')) {
          setPrivacyBlocked(true);
          setPrivacyMessage(
            visibility === 'private'
              ? 'Bu profil gizlidir.'
              : 'Bu profil sadece takipçilere açıktır.'
          );
        }

        // Canonicalize URL: if user has a username, always prefer /:username
        const canonicalPath = getProfilePath(normalizedProfile);
        const isProfileRoute = location.pathname.startsWith('/profile/') || location.pathname.startsWith('/@');
        if (canonicalPath && isProfileRoute && location.pathname !== canonicalPath) {
          navigate(canonicalPath, { replace: true });
        }
        
        // Posts: respect privacy (public-only until follow enforcement is implemented end-to-end)
        if (!privacyBlocked) {
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
        } else {
          setUserPosts([]);
        }
        
        try {
          const profileDbId = resolvedProfileData?.id ?? resolvedProfileData?.user_id ?? userId;
          if (profileDbId) {
            const statsRes = await users.getFollowStats(profileDbId).catch(() => null);
            const stats = statsRes?.data || statsRes;
            if (stats?.followers_count !== undefined) {
              setFollowStats({
                followers_count: stats.followers_count || 0,
                following_count: stats.following_count || 0,
                is_following: !!stats.is_following,
                is_followed_by: !!stats.is_followed_by,
              });
            }
          }
        } catch {
          // noop
        }

        // Fast ring: only if there are active fasts (requires auth+follow when not self)
        try {
          const profileDbId = resolvedProfileData?.id ?? resolvedProfileData?.user_id ?? userId;
          if (profileDbId) {
            const r = await apiCall(`/api/fast/${encodeURIComponent(profileDbId)}`).catch(() => null);
            const list = r?.data || [];
            setHasFast(Array.isArray(list) && list.length > 0);
          }
        } catch {
          setHasFast(false);
        }
      } catch (err) {
        console.error('Profile load error:', err);
        setError('Profil yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [userId, username]);

  useEffect(() => {
    // Load secondary tabs lazily
    if (!user?.user_id && !user?.id) return;
    const uid = user.user_id ?? user.id;
    (async () => {
      try {
        if (activeTab === 'comments') {
          setTabLoading(true);
          const r = await users.getComments(uid, { limit: 50 }).catch(() => null);
          const list = r?.data || r || [];
          setUserComments(Array.isArray(list) ? list : []);
        } else if (activeTab === 'likes') {
          setTabLoading(true);
          const r = await users.getLikes(uid, { limit: 50 }).catch(() => null);
          const list = r?.data || r || [];
          setLikedPosts(Array.isArray(list) ? list : []);
        } else if (activeTab === 'activity') {
          if (!isOwnProfile) return;
          setTabLoading(true);
          const r = await users.getActivity('me', { limit: 80 }).catch(() => null);
          const list = r?.data || r || [];
          setActivities(Array.isArray(list) ? list : []);
        }
      } finally {
        setTabLoading(false);
      }
    })();
  }, [activeTab, user?.user_id, user?.id, isOwnProfile]);
  
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
    (async () => {
      try {
        await users.block(userId);
        setBlockedIds((prev) => Array.from(new Set([...(prev || []), String(userId)])));
      } catch (e) {
        console.error(e);
        // eslint-disable-next-line no-alert
        alert(e?.message || 'Engelleme işlemi başarısız.');
      }
    })();
  };
  
  const handleReport = () => {
    setShowMenu(false);
    setReportReason('spam');
    setReportDetails('');
    setReportBusy(false);
    setReportDone(false);
    setReportModalOpen(true);
  };

  const submitReport = async () => {
    const tid = String(user?.user_id || user?.id || userId || '').trim();
    if (!tid) return;
    setReportBusy(true);
    try {
      const r = await users.report(tid, reportReason, reportDetails);
      if (r?.success) {
        setReportDone(true);
      } else {
        // eslint-disable-next-line no-alert
        alert(r?.error || 'Şikayet gönderilemedi.');
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Şikayet gönderilemedi.');
    } finally {
      setReportBusy(false);
    }
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
              verified={isUiVerifiedUser(user)}
              ring={hasFast ? 'fast' : null}
              onClick={() => {
                if (hasFast) {
                  const key = user?.username || user?.user_id || user?.id;
                  if (key) navigate(`/fast/${encodeURIComponent(String(key))}`);
                  return;
                }
                setShowAvatarModal(true);
              }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold break-words">{user.full_name}</h1>
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
                {((user?.metadata && user.metadata.privacy_settings?.showFollowers) ?? true) && (
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
                )}
                {((user?.metadata && user.metadata.privacy_settings?.showFollowing) ?? true) && (
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
                )}
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
                      <Edit className="w-6 h-6 sm:w-5 sm:h-5 mr-2" />
                      Profili Düzenle
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="outline">
                      <Settings className="w-6 h-6 sm:w-5 sm:h-5 mr-2" />
                      Ayarlar
                    </Button>
                  </Link>
                </>
              ) : isBlocked ? (
                <Button variant="outline" disabled>Engellenmiş</Button>
              ) : (
                <>
                  <FollowButton targetUserId={user?.user_id || userId} size="md" />
                  {canShowMessageButton && (
                    <button
                      type="button"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-2 transition-colors"
                      title="Mesaj Gönder"
                      onClick={() => {
                        // If not logged in, redirect to login first.
                        if (!currentUser?.id) {
                          navigate('/login-new');
                          return;
                        }
                        const tid = user?.user_id || user?.id || userId;
                        if (!tid) return;
                        navigate(`/messages?to=${encodeURIComponent(tid)}&focus=1`);
                      }}
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  )}
                  
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
                          <Ban className="w-6 h-6 sm:w-5 sm:h-5" />
                          Engelle
                        </button>
                        <button
                          onClick={handleReport}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium flex items-center gap-2"
                        >
                          <AlertCircle className="w-6 h-6 sm:w-5 sm:h-5" />
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
            userId={user?.user_id || user?.id || userId}
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

      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Profil Fotoğrafı"
        size="medium"
        className="overflow-hidden"
      >
        <div className="flex items-center justify-center">
          <img
            src={user?.avatar_url || user?.profile_image || '/favicon.ico'}
            alt={user?.full_name || 'Profil'}
            className="max-w-full max-h-[70vh] rounded-2xl object-contain bg-gray-50 border border-gray-200"
          />
        </div>
      </Modal>

      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Kullanıcıyı Şikayet Et">
        {reportDone ? (
          <div className="space-y-3">
            <div className="text-lg font-black text-green-700">Bildiriminiz alındı.</div>
            <div className="text-sm text-gray-700">İnceleme sonrası gerekli işlem yapılacaktır.</div>
            <Button onClick={() => setReportModalOpen(false)}>Kapat</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-black text-gray-900">Neden</div>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="spam">Spam</option>
              <option value="harassment">Taciz / Hakaret</option>
              <option value="scam">Dolandırıcılık</option>
              <option value="impersonation">Kimliğe bürünme</option>
              <option value="other">Diğer</option>
            </select>
            <div className="text-sm font-black text-gray-900">Not (opsiyonel)</div>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value.slice(0, 200))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              placeholder="En fazla 200 karakter"
            />
            <div className="text-xs text-gray-500">{200 - (reportDetails?.length || 0)} karakter kaldı</div>
            <Button onClick={submitReport} disabled={!reportReason || reportBusy}>
              Gönder
            </Button>
          </div>
        )}
      </Modal>
      
      {/* Tabs */}
      <div className="container-main py-6">
        {privacyBlocked && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-6">
            <h3 className="text-xl font-black text-gray-900 mb-2">Bu profil gizli</h3>
            <p className="text-gray-600">{privacyMessage}</p>
          </div>
        )}
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
          {isOwnProfile && (
            <button
              className={`pb-3 px-4 font-medium ${
                activeTab === 'activity'
                  ? 'text-primary-blue border-b-2 border-primary-blue'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('activity')}
            >
              Hareketlerim
            </button>
          )}
        </div>
        
        {/* Tab İçerikleri */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userPosts.map((post) => {
              const pid = post?.post_id ?? post?.id;
              return (
                <div key={pid ?? post.post_id ?? post.id} className="space-y-2">
                  <PostCardHorizontal post={post} fullWidth={true} />
                  {isOwnProfile && pid && !post?.is_deleted && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/post/${pid}?edit=1`)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/post/${pid}?delete=1`)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-700"
                      >
                        Sil
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'comments' && (
          <div className="space-y-3">
            {tabLoading ? (
              <div className="text-center text-gray-500 py-8">Yükleniyor…</div>
            ) : userComments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Henüz yorum yok.</div>
            ) : (
              userComments.map((c) => {
                const pid = c?.post?.id || c?.post_id;
                const postText = String(c?.post?.content_text ?? c?.post?.content ?? '').slice(0, 120);
                return (
                  <div key={c.id} className="card">
                    <div className="text-sm text-gray-900 font-semibold mb-2">{c.content}</div>
                    {pid && (
                      <button
                        type="button"
                        onClick={() => navigate(`/post/${pid}`)}
                        className="text-xs text-primary-blue hover:underline"
                      >
                        Paylaşıma git: {postText || 'Paylaşım'}
                      </button>
                    )}
                    {c.is_deleted && (
                      <div className="mt-2 text-xs text-gray-500">
                        Bu yorum onay sürecinde olabilir; herkese açık görünmeyebilir.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {activeTab === 'likes' && (
          <div className="space-y-3">
            {tabLoading ? (
              <div className="text-center text-gray-500 py-8">Yükleniyor…</div>
            ) : likedPosts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Henüz beğeni yok.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {likedPosts.map((p) => (
                  <PostCardHorizontal key={p.post_id ?? p.id} post={p} fullWidth={true} />
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'activity' && isOwnProfile && (
          <div className="space-y-3">
            {tabLoading ? (
              <div className="text-center text-gray-500 py-8">Yükleniyor…</div>
            ) : activities.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Henüz hareket yok.</div>
            ) : (
              activities.map((a, idx) => {
                const type = String(a?.type || '');
                const created = a?.created_at ? new Date(a.created_at).toLocaleString('tr-TR') : '';
                if (type === 'follow') {
                  return (
                    <div key={`${type}_${idx}`} className="card">
                      <div className="text-sm font-semibold text-gray-900">Takip ettin</div>
                      <button
                        type="button"
                        onClick={() => navigate(getProfilePath(a?.target_user || {}))}
                        className="text-sm text-primary-blue hover:underline"
                      >
                        {a?.target_user?.full_name || a?.target_user?.username || 'Kullanıcı'}
                      </button>
                      {created && <div className="text-xs text-gray-500 mt-1">{created}</div>}
                    </div>
                  );
                }
                if (type === 'like') {
                  const pid = a?.post?.id || a?.post?.post_id;
                  return (
                    <div key={`${type}_${idx}`} className="card">
                      <div className="text-sm font-semibold text-gray-900">Beğendin</div>
                      {pid && (
                        <button type="button" onClick={() => navigate(`/post/${pid}`)} className="text-sm text-primary-blue hover:underline">
                          Paylaşıma git
                        </button>
                      )}
                      {created && <div className="text-xs text-gray-500 mt-1">{created}</div>}
                    </div>
                  );
                }
                if (type === 'comment') {
                  const pid = a?.post?.id || a?.post?.post_id;
                  return (
                    <div key={`${type}_${idx}`} className="card">
                      <div className="text-sm font-semibold text-gray-900">Yorum yaptın</div>
                      <div className="text-sm text-gray-700 mt-1">{a?.comment?.content}</div>
                      {pid && (
                        <button type="button" onClick={() => navigate(`/post/${pid}`)} className="text-sm text-primary-blue hover:underline mt-2">
                          Paylaşıma git
                        </button>
                      )}
                      {created && <div className="text-xs text-gray-500 mt-1">{created}</div>}
                    </div>
                  );
                }
                if (type === 'post') {
                  const pid = a?.post?.id || a?.post?.post_id;
                  return (
                    <div key={`${type}_${idx}`} className="card">
                      <div className="text-sm font-semibold text-gray-900">Paylaşım yaptın</div>
                      {pid && (
                        <button type="button" onClick={() => navigate(`/post/${pid}`)} className="text-sm text-primary-blue hover:underline">
                          Paylaşıma git
                        </button>
                      )}
                      {created && <div className="text-xs text-gray-500 mt-1">{created}</div>}
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
