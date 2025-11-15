import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PostCard } from '../post/PostCard';
import { mockPosts } from '../../mock/posts';

export const MediaSidebar = ({ posts = [] }) => {
  const scrollRef = useRef(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);
  const mediaPosts = posts.filter(p => p.user?.user_type === 'media').slice(0, 10);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setCanScrollUp(scrollTop > 0);
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
      }
    };

    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      return () => scrollElement.removeEventListener('scroll', checkScroll);
    }
  }, [mediaPosts]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      top: direction === 'up' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative">
      {canScrollUp && (
        <button
          onClick={() => scroll('up')}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors mb-2"
          aria-label="Yukarı"
        >
          <ChevronUp className="w-5 h-5 text-gray-700" />
        </button>
      )}
      
      <div
        ref={scrollRef}
        className="space-y-4 overflow-y-auto max-h-[800px] scrollbar-hide pr-2"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {mediaPosts.map(post => (
          <PostCard 
            key={post.post_id} 
            post={post}
          />
        ))}
      </div>

      {canScrollDown && (
        <button
          onClick={() => scroll('down')}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors mt-2"
          aria-label="Aşağı"
        >
          <ChevronDown className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  );
};
