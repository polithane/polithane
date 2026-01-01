import { X, Eye, Heart, MessageCircle, Share2, Users, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatPolitScore } from '../../utils/formatters';
import api from '../../utils/api';

export const PolitScoreDetailModal = ({ post, onClose }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  
  if (!post) return null;
  
  const postId = String(post?.id || post?.post_id || '').trim();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!postId) return;
      setLoading(true);
      setError('');
      try {
        const r = await api.posts.getPolitScoreBreakdown(postId).catch(() => null);
        if (!r?.success) throw new Error(r?.error || 'Polit puan detayı yüklenemedi.');
        if (!cancelled) setData(r?.data || null);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || 'Polit puan detayı yüklenemedi.'));
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const scoreBreakdown = useMemo(() => {
    const d = data || {};
    const likes = d?.likes || {};
    const comments = d?.comments || {};
    const views = d?.views || {};
    return {
      views: {
        title: 'Görüntüleme',
        icon: <Eye className="w-5 h-5" />,
        total: views?.score ?? null,
        details: [
          { label: 'Toplam görüntülenme', count: Number(views?.count ?? post.view_count ?? 0) || 0, points: views?.score ?? null, unitPoint: '—' },
          ...(views?.note ? [{ label: 'Not', count: 1, points: null, unitPoint: String(views.note) }] : []),
        ],
      },
      likes: {
        title: 'Beğeni',
        icon: <Heart className="w-5 h-5" />,
        total: likes?.totalScore ?? null,
        details: Array.isArray(likes?.byRule)
          ? likes.byRule.map((x) => ({
              label: x.label || x.rule || 'like',
              count: Number(x.count || 0) || 0,
              points: Number(x.totalScore ?? 0) || 0,
              unitPoint: typeof x.unitScore === 'number' ? `${x.unitScore} P.` : '—',
            }))
          : [{ label: 'Toplam beğeni', count: Number(post.like_count || 0) || 0, points: null, unitPoint: '—' }],
      },
      comments: {
        title: 'Yorum',
        icon: <MessageCircle className="w-5 h-5" />,
        total: comments?.totalScore ?? null,
        details: Array.isArray(comments?.byRule)
          ? comments.byRule.map((x) => ({
              label: x.label || x.rule || 'comment',
              count: Number(x.count || 0) || 0,
              points: Number(x.totalScore ?? 0) || 0,
              unitPoint: typeof x.unitScore === 'number' ? `${x.unitScore} P.` : '—',
            }))
          : [{ label: 'Toplam yorum', count: Number(post.comment_count || 0) || 0, points: null, unitPoint: '—' }],
      },
      shares: {
        title: 'Paylaşım',
        icon: <Share2 className="w-5 h-5" />,
        total: null,
        details: [{ label: 'Not', count: 1, points: null, unitPoint: 'Paylaşım kırılımı şu an tutulmuyor' }],
      },
      engagement: {
        title: 'Özet',
        icon: <TrendingUp className="w-5 h-5" />,
        total: d?.totalScore ?? null,
        details: [
          { label: 'Toplam (hesaplanan)', count: 1, points: d?.totalScore ?? null, unitPoint: '—' },
          ...(d?.truncated ? [{ label: 'Not', count: 1, points: null, unitPoint: 'Çok büyük postlarda örnekleme uygulanır' }] : []),
        ],
      },
    };
  }, [data, post?.comment_count, post?.like_count, post?.view_count]);
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Başlık */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Polit Puan Detayı</h2>
              <p className="text-sm text-gray-500 mt-1">Etkileşim kırılımı DB’den hesaplanır (tahmin/mock yok).</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Toplam Puan */}
          <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-6">
            <div className="text-center">
              <p className="text-sm font-medium mb-2">TOPLAM POLİT PUAN</p>
              <p className="text-5xl font-bold">{formatPolitScore(post.polit_score)}</p>
            </div>
          </div>

          {loading ? <div className="p-6 text-sm text-gray-600">Yükleniyor…</div> : null}
          {error ? <div className="px-6 pb-2 text-sm text-red-600 font-semibold">{error}</div> : null}
          
          {/* Puan Dağılımı */}
          <div className="p-6 space-y-4">
            {Object.entries(scoreBreakdown).map(([key, category]) => (
              <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Kategori Başlığı */}
                <button
                  onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-primary-blue">{category.icon}</div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-xs text-gray-500">Toplam Katkı</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-blue">{category.total == null ? '—' : formatPolitScore(category.total)}</p>
                    <p className="text-xs text-gray-500">
                      {expandedCategory === key ? 'Gizle ▲' : 'Detay ▼'}
                    </p>
                  </div>
                </button>
                
                {/* Detaylar */}
                {expandedCategory === key && (
                  <div className="bg-white p-4 space-y-3 border-t border-gray-200">
                    {category.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium text-gray-900">{detail.label}</p>
                          <p className="text-xs text-gray-500">
                            {detail.count} adet × {detail.unitPoint}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-blue">{detail.points == null ? '—' : formatPolitScore(detail.points)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Alt Bilgi */}
          <div className="bg-gray-50 p-4 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <div className="bg-primary-blue rounded-full p-2 flex-shrink-0">
                <Users className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  Polithane'nin Şeffaflık İlkesi
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Bu ekranda “mock/tahmin” hesap göstermiyoruz. Şeffaflık için katsayılar (kural seti) açık; ancak tekil etkileşim logları ve
                  kullanıcı tipi kırılımları DB’de tutulmadığı sürece post bazında tam puan dökümü gösterilemez.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
