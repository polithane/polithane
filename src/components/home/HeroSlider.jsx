import { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Music, PenTool } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { formatPolitScore } from '../../utils/formatters';
import { getUserTitle } from '../../utils/titleHelpers';
import { useNavigate, Link } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';

export const HeroSlider = ({ posts = [], autoplay = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  
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
    const iconClass = "w-4 h-4 md:w-5 md:h-5 text-white/90";
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
  const sliderIsLight = isLightColor(bgColor);
  const ctaBgClass = sliderIsLight ? 'bg-gray-900 hover:bg-black' : 'bg-white hover:bg-gray-50';
  const ctaBorderClass = sliderIsLight ? 'border border-white/10' : 'border border-black/10';
  
  return (
    <div className="mb-4">
      {/* Mobile: big CTA above slider */}
      <div className="md:hidden mb-2">
        <button
          type="button"
          onClick={() => navigate('/polit-at')}
          className={`w-full h-[100px] rounded-2xl ${ctaBgClass} ${ctaBorderClass} font-black tracking-wide shadow-xl transition-colors flex items-center justify-center gap-3`}
          style={{ color: bgColor }}
          title="Polit At"
        >
          <PenTool className="w-7 h-7 text-current" />
          <span className="text-2xl leading-none">Polit At</span>
        </button>
      </div>

      <div 
        className="relative h-[100px] md:h-[120px] rounded-xl overflow-hidden cursor-pointer shadow-lg"
        style={{ backgroundColor: bgColor }}
        onClick={() => {
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
            verified={currentPost.user?.verification_badge}
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
        
        {/* Desktop: huge CTA on the far right */}
        <div className="hidden md:flex flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/polit-at');
            }}
            className={`h-full px-10 rounded-2xl ${ctaBgClass} ${ctaBorderClass} font-black tracking-wide shadow-2xl transition-colors flex items-center gap-4`}
            style={{ color: bgColor }}
            title="Polit At"
          >
            <PenTool className="w-9 h-9 text-current" />
            <span className="text-3xl leading-none">Polit At</span>
          </button>
        </div>
      </div>
      
      {/* Slider Dots */}
      {posts.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {posts.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
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
