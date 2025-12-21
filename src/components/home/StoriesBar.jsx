import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { normalizeAvatarUrl } from '../../utils/avatarUrl';

export const StoriesBar = ({ stories = [], mode = 'polifest' }) => {
  const navigate = useNavigate();
  const [hoveredStory, setHoveredStory] = useState(null);
  const items = Array.isArray(stories) ? stories : [];

  const cfg = useMemo(() => {
    const isFast = String(mode || 'polifest') === 'fast';
    return {
      isFast,
      itemPath: (story) => `/${isFast ? 'fast' : 'polifest'}/${story.username || story.user_id}`,
      rightActionPath: isFast ? '/fast-at' : '/polifest',
      rightActionTitle: isFast ? 'Fast At' : 'Tüm hikayeleri gör',
      ringClass: isFast
        ? 'border-2 border-dashed border-primary-blue'
        : null,
      bgClass: isFast
        ? 'bg-white'
        : null,
    };
  }, [mode]);
  
  return (
    <div className="mb-4 relative z-30">
      {/* Stories Container - Scroll alanı */}
      <div className="overflow-x-auto scrollbar-hide pr-[60px]">
        <div className="flex items-center gap-2 py-2">
          {/* Story Items */}
          {items.map((story) => (
            <button
              key={story.user_id}
              onClick={() => navigate(cfg.itemPath(story))}
              onMouseEnter={() => setHoveredStory(story.user_id)}
              onMouseLeave={() => setHoveredStory(null)}
              className="flex-shrink-0 group relative"
              title={story.full_name}
            >
              {/* Ring container */}
              <div
                className={[
                  'w-[50px] h-[50px] rounded-full p-[2px]',
                  cfg.isFast
                    ? cfg.ringClass
                    : story.story_count > 1
                      ? 'bg-gradient-to-tr from-primary-blue via-blue-400 to-primary-blue'
                      : 'bg-primary-blue',
                ].join(' ')}
              >
                {/* Inner circle - profile image */}
                <div className={['w-full h-full rounded-full p-[1.5px]', cfg.isFast ? 'bg-white' : 'bg-white'].join(' ')}>
                  <img 
                    src={normalizeAvatarUrl(story.profile_image || story.avatar_url)} 
                    alt={story.full_name}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>
              
              {/* Story count badge */}
              {story.story_count > 1 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-blue text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {story.story_count}
                </div>
              )}
              
              {/* Hover effect */}
              {hoveredStory === story.user_id && (
                <div className="absolute inset-0 rounded-full bg-primary-blue bg-opacity-10 animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tümü Butonu - SABİT SAĞDA (absolute) */}
      <button
        onClick={() => navigate(cfg.rightActionPath)}
        className="absolute right-0 top-2 group z-10"
        style={{
          background: 'linear-gradient(to right, transparent, #F9FAFB 20%, #F9FAFB)',
          paddingLeft: '20px'
        }}
        title={cfg.rightActionTitle}
      >
        <div className="relative">
          <div
            className={[
              'w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-gray-50',
              cfg.isFast
                ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                : 'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400',
            ].join(' ')}
          >
            <Plus className={['w-6 h-6', cfg.isFast ? 'text-white' : 'text-gray-600 group-hover:text-gray-700'].join(' ')} />
          </div>
        </div>
      </button>
    </div>
  );
};
