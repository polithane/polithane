import { useState } from 'react';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Hesap silinemedi.');
      setSuccess(true);
      setTimeout(async () => {
        await logout();
        navigate('/');
      }, 800);
    } catch (e) {
      setError(e?.message || 'Hesap silinemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Hesabı Sil</h2>
      <p className="text-sm text-gray-600 mb-6">
        Bu işlem hesabınızı <strong>pasif</strong> hale getirir (geri alınabilir). İleride kalıcı silme akışı eklenebilir.
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" />
          Hesap pasifleştirildi. Çıkış yapılıyor...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="font-black text-gray-900">Onay</div>
            <div className="text-sm text-gray-700 mt-1">
              Devam etmek için kutuya <strong>SİL</strong> yazın.
            </div>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-4 w-full border border-gray-300 rounded-lg p-3"
              placeholder="SİL"
            />
            <button
              onClick={handleDelete}
              disabled={loading || confirmText.trim().toUpperCase() !== 'SİL'}
              className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              {loading ? 'İşleniyor...' : 'Hesabı Pasifleştir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

