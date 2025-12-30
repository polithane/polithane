import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Video, Music, PenTool } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { formatPolitScore } from '../../utils/formatters';
import { getUserTitle, isUiVerifiedUser } from '../../utils/titleHelpers';
import { useNavigate, Link } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';

export const HeroSlider = ({ posts = [], autoplay = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const gestureRef = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const suppressClickRef = useRef(false);
  
  useEffect(() => {
    if (!autoplay || posts.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [autoplay, interval, posts.length]);
  
  if (!posts || posts.length === 0) return null;
  
  const currentPost = posts[currentIndex];
  const currentPostId = currentPost?.post_id ?? currentPost?.id;

  const go = (dir) => {
    const len = Array.isArray(posts) ? posts.length : 0;
    if (len <= 1) return;
    setCurrentIndex((prev) => {
      const next = (Number(prev) || 0) + dir;
      if (next < 0) return len - 1;
      if (next >= len) return 0;
      return next;
    });
  };
  
  const parseHexColor = (value) => {
    const s = String(value || '').trim();
    const m = s.match(/^#([0-9a-fA-F]{6})$/);
    if (!m) return null;
    const hex = m[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  };

  // Basit algı: arka plan açık mı?
  const isLightColor = (value) => {
    const rgb = parseHexColor(value);
    if (!rgb) return false;
    // relative luminance (approx)
    const l = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return l > 0.62;
  };

  // Background rengi belirleme
  const getBackgroundColor = () => {
    if (currentPost.user?.party_id && currentPost.user?.party?.party_color) {
      return currentPost.user.party.party_color;
    }
    
    // Kullanıcı tipine göre renk
    switch (currentPost.user?.user_type) {
      case 'normal': return '#6B7280'; // Gri - Vatandaş
      case 'ex_politician': return '#D97706'; // Amber - Deneyim
      case 'media': return '#7C3AED'; // Mor - Medya
      default: return '#009FD6'; // Mavi - Default
    }
  };
  
  // İçerik tipi ikonu
  const getContentIcon = () => {
    // Mobile-first: keep icons readable (avoid "dot-sized" icons)
    const iconClass = "w-6 h-6 md:w-5 md:h-5 text-white/90";
    switch (currentPost.content_type) {
      case CONTENT_TYPES.VIDEO:
        return <Video className={iconClass} />;
      case CONTENT_TYPES.IMAGE:
        return <ImageIcon className={iconClass} />;
      case CONTENT_TYPES.AUDIO:
        return <Music className={iconClass} />;
      default:
        return <PenTool className={iconClass} />;
    }
  };
  
  const bgColor = getBackgroundColor();
  // CTA moved to global ActionBar (keep slider clean)
  
  return (
    <div className="mb-4">
      <div 
        className="relative h-[100px] md:h-[120px] rounded-xl overflow-hidden cursor-pointer shadow-lg"
        style={{ backgroundColor: bgColor, touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          if (!posts || posts.length <= 1) return;
          suppressClickRef.current = false;
          gestureRef.current.active = true;
          gestureRef.current.startX = e.clientX;
          gestureRef.current.startY = e.clientY;
          gestureRef.current.lastX = e.clientX;
          gestureRef.current.lastY = e.clientY;
          try {
            e.currentTarget?.setPointerCapture?.(e.pointerId);
          } catch {
            // ignore
          }
        }}
        onPointerMove={(e) => {
          const g = gestureRef.current;
          if (!g.active) return;
          g.lastX = e.clientX;
          g.lastY = e.clientY;
        }}
        onPointerUp={() => {
          const g = gestureRef.current;
          if (!g.active) return;
          g.active = false;
          const dx = (g.lastX || 0) - (g.startX || 0);
          const dy = (g.lastY || 0) - (g.startY || 0);
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          if (absX > 45 && absX > absY * 1.2) {
            suppressClickRef.current = true;
            if (dx < 0) go(1);
            else go(-1);
            // release suppress after this frame so click doesn't fire
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
          }
        }}
        onPointerCancel={() => {
          gestureRef.current.active = false;
        }}
        onClick={() => {
          if (suppressClickRef.current) return;
          if (!currentPostId) return;
          navigate(`/post/${currentPostId}`);
        }}
      >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
      
      <div className="relative h-full flex items-center justify-between px-4 md:px-6 gap-3">
        {/* Sol: Profil Resmi + Gündem Başlığı */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar 
            src={currentPost.user?.avatar_url || currentPost.user?.profile_image} 
            size="48px" 
            verified={isUiVerifiedUser(currentPost.user)}
            className="border-2 border-white/30 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-xl lg:text-2xl font-bold mb-0.5 line-clamp-2 drop-shadow-lg text-white">
              {currentPost.agenda_tag || 'Gündem'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs md:text-sm text-white/90 font-semibold truncate">
                {currentPost.user?.full_name}
              </p>
              {getUserTitle(currentPost.user) && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/80">
                    {getUserTitle(currentPost.user)}
                  </span>
                  {currentPost.user?.city_code && ['mp', 'provincial_chair', 'district_chair', 'metropolitan_mayor', 'district_mayor'].includes(currentPost.user?.politician_type) && (
                    <Link
                      to={`/city/${currentPost.user.city_code}`}
                      className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white/90 hover:bg-white text-gray-900 text-[10px] font-bold rounded-full transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {currentPost.user.city_code}
                    </Link>
                  )}
                </div>
              )}
              <span className="text-xs text-white/70">•</span>
              <span className="text-xs text-white/90 font-medium">
                {formatPolitScore(currentPost.polit_score)}
              </span>
              <span className="text-xs text-white/70">•</span>
              {getContentIcon()}
            </div>
          </div>
        </div>
        
        {/* Polit At CTA moved to the global ActionBar */}
      </div>
      
      {/* Slider Dots */}
      {posts.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {posts.map((_, index) => (
            <button
              key={index}
              className={`h-3 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-8' : 'bg-white/50 w-3'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
