import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StoriesBar = ({ stories = [] }) => {
  const navigate = useNavigate();
  const [hoveredStory, setHoveredStory] = useState(null);
  
  // Mock stories data - gerçek data gelene kadar
  const mockStories = stories.length > 0 ? stories : [
    { user_id: 1, full_name: 'Kemal Kılıçdaroğlu', profile_image: 'https://i.pravatar.cc/150?img=1', story_count: 3 },
    { user_id: 2, full_name: 'Devlet Bahçeli', profile_image: 'https://i.pravatar.cc/150?img=2', story_count: 1 },
    { user_id: 3, full_name: 'Meral Akşener', profile_image: 'https://i.pravatar.cc/150?img=3', story_count: 2 },
    { user_id: 4, full_name: 'Ahmet Davutoğlu', profile_image: 'https://i.pravatar.cc/150?img=4', story_count: 4 },
    { user_id: 5, full_name: 'Ekrem İmamoğlu', profile_image: 'https://i.pravatar.cc/150?img=5', story_count: 2 },
    { user_id: 6, full_name: 'Mansur Yavaş', profile_image: 'https://i.pravatar.cc/150?img=6', story_count: 1 },
    { user_id: 7, full_name: 'Tunç Soyer', profile_image: 'https://i.pravatar.cc/150?img=7', story_count: 3 },
    { user_id: 8, full_name: 'Fatih Erbakan', profile_image: 'https://i.pravatar.cc/150?img=8', story_count: 2 },
    { user_id: 9, full_name: 'Ali Babacan', profile_image: 'https://i.pravatar.cc/150?img=9', story_count: 1 },
    { user_id: 10, full_name: 'Temel Karamollaoğlu', profile_image: 'https://i.pravatar.cc/150?img=10', story_count: 3 },
    { user_id: 11, full_name: 'Canan Kaftancıoğlu', profile_image: 'https://i.pravatar.cc/150?img=11', story_count: 2 },
    { user_id: 12, full_name: 'Özgür Özel', profile_image: 'https://i.pravatar.cc/150?img=12', story_count: 1 },
    { user_id: 13, full_name: 'Murat Kurum', profile_image: 'https://i.pravatar.cc/150?img=13', story_count: 4 },
    { user_id: 14, full_name: 'Süleyman Soylu', profile_image: 'https://i.pravatar.cc/150?img=14', story_count: 2 },
    { user_id: 15, full_name: 'İsmail Saymaz', profile_image: 'https://i.pravatar.cc/150?img=15', story_count: 3 },
    { user_id: 16, full_name: 'Müşerref Akay', profile_image: 'https://i.pravatar.cc/150?img=16', story_count: 1 },
    { user_id: 17, full_name: 'Nagehan Alçı', profile_image: 'https://i.pravatar.cc/150?img=17', story_count: 2 },
    { user_id: 18, full_name: 'Erkan Tan', profile_image: 'https://i.pravatar.cc/150?img=18', story_count: 1 },
    { user_id: 19, full_name: 'Ümit Özdağ', profile_image: 'https://i.pravatar.cc/150?img=19', story_count: 3 },
    { user_id: 20, full_name: 'Tuncay Özkan', profile_image: 'https://i.pravatar.cc/150?img=20', story_count: 2 },
    { user_id: 21, full_name: 'Selçuk Özdağ', profile_image: 'https://i.pravatar.cc/150?img=21', story_count: 1 },
    { user_id: 22, full_name: 'Cem Küçük', profile_image: 'https://i.pravatar.cc/150?img=22', story_count: 4 },
    { user_id: 23, full_name: 'Fatih Portakal', profile_image: 'https://i.pravatar.cc/150?img=23', story_count: 2 },
    { user_id: 24, full_name: 'Ahmet Hakan', profile_image: 'https://i.pravatar.cc/150?img=24', story_count: 3 },
    { user_id: 25, full_name: 'Sevilay Yılman', profile_image: 'https://i.pravatar.cc/150?img=25', story_count: 1 },
  ];
  
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
    <div className="mb-4">
      {/* Desktop & Mobile - Tüm genişliğe yayılan container */}
      <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
        {/* Story Items */}
        {mockStories.map((story) => (
          <button
            key={story.user_id}
            onClick={() => navigate(`/stories/${story.user_id}`)}
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
                  src={story.profile_image} 
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
        
        {/* Tümü Butonu - SONDA */}
        <button
          onClick={() => navigate('/stories')}
          className="flex-shrink-0 group ml-auto"
          title="Tüm hikayeleri gör"
        >
          <div className="relative">
            <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center hover:from-gray-300 hover:to-gray-400 transition-all">
              <Plus className="w-6 h-6 text-gray-600 group-hover:text-gray-700" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
