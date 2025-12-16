import { useState } from 'react';
import { Download, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const DataExportPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/users/me/export', {
        method: 'GET',
        headers: {
          ...(localStorage.getItem('auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
            : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = 'İndirme başarısız.';
        try {
          const j = JSON.parse(text);
          msg = j?.error || j?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polithane-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e?.message || 'İndirme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // keep apiCall import used (bundlers may tree-shake; this avoids lint warning in some setups)
  void apiCall;

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Verilerim</h2>
      <p className="text-sm text-gray-600 mb-6">
        Hesabınıza ait temel verileri (profil, postlar, bildirimler, mesajlar) JSON olarak indirebilirsiniz.
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" />
          İndirme başlatıldı.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-primary-blue" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900">JSON Veri İndir</div>
            <div className="text-sm text-gray-600 mt-1">
              Bu dosya üçüncü kişilerle paylaşılmamalıdır.
            </div>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 bg-primary-blue hover:bg-blue-600 text-white font-bold px-5 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {loading ? 'Hazırlanıyor...' : 'İndir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

