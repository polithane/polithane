import { X, PartyPopper, Users, MessageCircle, TrendingUp, Zap, Target, Eye, Heart, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiCall } from '../../utils/api';

export const WelcomePopup = ({ isOpen, onClose, userName }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchContent = async () => {
      try {
        const response = await apiCall('/api/admin/welcome-content', { method: 'GET' }).catch(() => null);
        if (response?.success && response?.data) {
          setContent(response.data);
        }
      } catch (error) {
        console.error('Welcome content fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [isOpen]);

  if (!isOpen) return null;

  // Default content (fallback)
  const defaultContent = {
    who_we_are: 'Polithane, özgür ve bağımsız bir siyaset platformudur. Vatandaşların, siyasetçilerin ve medya temsilcilerinin bir araya geldiği, şeffaf ve demokratik bir ortam sunuyoruz.',
    problem_we_solve: 'Siyasette şeffaflık eksikliği, vatandaşların sesinin duyulmaması ve güvenilir bilgiye erişim zorluğu gibi sorunlara çözüm üretiyoruz. Polithane ile herkes eşit şartlarda sesini duyurabilir.',
    mission: 'Misyonumuz, Türkiye\'de siyasi katılımı artırmak, şeffaflığı sağlamak ve vatandaşlarla siyasetçiler arasında güçlü bir köprü kurmaktır. Özgür tartışma ortamı yaratarak demokrasiye katkıda bulunmayı hedefliyoruz.',
    vision: 'Vizyonumuz, Polithane\'yi Türkiye\'nin en güvenilir ve en çok tercih edilen siyaset platformu haline getirmektir. Gelecekte, her vatandaşın siyasete katılım sağlayabildiği, şeffaf ve hesap verebilir bir ekosistem yaratmak istiyoruz.',
  };

  const displayContent = content || defaultContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl shadow-2xl max-w-2xl w-full my-8 relative animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/80 rounded-full transition-colors z-10 shadow-sm"
          aria-label="Kapat"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-[#009FD6] to-[#0077B6] px-8 py-10 rounded-t-3xl">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border-4 border-white/40">
              <PartyPopper className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-white text-center mb-2">
            Hoş Geldiniz{userName ? `, ${userName}` : ''}! 🎉
          </h2>
          <p className="text-blue-50 text-center text-lg font-medium">
            <strong className="text-white">Polithane</strong> ailesine katıldığınız için çok mutluyuz!
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Yükleniyor...</p>
            </div>
          ) : (
            <>
              {/* Biz Kimiz */}
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'who' ? null : 'who')}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#009FD6] rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Biz Kimiz?</h3>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'who' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'who' && (
                  <div className="bg-white rounded-xl p-5 mt-3 border-l-4 border-[#009FD6] shadow-sm">
                    <p className="text-gray-700 leading-relaxed">{displayContent.who_we_are}</p>
                  </div>
                )}
              </div>

              {/* Hangi Sorunu Çözüyoruz */}
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'problem' ? null : 'problem')}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Hangi Sorunu Çözüyoruz?</h3>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'problem' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'problem' && (
                  <div className="bg-white rounded-xl p-5 mt-3 border-l-4 border-purple-600 shadow-sm">
                    <p className="text-gray-700 leading-relaxed">{displayContent.problem_we_solve}</p>
                  </div>
                )}
              </div>

              {/* Misyon */}
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'mission' ? null : 'mission')}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Misyonumuz</h3>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'mission' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'mission' && (
                  <div className="bg-white rounded-xl p-5 mt-3 border-l-4 border-green-600 shadow-sm">
                    <p className="text-gray-700 leading-relaxed">{displayContent.mission}</p>
                  </div>
                )}
              </div>

              {/* Vizyon */}
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'vision' ? null : 'vision')}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Vizyonumuz</h3>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'vision' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'vision' && (
                  <div className="bg-white rounded-xl p-5 mt-3 border-l-4 border-orange-600 shadow-sm">
                    <p className="text-gray-700 leading-relaxed">{displayContent.vision}</p>
                  </div>
                )}
              </div>

              {/* Features Grid */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-6">
                <h3 className="font-bold text-gray-900 text-center mb-4 text-lg">✨ Neler Yapabilirsiniz?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-[#009FD6]" />
                      <h4 className="font-bold text-gray-900 text-sm">Polit & Fast</h4>
                    </div>
                    <p className="text-xs text-gray-600">Paylaş, etkileş, görüşlerini bildir</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-gray-900 text-sm">Yorum</h4>
                    </div>
                    <p className="text-xs text-gray-600">Tartışmalara katıl, fikrini paylaş</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-gray-900 text-sm">Topluluk</h4>
                    </div>
                    <p className="text-xs text-gray-600">Takip et, takipçi kazan</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                      <h4 className="font-bold text-gray-900 text-sm">Gündem</h4>
                    </div>
                    <p className="text-xs text-gray-600">Trendleri keşfet, oy kullan</p>
                  </div>
                </div>
              </div>

              {/* Slogan */}
              <div className="bg-gradient-to-r from-[#009FD6] to-[#0077B6] rounded-xl p-5 mb-6 shadow-lg">
                <p className="text-white text-center font-bold text-base">
                  ✨ Özgür, açık, şeffaf siyaset, bağımsız medya! ✨
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Action */}
        <div className="px-8 py-6 bg-gray-50 rounded-b-3xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#009FD6] to-[#0077B6] hover:from-[#0077B6] hover:to-[#005A8C] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            Keşfetmeye Başla 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
