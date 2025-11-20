import { useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { PolitScoreDetailModal } from '../common/PolitScoreDetailModal';
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
      {/* Parti Logosu - SAĞ ÜST KÖŞE - Responsive */}
      {post.user?.party_id && post.user?.party?.party_logo && (
        <div 
          className="absolute top-3 right-3 z-10 cursor-pointer hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/party/${post.user.party_id}`);
          }}
          title={`${post.user.party.party_short_name} detayını gör`}
        >
          <img 
            src={post.user.party.party_logo} 
            alt={post.user.party.party_short_name}
            className="w-4 h-4 sm:w-5 sm:h-5 md:w-[20px] md:h-[20px] object-contain drop-shadow-md"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Üst Bilgi */}
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${post.user?.user_id}`);
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Avatar 
              src={getAvatarUrl(post.user?.profile_image)} 
              size="32px" 
              verified={post.user?.verification_badge}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span 
                className="font-semibold text-sm text-gray-900 break-words cursor-pointer hover:text-primary-blue transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${post.user?.user_id}`);
                }}
              >
                {post.user?.full_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
              {getUserTitle(post.user) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span 
                    className="font-medium text-primary-blue cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Kullanıcı tipine göre kategori sayfasına yönlendir
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
                    {getUserTitle(post.user)}
                  </span>
                  {/* İl kodu - Tüm kullanıcılarda göster */}
                  {post.user?.city_code && (
                    <Link
                      to={`/city/${post.user.city_code}`}
                      className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-900 hover:bg-primary-blue text-white text-[10px] font-bold rounded-full transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.user.city_code}
                    </Link>
                  )}
                </div>
              )}
              {getUserTitle(post.user) && (
                <span className="flex-shrink-0">•</span>
              )}
              <span className="flex-shrink-0">{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* İçerik - Standart 150px yükseklikte görsel */}
      <div className="mb-3">
        {/* Görsel/İkon Alanı - Her zaman 150px yükseklikte */}
        <div className="relative w-full rounded-lg overflow-hidden mb-2" style={{ height: '150px' }}>
          {post.content_type === CONTENT_TYPES.TEXT && (
            // Yazı içeriği için ikon
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <FileText className="w-16 h-16 text-gray-400" />
            </div>
          )}
          {post.content_type === CONTENT_TYPES.IMAGE && (
            <>
              <img 
                src={getImageUrl(post.media_url)} 
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getPlaceholderImage('post', post.post_id);
                }}
              />
              {/* Resim ikonu overlay */}
              <div className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5">
                <ImageIcon className="w-4 h-4 text-primary-blue" />
              </div>
            </>
          )}
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
              {/* Play ikonu overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-full p-3">
                  <Video className="w-8 h-8 text-primary-blue" />
                </div>
              </div>
              {/* Süre */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {formatDuration(post.media_duration)}
              </div>
            </>
          )}
          {post.content_type === CONTENT_TYPES.AUDIO && (
            // Ses içeriği için müzik ikonu
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <div className="text-center">
                <Music className="w-16 h-16 text-primary-blue mx-auto mb-2" />
                <p className="text-sm text-gray-600">{formatDuration(post.media_duration)}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Açıklama - Tam 2 satır (line-clamp-2) */}
        {post.content_text && (
          <p className="text-gray-800 text-sm line-clamp-2 leading-snug mb-2">
            {post.content_text}
          </p>
        )}
        
        {/* REKLAM ALANI - İçerik ile gündem arasında (280px x 70px) */}
        <div className="w-full h-[70px] mb-3 overflow-hidden rounded-lg">
          <div 
            className="w-full h-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 cursor-pointer flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              // Rastgele reklam URL'leri
              const ads = [
                'https://example.com/ad1',
                'https://example.com/ad2',
                'https://example.com/ad3'
              ];
              const randomAd = ads[Math.floor(Math.random() * ads.length)];
              window.open(randomAd, '_blank');
            }}
          >
            <div className="text-center px-4">
              <p className="text-white font-bold text-sm mb-1">🎯 Sponsorlu İçerik</p>
              <p className="text-white/90 text-xs">Reklam Alanı - 280x70px</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gündem Etiketi ve Polit Puan - Alt kısım */}
      <div className="mt-auto">
        {post.agenda_tag && (
          <div 
            className="mb-2 cursor-pointer inline-block"
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
            <Badge variant="primary" size="small">
              {post.agenda_tag}
            </Badge>
          </div>
        )}
        
        {/* Polit Puan */}
        <div 
          className="mb-2 cursor-pointer hover:scale-105 transition-transform inline-block"
          onClick={(e) => {
            e.stopPropagation();
            setShowScoreModal(true);
          }}
          title="Polit Puan detaylarını gör"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary-blue hover:text-blue-700">
              {formatPolitScore(post.polit_score)}
            </span>
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
