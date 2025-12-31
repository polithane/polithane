import { useMemo, useState } from 'react';
import { DollarSign, CreditCard, BarChart3 } from 'lucide-react';
import { PaymentSystem } from './PaymentSystem';
import { RevenueAnalysis } from './RevenueAnalysis';

export const PaymentsAndRevenue = () => {
  const [tab, setTab] = useState('payments');

  const tabs = useMemo(
    () => [
      { key: 'payments', label: 'Ödeme Sistemi', icon: CreditCard },
      { key: 'revenue', label: 'Gelir Analizi', icon: BarChart3 },
    ],
    []
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-primary-blue" />
            Ödeme & Gelir
          </h1>
          <p className="text-gray-600">Planlar, işlemler ve gelir kayıtları</p>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-2 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg font-black inline-flex items-center gap-2 ${
                active ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'payments' ? <PaymentSystem embedded /> : null}
      {tab === 'revenue' ? <RevenueAnalysis embedded /> : null}
    </div>
  );
};

