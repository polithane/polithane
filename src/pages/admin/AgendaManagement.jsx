import { useEffect, useMemo, useState } from 'react';
import { admin as adminApi } from '../../utils/api';
import { Save, Plus, Trash2, Search, Flame } from 'lucide-react';
import { apiCall } from '../../utils/api';
import toast from 'react-hot-toast';

export const AgendaManagement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);

  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    title: '',
    trending_score: 5000,
    total_polit_score: 0,
    is_trending: true,
    is_active: true,
  });

  const fetchList = async () => {
    setLoading(true);
    setError('');
    setSchemaSql('');
    try {
      const r = await adminApi.getAgendas({
        limit: 200,
        search: q.trim() || undefined,
        is_active: showInactive ? undefined : 'true',
      });
      if (r?.schemaMissing && r?.requiredSql) {
        setSchemaSql(String(r.requiredSql || ''));
        setRows([]);
        return;
      }
      if (!r?.success) throw new Error(r?.error || 'Gündemler yüklenemedi.');
      setRows(Array.isArray(r?.data) ? r.data : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || 'Gündemler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchList();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const sorted = useMemo(() => {
    return (rows || []).slice().sort((a, b) => (Number(b.trending_score || 0) - Number(a.trending_score || 0)));
  }, [rows]);

  const updateRowLocal = (id, patch) => {
    setRows((prev) => prev.map((r) => (String(r.id) === String(id) ? { ...r, ...patch } : r)));
  };

  const saveRow = async (row) => {
    const id = row?.id;
    if (!id) return;
    setSavingId(id);
    setError('');
    setSchemaSql('');
    try {
      const payload = {
        title: String(row.title || '').trim(),
        slug: String(row.slug || '').trim(),
        is_active: !!row.is_active,
        is_trending: !!row.is_trending,
        trending_score: Number(row.trending_score || 0),
        total_polit_score: Number(row.total_polit_score || 0),
      };
      const r = await adminApi.updateAgenda(id, payload);
      if (r?.schemaMissing && r?.requiredSql) {
        setSchemaSql(String(r.requiredSql || ''));
        throw new Error('DB tablosu eksik.');
      }
      if (!r?.success) throw new Error(r?.error || 'Kaydedilemedi.');
      if (r?.success && r?.data) {
        updateRowLocal(id, r.data);
      }
      toast.success('Kaydedildi.');
    } catch (e) {
      setError(e?.message || 'Kaydedilemedi.');
      toast.error(String(e?.message || 'Kaydedilemedi.'));
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (row) => {
    const id = row?.id;
    if (!id) return;
    setSavingId(id);
    setError('');
    setSchemaSql('');
    try {
      const r = await adminApi.deleteAgenda(id);
      if (r?.schemaMissing && r?.requiredSql) {
        setSchemaSql(String(r.requiredSql || ''));
        throw new Error('DB tablosu eksik.');
      }
      if (!r?.success) throw new Error(r?.error || 'Silinemedi.');
      updateRowLocal(id, { is_active: false });
    } catch (e) {
      setError(e?.message || 'Silinemedi.');
    } finally {
      setSavingId(null);
    }
  };

  const createAgenda = async () => {
    const title = String(createDraft.title || '').trim();
    if (!title) return;
    setSavingId('__create__');
    setError('');
    setSchemaSql('');
    try {
      const r = await adminApi.createAgenda({
        title,
        trending_score: Number(createDraft.trending_score || 0),
        total_polit_score: Number(createDraft.total_polit_score || 0),
        is_trending: !!createDraft.is_trending,
        is_active: !!createDraft.is_active,
      });
      if (r?.schemaMissing && r?.requiredSql) {
        setSchemaSql(String(r.requiredSql || ''));
        throw new Error('DB tablosu eksik.');
      }
      if (!r?.success) throw new Error(r?.error || 'Oluşturulamadı.');
      if (r?.success && r?.data) {
        setRows((prev) => [r.data, ...(prev || [])]);
        setCreateDraft({ title: '', trending_score: 5000, total_polit_score: 0, is_trending: true, is_active: true });
        setCreateOpen(false);
      }
    } catch (e) {
      setError(e?.message || 'Oluşturulamadı.');
    } finally {
      setSavingId(null);
    }
  };

  const bootstrapAgendas = async () => {
    setBootstrapping(true);
    setError('');
    try {
      // Triggers server-side "empty-table bootstrap" logic (best-effort).
      await apiCall('/api/agendas?limit=1').catch(() => null);
      await fetchList();
    } catch (e) {
      setError(e?.message || 'Varsayılan gündemler yüklenemedi.');
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <Flame className="w-7 h-7 sm:w-6 sm:h-6 text-orange-500" />
            Gündem Yönetimi
          </h1>
          <p className="text-gray-600">Ana sayfa gündem sıralaması için trend skoru kullanılır (yüksek skor üstte).</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="px-5 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-6 h-6 sm:w-5 sm:h-5" />
          Yeni Gündem
        </button>
      </div>

      {createOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={createDraft.title}
              onChange={(e) => setCreateDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="Gündem başlığı"
              className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg"
            />
            <input
              value={createDraft.trending_score}
              onChange={(e) => setCreateDraft((p) => ({ ...p, trending_score: e.target.value }))}
              placeholder="trend_skoru"
              className="px-4 py-3 border border-gray-300 rounded-lg"
              inputMode="numeric"
            />
            <input
              value={createDraft.total_polit_score}
              onChange={(e) => setCreateDraft((p) => ({ ...p, total_polit_score: e.target.value }))}
              placeholder="başlangıç_polit_puan"
              className="px-4 py-3 border border-gray-300 rounded-lg"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={createAgenda}
              disabled={savingId === '__create__'}
              className="px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-6 h-6 sm:w-5 sm:h-5" />
              Oluştur
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!createDraft.is_trending}
                onChange={(e) => setCreateDraft((p) => ({ ...p, is_trending: e.target.checked }))}
                className="w-5 h-5 accent-primary-blue cursor-pointer"
              />
              Trend
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!createDraft.is_active}
                onChange={(e) => setCreateDraft((p) => ({ ...p, is_active: e.target.checked }))}
                className="w-5 h-5 accent-primary-blue cursor-pointer"
              />
              Aktif
            </label>
          </div>
        </div>
      )}

      {schemaSql ? (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `agendas`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-5 sm:h-5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Gündem ara (başlık/kısa adres)…"
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg"
          />
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-5 h-5 accent-primary-blue cursor-pointer"
          />
          Pasifleri de göster
        </label>
      </div>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {loading ? (
        <div className="text-gray-600">Yükleniyor…</div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-lg font-black text-gray-900">Henüz gündem yok</div>
          <div className="text-sm text-gray-600 mt-1">
            Gündem listesi veritabanından gelir. İstersen varsayılan gündem listesini tek tıkla oluşturabilirsin.
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={bootstrapAgendas}
              disabled={bootstrapping}
              className="px-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-black disabled:opacity-60"
            >
              {bootstrapping ? 'Varsayılan gündemler oluşturuluyor…' : 'Varsayılan gündemleri oluştur'}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
            >
              Yeni gündem ekle
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-black text-gray-700">Başlık</th>
                  <th className="px-4 py-3 text-left font-black text-gray-700">Kısa Adres</th>
                  <th className="px-4 py-3 text-left font-black text-gray-700">Trend Skoru</th>
                  <th className="px-4 py-3 text-left font-black text-gray-700">PolitPuan</th>
                  <th className="px-4 py-3 text-left font-black text-gray-700">Trend</th>
                  <th className="px-4 py-3 text-left font-black text-gray-700">Aktif</th>
                  <th className="px-4 py-3 text-right font-black text-gray-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((a) => (
                  <tr key={a.id} className={a.is_active ? '' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <input
                        value={a.title || ''}
                        onChange={(e) => updateRowLocal(a.id, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={a.slug || ''}
                        onChange={(e) => updateRowLocal(a.id, { slug: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={a.trending_score ?? 0}
                        onChange={(e) => updateRowLocal(a.id, { trending_score: e.target.value })}
                        className="w-[120px] px-3 py-2 border border-gray-200 rounded-lg"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={a.total_polit_score ?? 0}
                        onChange={(e) => updateRowLocal(a.id, { total_polit_score: e.target.value })}
                        className="w-[120px] px-3 py-2 border border-gray-200 rounded-lg"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!a.is_trending}
                        onChange={(e) => updateRowLocal(a.id, { is_trending: e.target.checked })}
                        className="w-5 h-5 accent-primary-blue cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!a.is_active}
                        onChange={(e) => updateRowLocal(a.id, { is_active: e.target.checked })}
                        className="w-5 h-5 accent-primary-blue cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveRow(a)}
                          disabled={String(savingId) === String(a.id)}
                          className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white font-black inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save className="w-6 h-6 sm:w-5 sm:h-5" />
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(a)}
                          disabled={String(savingId) === String(a.id)}
                          className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-black inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
                          Pasifleştir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

