import { X, Mail, CheckCircle, Sparkles } from 'lucide-react';

export const ActivationReminderModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in duration-300 overflow-hidden">
        {/* Header with Gradient */}
        <div className="relative bg-gradient-to-br from-[#009FD6] to-[#0077B6] px-6 py-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all"
            aria-label="Kapat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-4 h-4 text-yellow-800" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-white text-center mb-2">
            E-posta Aktivasyonu Gerekli
          </h2>
          <p className="text-blue-50 text-center text-sm opacity-90">
            Polithane'nin tüm özelliklerini kullanabilmek için
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Description */}
          <div className="text-gray-700 text-center mb-6 leading-relaxed">
            <p className="mb-3">
              <strong className="text-gray-900">E-posta adresinize</strong> gönderilen aktivasyon linkine tıklayarak hesabınızı aktifleştirin.
            </p>
            <p className="text-sm text-gray-600">
              Aktivasyon sonrası tüm özellikleri kullanabileceksiniz!
            </p>
          </div>

          {/* Features List */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 mb-6 border border-blue-100">
            <p className="text-sm font-bold text-[#009FD6] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Aktivasyon Sonrası Yapabilecekleriniz:
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 bg-[#009FD6] rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <span><strong>Polit</strong> ve <strong>Fast</strong> paylaşımları</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 bg-[#009FD6] rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <span>Yorum yapma ve beğenme</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 bg-[#009FD6] rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <span>Mesajlaşma ve iletişim</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 bg-[#009FD6] rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <span>Takip etme ve takipçi kazanma</span>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              <strong>💡 İpucu:</strong> E-posta gelmedi mi? <strong>Spam/Gereksiz</strong> klasörünü kontrol etmeyi unutmayın!
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#009FD6] to-[#0077B6] hover:from-[#0077B6] hover:to-[#005A8C] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transform hover:scale-[1.02]"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
