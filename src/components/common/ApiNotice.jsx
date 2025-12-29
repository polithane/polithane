import { AlertTriangle, RefreshCcw } from 'lucide-react';

export function ApiNotice({ title, message, schemaSql, onRetry, compact = false }) {
  const t = String(title || '').trim() || 'Bir sorun oluştu';
  const msg = String(message || '').trim();
  const sql = String(schemaSql || '').trim();

  return (
    <div
      className={[
        'bg-white border rounded-2xl shadow-sm',
        sql ? 'border-amber-200' : 'border-red-200',
        compact ? 'p-4' : 'p-6',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={['rounded-full p-2', sql ? 'bg-amber-100' : 'bg-red-100'].join(' ')}>
          <AlertTriangle className={['w-5 h-5', sql ? 'text-amber-700' : 'text-red-600'].join(' ')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={['font-black text-gray-900', compact ? 'text-base' : 'text-lg'].join(' ')}>{t}</div>
          {msg ? <div className="text-sm text-gray-700 mt-1 break-words">{msg}</div> : null}

          {sql ? (
            <div className="mt-4">
              <div className="text-sm text-amber-900 font-semibold">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
              <pre className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 overflow-auto text-xs text-gray-800">
                {sql}
              </pre>
            </div>
          ) : null}

          {typeof onRetry === 'function' ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
            >
              <RefreshCcw className="w-5 h-5" />
              Tekrar Dene
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

