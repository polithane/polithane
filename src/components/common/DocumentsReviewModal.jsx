import { X, FileCheck, Clock, Mail, MessageCircle } from 'lucide-react';

export const DocumentsReviewModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6 p-6 flex flex-col items-center justify-center relative">
          <FileCheck className="w-12 h-12 mb-3 drop-shadow-md animate-pulse" />
          <h2 className="text-2xl font-black text-center mb-1 drop-shadow-md">
            Evraklarınız İnceleniyor!
          </h2>
          <p className="text-sm text-white/90 text-center drop-shadow-sm">
            Başvurunuz güvenli bir şekilde alındı
          </p>
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Clock className="w-3 h-3" /> Beklemede
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3 text-gray-700 text-center mb-6">
          <p className="font-semibold text-gray-900">
            ✅ Mail aktivasyonu için teşekkürler!
          </p>
          <p>
            Değerli kullanıcımız, belgeleriniz ekibimiz tarafından <strong>özenle ve titizlikle</strong> inceleniyor.
          </p>
          <p>
            Bu inceleme süreci, platformumuzun <strong>güvenliğini</strong> ve <strong>doğru politika yapılmasını</strong> sağlamak için zorunludur.
          </p>
          <p>
            <strong>Hızla</strong> incelemeyi bitireceğiz ve size <strong>e-posta ve SMS</strong> yoluyla bilgi vereceğiz.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                İnceleme süresince yapabilecekleriniz:
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Profil bilgilerinizi tamamlayabilirsiniz</li>
                <li>• Diğer kullanıcıları takip edebilirsiniz</li>
                <li>• Gündemi ve politlari okuyabilirsiniz</li>
                <li>• Haberleri takip edebilirsiniz</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wait Message */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-amber-800 text-center font-medium">
            ⏳ Beklettiğimiz için özür dileriz. Bu süreç, platformun kalitesini korumak için gereklidir.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          Anladım
        </button>
      </div>
    </div>
  );
};
