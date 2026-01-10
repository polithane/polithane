/**
 * Teşkilat Mesajlaşma Sayfası
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { organization } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { MessageSquare, Send, ArrowLeft, Users, Search, Loader2 } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';

export const OrgMessagesPage = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchThreads();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.thread_id);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await organization.getMessageThreads();
      if (response.success) {
        setThreads(response.threads || []);
      }
    } catch (error) {
      console.error('Threads fetch error:', error);
      toast.error('Thread listesi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId) => {
    try {
      const response = await organization.getMessages(threadId);
      if (response.success) {
        setMessages(response.messages || []);
      }
    } catch (error) {
      console.error('Messages fetch error:', error);
      toast.error('Mesajlar alınamadı.');
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await organization.getContacts();
      if (response.success) {
        setContacts(response.contacts || []);
      }
    } catch (error) {
      console.error('Contacts fetch error:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // Yeni mesaj mı yoksa cevap mı?
    const receiverId = selectedThread?.sender_id === user.id 
      ? selectedThread.receiver_id 
      : selectedThread?.sender_id || selectedContact?.id;

    if (!receiverId) {
      toast.error('Alıcı seçilmedi.');
      return;
    }

    try {
      setSending(true);
      const response = await organization.sendMessage({
        receiverId,
        message: messageText,
        threadId: selectedThread?.thread_id,
        isReply: !!selectedThread,
      });

      if (response.success) {
        setMessageText('');
        
        if (selectedThread) {
          // Mevcut thread'e mesaj eklendi
          await fetchMessages(selectedThread.thread_id);
          await fetchThreads();
        } else {
          // Yeni thread oluşturuldu
          setShowNewMessage(false);
          setSelectedContact(null);
          await fetchThreads();
        }
        
        toast.success('Mesaj gönderildi.');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(error.message || 'Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const handleNewMessage = (contact) => {
    setSelectedContact(contact);
    setSelectedThread(null);
    setMessages([]);
    setShowNewMessage(false);
  };

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a
              href="/organization"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </a>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Teşkilat Mesajları</h1>
              <p className="text-sm text-gray-600">Hiyerarşiye uygun mesajlaşma</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="flex items-center gap-2 bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            <MessageSquare className="w-5 h-5" />
            Yeni Mesaj
          </button>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thread Listesi */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-gray-200 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Konuşmalar</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Henüz mesaj yok</p>
                </div>
              ) : (
                threads.map((thread) => {
                  const isMe = thread.sender_id === user.id;
                  const otherUser = isMe
                    ? { name: thread.receiver_name, username: thread.receiver_username, avatar: thread.receiver_avatar }
                    : { name: thread.sender_name, username: thread.sender_username, avatar: thread.sender_avatar };

                  return (
                    <button
                      key={thread.thread_id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                        selectedThread?.thread_id === thread.thread_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar src={otherUser.avatar} size="40px" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 truncate">{otherUser.name}</p>
                            {thread.unread_count > 0 && (
                              <span className="bg-primary-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-1">@{otherUser.username}</p>
                          <p className="text-sm text-gray-600 truncate">{thread.message}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Mesaj Alanı */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 h-[calc(100vh-200px)] flex flex-col">
            {selectedThread || selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                  {selectedThread && (() => {
                    const isMe = selectedThread.sender_id === user.id;
                    const otherUser = isMe
                      ? { name: selectedThread.receiver_name, username: selectedThread.receiver_username, avatar: selectedThread.receiver_avatar }
                      : { name: selectedThread.sender_name, username: selectedThread.sender_username, avatar: selectedThread.sender_avatar };
                    return (
                      <>
                        <Avatar src={otherUser.avatar} size="40px" />
                        <div>
                          <p className="font-bold text-gray-900">{otherUser.name}</p>
                          <p className="text-xs text-gray-500">@{otherUser.username}</p>
                        </div>
                      </>
                    );
                  })()}
                  {selectedContact && (
                    <>
                      <Avatar src={selectedContact.avatar_url} size="40px" />
                      <div>
                        <p className="font-bold text-gray-900">{selectedContact.full_name}</p>
                        <p className="text-xs text-gray-500">@{selectedContact.username}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => {
                    const isMyMessage = msg.sender_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMyMessage
                              ? 'bg-primary-blue text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMyMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="bg-primary-blue text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold">Bir konuşma seçin</p>
                  <p className="text-sm">veya yeni mesaj başlatın</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Yeni Mesaj Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900">Yeni Mesaj</h3>
                <button
                  onClick={() => setShowNewMessage(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kişi ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredContacts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Mesaj gönderebileceğiniz kişi bulunamadı</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleNewMessage(contact)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Avatar src={contact.avatar_url} size="40px" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{contact.full_name}</p>
                      <p className="text-xs text-gray-500">@{contact.username}</p>
                      {contact.province && (
                        <p className="text-xs text-gray-400">
                          {contact.province} {contact.district && `/ ${contact.district}`}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgMessagesPage;
