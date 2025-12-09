import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { getPlaceholderImage } from '../../utils/imagePaths';

export const Avatar = ({ 
  src, 
  alt = '', 
  size = '40px', 
  verified = false,
  partyLogo = null,
  onClick,
  className = ''
}) => {
  const sizeNum = parseInt(size);
  const badgeSize = sizeNum * 0.3;
  const partyLogoSize = sizeNum * 0.35;
  
  const getAvatarUrl = (url) => {
    // Eğer URL varsa kullan
    if (url) {
      // Absolute veya relative path
      if (url.startsWith('/') || url.startsWith('http')) {
        return url;
      }
    }
    // Placeholder kullan
    const userId = url?.match(/\d+/)?.[0] || Math.floor(Math.random() * 70) + 1;
    return getPlaceholderImage('avatar', userId);
  };

  return (
    <div 
      className={clsx('relative inline-block', onClick && 'cursor-pointer', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <img
        src={getAvatarUrl(src) || getPlaceholderImage('avatar', 1)}
        alt={alt}
        className="w-full h-full rounded-full object-cover border-2 border-gray-200"
        onError={(e) => {
          e.target.src = getPlaceholderImage('avatar', 1);
        }}
      />
      {/* Parti Logosu - Sol alt köşe */}
      {partyLogo && (
        <div 
          className="absolute -bottom-1 -left-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-200"
          style={{ width: `${partyLogoSize}px`, height: `${partyLogoSize}px` }}
        >
          <img
            src={partyLogo}
            alt="Parti"
            className="w-full h-full rounded-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      {/* Doğrulama Rozeti - Sağ alt köşe */}
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
