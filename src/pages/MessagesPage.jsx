import { useState, useEffect } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatTimeAgo } from '../utils/formatters';
import { mockUsers } from '../mock/users';
import { mockConversations, mockMessages, generateMockMessages } from '../mock/messages';
import { Search, Send } from 'lucide-react';

export const MessagesPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter only regular conversations (not requests)
  const regularConversations = mockConversations.filter(c => c.message_type === 'regular');
  
  // Filter conversations by search query
  const filteredConversations = searchQuery
    ? regularConversations.filter(conv => {
        const user = mockUsers.find(u => u.user_id === conv.participant_id);
        return user?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               conv.last_message.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : regularConversations;
  
  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConv) {
      const conversationMessages = mockMessages[selectedConv.conversation_id] || 
                                   generateMockMessages(selectedConv.conversation_id, 15);
      setMessages(conversationMessages);
    }
  }, [selectedConv]);
  
  // Send message
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
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[600px]">
          {/* Konuşma Listesi */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-3">Mesajlar</h2>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mesajlarda ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map(conv => {
                const user = mockUsers.find(u => u.user_id === conv.participant_id);
                if (!user) return null;
                
                return (
                  <div
                    key={conv.conversation_id}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConv?.conversation_id === conv.conversation_id ? 'bg-blue-50' : ''
                    } ${conv.unread_count > 0 ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar 
                        src={user.profile_image} 
                        size="48px"
                        verified={user.verification_badge}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {user.full_name}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTimeAgo(conv.last_message_time)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {conv.last_message}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge variant="danger" size="small" className="ml-2 flex-shrink-0">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conv.is_muted && (
                          <span className="text-xs text-gray-400 mt-1">🔇 Sessize alındı</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-gray-500">
                    {searchQuery ? 'Sonuç bulunamadı' : 'Henüz mesaj yok'}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Mesaj Thread */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
            {selectedConv ? (
              <>
                {/* Header */}
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
                      <p className="text-xs text-gray-500">
                        {mockUsers.find(u => u.user_id === selectedConv.participant_id)?.user_type === 'politician' ? 'Siyasetçi' : 'Kullanıcı'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Messages Area */}
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
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-primary-blue hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg p-2 px-4 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      <span className="font-semibold">Gönder</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Bir konuşma seçin</p>
                  <p className="text-sm">Mesajlarınızı görüntülemek için sol taraftan bir konuşma seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
