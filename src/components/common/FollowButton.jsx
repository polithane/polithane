import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { users as usersApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export const FollowButton = ({ targetUserId, size = 'md', onChange, iconOnly = false }) => {
  const { user: me, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState('not_following'); // not_following | following
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      if (!targetUserId) return;
      if (!isAuthenticated) {
        setFollowStatus('not_following');
        return;
      }
      try {
        const r = await usersApi.getFollowStats(targetUserId);
        const data = r?.data || r;
        setFollowStatus(data?.is_following ? 'following' : 'not_following');
      } catch {
        setFollowStatus('not_following');
      }
    })();
  }, [targetUserId, isAuthenticated]);

  const handleFollow = async () => {
    if (!targetUserId) return;
    if (!isAuthenticated) {
      toast.error('Takip etmek için giriş yapmalısınız.');
      navigate('/login-new');
      return;
    }
    if (String(me?.id || '') === String(targetUserId)) return;

    if (followStatus === 'following') {
      setShowUnfollowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const r = await usersApi.follow(targetUserId);
      const action = r?.action || r?.data?.action;
      const next = action === 'unfollowed' ? 'not_following' : 'following';
      setFollowStatus(next);
      onChange?.(next);
      if (next === 'following') toast.success('Başarıyla takip listene eklendi.');
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setShowUnfollowConfirm(false);
    setLoading(true);
    try {
      const r = await usersApi.follow(targetUserId);
      const action = r?.action || r?.data?.action;
      const next = action === 'unfollowed' ? 'not_following' : 'following';
      setFollowStatus(next);
      onChange?.(next);
      if (next === 'not_following') toast.success('Takipten çıkarıldı.');
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };
  
  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const iconSizes = {
    // Mobile-first: keep icons readable (no "dot" icons)
    sm: 'w-5 h-5 sm:w-4 sm:h-4',
    md: 'w-6 h-6 sm:w-5 sm:h-5',
    lg: 'w-7 h-7 sm:w-6 sm:h-6'
  };

  const iconOnlyPad = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
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
        disabled={!isAuthenticated || loading}
        className={
          iconOnly
            ? `inline-flex items-center justify-center ${iconOnlyPad[size] || 'p-2'} bg-primary-blue hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors`
            : `flex items-center gap-2 ${sizeClasses[size]} bg-primary-blue hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105`
        }
        title="Takip Et"
        aria-label="Takip Et"
      >
        {loading ? <Loader2 className={`${iconSizes[size]} animate-spin`} /> : <UserPlus className={iconSizes[size]} />}
        {!iconOnly ? 'Takip Et' : null}
      </button>
    );
  }
  
  if (followStatus === 'following') {
    return (
      <button
        onClick={handleFollow}
        disabled={!isAuthenticated || loading}
        className={
          iconOnly
            ? `inline-flex items-center justify-center ${iconOnlyPad[size] || 'p-2'} bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors`
            : `flex items-center gap-2 ${sizeClasses[size]} bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors`
        }
        title="Takip Ediliyor"
        aria-label="Takip Ediliyor"
      >
        {loading ? <Loader2 className={`${iconSizes[size]} animate-spin`} /> : <UserCheck className={iconSizes[size]} />}
        {!iconOnly ? 'Takip Ediliyor' : null}
      </button>
    );
  }
  
  return null;
};
