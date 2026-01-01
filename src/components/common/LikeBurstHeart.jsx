import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

// Instagram-like "burst" heart animation when a like happens.
// Usage: render inside a `relative` button/container and increment `trigger` when you want the burst.
export const LikeBurstHeart = ({ trigger = 0, sizeClass = 'w-8 h-8' }) => {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setBursts((prev) => [...(prev || []), id]);
    const t = setTimeout(() => {
      setBursts((prev) => (prev || []).filter((x) => x !== id));
    }, 700);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!bursts.length) return null;

  return (
    <>
      {bursts.map((id) => (
        <span key={id} className="like-burst-wrap" aria-hidden="true">
          <Heart className={['like-burst-heart', sizeClass].join(' ')} fill="currentColor" />
        </span>
      ))}
    </>
  );
};

