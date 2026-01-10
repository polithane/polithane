import { X, PartyPopper, Users, MessageCircle, TrendingUp, Zap } from 'lucide-react';

export const WelcomePopup = ({ isOpen, onClose, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Welcome Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-gray-900 text-center mb-2">
          Hoşgeldiniz{userName ? `, ${userName}` : ''}! 🎉
        </h2>

        <p className="text-gray-600 text-center mb-6">
          <strong>Polithane</strong> ailesine katıldığınız için çok mutluyuz!
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Polit & Fast</h3>
            </div>
            <p className="text-xs text-gray-600">Paylaş, etkileş, görüşlerini bildir</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900 text-sm">Yorum</h3>
            </div>
            <p className="text-xs text-gray-600">Tartışmalara katıl, fikrini paylaş</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-sm">Topluluk</h3>
            </div>
            <p className="text-xs text-gray-600">Takip et, takipçi kazan</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900 text-sm">Gündem</h3>
            </div>
            <p className="text-xs text-gray-600">Trendleri keşfet, oy kullan</p>
          </div>
        </div>

        {/* Slogan */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 mb-6">
          <p className="text-white text-center font-semibold text-sm">
            ✨ Özgür, açık, şeffaf siyaset, bağımsız medya! ✨
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          Keşfetmeye Başla 🚀
        </button>
      </div>
    </div>
  );
};
