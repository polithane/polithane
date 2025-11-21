import { useState } from 'react';
import { Search, Bell, MessageCircle, User, LogIn } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { AnimatedSlogan } from '../common/AnimatedSlogan';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();
  const [notificationCount] = useState(5);
  const [unreadMessages] = useState(3);
  const [isLoggedIn] = useState(false); // Mock - gerçekte auth context'ten gelecek
  
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[60px]">
      <div className="container-main h-full flex items-center justify-between">
        {/* Logo ve Slogan */}
        <div 
          className="cursor-pointer flex items-center"
          onClick={() => navigate('/')}
        >
          <AnimatedSlogan />
        </div>
        
        {/* Sağ Aksiyonlar */}
        <div className="flex items-center gap-4">
          {/* Arama */}
          <button
            onClick={() => navigate('/search')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          
          {isLoggedIn ? (
            <>
                {/* Bildirimler */}
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="danger" 
                      size="small"
                      className="absolute -top-1 -right-1"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </button>
                
                {/* Mesajlar */}
                <button
                  onClick={() => navigate('/messages')}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                  {unreadMessages > 0 && (
                    <Badge 
                      variant="danger" 
                      size="small"
                      className="absolute -top-1 -right-1"
                    >
                      {unreadMessages}
                    </Badge>
                  )}
                </button>
              
              {/* Kullanıcı Avatar */}
              <button onClick={() => navigate('/profile/1')}>
                <Avatar src="/assets/mock/avatars/user1.jpg" size="36px" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-[#0088bb] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Giriş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
