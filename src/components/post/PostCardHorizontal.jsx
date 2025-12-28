import { useMemo, useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { PolitScoreDetailModal } from '../common/PolitScoreDetailModal';
import { Tooltip } from '../common/Tooltip';
import { Modal } from '../common/Modal';
import { formatNumber, formatPolitScore, formatTimeAgo, truncate, formatDuration, getSourceDomain } from '../../utils/formatters';
import { getUserTitle, isUiVerifiedUser } from '../../utils/titleHelpers';
import { useNavigate, Link } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';
import { getProfilePath } from '../../utils/paths';
import { CITY_CODES } from '../../utils/constants';
import { posts as postsApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const normalizeCityName = (name) =>
  String(name || '')
    .trim()
    .toLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, ' ');

const CITY_NAME_TO_CODE = (() => {
  const m = new Map();
  Object.entries(CITY_CODES).forEach(([code, cityName]) => {
    m.set(normalizeCityName(cityName), code);
  });
  return m;
})();

const getPlateCodeFromProvince = (provinceName) => {
  const key = normalizeCityName(provinceName);
  return CITY_NAME_TO_CODE.get(key) || null;
};

export const PostCardHorizontal = ({ post, showCity = false, showPartyLogo = false, fullWidth = false, style }) => {
  const navigate = useNavigate();
  const [showScoreModal, setShowScoreModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const postId = post?.post_id ?? post?.id;

  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareTextCopied, setShareTextCopied] = useState(false);
  const [likeCount, setLikeCount] = useState(Number(post?.like_count || 0));
  const [isLiked, setIsLiked] = useState(Boolean(post?.is_liked));

  const postUrl = useMemo(() => {
    try {
      // Use server-rendered OG preview for social sharing (bots read meta tags).
      return `${window.location.origin}/api/og/post?id=${encodeURIComponent(postId)}`;
    } catch {
      return `/api/og/post?id=${encodeURIComponent(postId)}`;
    }
  }, [postId]);
  
  const shareText = useMemo(() => {
    const author = String(post?.user?.full_name || '').trim();
    const agenda = String(post?.agenda_tag || '').trim();
    const score = formatPolitScore(post?.polit_score || 0);
    const content = String(post?.content_text || post?.content || '').trim();
    const excerpt = content ? truncate(content, 160) : 'Bir polit paylaşıldı.';
    const lines = [
      author ? `${author}` : null,
      agenda ? `Gündem: ${agenda}` : null,
      `Polit Puan: ${score}`,
      '',
      excerpt,
      '',
      `Polithane'de gör: ${postUrl}`,
    ].filter((x) => x !== null);
    return lines.join('\n');
  }, [post?.user?.full_name, post?.agenda_tag, post?.polit_score, post?.content_text, post?.content, postUrl]);

  const encodedShareText = useMemo(() => encodeURIComponent(shareText), [shareText]);

  const getContentIcon = () => {
    switch (post.content_type) {
      case CONTENT_TYPES.VIDEO:
        return <Video className="w-5 h-5 sm:w-4 sm:h-4" />;
      case CONTENT_TYPES.IMAGE:
        return <ImageIcon className="w-5 h-5 sm:w-4 sm:h-4" />;
      case CONTENT_TYPES.AUDIO:
        return <Music className="w-5 h-5 sm:w-4 sm:h-4" />;
      default:
        return <FileText className="w-5 h-5 sm:w-4 sm:h-4" />;
    }
  };

  const toSafeSrc = (value) => {
    const s = String(value || '').trim();
    if (!s) return '';
    // Demo/seed post görsellerini "örnek resim" olarak göstermeyelim
    if (s.startsWith('/assets/posts/') || s === '/assets/default/post_image.jpg' || s === '/assets/default/post.jpg') return '';
    // Supabase public URL / signed URL / CDN
    if (s.startsWith('https://') || s.startsWith('http://')) return s;
    // Local public assets (Vite /public)
    if (s.startsWith('/')) return s;
    return '';
  };

  const normalizeMediaList = (value) => {
    const raw = Array.isArray(value) ? value : value ? [value] : [];
    return raw.map(toSafeSrc).filter(Boolean);
  };

  const SafeImage = ({ src, className, fallbackIcon = null }) => {
    const [failed, setFailed] = useState(false);
    const safeSrc = toSafeSrc(src);
    if (!safeSrc || failed) {
      return (
        <div className={`w-full h-full bg-gray-100 flex items-center justify-center ${className || ''}`}>
          {fallbackIcon || <ImageIcon className="w-10 h-10 text-gray-400" />}
        </div>
      );
    }
    return <img src={safeSrc} alt="" className={className} onError={() => setFailed(true)} />;
  };

  const copyToClipboard = async (text) => {
    const t = String(text || '');
    if (!t) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch {
      // fallback below
    }
    try {
      const el = document.createElement('textarea');
      el.value = t;
      el.setAttribute('readonly', 'true');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  };

  const handleToggleLike = async (e) => {
    e?.stopPropagation?.();
    if (!postId) return;
    if (!isAuthenticated) {
      navigate('/login-new');
      return;
    }
    try {
      const r = await postsApi.like(postId);
      if (r?.success) {
        const nextLiked = r?.action === 'liked' ? true : r?.action === 'unliked' ? false : !isLiked;
        setIsLiked(nextLiked);
        setLikeCount((prev) => Math.max(0, Number(prev || 0) + (nextLiked ? 1 : -1)));
      }
    } catch {
      // ignore (best-effort)
    }
  };

  return (
    <div 
      className={`card-hover ${fullWidth ? 'p-3 w-full' : 'p-4'} flex-shrink-0 cursor-pointer flex flex-col min-h-[400px] relative`}
      style={fullWidth ? {} : { scrollSnapAlign: 'start', ...style }}
      onClick={() => {
        if (!postId) return;
        navigate(`/post/${postId}`);
      }}
    >
      {/* Parti Logosu - SAĞ ÜST KÖŞE - %40 Büyütülmüş */}
      {post.user?.party_id && post.user?.party?.party_logo && (
        <Tooltip content={`${post.user.party.party_short_name} detayını gör`} delay={300}>
          <div 
            className="absolute top-3 right-3 z-10 cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/party/${post.user.party_id}`);
            }}
          >
            <img 
              src={post.user.party.party_logo} 
              alt={post.user.party.party_short_name}
              className="w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] md:w-[28px] md:h-[28px] object-contain drop-shadow-md"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </Tooltip>
      )}
      
      {/* Üst Bilgi */}
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Avatar ve Plaka Kodu */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                navigate(getProfilePath(post.user));
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Avatar 
                src={post.user?.avatar_url || post.user?.profile_image} 
                size="32px" 
                verified={isUiVerifiedUser(post.user)}
              />
            </div>
            {/* Plaka Kodu - Avatar altında */}
            {(() => {
              const plateCode = post.user?.city_code || getPlateCodeFromProvince(post.user?.province);
              if (!plateCode) return null;
              return (
                <Tooltip content={`${plateCode} ili detayını gör`} delay={300}>
                <Link
                  to={`/city/${plateCode}`}
                  className="inline-flex items-center justify-center px-2 py-1 bg-gray-900 hover:bg-primary-blue text-white text-[11px] font-black rounded-full transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {plateCode}
                </Link>
              </Tooltip>
              );
            })()}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* İsim - Her zaman 2 satırlık alan (SABİT YÜKSEKLİK) */}
            <h3 
              className="font-semibold text-sm text-gray-900 cursor-pointer hover:text-primary-blue transition-colors line-clamp-2 leading-[18px] h-[36px] mb-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(getProfilePath(post.user));
              }}
            >
              {post.user?.full_name}
            </h3>
            
            {/* Ünvan - Tek satır */}
            <div className="flex items-center gap-1.5 mb-0.5">
              {getUserTitle(post.user, true) && (
                <span 
                  className="font-medium text-primary-blue cursor-pointer hover:underline text-[10px] whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (post.user?.user_type === 'politician' && post.user?.politician_type === 'mp') {
                      navigate('/category/mps');
                    } else if (post.user?.user_type === 'politician') {
                      navigate('/category/organization');
                    } else if (post.user?.user_type === 'ex_politician') {
                      navigate('/category/experience');
                    } else if (post.user?.user_type === 'media') {
                      navigate('/category/media');
                    } else {
                      navigate('/category/citizens');
                    }
                  }}
                >
                  {getUserTitle(post.user, true)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* İçerik - Standart 150px yükseklikte görsel */}
      <div className="mb-3">
        {/* Görsel/İkon Alanı - Her zaman 150px yükseklikte */}
        <div className="relative w-full rounded-lg overflow-hidden mb-2" style={{ height: '150px' }}>
          {post.content_type === CONTENT_TYPES.TEXT && (
            // Yazı içeriği - Defter zemin + 3D kalem + ince border
            <div className="w-full h-full bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 flex items-center justify-center relative border border-gray-300"
                 style={{
                   backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, #e5e7eb 24px, #e5e7eb 25px)',
                   boxShadow: 'inset 0 0 0 1px rgba(229, 231, 235, 0.5)'
                 }}>
              {/* 3D Kalem İkonu */}
              <div className="relative" style={{ filter: 'drop-shadow(4px 6px 8px rgba(0,0,0,0.3))' }}>
                <svg width="80" height="80" viewBox="0 0 100 100" className="transform rotate-[-20deg]">
                  {/* Kalem gövdesi */}
                  <rect x="30" y="10" width="12" height="70" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
                  <rect x="30" y="10" width="6" height="70" fill="#FDE68A" opacity="0.6"/>
                  {/* Kalem ucu */}
                  <polygon points="36,80 30,90 42,90" fill="#78716C" stroke="#57534E" strokeWidth="1"/>
                  <polygon points="36,80 30,90 36,90" fill="#A8A29E" opacity="0.5"/>
                  {/* Silgi */}
                  <rect x="30" y="5" width="12" height="8" fill="#EF4444" stroke="#DC2626" strokeWidth="1" rx="1"/>
                  <rect x="30" y="5" width="6" height="8" fill="#FCA5A5" opacity="0.5" rx="1"/>
                </svg>
              </div>
            </div>
          )}
          {post.content_type === CONTENT_TYPES.IMAGE && (() => {
            const images = normalizeMediaList(post.media_url);
            const imageCount = images.length;

            // Medya yoksa: örnek/placeholder göstermeyelim
            if (imageCount === 0) {
              return (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <div className="text-xs text-gray-600 font-semibold">Resim yok</div>
                  </div>
                </div>
              );
            }
            
            // 1 Resim - Tam alan
            if (imageCount === 1) {
              return (
                <SafeImage src={images[0]} className="w-full h-full object-cover" />
              );
            }
            
            // 2 Resim - İkiye böl
            if (imageCount === 2) {
              return (
                <div className="w-full h-full grid grid-cols-2 gap-0.5">
                  {images.slice(0, 2).map((img, idx) => (
                    <SafeImage key={idx} src={img} className="w-full h-full object-cover" />
                  ))}
                </div>
              );
            }
            
            // 3 Resim - Sol yarı 1 büyük, sağ yarı 2 küçük
            if (imageCount === 3) {
              return (
                <div className="w-full h-full grid grid-cols-2 gap-0.5">
                  <SafeImage src={images[0]} className="w-full h-full object-cover" />
                  <div className="grid grid-rows-2 gap-0.5">
                    {images.slice(1, 3).map((img, idx) => (
                      <SafeImage key={idx} src={img} className="w-full h-full object-cover" />
                    ))}
                  </div>
                </div>
              );
            }
            
            // 4 Resim - 2x2 grid
            if (imageCount === 4) {
              return (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
                  {images.slice(0, 4).map((img, idx) => (
                    <SafeImage key={idx} src={img} className="w-full h-full object-cover" />
                  ))}
                </div>
              );
            }
            
            // 5+ Resim - İlk 3 resim + "Tümü" butonu
            return (
              <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
                {images.slice(0, 3).map((img, idx) => (
                  <SafeImage key={idx} src={img} className="w-full h-full object-cover" />
                ))}
                {/* Tümü Butonu */}
                <div className="w-full h-full bg-black bg-opacity-60 flex items-center justify-center cursor-pointer hover:bg-opacity-70 transition-all">
                  <div className="text-center">
                    <div className="text-4xl text-white mb-1">+</div>
                    <div className="text-white text-xs font-semibold">Tümü</div>
                    <div className="text-white text-[10px]">({imageCount})</div>
                  </div>
                </div>
              </div>
            );
          })()}
          {post.content_type === CONTENT_TYPES.VIDEO && (
            <>
              <SafeImage
                src={toSafeSrc(post.thumbnail_url) || normalizeMediaList(post.media_url)[0] || ''}
                className="w-full h-full object-cover"
                fallbackIcon={<Video className="w-12 h-12 text-gray-400" />}
              />
              {/* 3D Play Butonu */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative" style={{ filter: 'drop-shadow(4px 6px 12px rgba(0,0,0,0.4))' }}>
                  <svg width="80" height="80" viewBox="0 0 100 100">
                    {/* Dış çember - shadow */}
                    <circle cx="50" cy="53" r="35" fill="rgba(0,0,0,0.2)"/>
                    {/* Ana çember - gradient */}
                    <defs>
                      <linearGradient id="playGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="100%" stopColor="#e5e7eb" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="35" fill="url(#playGradient)" stroke="#d1d5db" strokeWidth="2"/>
                    {/* İç gölge efekti */}
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5"/>
                    {/* Play üçgeni */}
                    <polygon points="42,35 42,65 68,50" fill="#009fd6" stroke="#0088bb" strokeWidth="1"/>
                    <polygon points="42,35 42,50 55,42.5" fill="#00b4f0" opacity="0.6"/>
                  </svg>
                </div>
              </div>
              {/* Süre */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {formatDuration(post.media_duration)}
              </div>
            </>
          )}
          {post.content_type === CONTENT_TYPES.AUDIO && (
            // Ses içeriği - 3D Mikrofon
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center relative">
              <div className="text-center">
                {/* 3D Mikrofon İkonu */}
                <div className="relative inline-block mb-4" style={{ filter: 'drop-shadow(4px 6px 10px rgba(0,0,0,0.3))' }}>
                  <svg width="60" height="80" viewBox="0 0 100 120">
                    {/* Mikrofon başı */}
                    <defs>
                      <linearGradient id="micGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                        <stop offset="100%" stopColor="#1e40af" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    <rect x="35" y="20" width="30" height="40" rx="15" fill="url(#micGradient)" stroke="#1e3a8a" strokeWidth="2"/>
                    <rect x="35" y="20" width="15" height="40" rx="15" fill="#60a5fa" opacity="0.5"/>
                    {/* Mikrofon gövdesi */}
                    <path d="M 35 65 Q 35 80 50 80 Q 65 80 65 65" stroke="#1e3a8a" strokeWidth="3" fill="none"/>
                    {/* Stand */}
                    <line x1="50" y1="80" x2="50" y2="100" stroke="#1e3a8a" strokeWidth="3"/>
                    <line x1="35" y1="100" x2="65" y2="100" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                    {/* Grid çizgileri */}
                    <line x1="40" y1="30" x2="60" y2="30" stroke="#1e40af" strokeWidth="1" opacity="0.5"/>
                    <line x1="40" y1="40" x2="60" y2="40" stroke="#1e40af" strokeWidth="1" opacity="0.5"/>
                    <line x1="40" y1="50" x2="60" y2="50" stroke="#1e40af" strokeWidth="1" opacity="0.5"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700 font-semibold">{formatDuration(post.media_duration)}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Açıklama - Her zaman 2 satırlık alan (SABİT YÜKSEKLİK) */}
        {post.content_text && (
          post.content_type === CONTENT_TYPES.TEXT ? (
            <div className="mb-2">
              <div className="border-t border-gray-300 pt-3">
                <p className="text-gray-800 text-sm line-clamp-2 leading-snug h-[42px]">
                  {post.content_text}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-800 text-sm line-clamp-2 leading-snug mb-2 h-[42px]">
              {post.content_text}
            </p>
          )
        )}
      </div>

      {/* Metin polit: metin altına boşluk bırak (alt çizgi = etkileşim çubuğunun border-t'si) */}
      {post.content_type === CONTENT_TYPES.TEXT ? <div className="h-[30px]" /> : null}
      
      {/* Gündem Etiketi ve Polit Puan - Alt kısım */}
      <div className="mt-auto">
        
        {/* Gündem Başlığı - Her zaman 2 satır */}
        {post.agenda_tag && (
          <div 
            className="mb-2 cursor-pointer h-10"
            onClick={(e) => {
              e.stopPropagation();
              // Gündem slug'ını oluştur
              const slug = post.agenda_tag.toLowerCase()
                .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
                .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
                .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              navigate(`/agenda/${slug}`);
            }}
          >
            <div className="inline-block px-3 py-1 bg-primary-blue text-white rounded-full text-xs font-medium line-clamp-2 leading-[18px] max-w-full">
              {post.agenda_tag}
            </div>
          </div>
        )}
        
        {/* Polit Puan ve Paylaşım Zamanı - Yan yana */}
        <div className="mb-2 flex items-center justify-between">
          <div 
            className="cursor-pointer hover:scale-105 transition-transform inline-block"
            onClick={(e) => {
              e.stopPropagation();
              setShowScoreModal(true);
            }}
            title="Polit Puan detaylarını gör"
          >
            <span className="text-lg font-bold text-primary-blue hover:text-blue-700">
              {formatPolitScore(post.polit_score)}
            </span>
          </div>
          
          {/* Paylaşım Zamanı - Sağ tarafta */}
          <div className="text-[10px] text-gray-500">
            {formatTimeAgo(post.created_at)}
          </div>
        </div>
      </div>
      
      {/* Alt Etkileşim Çubuğu */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 text-primary-blue hover:text-blue-700 text-base"
            onClick={(e) => {
              e.stopPropagation();
              if (!postId) return;
              // View count is incremented on detail fetch (server-side best effort)
              navigate(`/post/${postId}`);
            }}
            title="Detayı aç"
          >
            <Eye className="w-6 h-6" />
            <span className="text-base font-bold">{formatNumber(post.view_count)}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-base"
            onClick={handleToggleLike}
            title={isLiked ? 'Beğeniyi geri al' : 'Beğen'}
          >
            <Heart className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} />
            <span className="text-base font-bold text-gray-800">{formatNumber(likeCount)}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-base"
            onClick={(e) => {
              e.stopPropagation();
              if (!postId) return;
              navigate(`/post/${postId}?comment=1`);
            }}
            title="Yorum yap"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-base font-bold text-gray-800">{formatNumber(post.comment_count)}</span>
          </button>
        </div>
        <button
          type="button"
          className="text-emerald-600 hover:text-emerald-700"
          onClick={(e) => {
            e.stopPropagation();
            setShareCopied(false);
            setShareTextCopied(false);
            // Track share (best-effort) so the post owner gets a notification.
            try {
              if (isAuthenticated && postId) {
                postsApi.share(postId).catch(() => null);
              }
            } catch {
              // ignore
            }
            setShareOpen(true);
          }}
          title="Paylaş"
        >
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Kaynak / Otomatik paylaşım şeffaflık satırı */}
      {post.source_url && (
        <div
          className="mt-2 text-[10px] text-gray-500 leading-snug"
          onClick={(e) => e.stopPropagation()}
        >
          Bu paylaşım <span className="font-semibold">{getSourceDomain(post.source_url)}</span> adresinden alınmış olup otomatik olarak paylaşılmıştır.
        </div>
      )}
      
      {/* Polit Puan Detay Modalı */}
      {showScoreModal && (
        <PolitScoreDetailModal 
          post={post}
          onClose={() => setShowScoreModal(false)}
        />
      )}

      {/* Share modal (no navigation) */}
      <Modal isOpen={shareOpen} onClose={() => setShareOpen(false)} title="Paylaş">
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="text-sm text-gray-700">
            Paylaşım metni:
            <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 break-all text-xs text-gray-800">
              {shareText}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodedShareText}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-[#25D366] text-white font-black text-center hover:opacity-90"
              onClick={(e) => e.stopPropagation()}
            >
              WhatsApp
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodedShareText}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-[#229ED9] text-white font-black text-center hover:opacity-90"
              onClick={(e) => e.stopPropagation()}
            >
              Telegram
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedShareText}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-black text-white font-black text-center hover:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-[#1877F2] text-white font-black text-center hover:opacity-90"
              onClick={(e) => e.stopPropagation()}
            >
              Facebook
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-[#0A66C2] text-white font-black text-center hover:opacity-90"
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn
            </a>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const ok = await copyToClipboard(postUrl);
                setShareCopied(ok);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-black hover:bg-gray-50"
            >
              {shareCopied ? 'Link Kopyalandı' : 'Linki Kopyala'}
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const ok = await copyToClipboard(shareText);
                setShareTextCopied(ok);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-black hover:bg-gray-50"
            >
              {shareTextCopied ? 'Metin Kopyalandı' : 'Metni Kopyala'}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Instagram web üzerinden direkt paylaşımı desteklemez; linki kopyalayıp Instagram’da paylaşabilirsiniz.
          </div>
        </div>
      </Modal>
    </div>
  );
};
