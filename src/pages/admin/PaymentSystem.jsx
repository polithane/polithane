import { CreditCard, DollarSign, Check, X, Clock, TrendingUp } from 'lucide-react';

export const PaymentSystem = () => {
  // NOTE: This screen used to show mock transactions. We intentionally show no fake financial data.
  // Backend integration (payments provider + transactions table + subscription states) will be wired here later.
  const transactions = [];

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
        <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Ödeme Sistemi</h1>
        <p className="text-gray-600">Ödemeleri ve abonelikleri yönetin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600">Bu Ay Gelir</div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-black text-green-700">—</div>
          <div className="text-xs text-green-600 mt-1">—</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600">Aktif Abonelik</div>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">—</div>
          <div className="text-xs text-blue-600 mt-1">—</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-yellow-600">Bekleyen Ödeme</div>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-black text-yellow-700">—</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-red-600">Başarısız Ödeme</div>
            <X className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700">—</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="font-black">Bu modül henüz canlı backend’e bağlı değil</div>
        <div className="text-sm mt-1">
          Güvenlik ve doğruluk için sahte ödeme/abonelik verisi göstermiyoruz. Ödeme sağlayıcısı ve transaction kayıtları bağlanınca bu ekran
          aktifleşecek.
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
            <span className="text-xs text-gray-500 font-semibold">Yakında</span>
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
                  <span className="font-semibold text-gray-900">{transaction.user}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{transaction.plan}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-900">₺{transaction.amount}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{transaction.payment_method}</span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{transaction.date}</span>
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
