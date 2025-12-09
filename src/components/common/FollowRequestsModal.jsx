import { useState } from 'react';
import { X, Check, XCircle } from 'lucide-react';
import { Avatar } from './Avatar';
import { getFollowRequests } from '../../mock/follows';
import { getUserTitle } from '../../utils/titleHelpers';
import { useNavigate } from 'react-router-dom';

export const FollowRequestsModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(getFollowRequests('currentUser'));
  
  if (!isOpen) return null;
  
  const handleAccept = (userId) => {
    // TODO: API çağrısı - isteği kabul et
    console.log('Takip isteği kabul edildi:', userId);
    setRequests(requests.filter(r => r.user_id !== userId));
  };
  
  const handleReject = (userId) => {
    // TODO: API çağrısı - isteği reddet
    console.log('Takip isteği reddedildi:', userId);
    setRequests(requests.filter(r => r.user_id !== userId));
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Takip İstekleri</h3>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* İstek Listesi */}
        <div className="flex-1 overflow-y-auto p-4">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Takip isteği yok</p>
              <p className="text-sm text-gray-400 mt-2">Yeni istekler burada görünecek</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(user => (
                <div key={user.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div
                    onClick={() => {
                      navigate(`/profile/${user.user_id}`);
                      onClose();
                    }}
                    className="cursor-pointer"
                  >
                    <Avatar 
                      src={user.avatar_url || user.profile_image} 
                      size="48px"
                      verified={user.verification_badge}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4
                      onClick={() => {
                        navigate(`/profile/${user.user_id}`);
                        onClose();
                      }}
                      className="font-semibold text-sm text-gray-900 hover:text-primary-blue cursor-pointer truncate"
                    >
                      {user.full_name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {getUserTitle(user, true)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(user.request_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(user.user_id)}
                      className="bg-primary-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Kabul
                    </button>
                    <button
                      onClick={() => handleReject(user.user_id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {requests.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              <span className="font-semibold text-primary-blue">{requests.length}</span> takip isteği bekliyor
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
