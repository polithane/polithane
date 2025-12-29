import { useEffect, useMemo, useState } from 'react';
import { Database, Activity, RefreshCw } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { formatDate } from '../../utils/formatters';

export const DatabaseManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [rOv, rSchema] = await Promise.all([
          adminApi.getDbOverview().catch(() => null),
          adminApi.schemaCheck().catch(() => null),
        ]);
        if (!rOv?.success) throw new Error(rOv?.error || 'DB özeti yüklenemedi.');
        if (!cancelled) {
          setOverview(rOv.data || null);
          setSchema(rSchema?.success ? rSchema.data : null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || 'DB özeti yüklenemedi.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tableRows = useMemo(() => {
    const counts = overview?.counts || {};
    const items = [
      'users',
      'posts',
      'comments',
      'notifications',
      'messages',
      'agendas',
      'parties',
      'follows',
      'likes',
      'admin_notification_rules',
      'admin_notification_channels',
    ];
    return items.map((t) => ({
      table: t,
      count: typeof counts[t] === 'number' ? counts[t] : null,
    }));
  }, [overview]);

  const totalRecords = useMemo(() => {
    return tableRows.reduce((acc, r) => acc + (typeof r.count === 'number' ? r.count : 0), 0);
  }, [tableRows]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Veritabanı Yönetimi</h1>
        <p className="text-gray-600">Supabase Postgres özet görünümü (mock yok)</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600">Veritabanı Durumu</div>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-black text-green-700">{schema?.ok === false ? 'Kontrol Gerekiyor' : 'Çalışıyor'}</div>
          <div className="text-xs text-green-600 mt-1">Schema kontrolü: {schema ? (schema.ok ? 'OK' : 'Eksik var') : '—'}</div>
        </div>

        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-purple-600">Toplam Kayıt</div>
            <Database className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{totalRecords.toLocaleString('tr-TR')}</div>
          <div className="text-xs text-purple-600 mt-1">Sayım: seçili tablolar</div>
        </div>

        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-orange-600">Son Polit</div>
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-700">{overview?.lastPostAt ? formatDate(overview.lastPostAt) : '—'}</div>
          <div className="text-xs text-orange-600 mt-1">created_at (posts)</div>
        </div>

        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600">Operasyon</div>
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">Supabase</div>
          <div className="text-xs text-blue-600 mt-1">Backup/optimizasyon panelden</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Tablo İstatistikleri</h3>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black inline-flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Yenile
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tablo Adı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kayıt Sayısı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tableRows.map((r) => (
              <tr key={r.table} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-gray-900">{r.table}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {typeof r.count === 'number' ? r.count.toLocaleString('tr-TR') : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schema?.ok === false ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
          <div className="font-black">Schema kontrolünde eksikler var</div>
          <div className="text-sm mt-1">Eksik tablolar/sütunlar için `Admin → Veritabanı Yönetimi → Schema Check` ekranını kullanın.</div>
        </div>
      ) : null}
    </div>
  );
};
