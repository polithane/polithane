import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

export const LoginPageNew = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [logoFailed, setLogoFailed] = useState(false);
  
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    remember: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.identifier, formData.password);
      
      if (result.success) {
        // Admin kullanıcıları admin paneline yönlendir
        if (result.user?.is_admin || result.user?.user_type === 'admin') {
          navigate('/adminyonetim');
        } else {
          navigate('/');
        }
      } else {
        setError(result.error || 'Giriş başarısız');
      }
    } catch (err) {
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform"
            aria-label="Ana sayfaya git"
          >
            {!logoFailed && (
              <img 
                src="/favicon.ico" 
                alt="Polithane" 
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-lg"
                onError={() => setLogoFailed(true)}
              />
            )}
            <div className={`${logoFailed ? 'flex' : 'hidden'} items-center justify-center w-24 h-24 sm:w-28 sm:h-28 bg-primary-blue rounded-2xl shadow-lg`}>
              <span className="text-5xl sm:text-6xl font-black text-white">P</span>
            </div>
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Polithane. Hoş Geldiniz</h1>
          <p className="text-gray-600">Özgür, açık, şeffaf siyaset, bağımsız medya!</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* E-posta veya Benzersiz İsim */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-posta veya Benzersiz İsim
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="eposta@ornek.com veya kullaniciadi"
                  className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer select-none py-2 pr-2 -my-2">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="w-6 h-6 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
                />
                <span className="text-sm font-semibold text-gray-800">Beni hatırla</span>
              </label>
              
              <Link
                to="/forgot-password"
                className="text-sm text-primary-blue hover:text-blue-600 font-semibold"
              >
                Şifremi Unuttum
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Hesabınız yok mu?{' '}
              <Link
                to="/register-new"
                className="text-primary-blue hover:text-blue-600 font-bold"
              >
                Kayıt Olun
              </Link>
            </p>
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
