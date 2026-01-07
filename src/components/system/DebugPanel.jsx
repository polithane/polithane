import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

const safeJsonParse = (s) => {
  try {
    return JSON.parse(String(s || ''));
  } catch {
    return null;
  }
};

const readLastMailTest = () => {
  try {
    return safeJsonParse(localStorage.getItem('debug:lastMailTest')) || null;
  } catch {
    return null;
  }
};

const readLastApiError = () => {
  try {
    return window.__lastApiError || null;
  } catch {
    return null;
  }
};

const diagnose = (r) => {
  const debug = r?.debug;
  if (!debug) return null;

  const used = String(debug.usedProvider || '').trim();
  const brevoCfg = !!debug?.brevo?.configured;
  const brevoKeyPresent = !!debug?.brevo?.keyPresent;
  const brevoFromPresent = !!debug?.brevo?.fromEmailPresent;
  const attempts = Array.isArray(debug?.attempts) ? debug.attempts : [];
  const brevoAttempt = attempts.find((a) => a?.provider === 'brevo');

  if (!brevoKeyPresent) return 'Brevo API key yok: Mail Ayarları > Brevo API Key girin (veya Vercel env BREVO_API_KEY).';
  if (!brevoFromPresent) return 'Gönderici email yok/boş: Mail Ayarları > Gönderici Email girin (Brevo’da doğrulanmış olmalı).';
  if (brevoCfg && brevoAttempt && brevoAttempt.sent === false && brevoAttempt.error) {
    return `Brevo hata verdi: "${brevoAttempt.error}". (Genelde sender doğrulaması, API key yetkisi veya Brevo Transactional limiti ile ilgilidir.)`;
  }
  if (brevoAttempt?.sent === true && brevoAttempt?.messageId) {
    return `Brevo kabul etti (messageId: ${brevoAttempt.messageId}). Mail gelmiyorsa spam/suppression kontrolü için Brevo Transactional Logs’ta bu ID ile arayın.`;
  }
  if (!used) {
    const last = attempts[attempts.length - 1];
    const lastErr = last?.sendError || last?.error || null;
    return lastErr ? `Gönderim başarısız: "${String(lastErr)}"` : 'Gönderim başarısız: debug içinde net hata yok.';
  }
  return null;
};

export const DebugPanel = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const qs = useMemo(() => new URLSearchParams(String(location?.search || '')), [location?.search]);
  const enabled = useMemo(() => {
    const q = qs.get('debug');
    if (q === '1' || q === 'true') return true;
    try {
      return localStorage.getItem('debug_panel') === 'true';
    } catch {
      return false;
    }
  }, [qs]);

  const [open, setOpen] = useState(true);
  const [env, setEnv] = useState(null);
  const [busy, setBusy] = useState(false);

  const [lastMail, setLastMail] = useState(() => readLastMailTest());
  const [lastErr, setLastErr] = useState(() => readLastApiError());
  const diagnosis = useMemo(() => diagnose(lastMail), [lastMail]);

  // Keep panel live (admin will trigger actions on other pages).
  useEffect(() => {
    const tick = () => {
      setLastMail(readLastMailTest());
      setLastErr(readLastApiError());
    };
    tick();
    const id = setInterval(tick, 1000);
    const onStorage = (e) => {
      if (e?.key === 'debug:lastMailTest') tick();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (!enabled) return null;
  if (!isAdmin?.()) return null;
  if (!open) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-[1000] px-3 py-2 rounded-xl bg-gray-900 text-white font-black inline-flex items-center gap-2 shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Bug className="w-5 h-5" />
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1000] w-[92vw] max-w-[520px] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="font-black text-gray-900 inline-flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary-blue" />
          Debug Panel (Admin)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              try {
                const r = await apiCall('/api/admin/env-check', { method: 'GET' });
                setEnv(r);
              } catch (e) {
                setEnv({ success: false, error: String(e?.message || 'env-check failed') });
              } finally {
                setBusy(false);
              }
            }}
            title="Env check"
          >
            <RefreshCw className={`w-5 h-5 text-gray-700 ${busy ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setOpen(false)} title="Kapat">
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {diagnosis ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 font-semibold">
            {diagnosis}
          </div>
        ) : null}

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Son Mail Testi</div>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-3 overflow-auto max-h-[220px]">
            {JSON.stringify(lastMail, null, 2)}
          </pre>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Son API Hatası</div>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-3 overflow-auto max-h-[180px]">
            {JSON.stringify(lastErr, null, 2)}
          </pre>
        </div>

        {env ? (
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Env Check</div>
            <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-3 overflow-auto max-h-[180px]">
              {JSON.stringify(env, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
};

