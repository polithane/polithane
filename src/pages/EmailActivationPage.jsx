import { useMemo, useState } from 'react';
import { Mail, RefreshCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall } from '../utils/api';

export const EmailActivationPage = () => {
  const { user } = useAuth();
  const initialEmail = useMemo(() => String(user?.email || '').trim(), [user?.email]);
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const resend = async () => {
    setSending(true);
    setMsg('');
    setErr('');
    try {
      const e = String(email || '').trim().toLowerCase();
      if (!e) throw new Error('E-posta adresi gerekli.');
      const r = await apiCall('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: e }) });
      if (!r?.success) throw new Error(r?.error || 'Gönderilemedi.');
      setMsg(String(r?.message || 'Gönderildi.'));
    } catch (e) {
      setErr(String(e?.message || 'Gönderilemedi.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container-main py-10">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-blue to-blue-700 flex items-center justify-center shadow-lg">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-black text-gray-900">Mail Aktivasyonu</h1>
                <p className="text-gray-600 mt-1">
                  Hesabını tam kullanabilmek için e-posta adresini doğrulamalısın.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-black">Mail bazen spam/junk/istenmeyen klasörüne düşebilir.</div>
                  <div className="mt-1">
                    Lütfen <span className="font-bold">Gelen Kutusu</span> yanında{' '}
                    <span className="font-bold">Spam / Junk / İstenmeyen</span> klasörlerini de kontrol et.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">E-posta adresi</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eposta@ornek.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
              />
              <button
                type="button"
                onClick={resend}
                disabled={sending}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-black disabled:opacity-60"
              >
                <RefreshCcw className="w-5 h-5" />
                {sending ? 'Gönderiliyor…' : 'Doğrulama mailini tekrar gönder'}
              </button>
            </div>

            {msg ? (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5" />
                <div className="text-sm font-semibold">{msg}</div>
              </div>
            ) : null}
            {err ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <div className="text-sm font-semibold">{err}</div>
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="font-black text-gray-900 mb-2">Doğrulama yapılana kadar</div>
              <ul className="text-sm text-gray-700 space-y-1 list-disc ml-5">
                <li>Siteyi gezebilirsin.</li>
                <li>Beğenme, yorum, takip, mesaj, paylaşım gibi etkileşimler kapalıdır.</li>
                <li>Doğrulama sonrası deneyimin otomatik olarak açılır.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

