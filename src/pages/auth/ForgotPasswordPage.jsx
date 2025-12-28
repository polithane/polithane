import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error || 'Bir hata oluştu');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate('/')}
            >
              {!logoFailed && (
                <img 
                  src="/logo.png" 
                  alt="Polithane" 
                  width={96}
                  height={96}
                  className="w-24 h-24 object-contain drop-shadow-lg"
                  onError={() => setLogoFailed(true)}
                />
              )}
              <div className={`${logoFailed ? 'flex' : 'hidden'} items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg`}>
                <span className="text-4xl font-black text-white">P</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 mb-3">
                E-posta Gönderildi!
              </h2>
              
              <p className="text-gray-600 mb-6">
                <strong>{email}</strong> adresine şifre sıfırlama linki gönderdik.
                Lütfen e-posta kutunuzu kontrol edin.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>📧 E-posta gelmediyse:</strong>
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Spam/Gereksiz klasörünü kontrol edin</li>
                  <li>E-posta adresinizi doğru yazdığınızdan emin olun</li>
                  <li>Birkaç dakika bekleyin (bazen geç gelebilir)</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login-new')}
                className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate('/')}
          >
            {!logoFailed && (
              <img 
                src="/logo.svg" 
                alt="Polithane" 
                width={80}
                height={80}
                className="w-auto h-20 object-contain drop-shadow-lg"
                onError={() => setLogoFailed(true)}
              />
            )}
            <div className={`${logoFailed ? 'flex' : 'hidden'} items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg`}>
              <span className="text-4xl font-black text-white">P</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Polithane. Şifremi Unuttum</h1>
          <p className="text-gray-600">Özgür, açık, şeffaf siyaset, bağımsız medya!</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* E-posta */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-posta Adresiniz
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eposta@ornek.com"
                  className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Kayıtlı e-posta adresinizi girin. Size şifre sıfırlama linki göndereceğiz.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6">
            <Link
              to="/login-new"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
            >
              <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
              Giriş Sayfasına Dön
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            © 2025 Polithane. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
};
