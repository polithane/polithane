import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { apiCall } from '../../utils/api';

// Şifre kuralları (RegisterPageNew ile aynı)
const PASSWORD_RULES = [
  { id: 'length', label: 'En az 8 karakter', validator: (p) => p.length >= 8 },
  { id: 'max_length', label: 'En fazla 50 karakter', validator: (p) => p.length <= 50 },
  { id: 'letter', label: 'En az 1 harf', validator: (p) => /[a-zA-Z]/.test(p) },
  { id: 'number', label: 'En az 1 rakam', validator: (p) => /[0-9]/.test(p) },
];

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [logoFailed, setLogoFailed] = useState(false);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Geçersiz veya eksik token. Lütfen şifre sıfırlama linkini tekrar isteyin.');
    }
  }, [token]);

  // Şifre kuralları kontrolü (RegisterPageNew ile aynı)
  const passwordValidation = useMemo(() => {
    return PASSWORD_RULES.map(rule => ({
      ...rule,
      passed: rule.validator(formData.password)
    }));
  }, [formData.password]);

  const passwordOk = useMemo(() => {
    return formData.password && passwordValidation.every(r => r.passed);
  }, [formData.password, passwordValidation]);

  const passwordMatch = useMemo(() => {
    return formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  const canSubmit = useMemo(() => {
    return passwordOk && passwordMatch && !loading && token;
  }, [passwordOk, passwordMatch, loading, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Lütfen tüm şartları sağlayın.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword: formData.password,
        }),
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login-new');
        }, 3000);
      } else {
        setError(response.error || 'Şifre sıfırlama başarısız.');
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
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
              {!logoFailed ? (
                <img
                  src="/logo.png"
                  alt="Polithane"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-contain drop-shadow-lg"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div className="flex items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg">
                  <span className="text-4xl font-black text-white">P</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 mb-3">
                Şifreniz Değiştirildi!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.
              </p>

              <p className="text-sm text-gray-500 mb-6">
                3 saniye içinde giriş sayfasına yönlendirileceksiniz...
              </p>

              <button
                onClick={() => navigate('/login-new')}
                className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Giriş Sayfasına Git
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
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt="Polithane"
                width={96}
                height={96}
                className="w-24 h-24 object-contain drop-shadow-lg"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg">
                <span className="text-4xl font-black text-white">P</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Polithane. Yeni Şifre</h1>
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

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Yeni Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="En az 8 karakter"
                  className={`w-full pl-14 pr-12 py-3 border rounded-lg focus:ring-2 outline-none transition-all ${
                    formData.password && passwordOk
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-primary-blue focus:border-primary-blue'
                  }`}
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
              {/* Password Rules */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.map(rule => (
                    <div key={rule.id} className="flex items-center gap-2 text-xs">
                      {rule.passed ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={rule.passed ? 'text-green-600' : 'text-red-600'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Şifrenizi tekrar girin"
                  className={`w-full pl-14 pr-12 py-3 border rounded-lg focus:ring-2 outline-none transition-all ${
                    formData.confirmPassword && passwordMatch
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-primary-blue focus:border-primary-blue'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {passwordMatch ? (
                    <>
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-600">Şifreler eşleşiyor</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-red-600">Şifreler eşleşmiyor</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full font-bold py-3 rounded-lg transition-all shadow-lg ${
                canSubmit
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Şifre Değiştiriliyor...' : 'Şifremi Değiştir'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login-new"
              className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
            >
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
