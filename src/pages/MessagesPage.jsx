import { useMemo, useState, useEffect, useRef } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { formatTimeAgo } from '../utils/formatters';
import { Search, Send, AlertCircle, Image as ImageIcon, Trash2, Check, CheckCheck, Plus, ArrowLeft, Flag } from 'lucide-react';
import { messages as messagesApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { apiCall } from '../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

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
  const [convActionBusyId, setConvActionBusyId] = useState(null);
  const [reportingConv, setReportingConv] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportDone, setReportDone] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileRef = useRef(null);
  const messageInputRef = useRef(null);
  const focusOnSelectRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  
  const [conversations, setConversations] = useState([]);
  const convPollRef = useRef(null);
  const msgPollRef = useRef(null);
  
  // Compose modal (MUST be above any early returns; otherwise React hook order breaks in production)
  const [showCompose, setShowCompose] = useState(false);
  const [composeContacts, setComposeContacts] = useState([]);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState([]);
  const [composeSuggestions, setComposeSuggestions] = useState([]);
  const [composeFollowingIds, setComposeFollowingIds] = useState(new Set());
  const [composeMutualIds, setComposeMutualIds] = useState(new Set());
  const composeTimerRef = useRef(null);

  const getReceiverId = (conv) => {
    const pid = conv?.participant_id ?? conv?.participant?.id ?? null;
    const s = String(pid ?? '').trim();
    return s || '';
  };

  const selectConversationById = (participantId, { focus = false } = {}) => {
    const pid = String(participantId || '').trim();
    if (!pid) return;
    const current = (conversations || []).find((c) => String(getReceiverId(c)) === pid) || null;
    // Fall back to a minimal stub if it's not in the list yet (e.g. deep-link)
    const conv =
      current ||
      ({
        conversation_id: `${user?.id || 'me'}-${pid}`,
        participant_id: pid,
        last_message: '',
        last_message_time: null,
        unread_count: 0,
        message_type: 'regular',
        participant: null,
      });
    selectConversation(conv, { focus });
  };
  
  const selectConversation = (conv, { focus = false } = {}) => {
    try {
      if (!conv) return;
      const pid = getReceiverId(conv);
      if (!pid) return;
      focusOnSelectRef.current = !!focus;
      setTab(String(conv?.message_type || '') === 'request' ? 'requests' : 'regular');
      setSelectedConv(conv);
      setError(null);
    } catch (err) {
      console.error('Error selecting conversation:', err);
      setError('Konuşma açılamadı');
    }
  };

  // Hard guard: messages require authentication.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login-new', {
        replace: true,
        state: { from: `${location.pathname || '/messages'}${location.search || ''}` },
      });
    }
  }, [authLoading, isAuthenticated, navigate, location.pathname, location.search]);
  
  const filteredConversations = useMemo(() => {
    const base = (conversations || []).filter((c) => (tab === 'requests' ? c.message_type === 'request' : c.message_type !== 'request'));
    if (!searchQuery || String(searchQuery || '').trim().length < 2) return base;
    return base.filter((conv) => {
      const u = conv.participant;
      return (
        (u?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv?.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [conversations, tab, searchQuery]);

  const requestCount = useMemo(() => {
    return (conversations || []).filter((c) => c?.message_type === 'request').length;
  }, [conversations]);
  
  // Scroll to bottom of messages
  const scrollToBottom = (behavior = 'smooth') => {
    const el = messagesAreaRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };

  const isNearBottom = () => {
    const el = messagesAreaRef.current;
    if (!el) return true;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    return remaining < 140;
  };

  const canDeleteMessage = () => {
    // Per product: sent messages shouldn't expose a delete action in the thread UI.
    return false;
  };

  const previewConversationText = (v) => {
    const s = String(v || '').trim();
    if (!s) return '';
    try {
      if (s.startsWith('{')) {
        const obj = JSON.parse(s);
        if (obj && typeof obj === 'object' && obj.type === 'image') return 'Resim Gönderildi.';
      }
    } catch {
      // ignore
    }
    if (/"type"\s*:\s*"image"/i.test(s)) return 'Resim Gönderildi.';
    return s;
  };
  
  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConv) {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const receiverId = getReceiverId(selectedConv);
          if (!receiverId) {
            setMessages([]);
            return;
          }
          const r = await messagesApi.getMessages(receiverId);
          if (r?.success) setMessages(r.data || []);
          shouldAutoScrollRef.current = true;
          setTimeout(() => scrollToBottom('auto'), 50);
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
    const otherId = String(selectedConv?.participant_id || '').trim();
    if (!otherId) return undefined;
    const tick = async () => {
      try {
        if (document?.hidden) return;
        const wantAutoScroll = shouldAutoScrollRef.current || isNearBottom();
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
        if (wantAutoScroll) {
          shouldAutoScrollRef.current = true;
          setTimeout(() => scrollToBottom('auto'), 40);
        }
      } catch {
        // ignore
      }
    };
    msgPollRef.current = setInterval(tick, 8000);
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
      msgPollRef.current = null;
    };
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
    const shouldOpen = qs.get('focus') === '1' || qs.get('open') === '1';
    if (!shouldOpen) return;
    // Optional: focus input when coming from profile/message shortcut
    focusOnSelectRef.current = qs.get('focus') === '1';

    // If user already selected another convo manually, don't override unless URL matches selection.
    if (selectedConv?.participant_id && String(selectedConv.participant_id) === targetId) return;

    const existing = (conversations || []).find((c) => String(c?.participant_id) === targetId);
    if (existing) {
      selectConversationById(targetId, { focus: focusOnSelectRef.current });
      // Consume the deep-link so revisiting /messages doesn't auto-open the last chat.
      navigate('/messages', { replace: true });
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
        selectConversation(stub, { focus: focusOnSelectRef.current });
        navigate('/messages', { replace: true });
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const raw = String(composeQuery || '').trim();
    // Users often type "@username" because UI displays it with "@"
    const q = raw.startsWith('@') ? raw.slice(1).trim() : raw;
    if (q.length < 2) {
      setComposeResults([]);
      return;
    }
    composeTimerRef.current = setTimeout(async () => {
      try {
        const r = await messagesApi.searchUsers(q);
        if (r?.success) {
          const data = r?.data?.data ?? r?.data ?? [];
          setComposeResults(Array.isArray(data) ? data : []);
        } else {
          setComposeResults([]);
        }
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
    navigate(`/messages?to=${encodeURIComponent(id)}&open=1&focus=1`);
  };
  
  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    try {
      setError(null);
      const receiverId = getReceiverId(selectedConv);
      if (!receiverId) {
        setError('Geçersiz alıcı.');
        return;
      }
      const sent = await messagesApi.send(receiverId, newMessage.trim());
      if (sent?.success) {
        setMessages((prev) => [...prev, sent.data]);
        setConversations((prev) => {
          const list = Array.isArray(prev) ? prev.slice() : [];
          const pid = String(receiverId);
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
      shouldAutoScrollRef.current = true;
      setTimeout(() => scrollToBottom('auto'), 30);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err?.message || 'Mesaj gönderilemedi');
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
      if (file.size > 10 * 1024 * 1024) throw new Error('Resim çok büyük (max 10MB).');

      // IMPORTANT: Use signed upload so the file goes directly to Supabase Storage
      // (avoids Vercel request-body limits from base64 uploads).
      const sign = await apiCall('/api/storage/sign-upload', {
        method: 'POST',
        body: JSON.stringify({
          bucket: 'uploads',
          folder: 'messages',
          contentType: file.type,
        }),
      });
      if (!sign?.success) throw new Error(sign?.error || 'Yükleme hazırlığı başarısız.');
      const { bucket, path, token, publicUrl } = sign?.data || {};
      if (!bucket || !path || !token || !publicUrl) throw new Error('Yükleme anahtarı alınamadı.');

      const { error: upErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upErr) throw new Error(String(upErr?.message || 'Resim yüklenemedi.'));
      const url = String(publicUrl);

      const receiverId = getReceiverId(selectedConv);
      if (!receiverId) throw new Error('Geçersiz alıcı.');
      const sent = await messagesApi.send(receiverId, '', { kind: 'image', url });
      if (sent?.success) {
        setMessages((prev) => [...prev, sent.data]);
        setConversations((prev) => {
          const list = Array.isArray(prev) ? prev.slice() : [];
          const pid = String(receiverId);
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

  const deleteConversation = async (conv) => {
    const pid = String(conv?.participant_id || '').trim();
    if (!pid) return;
    if (!window.confirm('Bu sohbeti silmek istiyor musunuz? Bu işlem sohbetin tüm mesajlarını veritabanından siler.')) return;
    setConvActionBusyId(pid);
    try {
      await messagesApi.deleteConversation(pid);
      setConversations((prev) => (prev || []).filter((c) => String(c?.participant_id) !== pid));
      if (String(selectedConv?.participant_id || '') === pid) {
        setSelectedConv(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e?.message || 'Sohbet silinemedi.');
    } finally {
      setConvActionBusyId(null);
    }
  };

  const reportConversation = async () => {
    const pid = String(reportingConv?.participant_id || '').trim();
    if (!pid) return;
    setConvActionBusyId(pid);
    try {
      const r = await messagesApi.reportConversation(pid, { reason: reportReason, details: reportDetails });
      if (r?.success) {
        setReportDone(true);
      } else {
        setError(r?.error || 'Şikayet gönderilemedi.');
      }
    } catch (e) {
      setError(e?.message || 'Şikayet gönderilemedi.');
    } finally {
      setConvActionBusyId(null);
    }
  };
  
  // IMPORTANT: keep all hooks above; return guards come last to avoid hook order violations.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-main py-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm font-semibold text-gray-700">
            Yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="bg-gray-50 h-[calc(100dvh-96px)] lg:h-[100dvh] overflow-hidden">
      <div className="container-main py-4 md:py-6 h-full flex flex-col min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Konuşma Listesi */}
          <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col ${selectedConv ? 'hidden md:flex' : ''}`}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold">Mesajlar</h2>
                <button
                  type="button"
                  onClick={openCompose}
                  className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-black inline-flex items-center gap-2"
                >
                  <Plus className="w-6 h-6 sm:w-5 sm:h-5" />
                  Yeni Mesaj
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
                  <span className="inline-flex items-center justify-center gap-2">
                    İstekler
                    {requestCount > 0 ? (
                      <Badge variant="danger" size="small" className={tab === 'requests' ? 'animate-pulse' : 'animate-pulse'}>
                        {requestCount > 99 ? '99+' : requestCount}
                      </Badge>
                    ) : null}
                  </span>
                </button>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mesajlarda ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
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
                      onClick={() => selectConversationById(getReceiverId(conv))}
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
                              {previewConversationText(conv.last_message || '') || 'Mesaj yok'}
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

                        {/* List actions: delete + report */}
                        <div className="hidden md:flex flex-col gap-2 flex-shrink-0">
                          <button
                            type="button"
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                            title="Sohbeti sil"
                            disabled={convActionBusyId === String(conv?.participant_id || '')}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                            title="Şikayet et"
                            disabled={convActionBusyId === String(conv?.participant_id || '')}
                            onClick={(e) => {
                              e.stopPropagation();
                              setError('');
                              setReportingConv(conv);
                              setReportReason('spam');
                              setReportDetails('');
                              setReportDone(false);
                            }}
                          >
                            <Flag className="w-5 h-5" />
                          </button>
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
          <div className={`bg-white rounded-xl border border-gray-200 flex flex-col min-h-0 overflow-hidden ${selectedConv ? '' : 'hidden md:flex'}`}>
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="p-4 border-b bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConv(null);
                        setMessages([]);
                        // Clear deep-link param so it doesn't re-open a previous convo.
                        navigate('/messages', { replace: true });
                      }}
                      className="md:hidden p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                      title="Mesaj listesi"
                    >
                      <ArrowLeft className="w-7 h-7 text-gray-700" />
                    </button>
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
                        {selectedConv.participant?.username ? `@${selectedConv.participant.username}` : ''}
                      </p>
                    </div>
                    {selectedConv.message_type === 'request' && (
                      <div className="ml-auto text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                        Mesaj isteği (cevap verirseniz sohbet açılır)
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Messages Area (only this part scrolls) */}
                <div
                  ref={messagesAreaRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50 overscroll-contain"
                  onScroll={() => {
                    shouldAutoScrollRef.current = isNearBottom();
                  }}
                >
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
                                    canDeleteMessage(message) ? (
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
                                    ) : null
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
                
                {/* Message Input (fixed inside panel; never scrolls with page) */}
                <div className="p-4 border-t bg-white">
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
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

      {/* Conversation report modal */}
      <Modal isOpen={!!reportingConv} onClose={() => setReportingConv(null)} title="Şikayet Et">
        {reportDone ? (
          <div className="space-y-3">
            <div className="text-lg font-black text-green-700">Bildiriminiz alındı.</div>
            <div className="text-sm text-gray-700">İnceleme sonrası gerekli işlem yapılacaktır.</div>
            <Button
              onClick={() => {
                setReportingConv(null);
              }}
            >
              Kapat
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-black text-gray-900">Neden</div>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="spam">Spam</option>
              <option value="harassment">Taciz / Hakaret</option>
              <option value="scam">Dolandırıcılık</option>
              <option value="other">Diğer</option>
            </select>
            <div className="text-sm font-black text-gray-900">Not (opsiyonel)</div>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value.slice(0, 200))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              placeholder="En fazla 200 karakter"
            />
            <div className="text-xs text-gray-500">{200 - (reportDetails?.length || 0)} karakter kaldı</div>
            <Button onClick={reportConversation} disabled={!reportReason || convActionBusyId === String(reportingConv?.participant_id || '')}>
              Gönder
            </Button>
          </div>
        )}
      </Modal>

      {/* Compose modal */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="Yeni Mesaj">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Kime?</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <input
                value={composeQuery}
                onChange={(e) => setComposeQuery(e.target.value)}
                placeholder="İsim veya kullanıcı adı ara…"
                className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
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
                      {Number(u?.friend_count || 0) > 0 ? (
                        <div className="text-[11px] text-gray-600 mt-0.5 leading-4">
                          <span className="font-black">
                            {Array.isArray(u?.friend_names) ? u.friend_names.filter(Boolean).join(', ') : ''}
                          </span>
                          {Number(u?.friend_count || 0) >
                          (Array.isArray(u?.friend_names) ? u.friend_names.filter(Boolean).length : 0) ? (
                            <span className="font-semibold">
                              {' '}
                              ve {Number(u?.friend_count || 0) - (Array.isArray(u?.friend_names) ? u.friend_names.filter(Boolean).length : 0)} kişi daha
                            </span>
                          ) : null}
                          <span className="font-semibold"> takip ediyor</span>
                        </div>
                      ) : null}
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
