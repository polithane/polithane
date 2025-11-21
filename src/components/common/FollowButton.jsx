import { useState } from 'react';
import { UserPlus, UserMinus, UserCheck, Clock, Ban } from 'lucide-react';
import { getFollowStatus, isBlocked, mockProfileSettings } from '../../mock/follows';

export const FollowButton = ({ targetUserId, currentUserId = 'currentUser', size = 'md' }) => {
  const initialStatus = getFollowStatus(currentUserId, targetUserId);
  const blocked = isBlocked(currentUserId, targetUserId);
  const [followStatus, setFollowStatus] = useState(initialStatus);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  
  if (blocked) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-semibold cursor-not-allowed"
      >
        <Ban className="w-4 h-4" />
        Engellenmiş
      </button>
    );
  }
  
  const handleFollow = () => {
    if (followStatus === 'not_following') {
      // Hedef kullanıcı özel hesap mı?
      const isPrivate = mockProfileSettings.is_private; // Gerçekte targetUserId'nin ayarları kontrol edilmeli
      
      if (isPrivate) {
        setFollowStatus('pending');
        // TODO: API çağrısı - takip isteği gönder
        console.log('Takip isteği gönderildi:', targetUserId);
      } else {
        setFollowStatus('following');
        // TODO: API çağrısı - direkt takip et
        console.log('Takip edildi:', targetUserId);
      }
    } else if (followStatus === 'following') {
      setShowUnfollowConfirm(true);
    } else if (followStatus === 'pending') {
      setFollowStatus('not_following');
      // TODO: API çağrısı - takip isteğini iptal et
      console.log('Takip isteği iptal edildi:', targetUserId);
    }
  };
  
  const handleUnfollow = () => {
    setFollowStatus('not_following');
    setShowUnfollowConfirm(false);
    // TODO: API çağrısı - takipten çık
    console.log('Takipten çıkıldı:', targetUserId);
  };
  
  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  // Takipten çık onay popup'ı
  if (showUnfollowConfirm) {
    return (
      <div className="relative">
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-[250px] z-50">
          <p className="text-sm text-gray-700 mb-3">Takipten çıkmak istediğinize emin misiniz?</p>
          <div className="flex gap-2">
            <button
              onClick={handleUnfollow}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-xs font-semibold transition-colors"
            >
              Evet, Çık
            </button>
            <button
              onClick={() => setShowUnfollowConfirm(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-3 rounded-lg text-xs font-semibold transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Takip durumuna göre buton
  if (followStatus === 'not_following') {
    return (
      <button
        onClick={handleFollow}
        className={`flex items-center gap-2 ${sizeClasses[size]} bg-primary-blue hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105`}
      >
        <UserPlus className={iconSizes[size]} />
        Takip Et
      </button>
    );
  }
  
  if (followStatus === 'pending') {
    return (
      <button
        onClick={handleFollow}
        className={`flex items-center gap-2 ${sizeClasses[size]} bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors`}
      >
        <Clock className={iconSizes[size]} />
        İstek Gönderildi
      </button>
    );
  }
  
  if (followStatus === 'following') {
    return (
      <button
        onClick={handleFollow}
        className={`flex items-center gap-2 ${sizeClasses[size]} bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors`}
      >
        <UserCheck className={iconSizes[size]} />
        Takip Ediliyor
      </button>
    );
  }
  
  return null;
};
