import { useState, useEffect } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatTimeAgo } from '../utils/formatters';
import { mockUsers } from '../mock/users';
import { mockConversations, mockMessages, generateMockMessages } from '../mock/messages';
import { Search, Check, CheckCheck } from 'lucide-react';

export const MessagesPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sadece normal mesajları göster (istekler hariç)
  const regularConversations = mockConversations.filter(c => c.message_type === 'regular');
  
  // Filtrelenmiş konuşmalar
  const filteredConversations = searchQuery
    ? regularConversations.filter(c => {
        const user = mockUsers.find(u => u.user_id === c.participant_id);
        return user?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : regularConversations;
  
  // Konuşma seçildiğinde mesajları yükle
  useEffect(() => {
    if (selectedConv) {
      const conversationMessages = mockMessages[selectedConv.conversation_id] || 
                                   generateMockMessages(selectedConv.conversation_id, 15);
      setMessages(conversationMessages);
    }
  }, [selectedConv]);
  
  // Mesaj gönder
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    const newMsg = {
      message_id: Date.now(),
      conversation_id: selectedConv.conversation_id,
      sender_id: 'currentUser',
      receiver_id: selectedConv.participant_id,
      message_text: newMessage,
      created_at: new Date().toISOString(),
      is_read: false
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4 h-[700px]">
          {/* Konuşma Listesi */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-3">Mesajlar</h2>
              {/* Arama */}
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
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-gray-500">
                    {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz mesaj yok'}
                  </p>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const user = mockUsers.find(u => u.user_id === conv.participant_id);
                  if (!user) return null;
                  
                  return (
                    <div
                      key={conv.conversation_id}
                      onClick={() => setSelectedConv(conv)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConv?.conversation_id === conv.conversation_id ? 'bg-blue-50' : ''
                      } ${conv.unread_count > 0 ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar 
                            src={user.profile_image} 
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
                            <span className="font-semibold truncate text-sm">{user.full_name}</span>
                            {conv.unread_count > 0 && (
                              <Badge variant="danger" size="small">{conv.unread_count}</Badge>
                            )}
                          </div>
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {conv.last_message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(conv.last_message_time)}</p>
                          {conv.is_muted && (
                            <span className="text-xs text-gray-400">🔇 Sessize alındı</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Mesaj Thread */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
            {selectedConv ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={mockUsers.find(u => u.user_id === selectedConv.participant_id)?.profile_image} 
                      size="40px"
                      verified={mockUsers.find(u => u.user_id === selectedConv.participant_id)?.verification_badge}
                    />
                    <div>
                      <h3 className="font-semibold">
                        {mockUsers.find(u => u.user_id === selectedConv.participant_id)?.full_name}
                      </h3>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isFromMe = message.sender_id === 'currentUser';
                      const user = isFromMe ? null : mockUsers.find(u => u.user_id === selectedConv.participant_id);
                      
                      return (
                        <div
                          key={message.message_id}
                          className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isFromMe && (
                            <Avatar 
                              src={user?.profile_image} 
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
                </div>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Mesajınızı yazın..." 
                      className="flex-1"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      Gönder
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">Bir konuşma seçin</p>
                  <p className="text-sm text-gray-400">Mesajlarınızı görmek için sol taraftan bir konuşma seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
