import { X, Eye, Heart, MessageCircle, Share2, Users, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { formatPolitScore } from '../../utils/formatters';

export const PolitScoreDetailModal = ({ post, onClose }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  if (!post) return null;
  
  // Mock puan detayları - Şeffaf algoritma gösterimi
  const scoreBreakdown = {
    views: {
      title: 'Görüntüleme Puanları',
      icon: <Eye className="w-5 h-5" />,
      total: Math.floor(post.view_count * 0.1),
      details: [
        { label: 'Üye Olmayanların Görüntülemesi', count: Math.floor(post.view_count * 0.4), points: Math.floor(post.view_count * 0.4 * 0.05), unitPoint: '0,05 P.' },
        { label: 'Parti Üyelerinin Görüntülemesi', count: Math.floor(post.view_count * 0.3), points: Math.floor(post.view_count * 0.3 * 0.1), unitPoint: '0,1 P.' },
        { label: 'Rakip Parti Üyelerinin Görüntülemesi', count: Math.floor(post.view_count * 0.2), points: Math.floor(post.view_count * 0.2 * 0.15), unitPoint: '0,15 P.' },
        { label: 'Siyasetçilerin Görüntülemesi', count: Math.floor(post.view_count * 0.1), points: Math.floor(post.view_count * 0.1 * 0.5), unitPoint: '0,5 P.' },
      ]
    },
    likes: {
      title: 'Beğeni Puanları',
      icon: <Heart className="w-5 h-5" />,
      total: Math.floor(post.like_count * 2),
      details: [
        { label: 'Üye Olmayanların Beğenisi', count: Math.floor(post.like_count * 0.3), points: Math.floor(post.like_count * 0.3 * 1), unitPoint: '1 P.' },
        { label: 'Parti Üyelerinin Beğenisi', count: Math.floor(post.like_count * 0.35), points: Math.floor(post.like_count * 0.35 * 2), unitPoint: '2 P.' },
        { label: 'Rakip Parti Üyelerinin Beğenisi', count: Math.floor(post.like_count * 0.25), points: Math.floor(post.like_count * 0.25 * 3), unitPoint: '3 P.' },
        { label: 'Siyasetçilerin Beğenisi', count: Math.floor(post.like_count * 0.1), points: Math.floor(post.like_count * 0.1 * 10), unitPoint: '10 P.' },
      ]
    },
    comments: {
      title: 'Yorum Puanları',
      icon: <MessageCircle className="w-5 h-5" />,
      total: Math.floor(post.comment_count * 5),
      details: [
        { label: 'Üye Olmayanların Yorumu', count: Math.floor(post.comment_count * 0.2), points: Math.floor(post.comment_count * 0.2 * 2), unitPoint: '2 P.' },
        { label: 'Parti Üyelerinin Yorumu', count: Math.floor(post.comment_count * 0.4), points: Math.floor(post.comment_count * 0.4 * 5), unitPoint: '5 P.' },
        { label: 'Rakip Parti Üyelerinin Yorumu', count: Math.floor(post.comment_count * 0.3), points: Math.floor(post.comment_count * 0.3 * 8), unitPoint: '8 P.' },
        { label: 'Siyasetçilerin Yorumu', count: Math.floor(post.comment_count * 0.1), points: Math.floor(post.comment_count * 0.1 * 20), unitPoint: '20 P.' },
      ]
    },
    shares: {
      title: 'Paylaşım Puanları',
      icon: <Share2 className="w-5 h-5" />,
      total: Math.floor(post.polit_score * 0.15),
      details: [
        { label: 'Sosyal Medya Paylaşımları', count: Math.floor(post.view_count * 0.05), points: Math.floor(post.view_count * 0.05 * 5), unitPoint: '5 P.' },
        { label: 'Platform İçi Paylaşımlar', count: Math.floor(post.view_count * 0.03), points: Math.floor(post.view_count * 0.03 * 3), unitPoint: '3 P.' },
      ]
    },
    engagement: {
      title: 'Etkileşim Bonusu',
      icon: <TrendingUp className="w-5 h-5" />,
      total: Math.floor(post.polit_score * 0.1),
      details: [
        { label: 'Gündem Oluşturma Bonusu', count: 1, points: Math.floor(post.polit_score * 0.05), unitPoint: `${Math.floor(post.polit_score * 0.05)} P.` },
        { label: 'Hızlı Etkileşim Bonusu', count: 1, points: Math.floor(post.polit_score * 0.03), unitPoint: `${Math.floor(post.polit_score * 0.03)} P.` },
        { label: 'Çeşitli Kitleden Etkileşim', count: 1, points: Math.floor(post.polit_score * 0.02), unitPoint: `${Math.floor(post.polit_score * 0.02)} P.` },
      ]
    }
  };
  
  const totalCalculated = Object.values(scoreBreakdown).reduce((sum, cat) => sum + cat.total, 0);
  
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
              <p className="text-sm text-gray-500 mt-1">Şeffaf ve açık algoritma - Her puan hesaplanabilir</p>
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
              <p className="text-sm mt-2 opacity-90">Hesaplanan: {formatPolitScore(totalCalculated)}</p>
            </div>
          </div>
          
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
                    <p className="text-xl font-bold text-primary-blue">{formatPolitScore(category.total)}</p>
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
                          <p className="text-lg font-bold text-primary-blue">{formatPolitScore(detail.points)}</p>
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
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  Polithane'nin Şeffaflık İlkesi
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Her bir etkileşimin puanı açık ve net. Tüm hesaplamalar şeffaf. 
                  Herhangi bir etkileşime tıklayarak o puanı kimin nasıl oluşturduğunu görebilirsiniz.
                  Rakip parti üyelerinin etkileşimleri daha değerlidir çünkü objektif ilgiyi gösterir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
