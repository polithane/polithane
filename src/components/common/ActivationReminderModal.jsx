import { X, Mail, CheckCircle } from 'lucide-react';

export const ActivationReminderModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-gray-900 text-center mb-3">
          Mail Aktivasyonu Gerekli
        </h2>

        {/* Description */}
        <div className="space-y-3 text-gray-600 text-center mb-6">
          <p>
            Site özelliklerini ve diğer işlemleri yapabilmek için <strong>üyeliğinizi aktive etmeniz</strong> gerekmektedir.
          </p>
          <p>
            Kayıt olduğunuz e-posta adresinize gönderilen <strong>aktivasyon linkine</strong> tıklayarak üyeliğinizi aktive edebilirsiniz.
          </p>
        </div>

        {/* Features List */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Aktivasyon sonrası yapabilecekleriniz:
          </p>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Polit ve Fast paylaşımları</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Yorum yapma ve beğenme</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Mesajlaşma</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Takip ve takipçi</span>
            </li>
          </ul>
        </div>

        {/* Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-600 text-center">
            📧 E-posta gelmedi mi? <strong>Spam/Gereksiz</strong> klasörünü kontrol edin.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all"
        >
          Anladım
        </button>
      </div>
    </div>
  );
};
