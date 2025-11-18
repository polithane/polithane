import { Eye, Heart, MessageCircle, Share2, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { formatNumber, formatPolitScore, formatTimeAgo, truncate, formatDuration } from '../../utils/formatters';
import { getPlaceholderImage } from '../../utils/imagePaths';
import { useNavigate } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';

export const PostCardHorizontal = ({ post, showCity = false, showPartyLogo = false, fullWidth = false, style }) => {
  const navigate = useNavigate();
  
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
      className={`card-hover ${fullWidth ? 'p-3 w-full' : 'p-4'} flex-shrink-0 cursor-pointer flex flex-col min-h-[400px]`}
      style={fullWidth ? {} : { scrollSnapAlign: 'start', ...style }}
      onClick={() => navigate(`/post/${post.post_id}`)}
    >
      {/* Üst Bilgi */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar 
            src={getAvatarUrl(post.user?.profile_image)} 
            size="32px" 
            verified={post.user?.verification_badge}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-gray-900 truncate">
                {post.user?.full_name}
              </span>
              {showPartyLogo && post.user?.party_id && (
                <img 
                  src={post.user?.party?.party_logo || `https://via.placeholder.com/16x16/${post.user?.party?.party_color?.replace('#', '') || '009fd6'}/ffffff?text=${post.user?.party?.party_short_name || 'P'}`} 
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {showCity && post.user?.city_code && (
                <span>{post.user.city_code}</span>
              )}
              <span>{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        
        {/* İçerik Tipi İkonu */}
        <div className="text-gray-400 flex-shrink-0">
          {getContentIcon()}
        </div>
      </div>
      
      {/* İçerik */}
      <div className="mb-3 flex-1">
        {post.content_type === CONTENT_TYPES.TEXT && (
          <p className="text-gray-800 text-sm line-clamp-3">{truncate(post.content_text, 100)}</p>
        )}
        {post.content_type === CONTENT_TYPES.IMAGE && (
          <div className="relative">
            <img 
              src={getImageUrl(post.media_url)} 
              alt=""
              className={`w-full rounded-lg object-cover ${fullWidth ? 'h-36' : 'h-48'}`}
              onError={(e) => {
                e.target.src = getPlaceholderImage('post', post.post_id);
              }}
            />
            {post.content_text && (
              <p className="mt-2 text-gray-800 text-sm line-clamp-2">{post.content_text}</p>
            )}
          </div>
        )}
        {post.content_type === CONTENT_TYPES.VIDEO && (
          <div className="relative">
            <img 
              src={getImageUrl(post.thumbnail_url || post.media_url)} 
              alt=""
              className={`w-full rounded-lg object-cover ${fullWidth ? 'h-36' : 'h-48'}`}
              onError={(e) => {
                e.target.src = getPlaceholderImage('post', post.post_id);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
              <div className="bg-white rounded-full p-2">
                <Video className="w-6 h-6 text-primary-blue" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              {formatDuration(post.media_duration)}
            </div>
            {post.content_text && (
              <p className="mt-2 text-gray-800 text-sm line-clamp-2">{post.content_text}</p>
            )}
          </div>
        )}
        {post.content_type === CONTENT_TYPES.AUDIO && (
          <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-3">
            <div className="bg-primary-blue rounded-full p-2">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="h-1.5 bg-gray-300 rounded-full mb-1"></div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{formatDuration(post.media_duration)}</span>
                <span>Ses</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Gündem Etiketi ve Polit Puan - Alt kısım */}
      <div className="mt-auto">
        {post.agenda_tag && (
          <div className="mb-2">
            <Badge variant="primary" size="small">
              {post.agenda_tag}
            </Badge>
          </div>
        )}
        
        {/* Polit Puan */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary-blue">
              {formatPolitScore(post.polit_score)}
            </span>
            <span className="text-xs text-gray-500">Polit Puan</span>
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
    </div>
  );
};
