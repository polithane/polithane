import { useMemo, useState } from 'react';
import { AlertTriangle, Play, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../utils/api';

export const SystemTransformation = () => {
  const [action, setAction] = useState('purge_archived_posts');
  const [confirm, setConfirm] = useState('');
  const [days, setDays] = useState(3);
  const [limit, setLimit] = useState(200);
  const [maxAgendas, setMaxAgendas] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const actions = useMemo(
    () => [
      {
        key: 'purge_archived_posts',
        label: 'Arşivlenmiş postları kalıcı sil (media temizliği dahil)',
        icon: Trash2,
      },
      {
        key: 'rebuild_agenda_post_counts',
        label: 'Gündem post_count yeniden hesapla (ilk N gündem)',
        icon: RefreshCw,
      },
    ],
    []
  );

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload =
        action === 'purge_archived_posts'
          ? { action, confirm, days: Number(days) || 3, limit: Number(limit) || 200 }
          : { action, confirm, maxAgendas: Number(maxAgendas) || 50 };
      const r = await api.admin.systemTransform(payload).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'İşlem başarısız.');
      setResult(r?.data ?? null);
    } catch (e) {
      setError(String(e?.message || 'İşlem başarısız.'));
    } finally {
      setLoading(false);
    }
  };

  const confirmOk = String(confirm || '').trim() === 'ONAYLIYORUM';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Sistem Dönüşümleri</h1>
        <p className="text-gray-600">Geri alınamaz işlemler. Dikkatli kullanın.</p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 mt-0.5" />
        <div className="text-sm">
          Bu ekrandaki işlemler <strong>kalıcı</strong> etkiler yaratabilir. Devam etmek için aşağıya <strong>ONAYLIYORUM</strong> yazmanız gerekir.
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-gray-600 uppercase">İşlem</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
              {actions.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-gray-600 uppercase">Onay</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="ONAYLIYORUM"
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <div className={`mt-1 text-xs ${confirmOk ? 'text-green-600' : 'text-gray-500'}`}>
              {confirmOk ? 'Onaylandı' : 'Devam etmek için ONAYLIYORUM yazın'}
            </div>
          </div>
        </div>

        {action === 'purge_archived_posts' ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-600 uppercase">Gün</label>
              <input
                value={String(days)}
                onChange={(e) => setDays(e.target.value)}
                className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg"
                inputMode="numeric"
              />
              <div className="mt-1 text-xs text-gray-500">Arşivlenmiş postlar: olderThanDays</div>
            </div>
            <div>
              <label className="text-xs font-black text-gray-600 uppercase">Limit</label>
              <input
                value={String(limit)}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg"
                inputMode="numeric"
              />
              <div className="mt-1 text-xs text-gray-500">Tek çalıştırmada işlenecek maksimum kayıt</div>
            </div>
          </div>
        ) : null}

        {action === 'rebuild_agenda_post_counts' ? (
          <div className="mt-4">
            <label className="text-xs font-black text-gray-600 uppercase">maxAgendas</label>
            <input
              value={String(maxAgendas)}
              onChange={(e) => setMaxAgendas(e.target.value)}
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg"
              inputMode="numeric"
            />
            <div className="mt-1 text-xs text-gray-500">En fazla 100 gündem üzerinde çalışır</div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={run}
            disabled={loading || !confirmOk}
            className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-black inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            {loading ? 'Çalışıyor…' : 'Çalıştır'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-lg font-black text-gray-900 mb-3">Sonuç</div>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-auto">
          {result == null ? '—' : JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
};

