import { Check } from 'lucide-react';
import { clsx } from 'clsx';

export const Avatar = ({ 
  src, 
  alt = '', 
  size = '40px', 
  verified = false,
  onClick,
  className = ''
}) => {
  const sizeNum = parseInt(size);
  const badgeSize = sizeNum * 0.3;
  
  return (
    <div 
      className={clsx('relative inline-block', onClick && 'cursor-pointer', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <img
        src={src || '/assets/default-avatar.png'}
        alt={alt}
        className="w-full h-full rounded-full object-cover border-2 border-gray-200"
        onError={(e) => {
          e.target.src = '/assets/default-avatar.png';
        }}
      />
      {verified && (
        <div 
          className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 flex items-center justify-center"
          style={{ width: `${badgeSize}px`, height: `${badgeSize}px` }}
        >
          <Check className="text-white" style={{ width: `${badgeSize * 0.6}px`, height: `${badgeSize * 0.6}px` }} />
        </div>
      )}
    </div>
  );
};
