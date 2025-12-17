import { useMemo, useState } from 'react';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle, Mail, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  // Steps are visually represented via checkboxes; kept for future extension.
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [ack3, setAck3] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const deleteStatus = useMemo(() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    return {
      status: String(meta.delete_request_status || ''),
      scheduledFor: meta.delete_request_scheduled_for || '',
    };
  }, [user]);

  const handleRequestEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me/delete-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Onay e-postası gönderilemedi.');
      setEmailSent(true);
      setSuccess(true);
    } catch (e) {
      setError(e?.message || 'Onay e-postası gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Hesap tekrar aktif edilemedi.');
      if (data.data) updateUser(data.data);
      setSuccess(true);
      setEmailSent(false);
    } catch (e) {
      setError(e?.message || 'Hesap tekrar aktif edilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Hesabı Sil</h2>
      <p className="text-sm text-gray-600 mb-6">
        Hesabınızı silmek için 3 aşamalı güvenlik onayı gerekir. Son adımda e‑posta onayı gönderilir.
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" />
          {emailSent ? 'Onay e-postası gönderildi. Lütfen e-postanızı kontrol edin.' : 'İşlem başarılı.'}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {deleteStatus.status === 'confirmed' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Undo2 className="w-6 h-6 text-primary-blue" />
            </div>
            <div className="flex-1">
              <div className="font-black text-gray-900">Silme kaydı mevcut</div>
              <div className="text-sm text-gray-700 mt-1">
                Hesabınız silinmek üzere kayda alınmış. Bu süre boyunca hesabınızı tekrar aktif edebilirsiniz.
              </div>
              {deleteStatus.scheduledFor && (
                <div className="text-xs text-gray-500 mt-2">
                  Planlanan kesin silme: <span className="font-semibold">{new Date(deleteStatus.scheduledFor).toLocaleString('tr-TR')}</span>
                </div>
              )}
              <button
                onClick={handleReactivate}
                disabled={loading}
                className="mt-4 inline-flex items-center gap-2 bg-primary-blue hover:bg-blue-600 text-white font-bold px-5 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-5 h-5" />
                {loading ? 'İşleniyor...' : 'Hesabımı Tekrar Aktif Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="font-black text-gray-900">Güvenlik Onayı (3 adım)</div>
            <div className="text-sm text-gray-700 mt-1">
                Hesap silme talebi, e‑posta üzerinden onaylandıktan sonra hesabınız pasif duruma alınır.
                Bu andan itibaren profiliniz ve içerikleriniz diğer kullanıcılara görünmez olur. 90 gün sonunda hesap kalıcı silinir.
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={ack1} onChange={(e) => setAck1(e.target.checked)} className="mt-0.5 w-6 h-6" />
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">1)</span> Bu talebin güvenlik nedeniyle e‑posta ile onaylanacağını anladım.
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={ack2} onChange={(e) => setAck2(e.target.checked)} className="mt-0.5 w-6 h-6" />
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">2)</span> Onay sonrası hesabım pasif olacak; 90 gün sonunda sitedeki görünürlüğüm kaldırılacak.
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={ack3} onChange={(e) => setAck3(e.target.checked)} className="mt-0.5 w-6 h-6" />
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">3)</span> Bu süre içinde istersem hesabımı tekrar aktif edebileceğimi anladım.
                </div>
              </label>

              <div className="pt-2">
                <div className="text-sm text-gray-700">
                  Devam etmek için kutuya <strong>SİL</strong> yazın.
                </div>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-3 w-full border border-gray-300 rounded-lg p-3"
                  placeholder="SİL"
                />
              </div>

              <button
                onClick={handleRequestEmail}
                disabled={loading || !ack1 || !ack2 || !ack3 || confirmText.trim().toUpperCase() !== 'SİL'}
                className="mt-2 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-5 h-5" />
                {loading ? 'Gönderiliyor...' : 'Onay E-postası Gönder'}
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/');
                }}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold px-5 py-3 rounded-lg"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

