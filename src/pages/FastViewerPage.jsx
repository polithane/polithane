import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Volume2,
  VolumeX,
  Pause,
  Play,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import ShareModal from '../components/ShareModal';
import FastOptionsMenu from '../components/FastOptionsMenu';
import CommentModal from '../components/CommentModal';

export default function FastViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [fasts, setFasts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);
  
  const videoRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const source = searchParams.get('source') || 'feed';
  const userId = searchParams.get('userId');

  useEffect(() => {
    loadFasts();
  }, [id, source, userId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setIsPortraitVideo(aspectRatio < 1);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [currentIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setVideoProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      if (currentIndex < fasts.length - 1) {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, fasts.length]);

  const loadFasts = async () => {
    try {
      setLoading(true);
      let response;
      
      if (source === 'profile' && userId) {
        response = await api.get(`/api/fasts/user/${userId}`);
      } else {
        response = await api.get('/api/fasts');
      }
      
      const fastsData = response.data;
      setFasts(fastsData);
      
      const index = fastsData.findIndex(f => f.id === parseInt(id));
      if (index !== -1) {
        setCurrentIndex(index);
      }
    } catch (err) {
      console.error('Error loading fasts:', err);
      setError('Failed to load fasts');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < fasts.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setVideoProgress(0);
      setIsPlaying(true);
      navigate(`/fasts/${fasts[nextIndex].id}?source=${source}${userId ? `&userId=${userId}` : ''}`, { replace: true });
    }
  }, [currentIndex, fasts, navigate, source, userId]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setVideoProgress(0);
      setIsPlaying(true);
      navigate(`/fasts/${fasts[prevIndex].id}?source=${source}${userId ? `&userId=${userId}` : ''}`, { replace: true });
    }
  }, [currentIndex, fasts, navigate, source, userId]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - touchEndY;
    const deltaX = touchStartX.current - touchEndX;
    
    // Check if vertical swipe is more dominant than horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const currentFast = fasts[currentIndex];
      const isLiked = currentFast.is_liked;

      if (isLiked) {
        await api.delete(`/api/fasts/${currentFast.id}/like`);
      } else {
        await api.post(`/api/fasts/${currentFast.id}/like`);
      }

      setFasts(prev => prev.map((fast, idx) => 
        idx === currentIndex
          ? {
              ...fast,
              is_liked: !isLiked,
              likes_count: isLiked ? fast.likes_count - 1 : fast.likes_count + 1
            }
          : fast
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleComment = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowCommentModal(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const currentFast = fasts[currentIndex];
      await api.post(`/api/fasts/${currentFast.id}/comments`, {
        content: commentText
      });

      setFasts(prev => prev.map((fast, idx) => 
        idx === currentIndex
          ? { ...fast, comments_count: fast.comments_count + 1 }
          : fast
      ));

      setCommentText('');
      setShowCommentModal(false);
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this Fast?')) {
      return;
    }

    try {
      const currentFast = fasts[currentIndex];
      await api.delete(`/api/fasts/${currentFast.id}`);
      
      const newFasts = fasts.filter((_, idx) => idx !== currentIndex);
      
      if (newFasts.length === 0) {
        navigate('/');
        return;
      }

      setFasts(newFasts);
      
      if (currentIndex >= newFasts.length) {
        const newIndex = newFasts.length - 1;
        setCurrentIndex(newIndex);
        navigate(`/fasts/${newFasts[newIndex].id}?source=${source}${userId ? `&userId=${userId}` : ''}`, { replace: true });
      } else {
        navigate(`/fasts/${newFasts[currentIndex].id}?source=${source}${userId ? `&userId=${userId}` : ''}`, { replace: true });
      }
    } catch (err) {
      console.error('Error deleting fast:', err);
      alert('Failed to delete Fast');
    }
  };

  const handleBack = () => {
    if (source === 'profile' && userId) {
      navigate(`/profile/${userId}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || fasts.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">{error || 'No fasts found'}</p>
          <button
            onClick={handleBack}
            className="text-purple-400 hover:text-purple-300"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const current = fasts[currentIndex];
  const itemSrc = current.content_type === 'video' 
    ? `${api.defaults.baseURL}/api/fasts/${current.id}/video`
    : `${api.defaults.baseURL}/api/fasts/${current.id}/image`;

  return (
    <div className="fixed inset-0 bg-black">
      <div
        ref={containerRef}
        className="h-full w-full relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            <div className="flex items-center gap-3">
              <img
                src={current.author.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${current.author.username}`}
                alt={current.author.username}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <div className="text-white">
                <p className="font-semibold">{current.author.username}</p>
                <p className="text-xs text-gray-300">
                  {formatDistanceToNow(new Date(current.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOptionsMenu(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-full w-full flex items-center justify-center bg-black">
          {current.content_type === 'image' ? (
            <img
              src={itemSrc}
              alt="Fast content"
              className="max-h-full max-w-full object-contain"
            />
            ) : current.content_type === 'video' ? (
              <video
                ref={videoRef}
                src={itemSrc}
                playsInline
                muted={muted}
                autoPlay
                controls={false}
                className={['absolute inset-0 w-full h-full', isPortraitVideo ? 'object-cover' : 'object-contain'].join(' ')}
              />
            ) : (
            <div className="text-white text-center p-8">
              <p className="text-xl mb-2">{current.author.username}</p>
              <p className="text-gray-300">{current.caption}</p>
            </div>
          )}
        </div>

        {/* Video Controls Overlay */}
        {current.content_type === 'video' && (
          <>
            {/* Progress Bar */}
            <div className="absolute top-16 left-0 right-0 h-1 bg-white/30 z-20">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>

            {/* Play/Pause Overlay */}
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              {!isPlaying && (
                <div className="bg-black/50 rounded-full p-4">
                  <Play className="w-12 h-12 text-white" fill="white" />
                </div>
              )}
            </button>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              className="absolute top-20 right-4 z-20 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              {muted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </>
        )}

        {/* Caption */}
        {current.caption && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-4">
            <p className="text-white text-sm bg-black/50 rounded-lg p-3">
              {current.caption}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center justify-around">
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 hover:bg-white/10 rounded-full transition-colors">
                <Heart
                  className={`w-7 h-7 transition-colors ${
                    current.is_liked
                      ? 'fill-red-500 text-red-500'
                      : 'text-white group-hover:text-red-500'
                  }`}
                />
              </div>
              <span className="text-white text-xs font-medium">
                {current.likes_count}
              </span>
            </button>

            <button
              onClick={handleComment}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 hover:bg-white/10 rounded-full transition-colors">
                <MessageCircle className="w-7 h-7 text-white group-hover:text-purple-400 transition-colors" />
              </div>
              <span className="text-white text-xs font-medium">
                {current.comments_count}
              </span>
            </button>

            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 hover:bg-white/10 rounded-full transition-colors">
                <Share2 className="w-7 h-7 text-white group-hover:text-green-400 transition-colors" />
              </div>
              <span className="text-white text-xs font-medium">Share</span>
            </button>
          </div>
        </div>

        {/* Navigation Indicators */}
        <div className="absolute left-1/2 bottom-4 transform -translate-x-1/2 z-10 flex gap-1">
          {fasts.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-1 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          fast={current}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Options Menu */}
      {showOptionsMenu && (
        <FastOptionsMenu
          fast={current}
          onClose={() => setShowOptionsMenu(false)}
          onDelete={handleDelete}
        />
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <CommentModal
          fast={current}
          onClose={() => setShowCommentModal(false)}
        />
      )}
    </div>
  );
}
