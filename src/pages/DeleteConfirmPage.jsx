import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Shield } from 'lucide-react';

export const DeleteConfirmPage = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setOk(false);
      try {
        const res = await fetch(`/api/users/delete-confirm?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Onay başarısız.');
        setOk(true);
        setMessage(
          data?.message ||
            'Hesabınız silinmek üzere kayda alındı. 90 gün içinde görünürlüğünüz kaldırılacaktır.'
        );
        setScheduledFor(data?.scheduled_for || '');
      } catch (e) {
        setOk(false);
        setMessage(e?.message || 'Onay başarısız.');
      } finally {
        setLoading(false);
      }
    };
    if (token) run();
    else {
      setLoading(false);
      setOk(false);
      setMessage('Token eksik.');
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary-blue" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Hesap Silme Onayı</h1>
          <p className="text-sm text-gray-600 mt-1">Güvenlik için bu işlem e‑posta ile onaylanır.</p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-600">Onaylanıyor…</div>
        ) : ok ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 flex items-start gap-2">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Onaylandı</div>
                <div className="text-sm">{message}</div>
                {scheduledFor && (
                  <div className="text-xs text-green-700 mt-2">
                    Planlanan kesin silme: <span className="font-semibold">{new Date(scheduledFor).toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900">
              <div className="font-bold mb-1">Önemli</div>
              <div className="text-sm">
                Bu süre boyunca hesabınız pasif bekler. İsterseniz giriş yaparak <strong>Ayarlar → Hesabı Sil</strong> ekranından
                hesabınızı tekrar aktif edebilirsiniz.
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/login-new"
                className="flex-1 text-center bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl"
              >
                Giriş Yap
              </Link>
              <Link
                to="/"
                className="flex-1 text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 rounded-xl"
              >
                Ana Sayfa
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 flex items-start gap-2">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Onaylanamadı</div>
              <div className="text-sm">{message}</div>
              <div className="text-xs text-red-700 mt-2">Bağlantı 24 saat içinde geçerlidir.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

