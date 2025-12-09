import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Settings, Archive, Search, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { Avatar } from './Avatar';
import { mockConversations, mockMessages, generateMockMessages, mockMessageSettings } from '../../mock/messages';
import { mockUsers } from '../../mock/users';
import { formatTimeAgo } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const FloatingChat = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list'); // list, chat, requests, settings
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toplam okunmamış mesaj sayısı
  const totalUnread = mockConversations
    .filter(c => c.message_type === 'regular')
    .reduce((sum, c) => sum + c.unread_count, 0);
  
  const requestCount = mockConversations.filter(c => c.message_type === 'request').length;
  
  // Konuşma seçildiğinde mesajları yükle
  useEffect(() => {
    if (selectedConversation) {
      const conversationMessages = mockMessages[selectedConversation.conversation_id] || 
                                   generateMockMessages(selectedConversation.conversation_id, 15);
      setMessages(conversationMessages);
      setView('chat');
    }
  }, [selectedConversation]);
  
  // Mesaj gönder
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const newMsg = {
      message_id: Date.now(),
      conversation_id: selectedConversation.conversation_id,
      sender_id: 'currentUser',
      receiver_id: selectedConversation.participant_id,
      message_text: newMessage,
      created_at: new Date().toISOString(),
      is_read: false
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };
  
  // Filtrelenmiş konuşmalar
  const regularConversations = mockConversations.filter(c => c.message_type === 'regular');
  const requestConversations = mockConversations.filter(c => c.message_type === 'request');
  
  const filteredConversations = view === 'requests' ? requestConversations : regularConversations;
  const displayConversations = searchQuery
    ? filteredConversations.filter(c => {
        const user = mockUsers.find(u => u.user_id === c.participant_id);
        return user?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : filteredConversations;
  
  if (!isOpen) {
    // Floating Button (Magnet)
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-br from-primary-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110"
        >
          <MessageCircle className="w-7 h-7" fill="currentColor" />
          
          {/* Bildirim Badge */}
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </div>
          )}
        </button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6" />
          <div>
            <h3 className="font-bold text-lg">
              {view === 'chat' && selectedConversation 
                ? mockUsers.find(u => u.user_id === selectedConversation.participant_id)?.full_name 
                : view === 'requests' 
                ? 'Mesaj İstekleri' 
                : view === 'settings'
                ? 'Mesaj Ayarları'
                : 'Mesajlar'}
            </h3>
            {view === 'list' && (
              <p className="text-xs text-blue-100">{totalUnread} okunmamış</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {view === 'chat' && (
            <button
              onClick={() => {
                setView('list');
                setSelectedConversation(null);
              }}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {view === 'list' && (
            <button
              onClick={() => setView('settings')}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* MESAJ LİSTESİ */}
      {view === 'list' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setView('list')}
              className="flex-1 px-4 py-3 text-sm font-semibold border-b-2 border-primary-blue text-primary-blue"
            >
              Mesajlar
            </button>
            <button
              onClick={() => setView('requests')}
              className="flex-1 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-primary-blue hover:bg-gray-100 transition-colors relative"
            >
              İstekler
              {requestCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {requestCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Arama */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Mesajlarda ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
          </div>
          
          {/* Konuşma Listesi */}
          <div className="flex-1 overflow-y-auto">
            {displayConversations.map(conversation => {
              const user = mockUsers.find(u => u.user_id === conversation.participant_id);
              if (!user) return null;
              
              return (
                <div
                  key={conversation.conversation_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                    conversation.unread_count > 0 ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar 
                      src={user.avatar_url || user.profile_image} 
                      size="48px"
                      verified={user.verification_badge}
                    />
                    {/* Online Status */}
                    {Math.random() > 0.5 && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">
                        {user.full_name}
                      </h4>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTimeAgo(conversation.last_message_time)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {conversation.last_message}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="flex-shrink-0 ml-2 bg-primary-blue text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    
                    {/* Sessize alınmış ise */}
                    {conversation.is_muted && (
                      <span className="text-xs text-gray-400 mt-1">🔇 Sessize alındı</span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {displayConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">
                  {view === 'requests' ? 'Mesaj isteği yok' : 'Henüz mesaj yok'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* MESAJ İSTEKLERİ */}
      {view === 'requests' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setView('list')}
              className="flex-1 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-primary-blue hover:bg-gray-100 transition-colors"
            >
              Mesajlar
            </button>
            <button
              onClick={() => setView('requests')}
              className="flex-1 px-4 py-3 text-sm font-semibold border-b-2 border-primary-blue text-primary-blue relative"
            >
              İstekler
              {requestCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {requestCount}
                </span>
              )}
            </button>
          </div>
          
          {/* İstek Listesi */}
          <div className="flex-1 overflow-y-auto">
            {requestConversations.map(conversation => {
              const user = mockUsers.find(u => u.user_id === conversation.participant_id);
              if (!user) return null;
              
              return (
                <div
                  key={conversation.conversation_id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar 
                      src={user.avatar_url || user.profile_image} 
                      size="48px"
                      verified={user.verification_badge}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900">
                        {user.full_name}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1">
                        {user.user_type === 'politician' ? 'Siyasetçi' : 'Kullanıcı'}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {conversation.last_message}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(conversation.last_message_time)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Aksiyon Butonları */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedConversation(conversation)}
                      className="flex-1 bg-primary-blue hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Kabul Et
                    </button>
                    <button
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
            
            {requestConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Mesaj isteği yok</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* SOHBET EKRANI */}
      {view === 'chat' && selectedConversation && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mesaj Alanı */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((message, index) => {
              const isFromMe = message.sender_id === 'currentUser';
              const user = isFromMe ? null : mockUsers.find(u => u.user_id === selectedConversation.participant_id);
              
              return (
                <div
                  key={message.message_id}
                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isFromMe && (
                    <Avatar 
                      src={user?.avatar_url || user?.profile_image} 
                      size="28px"
                      className="mr-2 flex-shrink-0"
                    />
                  )}
                  
                  <div className={`max-w-[70%] ${isFromMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isFromMe
                          ? 'bg-primary-blue text-white rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                      }`}
                    >
                      <p className="text-sm break-words">{message.message_text}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(message.created_at)}
                      </span>
                      {isFromMe && (
                        message.is_read 
                          ? <CheckCheck className="w-3 h-3 text-primary-blue" />
                          : <Check className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Mesaj Gönder */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Mesaj yaz..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-primary-blue hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full p-2 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AYARLAR */}
      {view === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Mesaj Alımı</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input type="radio" name="reception" defaultChecked={mockMessageSettings.message_reception === 'everyone'} />
                  <div>
                    <div className="font-medium text-sm">Herkese Açık</div>
                    <div className="text-xs text-gray-500">Herkes size mesaj gönderebilir</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input type="radio" name="reception" defaultChecked={mockMessageSettings.message_reception === 'friends'} />
                  <div>
                    <div className="font-medium text-sm">Sadece Takip Ettiklerim</div>
                    <div className="text-xs text-gray-500">Sadece takip ettikleriniz mesaj gönderebilir</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input type="radio" name="reception" defaultChecked={mockMessageSettings.message_reception === 'nobody'} />
                  <div>
                    <div className="font-medium text-sm">Herkese Kapalı</div>
                    <div className="text-xs text-gray-500">Kimse size mesaj gönderemez</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-3">Diğer Ayarlar</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div className="text-sm">Okundu bilgisi göster</div>
                  <input type="checkbox" defaultChecked={mockMessageSettings.show_read_receipts} className="w-5 h-5" />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div className="text-sm">Çevrimiçi durumu göster</div>
                  <input type="checkbox" defaultChecked={mockMessageSettings.show_online_status} className="w-5 h-5" />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div className="text-sm">Mesaj isteklerine izin ver</div>
                  <input type="checkbox" defaultChecked={mockMessageSettings.allow_message_requests} className="w-5 h-5" />
                </label>
              </div>
            </div>
            
            <button
              onClick={() => setView('list')}
              className="w-full bg-primary-blue hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
