import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Video, Music } from 'lucide-react';
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
    const iconClass = "w-16 h-16 md:w-20 md:h-20 text-white/90";
    switch (currentPost.content_type) {
      case CONTENT_TYPES.VIDEO:
        return <Video className={iconClass} />;
      case CONTENT_TYPES.IMAGE:
        return <ImageIcon className={iconClass} />;
      case CONTENT_TYPES.AUDIO:
        return <Music className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };
  
  const bgColor = getBackgroundColor();
  
  return (
    <div 
      className="relative h-[100px] md:h-[120px] rounded-xl overflow-hidden cursor-pointer mb-4 shadow-lg"
      style={{ backgroundColor: bgColor }}
      onClick={() => navigate(`/post/${currentPost.post_id}`)}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
      
      <div className="relative h-full flex items-center justify-between px-4 md:px-6">
        {/* Sol: Profil Resmi + Gündem Başlığı */}
        <div className="flex items-center gap-3 flex-1 pr-4">
          <Avatar 
            src={currentPost.user?.profile_image} 
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
            </div>
          </div>
        </div>
        
        {/* Sağ: İçerik Tipi İkonu */}
        <div className="flex-shrink-0">
          {getContentIcon()}
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
  );
};
