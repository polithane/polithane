import { useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, Video, Image as ImageIcon, Music, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { PolitScoreDetailModal } from '../common/PolitScoreDetailModal';
import { formatNumber, formatPolitScore, formatTimeAgo, truncate, formatDuration, getSourceDomain } from '../../utils/formatters';
import { getUserTitle } from '../../utils/titleHelpers';
import { useNavigate, Link } from 'react-router-dom';
import { CONTENT_TYPES } from '../../utils/constants';

export const PostCard = ({ post, showCity = false, showPartyLogo = false, showPosition = false }) => {
  const navigate = useNavigate();
  const [showScoreModal, setShowScoreModal] = useState(false);
  
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
      className="card-hover p-4 mb-4 w-full relative"
      onClick={() => navigate(`/post/${post.post_id}`)}
    >
      {/* Parti Logosu - SAĞ ÜST KÖŞE - Responsive */}
      {post.user?.party_id && post.user?.party?.party_logo && (
        <div 
          className="absolute top-4 right-4 z-10 cursor-pointer hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/party/${post.user.party_id}`);
          }}
          title={`${post.user.party.party_short_name} detayını gör`}
        >
          <img 
            src={post.user.party.party_logo} 
            alt={post.user.party.party_short_name}
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-[25px] md:h-[25px] object-contain drop-shadow-md"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Üst Bilgi */}
      <div className="flex items-start justify-between mb-3 pr-10">
        <div className="flex items-start gap-3 flex-1">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${post.user?.user_id}`);
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Avatar 
              src={post.user?.avatar_url || post.user?.profile_image} 
              size="40px" 
              verified={post.user?.verification_badge || post.user?.is_verified}
            />
          </div>
          <div className="flex-1 min-w-0">
            {/* İsim - Her zaman 2 satırlık alan */}
            <h3 
              className="font-semibold text-base text-gray-900 cursor-pointer hover:text-primary-blue transition-colors line-clamp-2 leading-5 mb-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${post.user?.user_id}`);
              }}
            >
              {post.user?.full_name}
            </h3>
            
            {/* Ünvan ve İl Kodu - Tek satır */}
            <div className="flex items-center gap-2 mb-1">
              {getUserTitle(post.user, true) && (
                <>
                  <span 
                    className="font-medium text-primary-blue cursor-pointer hover:underline text-xs whitespace-nowrap"
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
                  {/* İl kodu - Görevin yanında */}
                  {post.user?.city_code && (
                    <Link
                      to={`/city/${post.user.city_code}`}
                      className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-900 hover:bg-primary-blue text-white text-xs font-semibold rounded-full transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.user.city_code}
                    </Link>
                  )}
                </>
              )}
            </div>
            
            {/* Paylaşım Zamanı - Alt satır */}
            <div className="text-xs text-gray-500">
              {formatTimeAgo(post.created_at)}
            </div>
          </div>
        </div>
        
        {/* Polit Puan */}
        <div 
          className="text-right ml-2 cursor-pointer hover:scale-105 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            setShowScoreModal(true);
          }}
          title="Polit Puan detaylarını gör"
        >
          <div className="text-lg font-bold text-primary-blue hover:text-blue-700">
            {formatPolitScore(post.polit_score)}
          </div>
        </div>
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
        <div 
          className="mb-3 cursor-pointer inline-block"
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

      {/* Kaynak / Otomatik paylaşım şeffaflık satırı */}
      {post.source_url && (
        <div
          className="mt-3 text-[11px] text-gray-500 leading-snug"
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
    </div>
  );
};
