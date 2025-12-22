import { useMemo, useState } from 'react';
import { Mail, Send, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export const MailTest = () => {
  const { user } = useAuth();
  const defaultTo = useMemo(() => String(user?.email || '').trim(), [user?.email]);

  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState('Polithane SMTP Test');
  const [text, setText] = useState(
    `Bu bir test e-postasıdır.\n\nSaat: ${new Date().toISOString()}\n\n— Polithane`
  );
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);

  const onReset = () => {
    setTo(defaultTo);
    setSubject('Polithane SMTP Test');
    setText(`Bu bir test e-postasıdır.\n\nSaat: ${new Date().toISOString()}\n\n— Polithane`);
    setResult(null);
  };

  const onSend = async () => {
    const payload = {
      to: String(to || '').trim(),
      subject: String(subject || '').trim(),
      text: String(text || '').trim(),
    };
    if (!payload.to || !payload.to.includes('@')) {
      toast.error('Geçerli bir alıcı e-posta yazın.');
      return;
    }
    if (!payload.subject) {
      toast.error('Konu boş olamaz.');
      return;
    }
    if (!payload.text) {
      toast.error('Mesaj boş olamaz.');
      return;
    }

    setIsSending(true);
    setResult(null);
    try {
      const res = await api.admin.sendTestEmail(payload);
      setResult(res);
      if (res?.success) toast.success('Test e-postası gönderildi.');
      else toast.error(res?.error || 'E-posta gönderilemedi.');
    } catch (e) {
      const msg = String(e?.message || 'E-posta gönderilemedi.');
      setResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const ok = !!result?.success;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">E-posta Testi</h1>
          <p className="text-gray-600 mt-1">
            SMTP üzerinden tek seferlik test e-postası gönder (hata ayıklama sonucu burada görünür).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold"
          >
            <RefreshCw className="w-5 h-5" />
            Sıfırla
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-blue text-white hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
          >
            <Send className="w-5 h-5" />
            {isSending ? 'Gönderiliyor…' : 'Test Gönder'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary-blue" />
          </div>
          <div className="font-black text-gray-900">SMTP Test E-postası</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Alıcı</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="ornek@domain.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Konu</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Mesaj (Metin)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
        </div>

        {result && (
          <div className="mt-5">
            <div
              className={`rounded-xl border p-4 ${
                ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {ok ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className={`font-black ${ok ? 'text-green-800' : 'text-red-800'}`}>
                    {ok ? 'Başarılı' : 'Başarısız'}
                  </div>
                  <div className={`text-sm mt-1 ${ok ? 'text-green-800/80' : 'text-red-800/80'}`}>
                    {ok ? 'E-posta gönderimi tamamlandı.' : String(result?.error || 'E-posta gönderilemedi.')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Hata Ayıklama (JSON)</div>
              <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-4 overflow-auto max-h-[320px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

