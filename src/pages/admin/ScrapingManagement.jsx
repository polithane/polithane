import { useEffect, useMemo, useState } from 'react';
import { Globe, Play, Pause, RefreshCw } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const ScrapingManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [sources, setSources] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getSources().catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Kaynaklar yüklenemedi.');
      setSources(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(String(e?.message || 'Yüklenemedi.'));
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
    const total = sources.length;
    const items = sources.reduce((acc, s) => acc + (Number(s.items_collected || 0) || 0), 0);
    return { active, total, items };
  }, [sources]);

  const toggle = async (s) => {
    const id = String(s?.id || '');
    if (!id) return;
    const next = !(s?.enabled !== false);
    setSources((prev) => prev.map((x) => (String(x.id) === id ? { ...x, enabled: next } : x)));
    const r = await adminApi.updateSource(id, { enabled: next }).catch(() => null);
    if (!r?.success) await load();
  };

  const runNow = async (s) => {
    const id = String(s?.id || '');
    if (!id) return;
    const now = new Date().toISOString();
    setSources((prev) => prev.map((x) => (String(x.id) === id ? { ...x, last_fetch_at: now } : x)));
    const r = await adminApi.updateSource(id, { last_fetch_at: now }).catch(() => null);
    if (!r?.success) await load();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Tarama Yönetimi</h1>
          <p className="text-gray-600">Kaynaklar üzerinden tarama durumunu yönetin</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black inline-flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
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
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Aktif Kaynak</div>
          <div className="text-2xl font-black text-green-700">{stats.active}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Toplam Kaynak</div>
          <div className="text-2xl font-black text-blue-700">{stats.total}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Toplanan (toplam)</div>
          <div className="text-2xl font-black text-purple-700">{stats.items.toLocaleString('tr-TR')}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Not</div>
          <div className="text-xs text-gray-500">Gerçek scraping runner bu sürümde yok</div>
        </div>
      </div>

      <div className="space-y-4">
        {sources.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-blue/10 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{s.name}</h3>
                  <p className="text-sm text-gray-600">{s.url}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {s.enabled ? 'Aktif' : 'Duraklatıldı'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Son Çekme</span>
                <span className="text-sm font-semibold text-gray-900">{s.last_fetch_at ? String(s.last_fetch_at).slice(0, 19) : '—'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Toplanan</span>
                <span className="text-sm font-semibold text-blue-600">{Number(s.items_collected || 0).toLocaleString('tr-TR')}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Öncelik</span>
                <span className="text-sm font-semibold text-gray-900">{s.priority}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {s.enabled ? (
                <button type="button" onClick={() => toggle(s)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-semibold">
                  <Pause className="w-6 h-6 sm:w-5 sm:h-5" />
                  Duraklat
                </button>
              ) : (
                <button type="button" onClick={() => toggle(s)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                  <Play className="w-6 h-6 sm:w-5 sm:h-5" />
                  Başlat
                </button>
              )}
              <button type="button" onClick={() => runNow(s)} className="flex items-center gap-2 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                <RefreshCw className="w-6 h-6 sm:w-5 sm:h-5" />
                Şimdi Çalıştır (log)
              </button>
            </div>
          </div>
        ))}
        {sources.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">Henüz kaynak yok.</div> : null}
      </div>
    </div>
  );
};
