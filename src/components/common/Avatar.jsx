import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { normalizeAvatarUrl } from '../../utils/avatarUrl';

// Default avatar
const DEFAULT_AVATAR = '/uyeresmi.svg';

export const Avatar = ({ 
  src, 
  alt = '', 
  size = '40px', 
  verified = false,
  partyLogo = null,
  ring = null,
  onClick,
  className = ''
}) => {
  const sizeNum = parseInt(size);
  const badgeSize = sizeNum * 0.3;
  const partyLogoSize = sizeNum * 0.35;
  
  const candidates = useMemo(() => {
    const raw = String(src || '').trim();
    const out = [];

    const push = (u) => {
      const s = String(u || '').trim();
      if (!s) return;
      out.push(s);
    };

    if (raw) {
      // If valid URL/path, normalize (proxy Supabase avatars + safe encoding)
      if (raw.startsWith('/') || raw.startsWith('http')) {
        push(normalizeAvatarUrl(raw));
      } else {
        // Some DB rows store only Storage paths (no full URL). Try best-effort public URL candidates.
        const supabaseUrl = String(import.meta.env?.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
        if (supabaseUrl) {
          // 1) Treat "raw" as "bucket/objectPath"
          push(normalizeAvatarUrl(`${supabaseUrl}/storage/v1/object/public/${raw}`));
          // 2) Treat "raw" as objectPath under uploads bucket
          push(normalizeAvatarUrl(`${supabaseUrl}/storage/v1/object/public/uploads/${raw}`));
          // 3) If it already starts with "avatars/", also try avatars bucket without the prefix
          if (raw.startsWith('avatars/')) {
            push(normalizeAvatarUrl(`${supabaseUrl}/storage/v1/object/public/avatars/${raw.slice('avatars/'.length)}`));
          }
        }
      }
    }

    push(DEFAULT_AVATAR);
    return Array.from(new Set(out));
  }, [src]);

  const [tryIndex, setTryIndex] = useState(0);
  useEffect(() => {
    setTryIndex(0);
  }, [src]);

  return (
    <div 
      className={clsx('relative inline-block', onClick && 'cursor-pointer', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {ring === 'fast' ? (
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary-blue pointer-events-none" />
      ) : null}
      <img
        src={candidates[Math.min(tryIndex, Math.max(0, candidates.length - 1))] || DEFAULT_AVATAR}
        alt={alt}
        className={clsx(
          'w-full h-full rounded-full object-cover bg-white',
          ring === 'fast' ? 'border-0' : 'border-2 border-gray-200'
        )}
        crossOrigin="anonymous"
        onError={(e) => {
          // Try next candidate URL first; fallback to default.
          setTryIndex((prev) => {
            const next = Number(prev || 0) + 1;
            if (next < (candidates?.length || 0)) return next;
            try {
              // Avoid infinite loop
              if (e.currentTarget?.src && String(e.currentTarget.src).endsWith(DEFAULT_AVATAR)) return prev;
              e.currentTarget.src = DEFAULT_AVATAR;
            } catch {
              // ignore
            }
            return prev;
          });
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
