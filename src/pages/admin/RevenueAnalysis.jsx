import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, DollarSign, CreditCard, Plus, Trash2 } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

const formatMoneyTry = (cents) => {
  const v = (Number(cents || 0) || 0) / 100;
  return `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const RevenueAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);

  const [draft, setDraft] = useState({
    amount_cents: 0,
    category: 'other',
    plan_name: '',
    payment_method: '',
    status: 'completed',
    note: '',
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, e] = await Promise.all([adminApi.getRevenueSummary().catch(() => null), adminApi.getRevenueEntries({ limit: 100 }).catch(() => null)]);
      if (s?.schemaMissing && s?.requiredSql) setSchemaSql(String(s.requiredSql || ''));
      if (e?.schemaMissing && e?.requiredSql) setSchemaSql(String(e.requiredSql || ''));
      if (s?.success) setSummary(s.data || null);
      if (e?.success) setEntries(Array.isArray(e.data) ? e.data : []);
    } catch (err) {
      setError(String(err?.message || 'Gelir verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthTotal = Number(summary?.monthTotalCents || 0) || 0;
  const byCategory = Array.isArray(summary?.byCategory) ? summary.byCategory : [];
  const byPayment = Array.isArray(summary?.byPaymentMethod) ? summary.byPaymentMethod : [];

  const createEntry = async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const r = await adminApi.createRevenueEntry({
        ...draft,
        amount_cents: Math.max(0, parseInt(String(draft.amount_cents || 0), 10) || 0),
      });
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Kayıt eklenemedi.');
      }
      setDraft({ amount_cents: 0, category: 'other', plan_name: '', payment_method: '', status: 'completed', note: '' });
      await load();
    } catch (e) {
      setError(String(e?.message || 'Kayıt eklenemedi.'));
    } finally {
      setCreating(false);
    }
  };

  const deleteEntry = async (id) => {
    const rid = String(id || '');
    if (!rid) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu gelir kaydı silinsin mi?')) return;
    const r = await adminApi.deleteRevenueEntry(rid).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  const totalCategoryCards = useMemo(() => {
    const m = new Map(byCategory.map((x) => [String(x.key || '—'), Number(x.amount_cents || 0) || 0]));
    return {
      subscription: m.get('subscription') || 0,
      ads: m.get('ads') || 0,
      other: m.get('other') || 0,
    };
  }, [byCategory]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Gelir Analizi</h1>
        <p className="text-gray-600">Veritabanı tabanlı gelir kayıtları (mock yok)</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_revenue_entries`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-90">Bu Ay Toplam</div>
            <TrendingUp className="w-6 h-6 opacity-90" />
          </div>
          <div className="text-3xl font-black mb-2">{formatMoneyTry(monthTotal)}</div>
          <div className="text-xs opacity-90">{summary?.monthStart ? `Başlangıç: ${String(summary.monthStart).slice(0, 10)}` : '—'}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-90">Abonelik</div>
            <DollarSign className="w-6 h-6 opacity-90" />
          </div>
          <div className="text-3xl font-black mb-2">{formatMoneyTry(totalCategoryCards.subscription)}</div>
          <div className="text-xs opacity-90">Kategori: subscription</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-90">Reklam</div>
            <CreditCard className="w-6 h-6 opacity-90" />
          </div>
          <div className="text-3xl font-black mb-2">{formatMoneyTry(totalCategoryCards.ads)}</div>
          <div className="text-xs opacity-90">Kategori: ads</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-90">Diğer</div>
            <CreditCard className="w-6 h-6 opacity-90" />
          </div>
          <div className="text-3xl font-black mb-2">{formatMoneyTry(totalCategoryCards.other)}</div>
          <div className="text-xs opacity-90">Kategori: other</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Gelir Kaydı Ekle</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            value={String(draft.amount_cents || '')}
            onChange={(e) => setDraft((p) => ({ ...p, amount_cents: e.target.value }))}
            placeholder="Tutar (kuruş) ör: 19900"
            className="px-4 py-3 border border-gray-300 rounded-lg"
            inputMode="numeric"
          />
          <select value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
            <option value="subscription">subscription</option>
            <option value="ads">ads</option>
            <option value="other">other</option>
          </select>
          <input
            value={draft.plan_name}
            onChange={(e) => setDraft((p) => ({ ...p, plan_name: e.target.value }))}
            placeholder="Plan adı (opsiyonel)"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <input
            value={draft.payment_method}
            onChange={(e) => setDraft((p) => ({ ...p, payment_method: e.target.value }))}
            placeholder="Ödeme yöntemi (card/transfer)"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
            <option value="completed">completed</option>
            <option value="pending">pending</option>
            <option value="failed">failed</option>
          </select>
          <button type="button" onClick={createEntry} disabled={creating} className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60">
            {creating ? 'Ekleniyor…' : 'Ekle'}
          </button>
          <input
            value={draft.note}
            onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
            placeholder="Not (opsiyonel)"
            className="px-4 py-3 border border-gray-300 rounded-lg md:col-span-6"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Kategori Dağılımı (Bu Ay)</h3>
          <div className="space-y-2">
            {byCategory.map((x) => (
              <div key={x.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">{x.key}</span>
                <span className="font-black text-primary-blue">{formatMoneyTry(x.amount_cents)}</span>
              </div>
            ))}
            {byCategory.length === 0 ? <div className="text-sm text-gray-600">Henüz veri yok.</div> : null}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Ödeme Yöntemleri (Bu Ay)</h3>
          <div className="space-y-2">
            {byPayment.map((x) => (
              <div key={x.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">{x.key}</span>
                <span className="font-black text-primary-blue">{formatMoneyTry(x.amount_cents)}</span>
              </div>
            ))}
            {byPayment.length === 0 ? <div className="text-sm text-gray-600">Henüz veri yok.</div> : null}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Son Gelir Kayıtları</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tarih</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tutar</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kategori</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Yöntem</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Durum</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-700">{String(r.occurred_at || '').slice(0, 10)}</td>
                <td className="px-6 py-4 text-sm font-black text-gray-900">{formatMoneyTry(r.amount_cents)}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{r.category}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{r.payment_method || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{r.status}</td>
                <td className="px-6 py-4">
                  <button type="button" onClick={() => deleteEntry(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Sil">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-600">
                  Henüz kayıt yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
