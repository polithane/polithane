import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Flag, Pencil, X, Check } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { formatNumber, formatPolitScore, formatTimeAgo, formatDate, formatDuration, getSourceDomain } from '../utils/formatters';
import ReactPlayer from 'react-player';
import { posts as postsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { getProfilePath } from '../utils/paths';

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportDone, setReportDone] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [reportingPost, setReportingPost] = useState(false);
  const [postReportReason, setPostReportReason] = useState('spam');
  const [postReportDetails, setPostReportDetails] = useState('');
  const [postReportDone, setPostReportDone] = useState(false);

  const commentsRef = useRef(null);
  const commentBoxRef = useRef(null);
  
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = await postsApi.getById(postId);
        const dbPost = detail?.data ? detail.data : detail;
        setPost(dbPost);

        const c = await postsApi.getComments(postId).catch(() => null);
        const rows = c?.data?.data || c?.data || c || [];
        setComments(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Paylaşım yüklenemedi.');
        setPost(null);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);
  
  if (loading) {
    return (
      <div className="container-main py-8">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container-main py-8">
        <div className="text-center text-gray-700">{error || 'Paylaşım bulunamadı.'}</div>
      </div>
    );
  }

  const uiPost = {
    post_id: post.post_id ?? post.id,
    user_id: post.user_id,
    content_type: post.content_type || (Array.isArray(post.media_urls) && post.media_urls.length > 0 ? 'image' : 'text'),
    content_text: post.content_text ?? post.content ?? '',
    media_url: post.media_url ?? post.media_urls ?? [],
    thumbnail_url: post.thumbnail_url,
    media_duration: post.media_duration,
    agenda_tag: post.agenda_tag,
    polit_score: post.polit_score,
    view_count: post.view_count,
    like_count: post.like_count,
    comment_count: post.comment_count,
    share_count: post.share_count,
    created_at: post.created_at,
    source_url: post.source_url,
    user: post.user || null,
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login-new');
      return;
    }
    try {
      const r = await postsApi.like(uiPost.post_id);
      if (r?.success) {
        // Refresh counts
        const detail = await postsApi.getById(uiPost.post_id);
        setPost(detail?.data ? detail.data : detail);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      navigate('/login-new');
      return;
    }
    const text = newComment.trim();
    if (!text) return;
    if (text.length > 300) {
      setCommentError('Yorum en fazla 300 karakter olabilir.');
      return;
    }
    try {
      setCommentError('');
      await postsApi.addComment(uiPost.post_id, text);
      setNewComment('');
      const c = await postsApi.getComments(uiPost.post_id).catch(() => null);
      const rows = c?.data?.data || c?.data || c || [];
      setComments(Array.isArray(rows) ? rows : []);
      const detail = await postsApi.getById(uiPost.post_id);
      setPost(detail?.data ? detail.data : detail);
    } catch (e) {
      console.error(e);
      setCommentError(e?.message || 'Yorum gönderilemedi.');
    }
  };

  const nowMs = Date.now();
  const myCommentCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return (comments || []).filter((c) => String(c.user_id || c.user?.id) === String(currentUser.id)).length;
  }, [comments, currentUser?.id]);

  const canEditComment = (comment) => {
    if (!currentUser?.id) return false;
    if (String(comment.user_id || comment.user?.id) !== String(currentUser.id)) return false;
    const created = new Date(comment.created_at || 0).getTime();
    if (!Number.isFinite(created)) return false;
    return nowMs - created <= 10 * 60 * 1000;
  };

  const isPendingComment = (comment) => !!comment?.is_deleted;

  const postUrl = (() => {
    try {
      return `${window.location.origin}/post/${uiPost.post_id}`;
    } catch {
      return `/post/${uiPost.post_id}`;
    }
  })();

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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="max-w-3xl mx-auto">
          {/* Kullanıcı Bilgisi */}
          <div className="card mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar 
                src={uiPost.user?.avatar_url || uiPost.user?.profile_image} 
                size="60px" 
                verified={uiPost.user?.verification_badge || uiPost.user?.is_verified}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg break-words">{uiPost.user?.full_name}</h3>
                  {uiPost.user?.party_id && uiPost.user?.party?.short_name && (
                    <Badge variant="secondary" size="small">{uiPost.user.party.short_name}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 break-words">{formatDate(uiPost.created_at)}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (uiPost.user) navigate(getProfilePath(uiPost.user));
                  else navigate(`/profile/${uiPost.user_id}`);
                }}
              >
                Takip Et
              </Button>
            </div>
            
            {/* İçerik */}
            <div className="mb-4">
              {uiPost.content_type === 'text' && (
                <p className="text-gray-900 text-2xl leading-relaxed font-medium whitespace-pre-wrap">{uiPost.content_text}</p>
              )}
              {uiPost.content_type === 'image' && (
                <div>
                  {Array.isArray(uiPost.media_url) ? (
                    <img src={uiPost.media_url[0]} alt="" className="w-full rounded-lg mb-3" />
                  ) : (
                    <img src={uiPost.media_url} alt="" className="w-full rounded-lg mb-3" />
                  )}
                  {uiPost.content_text && <p className="text-gray-800">{uiPost.content_text}</p>}
                </div>
              )}
              {uiPost.content_type === 'video' && (
                <div>
                  <ReactPlayer url={Array.isArray(uiPost.media_url) ? uiPost.media_url[0] : uiPost.media_url} controls width="100%" />
                  {uiPost.content_text && <p className="text-gray-800 mt-3">{uiPost.content_text}</p>}
                </div>
              )}
              {uiPost.content_type === 'audio' && (
                <div className="bg-gray-100 rounded-lg p-6">
                  <audio src={Array.isArray(uiPost.media_url) ? uiPost.media_url[0] : uiPost.media_url} controls className="w-full" />
                  {uiPost.content_text && <p className="text-gray-800 mt-3">{uiPost.content_text}</p>}
                </div>
              )}
            </div>
            
            {/* Gündem */}
            {uiPost.agenda_tag && (
              <Badge variant="primary" className="mb-4">
                {uiPost.agenda_tag}
              </Badge>
            )}

            {/* Kaynak / Otomatik paylaşım şeffaflık satırı */}
            {uiPost.source_url && (
              <div className="mt-2 text-xs text-gray-500 leading-snug">
                Bu paylaşım <span className="font-semibold">{getSourceDomain(uiPost.source_url)}</span> adresinden alınmış olup otomatik olarak paylaşılmıştır.
              </div>
            )}
            
            {/* Etkileşim Butonları - Kompakt */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t">
              {/* BEĞEN - Özel Vurgulu */}
              <button onClick={handleToggleLike} className="flex items-center justify-center gap-2 bg-gradient-to-br from-red-500 via-pink-500 to-red-600 hover:from-red-600 hover:via-pink-600 hover:to-red-700 text-white py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Heart className="w-4 h-4" fill="currentColor" />
                <span className="text-sm font-bold">BEĞEN ({formatNumber(uiPost.like_count)})</span>
              </button>
              
              {/* YORUM */}
              <button
                onClick={() => {
                  commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTimeout(() => commentBoxRef.current?.focus?.(), 250);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-br from-primary-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-bold">YORUM ({formatNumber(uiPost.comment_count)})</span>
              </button>
              
              {/* PAYLAŞ */}
              <button
                onClick={async () => {
                  setShareCopied(false);
                  // If native share exists, offer it first
                  try {
                    if (navigator?.share) {
                      await navigator.share({ title: 'Polithane', url: postUrl });
                      return;
                    }
                  } catch {
                    // ignore
                  }
                  setShowShare(true);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-bold">PAYLAŞ ({formatNumber(uiPost.share_count || 0)})</span>
              </button>
            </div>
            
            {/* Şikayet Et - Alt Satırda */}
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => {
                  setReportingPost(true);
                  setPostReportReason('spam');
                  setPostReportDetails('');
                  setPostReportDone(false);
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-red-500 text-sm font-medium transition-colors"
              >
                <Flag className="w-4 h-4" />
                Şikayet Et
              </button>
            </div>
            
            {/* Polit Puan - Sadece P. ile */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                    <div className="text-3xl font-bold text-primary-blue">{formatPolitScore(uiPost.polit_score)}</div>
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
            <div ref={commentsRef} className="mb-6 pb-6 border-b scroll-mt-24">
              <div className="flex gap-3">
                <Avatar src={currentUser?.avatar_url || currentUser?.profile_image} size="40px" />
                <div className="flex-1">
                  <textarea
                    ref={commentBoxRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    rows="3"
                    maxLength={300}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-500">
                      {300 - (newComment?.length || 0)} karakter kaldı • {myCommentCount}/3 yorum
                    </div>
                    <Button className="mt-0" onClick={handleAddComment}>
                      Gönder
                    </Button>
                  </div>
                  {commentError && <div className="mt-2 text-sm text-red-600 font-semibold">{commentError}</div>}
                </div>
              </div>
            </div>
            
            {/* Yorum Listesi */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id || comment.comment_id} className="flex gap-3">
                  <Avatar src={comment.user?.avatar_url || comment.user?.profile_image} size="40px" verified={comment.user?.verification_badge || comment.user?.is_verified} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{comment.user?.full_name}</span>
                      <span className="text-sm text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                    </div>
                    {editingId === (comment.id || comment.comment_id) ? (
                      <div className="mb-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          maxLength={300}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-semibold"
                            onClick={() => {
                              setEditingId(null);
                              setEditingText('');
                            }}
                            type="button"
                          >
                            <div className="flex items-center gap-2">
                              <X className="w-4 h-4" />
                              Vazgeç
                            </div>
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white font-black"
                            onClick={async () => {
                              const text = editingText.trim();
                              if (!text) return;
                              try {
                                setCommentError('');
                                await postsApi.updateComment(comment.id || comment.comment_id, text);
                                setEditingId(null);
                                setEditingText('');
                                const c = await postsApi.getComments(uiPost.post_id).catch(() => null);
                                const rows = c?.data?.data || c?.data || c || [];
                                setComments(Array.isArray(rows) ? rows : []);
                              } catch (e) {
                                setCommentError(e?.message || 'Yorum güncellenemedi.');
                              }
                            }}
                            type="button"
                          >
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Kaydet
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={`mb-2 ${isPendingComment(comment) ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                          {comment.content || comment.comment_text}
                        </p>
                        {isPendingComment(comment) && (
                          <div className="mb-2 text-xs text-gray-500">
                            Bu mesaj güvenlik önlemleri nedeniyle sistem tarafından onaylanana kadar diğer kullanıcılara gösterilmez.
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-between">
                      <button
                        className="flex items-center gap-1 text-gray-600 hover:text-red-500 disabled:opacity-50"
                        type="button"
                        disabled={isPendingComment(comment)}
                        onClick={async () => {
                          try {
                            setCommentError('');
                            const id = comment.id || comment.comment_id;
                            if (!id) return;
                            const r = await postsApi.likeComment(id);
                            setComments((prev) =>
                              prev.map((c) => ((c.id || c.comment_id) === id ? { ...c, like_count: r?.like_count ?? c.like_count } : c))
                            );
                          } catch (e) {
                            setCommentError(e?.message || 'Beğeni işlemi başarısız.');
                          }
                        }}
                        title={isPendingComment(comment) ? 'Bu yorum incelemede' : 'Beğen'}
                      >
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{formatNumber(comment.like_count)}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {canEditComment(comment) && editingId !== (comment.id || comment.comment_id) && (
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold"
                            onClick={() => {
                              setCommentError('');
                              setEditingId(comment.id || comment.comment_id);
                              setEditingText(String(comment.content || comment.comment_text || ''));
                            }}
                            title="Düzenle (10 dk)"
                          >
                            <div className="flex items-center gap-1">
                              <Pencil className="w-3.5 h-3.5" />
                              Düzenle
                            </div>
                          </button>
                        )}

                        <button
                          className="flex items-center gap-1 text-gray-600 hover:text-red-500"
                          type="button"
                          onClick={() => {
                            setReporting(comment);
                            setReportReason('spam');
                            setReportDetails('');
                            setReportDone(false);
                          }}
                          title="Bildir"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </div>
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
              {formatPolitScore(uiPost.polit_score)} Polit Puan
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
                <span className="font-semibold">{formatNumber(uiPost.view_count)}</span>
              </li>
              <li className="flex justify-between">
                <span>Beğeni:</span>
                <span className="font-semibold">{formatNumber(uiPost.like_count)}</span>
              </li>
              <li className="flex justify-between">
                <span>Yorum:</span>
                <span className="font-semibold">{formatNumber(uiPost.comment_count)}</span>
              </li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Report modal */}
      {reporting && (
        <Modal isOpen={true} onClose={() => setReporting(null)} title="Yorumu Bildir">
          {reportDone ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-800 font-semibold">
                Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.
              </div>
              <Button onClick={() => setReporting(null)}>Kapat</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">Neden bildirmek istiyorsunuz?</div>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="spam">Spam</option>
                <option value="hakaret">Hakaret / Küfür</option>
                <option value="taciz">Taciz / Nefret</option>
                <option value="yaniltici">Yanıltıcı bilgi</option>
                <option value="zararli_link">Zararlı link</option>
                <option value="diger">Diğer</option>
              </select>

              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                placeholder="İsterseniz kısa bir açıklama ekleyin (opsiyonel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReporting(null)}>
                  Vazgeç
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setCommentError('');
                      const id = reporting.id || reporting.comment_id;
                      await postsApi.reportComment(id, reportReason, reportDetails);
                      setReportDone(true);
                    } catch (e) {
                      setCommentError(e?.message || 'Şikayet gönderilemedi.');
                      setReporting(null);
                    }
                  }}
                >
                  Gönder
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Share modal */}
      <Modal isOpen={showShare} onClose={() => setShowShare(false)} title="Paylaş">
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            Bu polit linki:
            <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 break-all text-xs text-gray-800">
              {postUrl}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-black text-white font-black text-center hover:bg-gray-900"
            >
              X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-[#1877F2] text-white font-black text-center hover:opacity-90"
            >
              Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl bg-[#25D366] text-white font-black text-center hover:opacity-90"
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(postUrl);
                setShareCopied(ok);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-black hover:bg-gray-50"
            >
              {shareCopied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Instagram web üzerinden direkt paylaşımı desteklemez; linki kopyalayıp Instagram’da paylaşabilirsiniz.
          </div>
        </div>
      </Modal>

      {/* Post report modal */}
      {reportingPost && (
        <Modal isOpen={true} onClose={() => setReportingPost(false)} title="Paylaşımı Şikayet Et">
          {postReportDone ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-800 font-semibold">
                Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.
              </div>
              <Button onClick={() => setReportingPost(false)}>Kapat</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">Neden şikayet etmek istiyorsunuz?</div>
              <select
                value={postReportReason}
                onChange={(e) => setPostReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="spam">Spam</option>
                <option value="hakaret">Hakaret / Küfür</option>
                <option value="taciz">Taciz / Nefret</option>
                <option value="yaniltici">Yanıltıcı bilgi</option>
                <option value="zararli_link">Zararlı link</option>
                <option value="diger">Diğer</option>
              </select>

              <textarea
                value={postReportDetails}
                onChange={(e) => setPostReportDetails(e.target.value)}
                rows={3}
                placeholder="İsterseniz kısa bir açıklama ekleyin (opsiyonel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReportingPost(false)}>
                  Vazgeç
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setCommentError('');
                      await postsApi.reportPost(uiPost.post_id, postReportReason, postReportDetails);
                      setPostReportDone(true);
                    } catch (e) {
                      setCommentError(e?.message || 'Şikayet gönderilemedi.');
                      setReportingPost(false);
                    }
                  }}
                >
                  Gönder
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
