import { useMemo, useState, useEffect, useRef } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { formatTimeAgo } from '../utils/formatters';
import { Search, Send, AlertCircle, Image as ImageIcon, Trash2, Check, CheckCheck } from 'lucide-react';
import { messages as messagesApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { getUserTitle, isUiVerifiedUser } from '../utils/titleHelpers';
import { apiCall } from '../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';

export const MessagesPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('regular'); // regular | requests
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileRef = useRef(null);
  const messageInputRef = useRef(null);
  const focusOnSelectRef = useRef(false);
  
  const [conversations, setConversations] = useState([]);
  const convPollRef = useRef(null);
  const msgPollRef = useRef(null);

  // Hard guard: messages require authentication.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login-new');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeContacts, setComposeContacts] = useState([]);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState([]);
  const [composeSuggestions, setComposeSuggestions] = useState([]);
  const [composeFollowingIds, setComposeFollowingIds] = useState(new Set());
  const [composeMutualIds, setComposeMutualIds] = useState(new Set());
  const composeTimerRef = useRef(null);
  
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

  // Optimistically clear unread badge when opening a conversation.
  useEffect(() => {
    if (!selectedConv?.participant_id) return;
    setConversations((prev) =>
      (prev || []).map((c) =>
        String(c?.participant_id) === String(selectedConv.participant_id) ? { ...c, unread_count: 0 } : c
      )
    );
  }, [selectedConv?.participant_id]);

  // Poll messages for the active conversation (new message + read status).
  useEffect(() => {
    if (!selectedConv?.participant_id) return;
    if (msgPollRef.current) clearInterval(msgPollRef.current);
    const otherId = String(selectedConv.participant_id);
    const tick = async () => {
      try {
        if (document?.hidden) return;
        const r = await messagesApi.getMessages(otherId);
        if (!r?.success) return;
        const next = Array.isArray(r.data) ? r.data : [];
        setMessages((prev) => {
          const base = Array.isArray(prev) ? prev : [];
          const merged = base.slice();
          const indexById = new Map(merged.map((m, i) => [String(m?.id || ''), i]));
          for (const m of next) {
            const id = String(m?.id || '');
            if (!id) continue;
            const at = indexById.get(id);
            if (at !== undefined) {
              merged[at] = { ...merged[at], ...m };
            } else {
              indexById.set(id, merged.length);
              merged.push(m);
            }
          }
          merged.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
          return merged;
        });
      } catch {
        // ignore
      }
    };
    msgPollRef.current = setInterval(tick, 8000);
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
      msgPollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConv?.participant_id]);

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

  // Poll conversations (unread count + latest message)
  useEffect(() => {
    if (!user?.id) return;
    if (convPollRef.current) clearInterval(convPollRef.current);
    const tick = async () => {
      try {
        if (document?.hidden) return;
        const r = await messagesApi.getConversations();
        if (r?.success) setConversations(r.data || []);
      } catch {
        // ignore
      }
    };
    convPollRef.current = setInterval(tick, 20000);
    return () => {
      if (convPollRef.current) clearInterval(convPollRef.current);
      convPollRef.current = null;
    };
  }, [user?.id]);

  // Deep-link: /messages?to=<id> should open conversation (or start one)
  useEffect(() => {
    const qs = new URLSearchParams(location.search || '');
    const to = qs.get('to');
    if (!to) return;
    const targetId = String(to || '').trim();
    if (!targetId) return;
    // Optional: focus input when coming from profile/message shortcut
    focusOnSelectRef.current = qs.get('focus') === '1';

    const existing = (conversations || []).find((c) => String(c?.participant_id) === targetId);
    if (existing) {
      setTab('regular');
      setSelectedConv(existing);
      return;
    }

    // If not in list yet, fetch user and create a temporary conversation object.
    (async () => {
      try {
        const r = await apiCall(`/api/users?id=${encodeURIComponent(targetId)}`).catch(() => null);
        const u = r?.data || r?.data?.data || r?.data?.user || r?.data?.user?.data || r?.data || r;
        const participant = u?.id ? u : r?.data;
        if (!participant?.id) return;
        const stub = {
          conversation_id: `${user?.id || 'me'}-${participant.id}`,
          participant_id: participant.id,
          last_message: '',
          last_message_time: null,
          unread_count: 0,
          message_type: 'regular',
          participant,
        };
        setTab('regular');
        setSelectedConv(stub);
      } catch {
        // ignore
      }
    })();
  }, [location.search, conversations, user?.id]);

  // If requested via URL, focus message input after selecting the conversation.
  useEffect(() => {
    if (!selectedConv?.participant_id) return;
    if (!focusOnSelectRef.current) return;
    focusOnSelectRef.current = false;
    setTimeout(() => messageInputRef.current?.focus?.(), 50);
  }, [selectedConv?.participant_id]);

  const openCompose = async () => {
    setShowCompose(true);
    setComposeQuery('');
    setComposeResults([]);
    setComposeSuggestions([]);
    setComposeLoading(true);
    try {
      const [contactsRes, followingRes, suggestionsRes] = await Promise.all([
        messagesApi.getContacts({ limit: 80 }).catch(() => null),
        user?.id ? apiCall(`/api/users/${encodeURIComponent(user.id)}/following?limit=200`).catch(() => null) : Promise.resolve(null),
        messagesApi.getSuggestions({ limit: 24 }).catch(() => null),
      ]);

      const contactsList = contactsRes?.data || contactsRes?.data?.data || [];
      const contacts = Array.isArray(contactsList) ? contactsList : [];
      setComposeContacts(contacts);
      setComposeMutualIds(new Set(contacts.map((u) => String(u?.id || '')).filter(Boolean)));

      const followingData = followingRes?.data || followingRes?.data?.data || followingRes || [];
      const following = Array.isArray(followingData) ? followingData : [];
      setComposeFollowingIds(new Set(following.map((u) => String(u?.id || u?.user_id || '')).filter(Boolean)));

      const suggestionsData = suggestionsRes?.data || suggestionsRes?.data?.data || [];
      const suggestions = Array.isArray(suggestionsData) ? suggestionsData : [];
      setComposeSuggestions(suggestions);
    } catch {
      setComposeContacts([]);
      setComposeSuggestions([]);
      setComposeFollowingIds(new Set());
      setComposeMutualIds(new Set());
    } finally {
      setComposeLoading(false);
    }
  };

  useEffect(() => {
    if (!showCompose) return;
    if (composeTimerRef.current) clearTimeout(composeTimerRef.current);
    const q = String(composeQuery || '').trim();
    if (q.length < 2) {
      setComposeResults([]);
      return;
    }
    composeTimerRef.current = setTimeout(async () => {
      try {
        const r = await messagesApi.searchUsers(q);
        if (r?.success) setComposeResults(r.data || []);
      } catch {
        setComposeResults([]);
      }
    }, 250);
    return () => clearTimeout(composeTimerRef.current);
  }, [composeQuery, showCompose]);

  const sortedComposeResults = useMemo(() => {
    const list = Array.isArray(composeResults) ? composeResults : [];
    if (list.length === 0) return [];

    const mutual = composeMutualIds instanceof Set ? composeMutualIds : new Set();
    const following = composeFollowingIds instanceof Set ? composeFollowingIds : new Set();

    const score = (u) => Number(u?.polit_score || 0) || 0;
    const bucket = (u) => {
      const id = String(u?.id || '');
      if (!id) return 9;
      if (mutual.has(id)) return 0; // takipleştiklerin
      if (following.has(id)) return 1; // ben takip ediyorum (tek yön)
      return 2; // diğerleri
    };

    return list
      .slice()
      .sort((a, b) => {
        const ba = bucket(a);
        const bb = bucket(b);
        if (ba !== bb) return ba - bb;
        return score(b) - score(a);
      });
  }, [composeResults, composeFollowingIds, composeMutualIds]);

  const startConversationWith = (u) => {
    const id = u?.id;
    if (!id) return;
    setShowCompose(false);
    setComposeQuery('');
    setComposeResults([]);
    // Use URL param so refresh works and we keep it simple.
    navigate(`/messages?to=${encodeURIComponent(id)}`);
  };
  
  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    try {
      const sent = await messagesApi.send(selectedConv.participant_id, newMessage.trim());
      if (sent?.success) {
        setMessages((prev) => [...prev, sent.data]);
        setConversations((prev) => {
          const list = Array.isArray(prev) ? prev.slice() : [];
          const pid = String(selectedConv.participant_id);
          const i = list.findIndex((c) => String(c?.participant_id) === pid);
          const updated = {
            ...(i >= 0 ? list[i] : selectedConv),
            last_message: sent.data?.content || newMessage.trim(),
            last_message_time: sent.data?.created_at || new Date().toISOString(),
            unread_count: 0,
          };
          if (i >= 0) list.splice(i, 1);
          return [updated, ...list];
        });
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
      if (sent?.success) {
        setMessages((prev) => [...prev, sent.data]);
        setConversations((prev) => {
          const list = Array.isArray(prev) ? prev.slice() : [];
          const pid = String(selectedConv.participant_id);
          const i = list.findIndex((c) => String(c?.participant_id) === pid);
          const updated = {
            ...(i >= 0 ? list[i] : selectedConv),
            last_message: '📷 Fotoğraf',
            last_message_time: sent.data?.created_at || new Date().toISOString(),
            unread_count: 0,
          };
          if (i >= 0) list.splice(i, 1);
          return [updated, ...list];
        });
      }
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
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold">Mesajlar</h2>
                <button
                  type="button"
                  onClick={openCompose}
                  className="px-3 py-2 rounded-lg bg-primary-blue hover:bg-blue-600 text-white text-sm font-black"
                >
                  Mesaj Gönder
                </button>
              </div>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-5 sm:h-5 text-gray-400" />
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
                        {getUserTitle(selectedConv.participant, true) || 'Üye'}
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
                                      {message.is_read ? <CheckCheck className="w-6 h-6 sm:w-5 sm:h-5" /> : <Check className="w-6 h-6 sm:w-5 sm:h-5" />}
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
                                      <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
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
                      ref={messageInputRef}
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

      {/* Compose modal */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="Yeni Mesaj">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Kime?</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-5 sm:h-5 text-gray-400" />
              <input
                value={composeQuery}
                onChange={(e) => setComposeQuery(e.target.value)}
                placeholder="İsim veya kullanıcı adı ara…"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
          </div>

          {composeLoading && <div className="text-sm text-gray-600">Kişiler yükleniyor…</div>}

          {!composeLoading && composeQuery.trim().length < 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: mutual contacts */}
              <div className="space-y-2 min-w-0">
                <div className="text-xs font-black text-gray-500 uppercase">Takipleştiklerin</div>
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {composeContacts.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left"
                      onClick={() => startConversationWith(u)}
                    >
                      <Avatar src={u.avatar_url} size="40px" verified={isUiVerifiedUser(u)} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{u.full_name}</div>
                        <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                      </div>
                    </button>
                  ))}
                  {composeContacts.length === 0 ? (
                    <div className="text-sm text-gray-600">Henüz takipleştiğin kişi yok.</div>
                  ) : null}
                </div>
              </div>

              {/* Right: suggestions (followings of my followings) */}
              <div className="space-y-2 min-w-0">
                <div className="text-xs font-black text-gray-500 uppercase">Öneriler</div>
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {composeSuggestions.map((u) => {
                    const friendCount = Number(u?.friend_count || 0) || 0;
                    const friendNames = Array.isArray(u?.friend_names) ? u.friend_names : [];
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left"
                        onClick={() => startConversationWith(u)}
                      >
                        <Avatar src={u.avatar_url} size="40px" verified={isUiVerifiedUser(u)} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{u.full_name}</div>
                          <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                          {friendCount > 0 ? (
                            <div className="text-[11px] text-gray-600 mt-0.5 leading-4">
                              <span className="font-black">{friendNames.join(', ')}</span>
                              {friendCount > friendNames.length ? (
                                <span className="font-semibold"> ve {friendCount - friendNames.length} kişi daha</span>
                              ) : null}
                              <span className="font-semibold"> takip ediyor</span>
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                  {composeSuggestions.length === 0 ? (
                    <div className="text-sm text-gray-600">Şimdilik öneri yok.</div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {!composeLoading && composeQuery.trim().length >= 2 && (
            <div className="space-y-2">
              <div className="text-xs font-black text-gray-500 uppercase">Arama Sonuçları</div>
              {sortedComposeResults.length === 0 && <div className="text-sm text-gray-600">Sonuç bulunamadı.</div>}
              <div className="max-h-[320px] overflow-y-auto space-y-2">
                {sortedComposeResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left"
                    onClick={() => startConversationWith(u)}
                  >
                    <Avatar src={u.avatar_url} size="40px" verified={isUiVerifiedUser(u)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">{u.full_name}</div>
                      <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
