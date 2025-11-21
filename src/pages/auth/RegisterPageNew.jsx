import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, 
  Phone, Upload, X, Check, Shield, Loader
} from 'lucide-react';

export const RegisterPageNew = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Username availability check
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Profile picture
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  
  // CAPTCHA verification
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    user_type: 'normal',
    agreeTerms: false,
    agreePrivacy: false,
  });

  // Generate new CAPTCHA
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ num1, num2, answer: num1 + num2 });
    setCaptchaAnswer('');
    setCaptchaVerified(false);
  };

  // Password strength calculator
  const calculatePasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    if (strength <= 2) return { strength, label: 'Zayıf', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Orta', color: 'bg-yellow-500' };
    return { strength, label: 'Güçlü', color: 'bg-green-500' };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  // Check username availability (DEMO: simulated with timeout)
  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setUsernameChecking(true);
    
    // Simulate API call
    setTimeout(() => {
      // Demo: usernames starting with 'admin' are taken
      const isTaken = username.toLowerCase().startsWith('admin');
      setUsernameAvailable(!isTaken);
      setUsernameChecking(false);
    }, 800);
  };

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.username]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  // Handle profile picture upload
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Dosya boyutu 5MB\'dan küçük olmalıdır');
        return;
      }
      
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  // Send OTP (Demo)
  const sendOtp = () => {
    setOtpSent(true);
    setResendTimer(60);
    setSuccess('Doğrulama kodu email adresinize gönderildi');
    
    // Demo: Log the OTP (in production, this would be sent via email)
    console.log('Demo OTP: 123456');
  };

  // Verify CAPTCHA
  const verifyCaptcha = () => {
    if (parseInt(captchaAnswer) === captchaQuestion.answer) {
      setCaptchaVerified(true);
      setSuccess('CAPTCHA doğrulandı');
      return true;
    } else {
      setError('CAPTCHA yanlış, lütfen tekrar deneyin');
      generateCaptcha();
      return false;
    }
  };

  // Validation functions
  const validateStep1 = () => {
    if (!formData.full_name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return false;
    }
    
    if (passwordStrength.strength <= 1) {
      setError('Lütfen daha güçlü bir şifre seçin');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return false;
    }
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Geçerli bir telefon numarası girin (10 haneli)');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!formData.username) {
      setError('Kullanıcı adı gereklidir');
      return false;
    }
    
    if (formData.username.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır');
      return false;
    }
    
    if (usernameAvailable === false) {
      setError('Bu kullanıcı adı kullanılıyor, lütfen başka bir tane deneyin');
      return false;
    }
    
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setError('Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz');
      return false;
    }
    
    return true;
  };

  const validateStep3 = () => {
    const otpValue = otp.join('');
    
    if (!captchaVerified) {
      setError('Lütfen CAPTCHA\'yı doğrulayın');
      return false;
    }
    
    if (otpValue.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin');
      return false;
    }
    
    // Demo: Accept '123456' as valid OTP
    if (otpValue !== '123456') {
      setError('Doğrulama kodu hatalı (Demo: 123456)');
      return false;
    }
    
    return true;
  };

  // Handle next steps
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setError('');
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setError('');
      sendOtp();
      setStep(3);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep3()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await register({
        ...formData,
        profile_image: profilePicturePreview || undefined
      });
      
      if (result.success) {
        setStep(4);
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(result.error || 'Kayıt başarısız');
      }
    } catch (err) {
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Social login handlers (Demo)
  const handleSocialLogin = (provider) => {
    setSuccess(`${provider} ile kayıt işlemi başlatıldı...`);
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    s <= step ? 'bg-primary-blue text-white scale-110' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-1 mx-2 transition-all ${s < step ? 'bg-primary-blue' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm font-semibold">
              <span className={step >= 1 ? 'text-primary-blue' : 'text-gray-500'}>Temel Bilgiler</span>
              <span className={step >= 2 ? 'text-primary-blue' : 'text-gray-500'}>Profil Detayları</span>
              <span className={step >= 3 ? 'text-primary-blue' : 'text-gray-500'}>Doğrulama</span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Hesap Oluştur</h2>
              <p className="text-gray-600 mb-6">Polithane ailesine katılın</p>
              
              {/* Social Login Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('Google')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google ile Kayıt Ol
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSocialLogin('Twitter')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter ile Kayıt Ol
                </button>
              </div>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-semibold">veya email ile</span>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Ahmet Yılmaz"
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Adresi *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ornek@email.com"
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon Numarası *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="5XX XXX XX XX"
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">SMS doğrulama için kullanılacaktır</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="En az 8 karakter"
                      className="w-full pl-14 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'
                            }`}
                          ></div>
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${
                        passwordStrength.strength <= 2 ? 'text-red-600' : 
                        passwordStrength.strength === 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        Şifre Gücü: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre Tekrar *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Şifrenizi tekrar girin"
                      className="w-full pl-14 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Şifreler eşleşmiyor</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleNext}
                className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg mt-6 transition-all shadow-lg hover:shadow-xl"
              >
                Devam Et
              </button>
            </div>
          )}
          
          {/* Step 2: Profile Details */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Profil Detayları</h2>
              <p className="text-gray-600 mb-6">Profilinizi özelleştirin</p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Profile Picture Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Profil Fotoğrafı (Opsiyonel)</label>
                  <div className="flex items-center gap-4">
                    {profilePicturePreview ? (
                      <div className="relative">
                        <img
                          src={profilePicturePreview}
                          alt="Preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePicture(null);
                            setProfilePicturePreview(null);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all font-semibold text-sm">
                        <Upload className="w-4 h-4" />
                        Fotoğraf Yükle
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Max 5MB (JPG, PNG)</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kullanıcı Adı *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="@kullaniciadi"
                      className="w-full pl-14 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {usernameChecking && <Loader className="w-5 h-5 text-gray-400 animate-spin" />}
                      {!usernameChecking && usernameAvailable === true && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {!usernameChecking && usernameAvailable === false && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {!usernameChecking && usernameAvailable === true && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Kullanıcı adı müsait
                    </p>
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <X className="w-3 h-3" /> Bu kullanıcı adı kullanılıyor
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hesap Tipi *</label>
                  <p className="text-sm text-gray-600 mb-3">
                    Hesap tipiniz, platformdaki özelliklerinizi ve yetkilerinizi belirler
                  </p>
                  
                  <div className="space-y-2">
                    {/* Vatandaş */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="normal"
                        checked={formData.user_type === 'normal'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          👤 Vatandaş
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Popüler</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Siyaseti takip edin, yorum yapın ve oy verin. Standart kullanıcı hesabı.
                        </p>
                      </div>
                    </label>
                    
                    {/* Parti Üyesi */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="party_member"
                        checked={formData.user_type === 'party_member'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          🎗️ Parti Üyesi
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Bir siyasi partiye üye olarak içerik paylaşın ve parti aktivitelerine katılın.
                        </p>
                      </div>
                    </label>
                    
                    {/* Siyasetçi */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="politician"
                        checked={formData.user_type === 'politician'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          🏛️ Siyasetçi
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Doğrulama Gerekli</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Milletvekili, belediye başkanı veya siyasi parti yöneticisi. Kimlik doğrulaması gereklidir.
                        </p>
                      </div>
                    </label>
                    
                    {/* Eski Siyasetçi */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="ex_politician"
                        checked={formData.user_type === 'ex_politician'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          📜 Eski Siyasetçi
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Görevden ayrılmış milletvekili, bakan veya yerel yönetici. Tecrübelerinizi paylaşın.
                        </p>
                      </div>
                    </label>
                    
                    {/* Medya */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="media"
                        checked={formData.user_type === 'media'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          📰 Medya / Gazeteci
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Doğrulama Gerekli</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Gazete, TV, radyo veya dijital medya çalışanı. Haber ve analiz paylaşın.
                        </p>
                      </div>
                    </label>
                    
                    {/* Akademisyen */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="academic"
                        checked={formData.user_type === 'academic'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          🎓 Akademisyen / Uzman
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Siyaset bilimci, hukuk profesörü veya alan uzmanı. Akademik görüşler paylaşın.
                        </p>
                      </div>
                    </label>
                    
                    {/* STK / Sivil Toplum */}
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary-blue transition-all bg-white">
                      <input
                        type="radio"
                        name="user_type"
                        value="ngo"
                        checked={formData.user_type === 'ngo'}
                        onChange={handleChange}
                        className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 focus:ring-primary-blue"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          🤝 STK / Sivil Toplum
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Dernek, vakıf veya sivil toplum kuruluşu temsilcisi. Toplumsal konularda ses getirin.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
                    />
                    <span className="text-sm text-gray-700">
                      <Link to="/terms" className="text-primary-blue hover:underline font-semibold">
                        Kullanım Koşulları
                      </Link>
                      'nı okudum ve kabul ediyorum
                    </span>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreePrivacy"
                      checked={formData.agreePrivacy}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
                    />
                    <span className="text-sm text-gray-700">
                      <Link to="/privacy" className="text-primary-blue hover:underline font-semibold">
                        Gizlilik Politikası
                      </Link>
                      'nı okudum ve kabul ediyorum
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-all"
                >
                  Geri
                </button>
                <button
                  onClick={handleNext}
                  disabled={usernameChecking || usernameAvailable === false}
                  className="flex-1 bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  Devam Et
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Verification (OTP + CAPTCHA) */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Hesabınızı Doğrulayın</h2>
              <p className="text-gray-600 mb-6">Son adım!</p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}
              
              <div className="space-y-6">
                {/* Email OTP */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Doğrulama Kodu *
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>{formData.email}</strong> adresine gönderilen 6 haneli kodu girin
                  </p>
                  
                  <div className="flex gap-2 justify-center mb-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none transition-all"
                      />
                    ))}
                  </div>
                  
                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-sm text-gray-500">
                        Yeniden gönder ({resendTimer}s)
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={sendOtp}
                        className="text-sm text-primary-blue hover:text-blue-600 font-semibold"
                      >
                        Kodu Yeniden Gönder
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <strong>Demo:</strong> Doğrulama kodu: <strong>123456</strong>
                    </p>
                  </div>
                </div>
                
                {/* CAPTCHA */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-blue" />
                    Güvenlik Doğrulaması (CAPTCHA) *
                  </label>
                  
                  <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-3">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-600 mb-2">Lütfen aşağıdaki soruyu cevaplayın:</p>
                      <p className="text-3xl font-black text-gray-900">
                        {captchaQuestion.num1} + {captchaQuestion.num2} = ?
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        placeholder="Cevap"
                        disabled={captchaVerified}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center text-xl font-bold focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none disabled:bg-green-50 disabled:text-green-700"
                      />
                      {!captchaVerified ? (
                        <button
                          type="button"
                          onClick={verifyCaptcha}
                          className="px-6 py-2 bg-primary-blue hover:bg-blue-600 text-white font-bold rounded-lg transition-all"
                        >
                          Doğrula
                        </button>
                      ) : (
                        <div className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg flex items-center gap-2">
                          <Check className="w-5 h-5" /> Doğrulandı
                        </div>
                      )}
                    </div>
                    
                    {!captchaVerified && (
                      <button
                        type="button"
                        onClick={generateCaptcha}
                        className="w-full mt-3 text-sm text-gray-600 hover:text-gray-900 font-semibold"
                      >
                        🔄 Yeni Soru
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-all"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={loading || !captchaVerified}
                  className="flex-1 bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Kaydediliyor...
                    </span>
                  ) : (
                    'Kayıt Ol'
                  )}
                </button>
              </div>
            </form>
          )}
          
          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4 animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">🎉 Kayıt Başarılı!</h2>
              <p className="text-gray-600 mb-4">Hesabınız oluşturuldu, ana sayfaya yönlendiriliyorsunuz...</p>
              <div className="inline-block">
                <Loader className="w-6 h-6 text-primary-blue animate-spin" />
              </div>
            </div>
          )}
          
          {step < 4 && (
            <div className="mt-6 text-center border-t border-gray-200 pt-6">
              <p className="text-gray-600">
                Zaten hesabınız var mı?{' '}
                <Link to="/login-new" className="text-primary-blue hover:text-blue-600 font-bold">
                  Giriş Yapın
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
