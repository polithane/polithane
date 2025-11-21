import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MoreVertical, Ban, AlertCircle, MessageCircle } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { FollowButton } from '../components/common/FollowButton';
import { FollowListModal } from '../components/common/FollowListModal';
import { BlockUserModal } from '../components/common/BlockUserModal';
import { PostCard } from '../components/post/PostCard';
import { formatNumber, formatPolitScore } from '../utils/formatters';
import { getUserTitle } from '../utils/titleHelpers';
import { mockUsers } from '../mock/users';
import { mockPosts } from '../mock/posts';
import { getFollowStats, mockBlockedUsers } from '../mock/follows';

export const ProfilePage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState('followers');
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  
  const isOwnProfile = userId === 'currentUser' || parseInt(userId) === 'currentUser';
  const isBlocked = mockBlockedUsers.some(b => 
    (b.blocker_id === 'currentUser' && b.blocked_id === parseInt(userId)) ||
    (b.blocked_id === 'currentUser' && b.blocker_id === parseInt(userId))
  );
  
  useEffect(() => {
    const foundUser = mockUsers.find(u => u.user_id === parseInt(userId));
    setUser(foundUser);
    
    const posts = mockPosts.filter(p => p.user_id === parseInt(userId));
    setUserPosts(posts);
    
    const stats = getFollowStats(userId);
    setFollowStats(stats);
  }, [userId]);
  
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
              src={user.profile_image} 
              size="120px" 
              verified={user.verification_badge}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold break-words">{user.full_name}</h1>
                {user.verification_badge && <Badge variant="primary">Doğrulanmış</Badge>}
                {user.party_id && user.party?.party_short_name && (
                  <Badge variant="secondary">{user.party.party_short_name}</Badge>
                )}
              </div>
              {getUserTitle(user) && (
                <p className="text-primary-blue font-semibold text-lg mb-2">
                  {getUserTitle(user)}
                </p>
              )}
              <p className="text-gray-600 mb-2 break-words">@{user.username}</p>
              {user.bio && <p className="text-gray-800 mb-4 break-words">{user.bio}</p>}
              
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
                <Button variant="outline">Profili Düzenle</Button>
              ) : isBlocked ? (
                <Button variant="outline" disabled>Engellenmiş</Button>
              ) : (
                <>
                  <FollowButton targetUserId={parseInt(userId)} size="md" />
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
          <div className="space-y-4">
            {userPosts.map(post => (
              <PostCard key={post.post_id} post={post} />
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
