import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Link as LinkIcon } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const SourceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [sources, setSources] = useState([]);

  const [draft, setDraft] = useState({
    name: '',
    type: 'news',
    url: '',
    rss_feed: '',
    enabled: true,
    priority: 'medium',
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getSources().catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Kaynaklar yüklenemedi.');
      setSources(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(String(e?.message || 'Kaynaklar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const active = sources.filter((s) => s.enabled).length;
    const news = sources.filter((s) => String(s.type) === 'news').length;
    const pol = sources.filter((s) => String(s.type || '').includes('politician')).length;
    const totalItems = sources.reduce((acc, s) => acc + (Number(s.items_collected || 0) || 0), 0);
    return { active, news, pol, totalItems };
  }, [sources]);

  const getTypeBadge = (type) => {
    const badges = {
      news: { color: 'bg-blue-100 text-blue-700', text: 'Haber Sitesi' },
      politician_twitter: { color: 'bg-purple-100 text-purple-700', text: 'Siyasetçi Twitter' },
      politician_instagram: { color: 'bg-pink-100 text-pink-700', text: 'Siyasetçi Instagram' },
      media_twitter: { color: 'bg-cyan-100 text-cyan-700', text: 'Medya Twitter' },
      other: { color: 'bg-gray-100 text-gray-700', text: 'Diğer' },
    };
    const badge = badges[type] || badges.other;
    return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.text}</span>;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { color: 'bg-red-100 text-red-700', text: 'Yüksek' },
      medium: { color: 'bg-yellow-100 text-yellow-700', text: 'Orta' },
      low: { color: 'bg-gray-100 text-gray-700', text: 'Düşük' },
    };
    const badge = badges[priority] || badges.medium;
    return <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{badge.text}</span>;
  };

  const toggleSource = async (source) => {
    const id = String(source?.id || '');
    if (!id) return;
    const next = !(source?.enabled !== false);
    setSources((prev) => prev.map((x) => (String(x.id) === id ? { ...x, enabled: next } : x)));
    const r = await adminApi.updateSource(id, { enabled: next }).catch(() => null);
    if (!r?.success) await load();
  };

  const createSource = async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const payload = {
        ...draft,
        rss_feed: draft.rss_feed ? String(draft.rss_feed).trim() : null,
      };
      const r = await adminApi.createSource(payload).catch(() => null);
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Kaynak eklenemedi.');
      }
      setDraft({ name: '', type: draft.type || 'news', url: '', rss_feed: '', enabled: true, priority: 'medium' });
      await load();
    } catch (e) {
      setError(String(e?.message || 'Kaynak eklenemedi.'));
    } finally {
      setCreating(false);
    }
  };

  const deleteSource = async (source) => {
    const id = String(source?.id || '');
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu kaynak silinsin mi?')) return;
    const r = await adminApi.deleteSource(id).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kaynak Yönetimi</h1>
          <p className="text-gray-600">İçerik kaynaklarını DB’den yönetin (mock yok)</p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black">
          Yenile
        </button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_sources`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Kaynak</div>
          <div className="text-2xl font-black text-gray-900">{sources.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Aktif Kaynak</div>
          <div className="text-2xl font-black text-green-700">{stats.active}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Haber Kaynağı</div>
          <div className="text-2xl font-black text-blue-700">{stats.news}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Siyasetçi</div>
          <div className="text-2xl font-black text-purple-700">{stats.pol}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Yeni Kaynak</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Kaynak Adı" className="px-4 py-3 border border-gray-300 rounded-lg" />
          <input value={draft.url} onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))} placeholder="Bağlantı" className="px-4 py-3 border border-gray-300 rounded-lg" />
          <input value={draft.rss_feed} onChange={(e) => setDraft((p) => ({ ...p, rss_feed: e.target.value }))} placeholder="RSS (opsiyonel)" className="px-4 py-3 border border-gray-300 rounded-lg" />
          <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
            <option value="news">news</option>
            <option value="politician_twitter">politician_twitter</option>
            <option value="politician_instagram">politician_instagram</option>
            <option value="media_twitter">media_twitter</option>
            <option value="other">other</option>
          </select>
          <select value={draft.priority} onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
          <button type="button" onClick={createSource} disabled={creating} className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60">
            {creating ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">Toplanan içerik / son çekme alanları scraper tarafından güncellenecek.</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kaynak</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tür</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Bağlantı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Öncelik</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Toplanan</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Son Çekme</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Durum</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sources.map((source) => (
              <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{source.name}</div>
                </td>
                <td className="px-6 py-4">{getTypeBadge(source.type)}</td>
                <td className="px-6 py-4">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-blue hover:underline">
                    <LinkIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="max-w-xs truncate">{source.url}</span>
                  </a>
                </td>
                <td className="px-6 py-4">{getPriorityBadge(source.priority)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-700">{Number(source.items_collected || 0).toLocaleString('tr-TR')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{source.last_fetch_at ? String(source.last_fetch_at).slice(0, 19) : '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <button type="button" onClick={() => toggleSource(source)} className={source.enabled ? 'text-green-500' : 'text-gray-400'} title="Aç/Kapat">
                    {source.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button type="button" onClick={() => deleteSource(source)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                    <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
            {sources.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-600">
                  Henüz kaynak yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
