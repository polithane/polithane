import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowLeft, XCircle, Loader2 } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Email validation states
  const [emailStatus, setEmailStatus] = useState(''); // 'checking', 'found', 'not-found'
  const emailCheckTimeoutRef = useRef(null);
  
  // DEBUG: Geçici debug log'ları
  const [debugInfo, setDebugInfo] = useState(null);

  // Check email when it changes
  useEffect(() => {
    const checkEmailExists = async (emailValue) => {
      if (!emailValue || emailValue.length < 5) {
        setEmailStatus('');
        return;
      }

      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        setEmailStatus('');
        return;
      }

      // Turkish character check
      const hasTurkish = /[çğıöşüİÇĞÖŞÜ]/.test(emailValue);
      if (hasTurkish) {
        setEmailStatus('not-found');
        return;
      }

      setEmailStatus('checking');

      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }

      emailCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const apiBase = (import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000'))
            .replace(/\/+$/, '')
            .replace(/\/api$/, '');
          console.log('🔍 Checking email:', emailValue);
          const response = await fetch(`${apiBase}/api/auth/check-availability?email=${encodeURIComponent(emailValue)}`);
          console.log('📥 Response status:', response.status);
          const data = await response.json();
          console.log('📄 Response data:', data);
          
          if (data.success) {
            // In forgot password, we want TAKEN emails (users that exist)
            const newStatus = data.emailAvailable ? 'not-found' : 'found';
            console.log('✅ Setting email status:', newStatus);
            setEmailStatus(newStatus);
          } else {
            console.log('❌ Check failed, clearing status');
            setEmailStatus('');
          }
        } catch (err) {
          console.error('❌ Email check error:', err);
          setEmailStatus('');
        }
      }, 500);
    };

    checkEmailExists(email);

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null); // Clear previous debug info

    // Check email status before submitting
    if (emailStatus === 'not-found') {
      setError('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.');
      return;
    }

    if (emailStatus === 'checking') {
      setError('E-posta kontrolü yapılıyor, lütfen bekleyin...');
      return;
    }

    setLoading(true);

    try {
      // DEBUG: API çağrısı öncesi
      const debugStart = {
        timestamp: new Date().toISOString(),
        email: email,
        emailStatus: emailStatus,
      };

      const response = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      // DEBUG: API response'u kaydet
      setDebugInfo({
        ...debugStart,
        response: response,
        responseTime: new Date().toISOString(),
        success: response.success,
        error: response.error,
        backendDebug: response.debug || null, // Backend'den gelen detaylı hata
        backendCode: response.code || null,
        rawResponse: JSON.stringify(response, null, 2),
      });

      if (response.success) {
        setSuccess(true);
      } else {
        // Backend debug varsa onu da göster
        const errorMsg = response.error || 'Bir hata oluştu';
        const debugMsg = response.debug ? ` (Detay: ${response.debug})` : '';
        setError(errorMsg + debugMsg);
        setLoading(false);
      }
    } catch (err) {
      // DEBUG: Hata durumu (err.data backend response içeriyor!)
      setDebugInfo({
        timestamp: new Date().toISOString(),
        email: email,
        error: err.message,
        errorStack: err.stack,
        errorString: err.toString(),
        backendData: err.data || null, // Backend'den gelen tüm data (debug dahil)
        backendDebug: err.data?.debug || null, // Backend debug field
        backendCode: err.data?.code || null,
      });
      
      // Backend debug varsa mesaja ekle
      const errorMsg = err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      const debugMsg = err.data?.debug ? ` [DEBUG: ${err.data.debug}]` : '';
      setError(errorMsg + debugMsg);
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

          {/* DEBUG INFO - Success sayfasında da göster */}
          {/* DEBUG INFO - Removed (not needed anymore) */}

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-24 h-24 text-green-600" />
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
                src="/logo.png" 
                alt="Polithane" 
                width={80}
                height={80}
                className="w-20 h-20 object-contain drop-shadow-lg"
                onError={() => setLogoFailed(true)}
              />
            )}
            <div className={`${logoFailed ? 'flex' : 'hidden'} items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg`}>
              <span className="text-4xl font-black text-white">P</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Polithane</h1>
          <p className="text-gray-600">Özgür, açık, şeffaf siyaset, bağımsız medya!</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* DEBUG INFO - Removed (not needed anymore) */}

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
                  className={`w-full pl-14 pr-12 py-3 border rounded-lg outline-none transition-all ${
                    emailStatus === 'found'
                      ? 'border-green-500 focus:ring-2 focus:ring-green-500'
                      : emailStatus === 'not-found'
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-2 focus:ring-primary-blue focus:border-primary-blue'
                  }`}
                  required
                />
                {/* Status Icons - MASSIVE (2x bigger = 6x from original) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {emailStatus === 'checking' && (
                    <Loader2 className="w-24 h-24 text-gray-400 animate-spin" />
                  )}
                  {emailStatus === 'found' && (
                    <CheckCircle className="w-24 h-24 text-green-500" />
                  )}
                  {emailStatus === 'not-found' && (
                    <XCircle className="w-24 h-24 text-red-500" />
                  )}
                </div>
              </div>
              {/* Status Messages */}
              {emailStatus === 'found' && (
                <p className="text-xs text-green-600 mt-2 font-semibold">
                  ✓ E-posta kayıtlı, şifre sıfırlama linki gönderilebilir.
                </p>
              )}
              {emailStatus === 'not-found' && (
                <p className="text-xs text-red-600 mt-2 font-semibold">
                  ✗ Bu e-posta adresi sistemde kayıtlı değil.
                </p>
              )}
              {!emailStatus && (
                <p className="text-xs text-gray-500 mt-2">
                  Kayıtlı e-posta adresinizi girin. Size şifre sıfırlama linki göndereceğiz.
                </p>
              )}
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
