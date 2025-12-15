import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StoriesBar = ({ stories = [] }) => {
  const navigate = useNavigate();
  const [hoveredStory, setHoveredStory] = useState(null);
  const items = Array.isArray(stories) ? stories : [];
  
  // Story border'ı - story sayısına göre segmentlere böl
  const getStoryBorder = (storyCount) => {
    if (storyCount === 1) {
      return 'border-2 border-primary-blue';
    }
    
    // Çoklu story için gradient border
    const segments = Math.min(storyCount, 8); // Max 8 segment
    const colors = Array(segments).fill('#009fd6').join(', ');
    
    return `border-[3px] border-transparent bg-gradient-to-r from-primary-blue via-blue-400 to-primary-blue bg-clip-padding`;
  };
  
  return (
    <div className="mb-4 relative">
      {/* Stories Container - Scroll alanı */}
      <div className="overflow-x-auto scrollbar-hide pr-[60px]">
        <div className="flex items-center gap-2 py-2">
          {/* Story Items */}
          {items.map((story) => (
            <button
              key={story.user_id}
              onClick={() => navigate(`/polifest/${story.username || story.user_id}`)}
              onMouseEnter={() => setHoveredStory(story.user_id)}
              onMouseLeave={() => setHoveredStory(null)}
              className="flex-shrink-0 group relative"
              title={story.full_name}
            >
              {/* Gradient border container */}
              <div className={`w-[50px] h-[50px] rounded-full p-[2px] ${
                story.story_count > 1 
                  ? 'bg-gradient-to-tr from-primary-blue via-blue-400 to-primary-blue' 
                  : 'bg-primary-blue'
              }`}>
                {/* Inner circle - profile image */}
                <div className="w-full h-full rounded-full bg-white p-[1.5px]">
                  <img 
                    src={story.profile_image || story.avatar_url} 
                    alt={story.full_name}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>
              
              {/* Story count badge */}
              {story.story_count > 1 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-blue text-white text-[8px] font-bold rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm">
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
        onClick={() => navigate('/polifest')}
        className="absolute right-0 top-2 group z-10"
        style={{
          background: 'linear-gradient(to right, transparent, #F9FAFB 20%, #F9FAFB)',
          paddingLeft: '20px'
        }}
        title="Tüm hikayeleri gör"
      >
        <div className="relative">
          <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center hover:from-gray-300 hover:to-gray-400 transition-all shadow-lg border-2 border-gray-50">
            <Plus className="w-6 h-6 text-gray-600 group-hover:text-gray-700" />
          </div>
        </div>
      </button>
    </div>
  );
};
