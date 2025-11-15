import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCard } from '../components/post/PostCard';
import { formatNumber } from '../utils/formatters';
import { mockUsers } from '../mock/users';
import { mockPosts } from '../mock/posts';

export const ProfilePage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  
  useEffect(() => {
    const foundUser = mockUsers.find(u => u.user_id === parseInt(userId));
    setUser(foundUser);
    
    const posts = mockPosts.filter(p => p.user_id === parseInt(userId));
    setUserPosts(posts);
  }, [userId]);
  
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
            <Avatar src={user.profile_image} size="120px" verified={user.verification_badge} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{user.full_name}</h1>
                {user.verification_badge && <Badge variant="primary">Doğrulanmış</Badge>}
              </div>
              <p className="text-gray-600 mb-2">@{user.username}</p>
              {user.bio && <p className="text-gray-800 mb-4">{user.bio}</p>}
              
              {/* İstatistikler */}
              <div className="flex gap-8 mt-4">
                <div>
                  <div className="text-xl font-bold">{formatNumber(user.follower_count)}</div>
                  <div className="text-sm text-gray-500">Takipçi</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{formatNumber(user.following_count)}</div>
                  <div className="text-sm text-gray-500">Takip</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{formatNumber(user.post_count)}</div>
                  <div className="text-sm text-gray-500">Paylaşım</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary-blue">{formatNumber(user.polit_score)}</div>
                  <div className="text-sm text-gray-500">Polit Puan</div>
                </div>
              </div>
            </div>
            <Button variant="outline">Takip Et</Button>
          </div>
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
