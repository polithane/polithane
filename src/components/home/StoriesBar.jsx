import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { normalizeAvatarUrl } from '../../utils/avatarUrl';
import { getUserHandle } from '../../utils/userHandle';

export const StoriesBar = ({ stories = [], mode = 'polifest' }) => {
  const navigate = useNavigate();
  const [hoveredStory, setHoveredStory] = useState(null);
  const items = Array.isArray(stories) ? stories : [];

  const cfg = useMemo(() => {
    const isFast = String(mode || 'polifest') === 'fast';
    return {
      isFast,
      itemPath: (story) => `/${isFast ? 'fast' : 'polifest'}/${encodeURIComponent(String(story?.user_id || getUserHandle(story) || '').trim())}`,
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

  const openFast = (story, index) => {
    const keyOf = (s) => String(s?.user_id || s?.id || getUserHandle(s) || '').trim();
    const queue = (items || [])
      .map((s) => ({
        key: keyOf(s),
        user_id: s?.user_id,
        username: getUserHandle(s),
        full_name: s?.full_name,
        avatar_url: s?.avatar_url || s?.profile_image,
        profile_image: s?.profile_image || s?.avatar_url,
        story_count: s?.story_count,
        latest_created_at: s?.latest_created_at,
      }))
      .filter((x) => x.key);
    const startKey = keyOf(story);
    const startIndex = Math.max(0, queue.findIndex((x) => x.key === startKey));
    // Persist so refresh/back can continue the same playlist.
    try {
      sessionStorage.setItem(
        'fast_queue_v1',
        JSON.stringify({
          ts: Date.now(),
          queue,
          startKey,
          startIndex,
        })
      );
    } catch {
      // ignore
    }
    navigate(cfg.itemPath(story), {
      state: {
        fastQueue: queue,
        fastStartKey: startKey,
        fastStartIndex: startIndex >= 0 ? startIndex : index || 0,
      },
    });
  };
  
  return (
    <div className="mb-4 relative z-30">
      {/* Stories Container - Scroll alanı */}
      <div className="overflow-x-auto scrollbar-hide pr-[60px]">
        <div className="flex items-center gap-2 py-2">
          {/* Story Items */}
          {items.map((story, idx) => (
            <button
              key={story.user_id}
              onClick={() => (cfg.isFast ? openFast(story, idx) : navigate(cfg.itemPath(story)))}
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
      {!cfg.isFast ? (
        <button
          onClick={() => navigate(cfg.rightActionPath)}
          className="absolute right-0 top-2 group z-10"
          style={{
            background: 'linear-gradient(to right, transparent, #F9FAFB 20%, #F9FAFB)',
            paddingLeft: '20px',
          }}
          title={cfg.rightActionTitle}
        >
          <div className="relative">
            <div
              className={[
                'w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-gray-50',
                'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400',
              ].join(' ')}
            >
              <Plus className="w-6 h-6 text-gray-600 group-hover:text-gray-700" />
            </div>
          </div>
        </button>
      ) : null}
    </div>
  );
};
