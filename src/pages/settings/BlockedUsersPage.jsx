import { useEffect, useState } from 'react';
import { Search, UserX, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { Avatar } from '../../components/common/Avatar';

export const BlockedUsersPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [blocked, setBlocked] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadBlocked = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('/api/users/blocks');
      if (!res?.success) throw new Error(res?.error || 'Engellenenler yüklenemedi.');
      setBlocked(res.data || []);
    } catch (e) {
      const msg = String(e?.message || '');
      // If server cannot persist blocks (metadata missing), explain clearly.
      setError(
        msg ||
          "Engellenenler kaydedilemiyor. Çözüm: Supabase'de `users` tablosuna `metadata` (JSONB) sütunu eklenmeli ve RLS/policy ayarlanmalı."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocked();
  }, []);

  useEffect(() => {
    let t = null;
    const run = async () => {
      const q = query.trim();
      if (q.length < 3) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await apiCall(`/api/users?search=${encodeURIComponent(q)}&limit=8`);
        const list = Array.isArray(res) ? res : res?.data || [];
        setResults(Array.isArray(list) ? list : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    };
    t = setTimeout(run, 350);
    return () => t && clearTimeout(t);
  }, [query]);

  const blockUser = async (userId) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiCall('/api/users/blocks', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res?.success) throw new Error(res?.error || 'Engellenemedi.');
      setSuccess('Kullanıcı engellendi.');
      await loadBlocked();
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError(e?.message || 'Engellenemedi.');
    }
  };

  const unblockUser = async (userId) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiCall(`/api/users/blocks/${userId}`, { method: 'DELETE' });
      if (!res?.success) throw new Error(res?.error || 'Kaldırılamadı.');
      setSuccess('Engel kaldırıldı.');
      await loadBlocked();
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError(e?.message || 'Kaldırılamadı.');
    }
  };

  const blockedIds = new Set((blocked || []).map((u) => String(u?.id)));

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Engellenenler</h2>
      <p className="text-sm text-gray-600 mb-6">
        Engellediğiniz kullanıcılar size mesaj gönderemez (mesaj filtrelemesi sonraki adımda).
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı ara (en az 3 karakter)"
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin w-5 h-5 border-2 border-primary-blue border-t-transparent rounded-full" />
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 border rounded-xl">
                <Avatar src={u.avatar_url} size="44px" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{u.full_name}</div>
                  <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                </div>
                <button
                  onClick={() => blockUser(u.id)}
                  disabled={blockedIds.has(String(u.id))}
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold px-3 py-2 rounded-lg disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  {blockedIds.has(String(u.id)) ? 'Engelli' : 'Engelle'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-bold text-gray-900">Engellenen Kullanıcılar</div>
          <div className="text-sm text-gray-600">{blocked.length}</div>
        </div>
        <div className="divide-y">
          {blocked.map((u) => (
            <div key={u.id} className="px-5 py-4 flex items-center gap-3">
              <Avatar src={u.avatar_url} size="44px" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 truncate">{u.full_name}</div>
                <div className="text-xs text-gray-500 truncate">@{u.username}</div>
              </div>
              <button
                onClick={() => unblockUser(u.id)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                Kaldır
              </button>
            </div>
          ))}
          {!loading && blocked.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-500">
              Henüz kimseyi engellemediniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

