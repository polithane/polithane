import { useState, useEffect } from 'react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { formatNumber } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

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
  
  return (
    <div 
      className="relative h-[120px] rounded-xl overflow-hidden cursor-pointer mb-4"
      onClick={() => navigate(`/post/${currentPost.post_id}`)}
    >
      <img 
        src={currentPost.media_url || currentPost.thumbnail_url || `https://picsum.photos/1200/300?random=${currentPost.post_id}`}
        alt=""
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.src = `https://picsum.photos/1200/300?random=${currentPost.post_id}`;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={currentPost.user?.profile_image || `https://i.pravatar.cc/150?img=${currentPost.user_id || 1}`} size="32px" />
            <div>
              <div className="font-semibold text-sm">{currentPost.user?.full_name}</div>
              <Badge variant="primary" size="small" className="mt-1">
                #{currentPost.agenda_tag}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatNumber(currentPost.polit_score)}</div>
            <div className="text-xs text-gray-300">Polit Puan</div>
          </div>
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
