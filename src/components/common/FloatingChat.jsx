import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, Search, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { formatTimeAgo } from '../../utils/formatters';
import { isUiVerifiedUser } from '../../utils/titleHelpers';
import { messages as messagesApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export const FloatingChat = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list'); // list | requests | chat
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

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

  const totalUnread = useMemo(() => {
    return (conversations || [])
      .filter((c) => c?.message_type !== 'request')
      .reduce((sum, c) => sum + (Number(c?.unread_count || 0) || 0), 0);
  }, [conversations]);

  const requestCount = useMemo(() => {
    return (conversations || []).filter((c) => c?.message_type === 'request').length;
  }, [conversations]);

  const visibleConversations = useMemo(() => {
    const list = (conversations || []).filter((c) => (view === 'requests' ? c.message_type === 'request' : c.message_type !== 'request'));
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => {
      const u = c?.participant;
      return (u?.full_name || '').toLowerCase().includes(q) || (c?.last_message || '').toLowerCase().includes(q);
    });
  }, [conversations, view, searchQuery]);

  const loadConversations = async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const r = await messagesApi.getConversations();
      if (r?.success) setConversations(r.data || []);
    } catch {
      setConversations([]);
    }
  };

  const loadMessages = async (otherId) => {
    if (!isAuthenticated || !otherId) return;
    setLoading(true);
    try {
      const r = await messagesApi.getMessages(otherId);
      setMessages(r?.data || []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      await loadConversations();
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!selectedConversation) return;
    setView('chat');
    loadMessages(selectedConversation.participant_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.participant_id]);

  const handleOpen = () => {
    if (!isAuthenticated) {
      navigate('/login-new');
      return;
    }
    setIsOpen(true);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation?.participant_id) return;
    try {
      const sent = await messagesApi.send(selectedConversation.participant_id, newMessage.trim());
      if (sent?.success && sent.data) {
        setMessages((prev) => [...prev, sent.data]);
        setNewMessage('');
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        await loadConversations();
      }
    } catch {
      // no-op (page version has detailed errors)
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpen}
          className="relative bg-gradient-to-br from-primary-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform hover:scale-110"
        >
          <MessageCircle className="w-7 h-7" fill="currentColor" />
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </div>
          )}
        </button>
      </div>
    );
  }

  const title =
    view === 'chat' && selectedConversation?.participant
      ? selectedConversation.participant.full_name
      : view === 'requests'
        ? 'Mesaj İstekleri'
        : 'Mesajlar';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <MessageCircle className="w-6 h-6" />
          <div className="min-w-0">
            <h3 className="font-bold text-lg truncate">{title}</h3>
            {view === 'list' && <p className="text-xs text-blue-100">{totalUnread} okunmamış</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            title="Tüm mesajlar"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          {view === 'chat' && (
            <button
              type="button"
              onClick={() => {
                setView('list');
                setSelectedConversation(null);
                setMessages([]);
              }}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
              title="Geri"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button type="button" onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1.5 transition-colors" title="Kapat">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {(view === 'list' || view === 'requests') && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${view === 'list' ? 'border-b-2 border-primary-blue text-primary-blue' : 'text-gray-600 hover:text-primary-blue'}`}
            >
              Mesajlar
            </button>
            <button
              type="button"
              onClick={() => setView('requests')}
              className={`flex-1 px-4 py-3 text-sm font-semibold relative ${
                view === 'requests' ? 'border-b-2 border-primary-blue text-primary-blue' : 'text-gray-600 hover:text-primary-blue'
              }`}
            >
              İstekler
              {requestCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {requestCount}
                </span>
              )}
            </button>
          </div>

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

          <div className="flex-1 overflow-y-auto">
            {visibleConversations.map((c) => {
              const u = c?.participant;
              if (!u) return null;
              return (
                <button
                  type="button"
                  key={c.conversation_id}
                  onClick={() => setSelectedConversation(c)}
                  className={`w-full text-left flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                    c.unread_count > 0 ? 'bg-blue-50' : ''
                  }`}
                >
                  <Avatar src={u.avatar_url || u.profile_image} size="48px" verified={isUiVerifiedUser(u)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm text-gray-900 truncate">{u.full_name}</div>
                      <div className="text-xs text-gray-500 flex-shrink-0">{c.last_message_time ? formatTimeAgo(c.last_message_time) : ''}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm truncate text-gray-600">{c.last_message || 'Mesaj yok'}</div>
                      {c.unread_count > 0 && (
                        <span className="flex-shrink-0 ml-2 bg-primary-blue text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {visibleConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">{view === 'requests' ? 'Mesaj isteği yok' : 'Henüz mesaj yok'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'chat' && selectedConversation && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {loading ? (
              <div className="text-center text-sm text-gray-500 py-10">Yükleniyor…</div>
            ) : (
              (messages || []).map((m) => {
                const isFromMe = String(m.sender_id) === String(user?.id);
                const media = safeParseMessage(m);
                return (
                  <div key={m.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isFromMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isFromMe ? 'bg-primary-blue text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                        }`}
                      >
                        {media?.type === 'image' ? (
                          <div className="space-y-2">
                            {media.text ? <div className="text-sm whitespace-pre-wrap break-words">{media.text}</div> : null}
                            <a href={media.url} target="_blank" rel="noreferrer">
                              <img src={media.url} alt="Resim" className="rounded-xl max-w-full max-h-[220px] object-contain border border-white/20" />
                            </a>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1 text-xs text-gray-400">
                        <span>{m.created_at ? formatTimeAgo(m.created_at) : ''}</span>
                        {isFromMe && (m.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Mesaj yaz..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="bg-primary-blue hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full p-2 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
