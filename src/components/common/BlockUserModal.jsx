import { X, Ban, AlertTriangle } from 'lucide-react';
import { Avatar } from './Avatar';

export const BlockUserModal = ({ isOpen, onClose, user, onConfirm }) => {
  if (!isOpen || !user) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <Avatar 
            src={user.profile_image} 
            size="48px"
            verified={user.verification_badge}
          />
          <div>
            <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
            <p className="text-sm text-gray-500">@{user.username || user.user_id}</p>
          </div>
        </div>
        
        {/* Açıklama */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-lg text-gray-900 mb-2 text-center">
            Bu kullanıcıyı engellemek istediğinize emin misiniz?
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <Ban className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span>Sizi takip edemeyecek ve paylaşımlarınızı göremeyecek</span>
            </li>
            <li className="flex items-start gap-2">
              <Ban className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span>Size mesaj gönderemeyecek</span>
            </li>
            <li className="flex items-start gap-2">
              <Ban className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span>Paylaşımlarınıza yorum yapamayacak</span>
            </li>
          </ul>
        </div>
        
        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => {
              onConfirm(user.user_id);
              onClose();
            }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Engelle
          </button>
        </div>
      </div>
    </div>
  );
};
