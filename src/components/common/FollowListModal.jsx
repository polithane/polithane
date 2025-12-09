import { useState } from 'react';
import { X, Users, UserCheck } from 'lucide-react';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { getFollowers, getFollowing } from '../../mock/follows';
import { getUserTitle } from '../../utils/titleHelpers';
import { useNavigate } from 'react-router-dom';

export const FollowListModal = ({ isOpen, onClose, userId, tab = 'followers' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab); // followers, following
  
  const followers = getFollowers(userId);
  const following = getFollowing(userId);
  
  const displayList = activeTab === 'followers' ? followers : following;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-xl font-bold text-gray-900">
              {activeTab === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
            </h3>
            <button
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-t border-gray-200">
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'followers'
                  ? 'border-b-2 border-primary-blue text-primary-blue'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Takipçiler ({followers.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'following'
                  ? 'border-b-2 border-primary-blue text-primary-blue'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserCheck className="w-4 h-4" />
                Takip ({following.length})
              </div>
            </button>
          </div>
        </div>
        
        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {activeTab === 'followers' ? (
                  <Users className="w-10 h-10 text-gray-400" />
                ) : (
                  <UserCheck className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500 font-medium">
                {activeTab === 'followers' ? 'Henüz takipçi yok' : 'Henüz kimse takip edilmiyor'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayList.map(user => (
                <div key={user.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div
                    onClick={() => {
                      navigate(`/profile/${user.user_id}`);
                      onClose();
                    }}
                    className="cursor-pointer"
                  >
                    <Avatar 
                      src={user.avatar_url || user.profile_image} 
                      size="48px"
                      verified={user.verification_badge}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4
                      onClick={() => {
                        navigate(`/profile/${user.user_id}`);
                        onClose();
                      }}
                      className="font-semibold text-sm text-gray-900 hover:text-primary-blue cursor-pointer truncate"
                    >
                      {user.full_name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {getUserTitle(user, true)}
                    </p>
                  </div>
                  
                  {/* Kendi profilindeysek takip butonu gösterme */}
                  {userId !== 'currentUser' && (
                    <div className="flex-shrink-0">
                      <FollowButton targetUserId={user.user_id} size="sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
