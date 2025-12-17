import { useMemo, useState, useEffect, useRef } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatTimeAgo } from '../utils/formatters';
import { Search, Send, AlertCircle, Image as ImageIcon, Trash2, Check, CheckCheck } from 'lucide-react';
import { messages as messagesApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { apiCall } from '../utils/api';

export const MessagesPage = () => {
  const { user } = useAuth();
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('regular'); // regular | requests
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileRef = useRef(null);
  
  const [conversations, setConversations] = useState([]);
  
  const filteredConversations = useMemo(() => {
    const base = (conversations || []).filter((c) => (tab === 'requests' ? c.message_type === 'request' : c.message_type !== 'request'));
    if (!searchQuery) return base;
    return base.filter((conv) => {
      const u = conv.participant;
      return (
        (u?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv?.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [conversations, tab, searchQuery]);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConv) {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const r = await messagesApi.getMessages(selectedConv.participant_id);
          if (r?.success) setMessages(r.data || []);
          setTimeout(scrollToBottom, 100);
        } catch (err) {
          console.error('Error loading messages:', err);
          setError('Mesajlar yüklenirken bir hata oluştu');
          setMessages([]);
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [selectedConv]);

  // Load conversations
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const r = await messagesApi.getConversations();
        if (r?.success) setConversations(r.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user?.id]);
  
  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    try {
      const sent = await messagesApi.send(selectedConv.participant_id, newMessage.trim());
      if (sent?.success) {
        setMessages((prev) => [...prev, sent.data]);
      }
      setNewMessage('');
      
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Mesaj gönderilemedi');
    }
  };

  const safeParseMessage = (message) => {
    const raw = String(message?.content || '');
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && obj.type === 'image' && obj.url) return obj;
      return null;
    } catch {
      return null;
    }
  };

  const handlePickImage = () => {
    setError(null);
    fileRef.current?.click();
  };

  const handleSendImage = async (file) => {
    if (!file || !selectedConv) return;
    try {
      setError(null);
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowed.has(file.type)) throw new Error('Sadece JPG / PNG / WEBP gönderebilirsiniz.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Resim çok büyük (max 5MB).');

      const toDataUrl = (f) =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => reject(new Error('Dosya okunamadı.'));
          r.readAsDataURL(f);
        });
      const dataUrl = await toDataUrl(file);

      const up = await apiCall('/api/storage/upload', {
        method: 'POST',
        body: JSON.stringify({ bucket: 'uploads', folder: 'messages', dataUrl, contentType: file.type }),
      });
      const url = up?.data?.publicUrl;
      if (!url) throw new Error('Resim yüklenemedi.');

      const sent = await messagesApi.send(selectedConv.participant_id, '', { kind: 'image', url });
      if (sent?.success) setMessages((prev) => [...prev, sent.data]);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      setError(e?.message || 'Resim gönderilemedi');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRejectRequest = async (conv) => {
    try {
      await messagesApi.rejectRequest(conv.participant_id);
      setConversations((prev) => (prev || []).filter((c) => c.participant_id !== conv.participant_id));
      if (selectedConv?.participant_id === conv.participant_id) {
        setSelectedConv(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e?.message || 'İstek reddedilemedi.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[600px]">
          {/* Konuşma Listesi */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-3">Mesajlar</h2>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setTab('regular')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border ${
                    tab === 'regular' ? 'bg-blue-50 border-blue-200 text-primary-blue' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Mesajlar
                </button>
                <button
                  type="button"
                  onClick={() => setTab('requests')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border ${
                    tab === 'requests' ? 'bg-blue-50 border-blue-200 text-primary-blue' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  İstekler
                </button>
              </div>
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
                try {
                  if (!conv || !conv.conversation_id) return null;
                  
                  const user = conv.participant;
                  if (!user) return null;
                  
                  return (
                    <div
                      key={conv.conversation_id}
                      onClick={() => {
                        try {
                          setSelectedConv(conv);
                          setError(null);
                        } catch (err) {
                          console.error('Error selecting conversation:', err);
                          setError('Konuşma açılamadı');
                        }
                      }}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConv?.conversation_id === conv.conversation_id ? 'bg-blue-50' : ''
                      } ${conv.unread_count > 0 ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar 
                          src={user.avatar_url || user.profile_image} 
                          size="48px"
                          verified={isUiVerifiedUser(user)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                              {user.full_name || 'Bilinmeyen Kullanıcı'}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {conv.last_message_time ? formatTimeAgo(conv.last_message_time) : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {conv.last_message || 'Mesaj yok'}
                            </p>
                            {conv.unread_count > 0 && (
                              <Badge variant="danger" size="small" className="ml-2 flex-shrink-0">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          {tab === 'requests' && (
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectRequest(conv);
                                }}
                              >
                                Reddet
                              </button>
                            </div>
                          )}
                          {conv.is_muted && (
                            <span className="text-xs text-gray-400 mt-1">🔇 Sessize alındı</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } catch (err) {
                  console.error('Error rendering conversation:', err);
                  return null;
                }
              })}
              {filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-gray-500">
                    {searchQuery ? 'Sonuç bulunamadı' : tab === 'requests' ? 'Mesaj isteği yok' : 'Henüz mesaj yok'}
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
                      src={selectedConv.participant?.avatar_url || selectedConv.participant?.profile_image} 
                      size="40px"
                      verified={isUiVerifiedUser(selectedConv.participant)}
                    />
                    <div>
                      <h3 className="font-semibold">
                        {selectedConv.participant?.full_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {selectedConv.participant?.user_type || 'Kullanıcı'}
                      </p>
                    </div>
                    {selectedConv.message_type === 'request' && (
                      <div className="ml-auto text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                        Mesaj isteği (cevap verirseniz sohbet açılır)
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                      <button 
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-3"></div>
                        <p className="text-gray-500">Mesajlar yükleniyor...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        try {
                          if (!message || !message.id) return null;
                          
                          const isFromMe = message.sender_id === user?.id;
                          const otherUser = isFromMe ? null : selectedConv?.participant;
                          const media = safeParseMessage(message);
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isFromMe && (
                                <Avatar 
                                  src={otherUser?.avatar_url || otherUser?.profile_image} 
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
                                  {media?.type === 'image' ? (
                                    <div className="space-y-2">
                                      {media.text ? <div className="text-sm break-words whitespace-pre-wrap">{media.text}</div> : null}
                                      <a href={media.url} target="_blank" rel="noreferrer">
                                        <img
                                          src={media.url}
                                          alt="Gönderilen resim"
                                          className="rounded-xl max-w-full max-h-[260px] object-contain border border-white/20"
                                        />
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-sm break-words whitespace-pre-wrap">{message.content || ''}</p>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1 px-1">
                                  <span className="text-xs text-gray-400">
                                    {message.created_at ? formatTimeAgo(message.created_at) : ''}
                                  </span>
                                  {isFromMe && (
                                    <span className="inline-flex items-center gap-1 text-gray-400" title={message.is_read ? 'Görüldü' : 'Gönderildi'}>
                                      {message.is_read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    </span>
                                  )}
                                  {isFromMe && (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600"
                                      title="Mesajı sil"
                                      onClick={async () => {
                                        try {
                                          await messagesApi.delete(message.id);
                                          setMessages((prev) => prev.filter((m) => m.id !== message.id));
                                        } catch (e) {
                                          setError(e?.message || 'Mesaj silinemedi');
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        } catch (err) {
                          console.error('Error rendering message:', err);
                          return null;
                        }
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                {/* Message Input */}
                <div className="p-4 border-t">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleSendImage(e.target.files?.[0])}
                  />
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
                      type="button"
                      onClick={handlePickImage}
                      className="bg-white border border-gray-300 text-gray-800 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                      title="Resim gönder"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
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
