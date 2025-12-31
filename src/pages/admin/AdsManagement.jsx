import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const AdsManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [ads, setAds] = useState([]);

  const [draft, setDraft] = useState({ title: '', position: 'agenda_bar', target_url: '', status: 'paused' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getAds().catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Reklamlar yüklenemedi.');
      setAds(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(String(e?.message || 'Reklamlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const active = ads.filter((a) => String(a.status) === 'active').length;
    const clicks = ads.reduce((acc, a) => acc + (Number(a.clicks || 0) || 0), 0);
    const imps = ads.reduce((acc, a) => acc + (Number(a.impressions || 0) || 0), 0);
    const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
    return { active, clicks, imps, ctr };
  }, [ads]);

  const createAd = async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const r = await adminApi.createAd(draft).catch(() => null);
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Reklam oluşturulamadı.');
      }
      setDraft({ title: '', position: draft.position || 'agenda_bar', target_url: '', status: 'paused' });
      await load();
    } catch (e) {
      setError(String(e?.message || 'Reklam oluşturulamadı.'));
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (ad) => {
    const id = String(ad?.id || '');
    if (!id) return;
    const next = String(ad.status) === 'active' ? 'paused' : 'active';
    setAds((prev) => prev.map((x) => (String(x.id) === id ? { ...x, status: next } : x)));
    const r = await adminApi.updateAd(id, { status: next }).catch(() => null);
    if (!r?.success) await load();
  };

  const deleteAd = async (ad) => {
    const id = String(ad?.id || '');
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu reklam silinsin mi?')) return;
    const r = await adminApi.deleteAd(id).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Reklam Yönetimi</h1>
          <p className="text-gray-600">Reklam alanlarını yönetin</p>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_ads`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">{stats.active}</div>
          <div className="text-sm text-gray-600">Aktif Reklam</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">{stats.clicks.toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-600">Toplam Tıklama</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">{stats.imps.toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-600">Toplam Gösterim</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-black text-gray-900">{stats.ctr.toFixed(2)}%</div>
          <div className="text-sm text-gray-600">Ort. Tıklama Oranı</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Yeni Reklam</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="Reklam başlığı"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <select
            value={draft.position}
            onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
          >
            <option value="agenda_bar">agenda_bar</option>
            <option value="post_card">post_card</option>
            <option value="header">header</option>
            <option value="sidebar">sidebar</option>
          </select>
          <input
            value={draft.target_url}
            onChange={(e) => setDraft((p) => ({ ...p, target_url: e.target.value }))}
            placeholder="Hedef URL (opsiyonel)"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <button
            type="button"
            onClick={createAd}
            disabled={creating}
            className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60"
          >
            {creating ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Reklam</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Pozisyon</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Durum</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Tıklama</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Gösterim</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">CTR</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => {
              const clicks = Number(ad.clicks || 0) || 0;
              const imps = Number(ad.impressions || 0) || 0;
              const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
              return (
                <tr key={ad.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{ad.title}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{ad.position}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        String(ad.status) === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {String(ad.status) === 'active' ? 'Aktif' : 'Durakladı'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{clicks.toLocaleString('tr-TR')}</td>
                  <td className="px-6 py-4">{imps.toLocaleString('tr-TR')}</td>
                  <td className="px-6 py-4 font-semibold">{ctr.toFixed(2)}%</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(ad)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Aktif/Pasif"
                      >
                        {String(ad.status) === 'active' ? (
                          <EyeOff className="w-6 h-6 sm:w-5 sm:h-5" />
                        ) : (
                          <Eye className="w-6 h-6 sm:w-5 sm:h-5" />
                        )}
                      </button>
                      <button type="button" onClick={() => deleteAd(ad)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Sil">
                        <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {ads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-600">
                  Henüz reklam yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
