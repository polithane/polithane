import { useEffect, useMemo, useState } from 'react';
import { Mail, Save, Send, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export const MailSettings = () => {
  const { user } = useAuth();
  const defaultTo = useMemo(() => String(user?.email || '').trim(), [user?.email]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [result, setResult] = useState(null);

  const [settings, setSettings] = useState({
    mail_enabled: 'true',
    mail_provider: 'brevo',
    mail_sender_email: '',
    mail_sender_name: 'Polithane',
    mail_reply_to_email: '',
    mail_reply_to_name: '',
    email_verification_enabled: 'false',
    brevo_api_key_configured: false,
  });
  const [brevoApiKeyDraft, setBrevoApiKeyDraft] = useState('');

  const [test, setTest] = useState({
    to: defaultTo,
    subject: 'Polithane Mail Test',
    text: `Bu bir test e-postasıdır.\n\nSaat: ${new Date().toISOString()}\n\n— Polithane`,
    html: '',
  });

  const load = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await api.admin.getMailSettings().catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Mail ayarları yüklenemedi.');
      setSettings((p) => ({ ...p, ...(r.data || {}) }));
    } catch (e) {
      toast.error(String(e?.message || 'Mail ayarları yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTest((p) => ({ ...p, to: defaultTo || p.to }));
  }, [defaultTo]);

  const onSave = async () => {
    if (saving) return;
    const senderEmail = String(settings.mail_sender_email || '').trim();
    if (settings.mail_enabled === 'true' && !senderEmail) {
      toast.error('Gönderici email zorunlu (mail_sender_email).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        mail_enabled: String(settings.mail_enabled),
        mail_provider: 'brevo',
        mail_sender_email: String(settings.mail_sender_email || '').trim(),
        mail_sender_name: String(settings.mail_sender_name || '').trim(),
        mail_reply_to_email: String(settings.mail_reply_to_email || '').trim(),
        mail_reply_to_name: String(settings.mail_reply_to_name || '').trim(),
        email_verification_enabled: String(settings.email_verification_enabled),
        brevo_api_key: String(brevoApiKeyDraft || '').trim() || undefined,
      };
      const r = await api.admin.updateMailSettings(payload).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Kaydedilemedi.');
      setBrevoApiKeyDraft('');
      toast.success('Mail ayarları kaydedildi.');
      await load();
    } catch (e) {
      toast.error(String(e?.message || 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const onSendTest = async () => {
    if (testSending) return;
    const payload = {
      to: String(test.to || '').trim(),
      subject: String(test.subject || '').trim(),
      text: String(test.text || '').trim(),
      html: String(test.html || '').trim(),
    };
    if (!payload.to || !payload.to.includes('@')) {
      toast.error('Geçerli bir alıcı e-posta yazın.');
      return;
    }
    if (!payload.subject) {
      toast.error('Konu boş olamaz.');
      return;
    }
    if (!payload.text && !payload.html) {
      toast.error('Mesaj boş olamaz (text veya html).');
      return;
    }

    setTestSending(true);
    setResult(null);
    try {
      const r = await api.admin.sendTestEmail(payload);
      setResult(r);
      if (r?.success) toast.success('Test e-postası gönderildi.');
      else toast.error(r?.error || 'E-posta gönderilemedi.');
    } catch (e) {
      const msg = String(e?.message || 'E-posta gönderilemedi.');
      setResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setTestSending(false);
    }
  };

  const ok = !!result?.success;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Mail Ayarları</h1>
          <p className="text-gray-600 mt-1">Tüm mail sistemi burada yönetilir (Brevo Transactional API).</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold disabled:opacity-60"
          >
            <RefreshCw className="w-5 h-5" />
            Yenile
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-60 font-semibold"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-blue" />
            </div>
            <div className="font-black text-gray-900">Brevo Mail Yapılandırması</div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div>
                <div className="font-black text-gray-900">Mail Sistemi</div>
                <div className="text-sm text-gray-600">Genel mail gönderimi açık/kapalı</div>
              </div>
              <select
                value={String(settings.mail_enabled)}
                onChange={(e) => setSettings((p) => ({ ...p, mail_enabled: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold"
              >
                <option value="true">Açık</option>
                <option value="false">Kapalı</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-blue" />
                <div>
                  <div className="font-black text-gray-900">E-posta Doğrulama</div>
                  <div className="text-sm text-gray-600">Login için email_verified zorunlu olsun</div>
                </div>
              </div>
              <select
                value={String(settings.email_verification_enabled)}
                onChange={(e) => setSettings((p) => ({ ...p, email_verification_enabled: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold"
              >
                <option value="true">Açık</option>
                <option value="false">Kapalı</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Provider</label>
              <input
                value="brevo"
                readOnly
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 text-gray-800 font-semibold"
              />
              <div className="text-xs text-gray-500 mt-1">
                Not: Bu projede tek provider: <strong>Brevo</strong>.
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Brevo API Key</label>
              <input
                type="password"
                value={brevoApiKeyDraft}
                onChange={(e) => setBrevoApiKeyDraft(e.target.value)}
                placeholder={settings.brevo_api_key_configured ? '•••••••• (kayıtlı)' : 'Brevo API Key girin'}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
              <div className="text-xs text-gray-500 mt-1">
                {settings.brevo_api_key_configured ? 'API key kayıtlı (gizli).' : 'API key henüz tanımlı değil.'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Gönderici Email</label>
                <input
                  value={settings.mail_sender_email}
                  onChange={(e) => setSettings((p) => ({ ...p, mail_sender_email: e.target.value }))}
                  placeholder="noreply@polithane.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Gönderici Ad</label>
                <input
                  value={settings.mail_sender_name}
                  onChange={(e) => setSettings((p) => ({ ...p, mail_sender_name: e.target.value }))}
                  placeholder="Polithane"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reply-To Email (opsiyonel)</label>
                <input
                  value={settings.mail_reply_to_email}
                  onChange={(e) => setSettings((p) => ({ ...p, mail_reply_to_email: e.target.value }))}
                  placeholder="support@polithane.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reply-To Ad (opsiyonel)</label>
                <input
                  value={settings.mail_reply_to_name}
                  onChange={(e) => setSettings((p) => ({ ...p, mail_reply_to_name: e.target.value }))}
                  placeholder="Polithane Destek"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="font-black text-gray-900">Test Mail Gönder</div>
            <button
              type="button"
              onClick={onSendTest}
              disabled={testSending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-blue text-white hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            >
              <Send className="w-5 h-5" />
              {testSending ? 'Gönderiliyor…' : 'Test Gönder'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Alıcı</label>
              <input
                value={test.to}
                onChange={(e) => setTest((p) => ({ ...p, to: e.target.value }))}
                placeholder="ornek@domain.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Konu</label>
              <input
                value={test.subject}
                onChange={(e) => setTest((p) => ({ ...p, subject: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mesaj (Text)</label>
              <textarea
                value={test.text}
                onChange={(e) => setTest((p) => ({ ...p, text: e.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mesaj (HTML) (opsiyonel)</label>
              <textarea
                value={test.html}
                onChange={(e) => setTest((p) => ({ ...p, html: e.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
          </div>

          {result ? (
            <div className="mt-5">
              <div
                className={`rounded-xl border p-4 ${
                  ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className={`font-black ${ok ? 'text-green-800' : 'text-red-800'}`}>
                  {ok ? 'Başarılı' : 'Başarısız'}
                </div>
                <div className={`text-sm mt-1 ${ok ? 'text-green-800/80' : 'text-red-800/80'}`}>
                  {ok ? 'E-posta gönderimi tamamlandı.' : String(result?.error || 'E-posta gönderilemedi.')}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Hata Ayıklama (JSON)</div>
                <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-4 overflow-auto max-h-[320px]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

