import { useEffect, useMemo, useState } from 'react';
import { CreditCard, DollarSign, Check, X, Clock, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const PaymentSystem = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [plans, setPlans] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [newPlan, setNewPlan] = useState({ name: '', period: 'monthly', price_cents: 0, currency: 'TRY', is_active: true });
  const [creatingPlan, setCreatingPlan] = useState(false);

  const [newTx, setNewTx] = useState({
    user_email: '',
    plan_name: '',
    amount_cents: 0,
    currency: 'TRY',
    payment_method: 'card',
    status: 'completed',
    note: '',
  });
  const [creatingTx, setCreatingTx] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, t] = await Promise.all([
        adminApi.getPaymentPlans().catch(() => null),
        adminApi.getPaymentTransactions({ limit: 100 }).catch(() => null),
      ]);
      if (p?.schemaMissing && p?.requiredSql) setSchemaSql(String(p.requiredSql || ''));
      if (t?.schemaMissing && t?.requiredSql) setSchemaSql(String(t.requiredSql || ''));
      if (p?.success) setPlans(Array.isArray(p.data) ? p.data : []);
      if (t?.success) setTransactions(Array.isArray(t.data) ? t.data : []);
    } catch (e) {
      setError(String(e?.message || 'Ödeme verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const month = transactions.filter((x) => String(x?.occurred_at || '') >= start);
    const completed = month.filter((x) => String(x?.status || '') === 'completed');
    const pending = month.filter((x) => String(x?.status || '') === 'pending');
    const failed = month.filter((x) => String(x?.status || '') === 'failed');
    const sum = (arr) => arr.reduce((acc, x) => acc + (Number(x?.amount_cents || 0) || 0), 0);
    return { start, revenueCents: sum(completed), pending: pending.length, failed: failed.length };
  }, [transactions]);

  const fmtTry = (cents) => {
    const v = (Number(cents || 0) || 0) / 100;
    return `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-700', icon: Check, text: 'Tamamlandı' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Bekliyor' },
      failed: { color: 'bg-red-100 text-red-700', icon: X, text: 'Başarısız' },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-5 h-5" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Ödeme Sistemi</h1>
        <p className="text-gray-600">Plan ve işlem kayıtları. Sağlayıcı entegrasyonu sonraki faz.</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-black">DB tablosu eksik</div>
          <div className="text-sm mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600">Bu Ay Gelir</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-black text-green-700">{fmtTry(monthStats.revenueCents)}</div>
          <div className="text-xs text-green-600 mt-1">{monthStats.start.slice(0, 10)} →</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600">Aktif Plan</div>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{plans.filter((p) => p.is_active !== false).length}</div>
          <div className="text-xs text-blue-600 mt-1">Toplam plan: {plans.length}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-yellow-600">Bekleyen Ödeme</div>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-black text-yellow-700">{monthStats.pending}</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-red-600">Başarısız Ödeme</div>
            <X className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700">{monthStats.failed}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-6 h-6 text-primary-blue" />
            <div className="text-lg font-black text-gray-900">Yeni Plan</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={newPlan.name}
              onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
              placeholder="Plan adı"
              className="px-4 py-3 border border-gray-300 rounded-lg"
            />
            <select value={newPlan.period} onChange={(e) => setNewPlan((p) => ({ ...p, period: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="one_time">one_time</option>
            </select>
            <input
              value={String(newPlan.price_cents)}
              onChange={(e) => setNewPlan((p) => ({ ...p, price_cents: e.target.value }))}
              placeholder="Fiyat (kuruş) ör: 19900"
              className="px-4 py-3 border border-gray-300 rounded-lg"
              inputMode="numeric"
            />
            <button
              type="button"
              disabled={creatingPlan}
              onClick={async () => {
                if (creatingPlan) return;
                setCreatingPlan(true);
                setError('');
                try {
                  const r = await adminApi.createPaymentPlan({ ...newPlan, price_cents: parseInt(String(newPlan.price_cents || 0), 10) || 0 }).catch(() => null);
                  if (!r?.success) {
                    if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
                    throw new Error(r?.error || 'Plan oluşturulamadı.');
                  }
                  setNewPlan({ name: '', period: 'monthly', price_cents: 0, currency: 'TRY', is_active: true });
                  await load();
                } catch (e) {
                  setError(String(e?.message || 'Plan oluşturulamadı.'));
                } finally {
                  setCreatingPlan(false);
                }
              }}
              className="md:col-span-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60"
            >
              {creatingPlan ? 'Ekleniyor…' : 'Plan Ekle'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-6 h-6 text-primary-blue" />
            <div className="text-lg font-black text-gray-900">Yeni İşlem</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={newTx.user_email}
              onChange={(e) => setNewTx((p) => ({ ...p, user_email: e.target.value }))}
              placeholder="Kullanıcı e-posta (opsiyonel)"
              className="px-4 py-3 border border-gray-300 rounded-lg"
            />
            <input
              value={newTx.plan_name}
              onChange={(e) => setNewTx((p) => ({ ...p, plan_name: e.target.value }))}
              placeholder="Plan adı (opsiyonel)"
              className="px-4 py-3 border border-gray-300 rounded-lg"
            />
            <input
              value={String(newTx.amount_cents)}
              onChange={(e) => setNewTx((p) => ({ ...p, amount_cents: e.target.value }))}
              placeholder="Tutar (kuruş) ör: 19900"
              className="px-4 py-3 border border-gray-300 rounded-lg"
              inputMode="numeric"
            />
            <select value={newTx.status} onChange={(e) => setNewTx((p) => ({ ...p, status: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="completed">completed</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
            </select>
            <select value={newTx.payment_method} onChange={(e) => setNewTx((p) => ({ ...p, payment_method: e.target.value }))} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="card">card</option>
              <option value="transfer">transfer</option>
              <option value="other">other</option>
            </select>
            <button
              type="button"
              disabled={creatingTx}
              onClick={async () => {
                if (creatingTx) return;
                setCreatingTx(true);
                setError('');
                try {
                  const r = await adminApi.createPaymentTransaction({ ...newTx, amount_cents: parseInt(String(newTx.amount_cents || 0), 10) || 0 }).catch(() => null);
                  if (!r?.success) {
                    if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
                    throw new Error(r?.error || 'İşlem eklenemedi.');
                  }
                  setNewTx({ user_email: '', plan_name: '', amount_cents: 0, currency: 'TRY', payment_method: 'card', status: 'completed', note: '' });
                  await load();
                } catch (e) {
                  setError(String(e?.message || 'İşlem eklenemedi.'));
                } finally {
                  setCreatingTx(false);
                }
              }}
              className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60"
            >
              {creatingTx ? 'Ekleniyor…' : 'İşlem Ekle'}
            </button>
            <input
              value={newTx.note}
              onChange={(e) => setNewTx((p) => ({ ...p, note: e.target.value }))}
              placeholder="Not (opsiyonel)"
              className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Ödeme Yöntemleri</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Kredi/Banka Kartı</h4>
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary-blue" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Visa, Mastercard, Troy</p>
            <span className="text-xs text-green-600 font-semibold">Aktif</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Banka Transferi</h4>
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">EFT/Havale</p>
            <span className="text-xs text-green-600 font-semibold">Aktif</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Kripto Para</h4>
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">BTC, ETH, USDT</p>
            <span className="text-xs text-gray-500 font-semibold">Pasif (entegrasyon yok)</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Son İşlemler</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kullanıcı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Plan</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tutar</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Yöntem</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Durum</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-semibold text-gray-900">{transaction.user_email || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{transaction.plan_name || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-900">{fmtTry(transaction.amount_cents)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{transaction.payment_method}</span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{String(transaction.occurred_at || '').slice(0, 19) || '—'}</span>
                    <button
                      type="button"
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="Sil"
                      onClick={async () => {
                        // eslint-disable-next-line no-alert
                        if (!window.confirm('Bu işlem silinsin mi?')) return;
                        const r = await adminApi.deletePaymentTransaction(transaction.id).catch(() => null);
                        if (!r?.success) {
                          setError(r?.error || 'Silinemedi.');
                          return;
                        }
                        await load();
                      }}
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-600">
                  Henüz işlem yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
