import { Eye, Heart, MessageCircle, Share2, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { formatNumber, formatPolitScore, formatTimeAgo, truncate, formatDuration } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';

export const PostCard = ({ post, showCity = false, showPartyLogo = false, showPosition = false }) => {
  const navigate = useNavigate();
  
  const getContentIcon = () => {
    switch (post.content_type) {
      case CONTENT_TYPES.VIDEO:
        return <Video className="w-5 h-5" />;
      case CONTENT_TYPES.IMAGE:
        return <ImageIcon className="w-5 h-5" />;
      case CONTENT_TYPES.AUDIO:
        return <Music className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };
  
  return (
    <div 
      className="card-hover p-4 mb-4 w-full"
      onClick={() => navigate(`/post/${post.post_id}`)}
    >
      {/* Üst Bilgi */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <Avatar 
            src={post.user?.profile_image} 
            size="40px" 
            verified={post.user?.verification_badge}
            partyLogo={post.user?.party_id ? post.user?.party?.party_logo : null}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 break-words">
                {post.user?.full_name}
              </span>
              {showPartyLogo && post.user?.party_id && (
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {post.user?.party?.party_short_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              {showCity && post.user?.city_code && (
                <span className="flex-shrink-0">{post.user.city_code}</span>
              )}
              <span className="flex-shrink-0">{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        
        {/* Polit Puan */}
        <div className="text-right ml-2">
          <div className="text-lg font-bold text-primary-blue">
            {formatPolitScore(post.polit_score)}
          </div>
          <div className="text-xs text-gray-500">Polit Puan</div>
        </div>
      </div>
      
      {/* İçerik Tipi İkonu */}
      <div className="absolute top-4 right-4 text-gray-400">
        {getContentIcon()}
      </div>
      
      {/* İçerik */}
      <div className="mb-3">
        {post.content_type === CONTENT_TYPES.TEXT && (
          <p className="text-gray-800">{truncate(post.content_text, 150)}</p>
        )}
        {post.content_type === CONTENT_TYPES.IMAGE && (
          <div className="relative">
            <img 
              src={post.media_url} 
              alt=""
              className="w-full rounded-lg object-cover max-h-96"
            />
            {post.content_text && (
              <p className="mt-2 text-gray-800">{post.content_text}</p>
            )}
          </div>
        )}
        {post.content_type === CONTENT_TYPES.VIDEO && (
          <div className="relative">
            <img 
              src={post.thumbnail_url || post.media_url} 
              alt=""
              className="w-full rounded-lg object-cover max-h-96"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
              <div className="bg-white rounded-full p-3">
                <Video className="w-8 h-8 text-primary-blue" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
              {formatDuration(post.media_duration)}
            </div>
            {post.content_text && (
              <p className="mt-2 text-gray-800">{post.content_text}</p>
            )}
          </div>
        )}
        {post.content_type === CONTENT_TYPES.AUDIO && (
          <div className="bg-gray-100 rounded-lg p-4 flex items-center gap-4">
            <div className="bg-primary-blue rounded-full p-3">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-300 rounded-full mb-2"></div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatDuration(post.media_duration)}</span>
                <span>Ses Dosyası</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Gündem Etiketi */}
      {post.agenda_tag && (
        <div className="mb-3">
          <Badge variant="primary" size="small">
            {post.agenda_tag}
          </Badge>
        </div>
      )}
      
      {/* Alt Etkileşim Çubuğu */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-1 text-gray-600 hover:text-primary-blue">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{formatNumber(post.view_count)}</span>
          </button>
          <button className="flex items-center gap-1 text-gray-600 hover:text-red-500">
            <Heart className="w-4 h-4" />
            <span className="text-sm">{formatNumber(post.like_count)}</span>
          </button>
          <button className="flex items-center gap-1 text-gray-600 hover:text-primary-blue">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{formatNumber(post.comment_count)}</span>
          </button>
        </div>
        <button className="text-gray-600 hover:text-primary-blue">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
