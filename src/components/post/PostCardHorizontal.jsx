import { useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { PolitScoreDetailModal } from '../common/PolitScoreDetailModal';
import { Tooltip } from '../common/Tooltip';
import { formatNumber, formatPolitScore, formatTimeAgo, truncate, formatDuration } from '../../utils/formatters';
import { getUserTitle } from '../../utils/titleHelpers';
import { getPlaceholderImage } from '../../utils/imagePaths';
import { useNavigate, Link } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';

export const PostCardHorizontal = ({ post, showCity = false, showPartyLogo = false, fullWidth = false, style }) => {
  const navigate = useNavigate();
  const [showScoreModal, setShowScoreModal] = useState(false);
  
  const getContentIcon = () => {
    switch (post.content_type) {
      case CONTENT_TYPES.VIDEO:
        return <Video className="w-4 h-4" />;
      case CONTENT_TYPES.IMAGE:
        return <ImageIcon className="w-4 h-4" />;
      case CONTENT_TYPES.AUDIO:
        return <Music className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Resim URL helper
  const getImageUrl = (url) => {
    // Eğer gerçek path varsa kullan
    if (url && url.startsWith('/assets/')) return url;
    // Placeholder kullan
    return getPlaceholderImage('post', post.post_id);
  };

  const getAvatarUrl = (url) => {
    // Eğer gerçek path varsa kullan
    if (url && url.startsWith('/assets/')) return url;
    // Placeholder kullan
    return getPlaceholderImage('avatar', post.user_id || 1);
  };

  return (
    <div 
      className={`card-hover ${fullWidth ? 'p-3 w-full' : 'p-4'} flex-shrink-0 cursor-pointer flex flex-col min-h-[400px] relative`}
      style={fullWidth ? {} : { scrollSnapAlign: 'start', ...style }}
      onClick={() => navigate(`/post/${post.post_id}`)}
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
                navigate(`/profile/${post.user?.user_id}`);
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Avatar 
                src={post.user?.avatar_url || post.user?.avatar_url || user?.profile_image} 
                size="32px" 
                verified={post.user?.verification_badge || post.user?.is_verified}
              />
            </div>
            {/* Plaka Kodu - Avatar altında */}
            {post.user?.city_code && (
              <Tooltip content={`${post.user.city_code} ili detayını gör`} delay={300}>
                <Link
                  to={`/city/${post.user.city_code}`}
                  className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-900 hover:bg-primary-blue text-white text-[9px] font-bold rounded-full transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.user.city_code}
                </Link>
              </Tooltip>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* İsim - Her zaman 2 satırlık alan (SABİT YÜKSEKLİK) */}
            <h3 
              className="font-semibold text-sm text-gray-900 cursor-pointer hover:text-primary-blue transition-colors line-clamp-2 leading-[18px] h-[36px] mb-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${post.user?.user_id}`);
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
            // Resimleri array'e çevir (tek resim veya çoklu)
            const images = Array.isArray(post.media_url) ? post.media_url : [post.media_url];
            const imageCount = images.length;
            
            // 1 Resim - Tam alan
            if (imageCount === 1) {
              return (
                <img 
                  src={getImageUrl(images[0])} 
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = getPlaceholderImage('post', post.post_id); }}
                />
              );
            }
            
            // 2 Resim - İkiye böl
            if (imageCount === 2) {
              return (
                <div className="w-full h-full grid grid-cols-2 gap-0.5">
                  {images.slice(0, 2).map((img, idx) => (
                    <img 
                      key={idx}
                      src={getImageUrl(img)} 
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = getPlaceholderImage('post', post.post_id + idx); }}
                    />
                  ))}
                </div>
              );
            }
            
            // 3 Resim - Sol yarı 1 büyük, sağ yarı 2 küçük
            if (imageCount === 3) {
              return (
                <div className="w-full h-full grid grid-cols-2 gap-0.5">
                  <img 
                    src={getImageUrl(images[0])} 
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = getPlaceholderImage('post', post.post_id); }}
                  />
                  <div className="grid grid-rows-2 gap-0.5">
                    {images.slice(1, 3).map((img, idx) => (
                      <img 
                        key={idx}
                        src={getImageUrl(img)} 
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = getPlaceholderImage('post', post.post_id + idx + 1); }}
                      />
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
                    <img 
                      key={idx}
                      src={getImageUrl(img)} 
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = getPlaceholderImage('post', post.post_id + idx); }}
                    />
                  ))}
                </div>
              );
            }
            
            // 5+ Resim - İlk 3 resim + "Tümü" butonu
            return (
              <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
                {images.slice(0, 3).map((img, idx) => (
                  <img 
                    key={idx}
                    src={getImageUrl(img)} 
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = getPlaceholderImage('post', post.post_id + idx); }}
                  />
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
              <img 
                src={getImageUrl(post.thumbnail_url || post.media_url)} 
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getPlaceholderImage('post', post.post_id);
                }}
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
          <p className="text-gray-800 text-sm line-clamp-2 leading-snug mb-2 h-[42px]">
            {post.content_text}
          </p>
        )}
      </div>
      
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
          <button className="flex items-center gap-1 text-gray-600 hover:text-primary-blue text-xs">
            <Eye className="w-3 h-3" />
            <span>{formatNumber(post.view_count)}</span>
          </button>
          <button className="flex items-center gap-1 text-gray-600 hover:text-red-500 text-xs">
            <Heart className="w-3 h-3" />
            <span>{formatNumber(post.like_count)}</span>
          </button>
          <button className="flex items-center gap-1 text-gray-600 hover:text-primary-blue text-xs">
            <MessageCircle className="w-3 h-3" />
            <span>{formatNumber(post.comment_count)}</span>
          </button>
        </div>
        <button className="text-gray-600 hover:text-primary-blue">
          <Share2 className="w-3 h-3" />
        </button>
      </div>
      
      {/* Polit Puan Detay Modalı */}
      {showScoreModal && (
        <PolitScoreDetailModal 
          post={post}
          onClose={() => setShowScoreModal(false)}
        />
      )}
    </div>
  );
};
