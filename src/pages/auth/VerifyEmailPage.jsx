import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [logoFailed, setLogoFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoading(false);
        setOk(false);
        setError('Geçersiz veya eksik token.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const r = await apiCall(`/api/auth/verify-email?token=${encodeURIComponent(token)}`).catch(() => null);
        if (!cancelled && r?.success) {
          setOk(true);
        } else if (!cancelled) {
          setOk(false);
          setError(r?.error || 'Doğrulama başarısız.');
        }
      } catch (e) {
        if (!cancelled) {
          setOk(false);
          setError(e?.message || 'Doğrulama başarısız.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/')}>
            {!logoFailed && (
              <img
                src="/logo.png"
                alt="Polithane"
                className="w-24 h-auto object-contain drop-shadow-lg"
                onError={() => setLogoFailed(true)}
              />
            )}
            <div className={`${logoFailed ? 'flex' : 'hidden'} items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg`}>
              <span className="text-4xl font-black text-white">P</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">E-posta Doğrulama</h1>
          <p className="text-gray-600">Hesabınızı aktifleştiriyoruz…</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {loading && <div className="text-center text-sm text-gray-600">Doğrulanıyor…</div>}

          {!loading && ok && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">E-posta doğrulandı</h2>
              <p className="text-gray-600 mb-6">Artık giriş yapabilirsiniz.</p>
              <button
                onClick={() => navigate('/login-new')}
                className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Giriş Yap
              </button>
            </div>
          )}

          {!loading && !ok && (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error || 'Doğrulama başarısız.'}</p>
              </div>

              <div className="flex items-center justify-between">
                <Link to="/login-new" className="text-primary-blue font-black hover:underline">
                  Giriş
                </Link>
                <Link to="/register-new" className="text-gray-700 font-black hover:underline">
                  Üye ol
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

