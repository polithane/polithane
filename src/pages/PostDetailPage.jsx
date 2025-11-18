import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Flag } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { formatNumber, formatPolitScore, formatTimeAgo, formatDate, formatDuration } from '../utils/formatters';
import { mockPosts } from '../mock/posts';
import { mockComments, generateMockComments } from '../mock/comments';
import ReactPlayer from 'react-player';

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  useEffect(() => {
    const foundPost = mockPosts.find(p => p.post_id === parseInt(postId));
    setPost(foundPost);
    
    const postComments = generateMockComments(20).filter(c => c.post_id === parseInt(postId));
    setComments(postComments);
  }, [postId]);
  
  if (!post) {
    return (
      <div className="container-main py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="max-w-3xl mx-auto">
          {/* Kullanıcı Bilgisi */}
          <div className="card mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar 
                src={post.user?.profile_image} 
                size="60px" 
                verified={post.user?.verification_badge}
                partyLogo={post.user?.party_id ? post.user?.party?.party_logo : null}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg break-words">{post.user?.full_name}</h3>
                  {post.user?.party_id && post.user?.party?.party_short_name && (
                    <Badge variant="secondary" size="small">{post.user.party.party_short_name}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 break-words">{formatDate(post.created_at)}</p>
              </div>
              <Button variant="outline" onClick={() => navigate(`/profile/${post.user_id}`)}>
                Takip Et
              </Button>
            </div>
            
            {/* İçerik */}
            <div className="mb-4">
              {post.content_type === 'text' && (
                <p className="text-gray-800 text-lg whitespace-pre-wrap">{post.content_text}</p>
              )}
              {post.content_type === 'image' && (
                <div>
                  <img src={post.media_url} alt="" className="w-full rounded-lg mb-3" />
                  {post.content_text && <p className="text-gray-800">{post.content_text}</p>}
                </div>
              )}
              {post.content_type === 'video' && (
                <div>
                  <ReactPlayer url={post.media_url} controls width="100%" />
                  {post.content_text && <p className="text-gray-800 mt-3">{post.content_text}</p>}
                </div>
              )}
              {post.content_type === 'audio' && (
                <div className="bg-gray-100 rounded-lg p-6">
                  <audio src={post.media_url} controls className="w-full" />
                  {post.content_text && <p className="text-gray-800 mt-3">{post.content_text}</p>}
                </div>
              )}
            </div>
            
            {/* Gündem */}
            {post.agenda_tag && (
              <Badge variant="primary" className="mb-4">
                {post.agenda_tag}
              </Badge>
            )}
            
            {/* Etkileşim Butonları */}
            <div className="flex items-center gap-6 pt-4 border-t">
              <button className="flex items-center gap-2 text-gray-600 hover:text-red-500">
                <Heart className="w-5 h-5" />
                <span>{formatNumber(post.like_count)}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-primary-blue">
                <MessageCircle className="w-5 h-5" />
                <span>{formatNumber(post.comment_count)}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-primary-blue">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 ml-auto">
                <Flag className="w-5 h-5" />
              </button>
            </div>
            
            {/* Polit Puan */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-primary-blue">{formatPolitScore(post.polit_score)}</div>
                  <div className="text-sm text-gray-500">Polit Puan</div>
                </div>
                <Button variant="outline" onClick={() => setShowScoreModal(true)}>
                  Detaylı Hesaplama
                </Button>
              </div>
            </div>
          </div>
          
          {/* Yorumlar */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Yorumlar ({comments.length})</h3>
            
            {/* Yorum Ekleme */}
            <div className="mb-6 pb-6 border-b">
              <div className="flex gap-3">
                <Avatar src="/assets/mock/avatars/user1.jpg" size="40px" />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    rows="3"
                  />
                  <Button className="mt-2" onClick={() => {
                    // Mock comment add
                    setNewComment('');
                  }}>
                    Gönder
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Yorum Listesi */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.comment_id} className="flex gap-3">
                  <Avatar src={comment.user?.profile_image} size="40px" verified={comment.user?.verification_badge} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{comment.user?.full_name}</span>
                      <span className="text-sm text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-800 mb-2">{comment.comment_text}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-gray-600 hover:text-red-500">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{formatNumber(comment.like_count)}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-600 hover:text-red-500">
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Polit Puan Detay Modal */}
      <Modal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        title="Polit Puan Detaylı Hesaplama"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-primary-blue mb-2">
              {formatPolitScore(post.polit_score)} Polit Puan
            </div>
            <p className="text-sm text-gray-600">
              Bu puan, paylaşımınıza yapılan etkileşimlerden hesaplanmıştır.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Hesaplama Detayları:</h4>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Görüntülenme:</span>
                <span className="font-semibold">{formatNumber(post.view_count)}</span>
              </li>
              <li className="flex justify-between">
                <span>Beğeni:</span>
                <span className="font-semibold">{formatNumber(post.like_count)}</span>
              </li>
              <li className="flex justify-between">
                <span>Yorum:</span>
                <span className="font-semibold">{formatNumber(post.comment_count)}</span>
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
