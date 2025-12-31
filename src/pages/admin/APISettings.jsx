import { useEffect, useState } from 'react';
import { Plus, Trash2, EyeOff, Save } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const APISettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [keys, setKeys] = useState([]);

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getApiKeys().catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Anahtarlar yüklenemedi.');
      setKeys(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(String(e?.message || 'Anahtarlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createKey = async () => {
    const n = String(name || '').trim();
    if (!n) return;
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const r = await adminApi.createApiKey({ name: n }).catch(() => null);
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Anahtar oluşturulamadı.');
      }
      setNewSecret(String(r.secret || ''));
      setName('');
      await load();
    } catch (e) {
      setError(String(e?.message || 'Anahtar oluşturulamadı.'));
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id) => {
    const rid = String(id || '');
    if (!rid) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu API anahtarı silinsin mi?')) return;
    const r = await adminApi.deleteApiKey(rid).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  const updateKey = async (id, patch) => {
    const rid = String(id || '');
    if (!rid) return;
    setSavingId(rid);
    setError('');
    try {
      const r = await adminApi.updateApiKey(rid, patch).catch(() => null);
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Güncellenemedi.');
      }
      await load();
    } catch (e) {
      setError(String(e?.message || 'Güncellenemedi.'));
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">API Ayarları</h1>
          <p className="text-gray-600">API anahtarlarını yönetin</p>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_api_keys`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      {newSecret ? (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
          <div className="font-black">Yeni anahtar oluşturuldu (sadece 1 kere gösterilir)</div>
          <div className="text-sm mt-2">Bu anahtarı kopyalayıp güvenli yerde saklayın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-green-200 overflow-auto text-xs text-gray-900">{newSecret}</pre>
          <button
            type="button"
            className="mt-3 px-4 py-2 rounded-lg bg-gray-900 text-white font-black"
            onClick={() => setNewSecret('')}
          >
            Kapat
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Yeni API Anahtarı</div>
        </div>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anahtar adı"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
          />
          <button
            type="button"
            onClick={createKey}
            disabled={creating}
            className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60"
          >
            {creating ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Not: Secret değerleri sadece oluştururken 1 kez gösterilir. Sonrasında sadece prefix görüntülenir.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">API Anahtarları</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {keys.map((k) => (
            <div key={k.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-gray-900">Ad</div>
                  <input
                    defaultValue={k.name}
                    onBlur={(e) => {
                      const next = String(e.target.value || '').trim();
                      if (next && next !== String(k.name || '')) updateKey(k.id, { name: next });
                    }}
                    className="mt-1 w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="text-xs text-gray-500 mt-1">Prefix: {k.key_prefix}…</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    Durum:
                    <select
                      value={String(k.status || 'active')}
                      onChange={(e) => updateKey(k.id, { status: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded-lg bg-white text-xs"
                      disabled={savingId === String(k.id)}
                    >
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                    {savingId === String(k.id) ? <span className="text-xs text-gray-400">Kaydediliyor…</span> : null}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">İstek: {Number(k.requests_count || 0).toLocaleString('tr-TR')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                    <EyeOff className="w-5 h-5" /> Gizli
                  </span>
                  <button
                    type="button"
                    onClick={() => updateKey(k.id, { status: String(k.status || 'active') === 'active' ? 'disabled' : 'active' })}
                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-xs font-black inline-flex items-center gap-2"
                    title="Durumu değiştir"
                    disabled={savingId === String(k.id)}
                  >
                    <Save className="w-5 h-5" />
                    Kaydet
                  </button>
                  <button type="button" onClick={() => deleteKey(k.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                    <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {keys.length === 0 ? <div className="p-6 text-sm text-gray-600">Henüz API anahtarı yok.</div> : null}
        </div>
      </div>
    </div>
  );
};
