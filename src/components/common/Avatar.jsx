import { Check } from 'lucide-react';
import { clsx } from 'clsx';

// Default avatar
const DEFAULT_AVATAR = '/favicon.ico';

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
    // Eğer geçerli URL varsa kullan
    if (url && (url.startsWith('/') || url.startsWith('http'))) {
      // Supabase Storage gibi URL'lerde Türkçe karakter/boşluk sorunlarını önlemek için encode et
      if (url.startsWith('http') && !url.includes('%')) {
        return encodeURI(url);
      }
      return url;
    }
    // Yoksa default logo
    return DEFAULT_AVATAR;
  };

  return (
    <div 
      className={clsx('relative inline-block', onClick && 'cursor-pointer', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <img
        src={getAvatarUrl(src)}
        alt={alt}
        className="w-full h-full rounded-full object-cover border-2 border-gray-200 bg-white"
        crossOrigin="anonymous"
        onError={(e) => {
          // Hata durumunda default logo göster
          try {
            // Avoid infinite loop
            if (e.currentTarget?.src && e.currentTarget.src.endsWith(DEFAULT_AVATAR)) return;
            e.currentTarget.src = DEFAULT_AVATAR;
          } catch {
            // ignore
          }
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
          className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 flex items-center justify-center"
          style={{ width: `${badgeSize}px`, height: `${badgeSize}px` }}
        >
          <Check className="text-blue-700" style={{ width: `${badgeSize * 0.6}px`, height: `${badgeSize * 0.6}px` }} />
        </div>
      )}
    </div>
  );
};
