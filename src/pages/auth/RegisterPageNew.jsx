import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, 
  Phone, Upload, X, Search, UserPlus, Shield, FileText, Clock
} from 'lucide-react';
import { FEATURE_FLAGS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import { isValidUsername, normalizeUsername } from '../../utils/validators';

export const RegisterPageNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  
  const [registrationType, setRegistrationType] = useState(null); // 'new' or 'claim'
  const [membershipType, setMembershipType] = useState(null); // 'normal', 'party_member', 'organization', 'mp'
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile search for claiming
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Document uploads
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    city: '',
    district: '',
    party: '',
    position: '',
  });

  // Eğer profil sahiplenme linkinden geldiysek: aramayı atla, direkt sahiplenme formu aç
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const claimUserId = params.get('claimUserId');
    if (mode === 'claim' && claimUserId && FEATURE_FLAGS.ENABLE_PROFILE_CLAIM_FLOW) {
      (async () => {
        try {
          const id = parseInt(claimUserId);
          const { data } = await supabase
            .from('users')
            .select('id,username,full_name,city_code,politician_type,user_type,is_automated')
            .eq('id', id)
            .limit(1)
            .maybeSingle();
          if (data) {
            setRegistrationType('claim');
            setStep(2);
            setSelectedProfile({
              id: data.id,
              username: `@${normalizeUsername(data.username)}`,
              full_name: data.full_name,
              position: data.politician_type || data.user_type,
              city: data.city_code,
              is_auto: data.is_automated
            });
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [location.search]);

  // Search profiles
  const handleProfileSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const q = searchQuery.trim();
    const { data } = await supabase
      .from('users')
      .select('id,username,full_name,city_code,politician_type,user_type,is_automated')
      .eq('is_automated', true)
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20);
    const results = (data || []).map((u) => ({
      id: u.id,
      username: `@${normalizeUsername(u.username)}`,
      full_name: u.full_name,
      position: u.politician_type || u.user_type,
      city: u.city_code,
      is_auto: u.is_automated
    }));
    setSearchResults(results);
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
        return;
      }
      
      setDocumentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // username için otomatik normalize uygula
    if (name === 'username') {
      const normalized = normalizeUsername(value);
      setFormData(prev => ({ ...prev, username: normalized }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    setError('');
  };

  // Password strength
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

  // Validation
  const validateForm = () => {
    if (!formData.full_name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return false;
    }

    if (formData.username && !isValidUsername(formData.username)) {
      setError('Benzersiz isim geçersiz. Sadece a-z, 0-9 ve _ kullanılabilir; 3-20 karakter olmalıdır.');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return false;
    }
    
    return true;
  };

  // Handle profile claim submission
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // API call simulation
      setTimeout(() => {
        setLoading(false);
        setStep(99); // Success screen
      }, 1500);
    } catch (err) {
      setError('Bir hata oluştu');
      setLoading(false);
    }
  };

  // Handle new member registration
  const handleNewMemberSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Document check for non-normal members
    if (membershipType !== 'normal' && !documentFile) {
      setError('Lütfen gerekli belgeyi yükleyin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Username: kullanıcı girdiyse onu kullan, yoksa email'den normalize üret
      const username = formData.username || normalizeUsername(formData.email.split('@')[0]);
      
      const result = await register({
        ...formData,
        username, // Add generated username
        membership_type: membershipType,
        document: documentFile
      });
      
      if (result.success) {
        setStep(99); // Success screen
      } else {
        setError(result.error || 'Kayıt başarısız');
      }
    } catch (err) {
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Membership type configurations
  const membershipTypes = {
    normal: {
      title: 'Normal Üye',
      icon: '👤',
      badge: 'Standart',
      badgeColor: 'bg-gray-100 text-gray-700',
      description: 'Standart üyelik türüdür. Polithane\'de içerik takip edebilir, yorum yapabilir ve oy kullanabilirsiniz. Sadece e-posta doğrulaması gereklidir.',
      benefits: ['İçerikleri görüntüleme', 'Yorum yapma', 'Beğeni ve paylaşım', 'Temel etkileşim puanları'],
      requiresDocument: false,
      documentTitle: null
    },
    party_member: {
      title: 'Siyasi Parti Üyesi',
      icon: '🎗️',
      badge: 'Yüksek Puan',
      badgeColor: 'bg-blue-100 text-blue-700',
      description: 'Etkileşim puanları daha yüksek üyelik türüdür. E-Devlet üzerinden alınacak Siyasi Parti Üyelik Belgesi\'nin yüklenmesi gerekir. Lütfen belgenizi hazırlayınız. Üyelik kabulü için bilgi mesajı gönderilecektir.',
      benefits: ['Normal üye avantajları', '5x daha fazla etkileşim puanı', 'Parti aktivitelerine katılım', 'Öncelikli görünürlük'],
      requiresDocument: true,
      documentTitle: 'E-Devlet Parti Üyelik Belgesi'
    },
    organization: {
      title: 'Parti Teşkilatı Görevlisi',
      icon: '🏛️',
      badge: 'Çok Yüksek Puan',
      badgeColor: 'bg-purple-100 text-purple-700',
      description: 'Etkileşim puanları çok daha yüksek üyelik türüdür. Görev mazbatası fotokopisinin yüklenmesi gerekir. Lütfen belgenizi hazırlayınız. Üyelik kabulü için bilgi mesajı gönderilecektir.',
      benefits: ['Parti üyesi avantajları', '15x daha fazla etkileşim puanı', 'Teşkilat içerikleri paylaşımı', 'Özel rozet ve etiketler'],
      requiresDocument: true,
      documentTitle: 'Görev Mazbatası'
    },
    mp: {
      title: 'Milletvekili',
      icon: '⭐',
      badge: 'Olağanüstü Yüksek Puan',
      badgeColor: 'bg-red-100 text-red-700',
      description: 'Etkileşim puanları olağanüstü yüksek üyelik türüdür. Milletvekilliği mazbatası fotokopisinin yüklenmesi gerekir. Lütfen belgenizi hazırlayınız. Üyelik kabulü için bilgi mesajı gönderilecektir.',
      benefits: ['Tüm önceki avantajlar', '50x daha fazla etkileşim puanı', 'Doğrulanmış milletvekili rozeti', 'Maksimum görünürlük ve etki'],
      requiresDocument: true,
      documentTitle: 'Milletvekilliği Mazbatası'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate('/')}
          >
            <img 
              src="/ikon.png" 
              alt="Polithane" 
              className="w-20 h-20 object-contain drop-shadow-lg"
              onError={(e) => {
                // Fallback to default icon if not found
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg">
              <span className="text-4xl font-black text-white">P</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Polithane. Hoş Geldiniz</h1>
          <p className="text-gray-600">Özgür, açık, şeffaf siyaset, bağımsız medya!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* STEP 1: Kayıt Türü Seçimi */}
          {step === 1 && !registrationType && (
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Kayıt Türünü Seçin</h2>
              <p className="text-gray-600 mb-8 text-center">Nasıl kayıt olmak istersiniz?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Yeni Üye Ol */}
                <button
                  onClick={() => {
                    setRegistrationType('new');
                    setStep(2);
                  }}
                  className="group p-8 border-2 border-gray-200 rounded-2xl hover:border-primary-blue hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserPlus className="w-8 h-8 text-primary-blue" />
                    </div>
                    <span className="text-4xl">✨</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Yeni Üye Ol</h3>
                  <p className="text-gray-600 text-sm">
                    Polithane'de yeni bir hesap oluşturun. Üyelik türünüzü seçin ve kayıt işlemlerini tamamlayın.
                  </p>
                </button>

                {/* Profil Sahipliğini Al */}
                {FEATURE_FLAGS.ENABLE_PROFILE_CLAIM_FLOW && (
                  <button
                    onClick={() => {
                      setRegistrationType('claim');
                      setStep(2);
                    }}
                    className="group p-8 border-2 border-gray-200 rounded-2xl hover:border-primary-blue hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Shield className="w-8 h-8 text-purple-600" />
                      </div>
                      <span className="text-4xl">🔑</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Profil Sahipliğini Al</h3>
                    <p className="text-gray-600 text-sm">
                      Sizin adınıza otomatik oluşturulmuş bir profil var mı? Profilinizi bulun ve sahipliğini alın.
                    </p>
                  </button>
                )}
              </div>

              {/* Geri dön linki */}
              <div className="mt-8 text-center">
                <Link to="/login-new" className="text-primary-blue hover:text-blue-600 font-semibold text-sm">
                  ← Giriş sayfasına dön
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2a: Profil Sahipliği - Arama */}
          {step === 2 && registrationType === 'claim' && !selectedProfile && (
            <div>
              <button
                onClick={() => {
                  setRegistrationType(null);
                  setStep(1);
                }}
                className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
              >
                ← Geri
              </button>

              <h2 className="text-2xl font-black text-gray-900 mb-2">Profil Sahipliği</h2>
              <p className="text-gray-600 mb-6">
                Kullanıcı adınızı (@kullaniciadi) veya ad soyadınızı yazarak profilinizi arayın
              </p>

              {/* Arama Alanı */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="@yusufterzi veya Yusuf Terzi"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleProfileSearch()}
                  className="w-full pl-14 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none text-lg"
                />
                <button
                  onClick={handleProfileSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Ara
                </button>
              </div>

              {/* Arama Sonuçları */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">
                    {searchResults.length} profil bulundu:
                  </p>
                  {searchResults.map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-primary-blue transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{profile.full_name}</h3>
                          <p className="text-sm text-gray-600">{profile.username}</p>
                          <p className="text-xs text-gray-500">{profile.position} • {profile.city}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Seçilen profili direkt sahiplenme formuna taşı
                          setSelectedProfile(profile);
                        }}
                        className="bg-primary-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
                      >
                        Sahip Ol
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-gray-600 mb-4">Profil bulunamadı</p>
                  <button
                    onClick={() => {
                      setRegistrationType('new');
                    }}
                    className="text-primary-blue hover:text-blue-600 font-semibold"
                  >
                    Bunun yerine yeni üye olmak ister misiniz?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2b: Profil Sahipliği - Form */}
          {step === 2 && registrationType === 'claim' && selectedProfile && (
            <form onSubmit={handleClaimSubmit}>
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
              >
                ← Geri
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-primary-blue" />
                  <h3 className="font-bold text-gray-900">Profil Sahipliği Talebi</h3>
                </div>
                <p className="text-sm text-gray-700">
                  <strong>{selectedProfile.full_name}</strong> ({selectedProfile.username}) profilinin sahipliğini talep ediyorsunuz.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Profildeki isminizle aynı olmalı"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">E-posta Adresi *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ornek@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon Numarası *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="5XX XXX XX XX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="En az 8 karakter"
                      className="w-full px-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'}`}></div>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-gray-600">Şifre Gücü: {passwordStrength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre Tekrar *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Şifrenizi tekrar girin"
                      className="w-full px-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-primary-blue hover:bg-blue-600 text-white font-bold py-4 rounded-lg disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? 'Gönderiliyor...' : 'Sahiplik Talebini Gönder'}
              </button>
            </form>
          )}

          {/* STEP 2c: Yeni Üye - Üyelik Tipi Seçimi */}
          {step === 2 && registrationType === 'new' && !membershipType && (
            <div>
              <button
                onClick={() => {
                  setRegistrationType(null);
                  setStep(1);
                }}
                className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
              >
                ← Geri
              </button>

              <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Üyelik Türünüzü Seçin</h2>
              <p className="text-gray-600 mb-8 text-center">Size uygun üyelik kategorisini seçerek başlayın</p>

              <div className="space-y-4">
                {Object.entries(membershipTypes).map(([key, type]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMembershipType(key);
                      setStep(3);
                    }}
                    className="w-full text-left p-6 border-2 border-gray-200 rounded-xl hover:border-primary-blue hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{type.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{type.title}</h3>
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${type.badgeColor}`}>
                            {type.badge}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{type.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {type.benefits.slice(0, 2).map((benefit, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              ✓ {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Kayıt Formu */}
          {step === 3 && membershipType && (
            <form onSubmit={handleNewMemberSubmit}>
              <button
                type="button"
                onClick={() => {
                  setMembershipType(null);
                  setStep(2);
                }}
                className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
              >
                ← Geri
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{membershipTypes[membershipType].icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{membershipTypes[membershipType].title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${membershipTypes[membershipType].badgeColor}`}>
                      {membershipTypes[membershipType].badge}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Benzersiz İsim (max 20) *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">@</span>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="ornek: ugur_bayraktutan"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      maxLength={20}
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Sadece <span className="font-semibold">a-z, 0-9, _</span> kullanın. Türkçe karakter yok. Maksimum <span className="font-semibold">20</span> karakter.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Ahmet Yılmaz"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">E-posta *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ornek@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="5XX XXX XX XX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="En az 8 karakter"
                        className="w-full px-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre Tekrar *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Şifre tekrar"
                        className="w-full px-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'}`}></div>
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-gray-600">Şifre Gücü: {passwordStrength.label}</p>
                  </div>
                )}

                {/* Belge Yükleme - Sadece normal üye değilse */}
                {membershipTypes[membershipType].requiresDocument && (
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900 mb-1">Belge Yükleme Gerekli</h4>
                          <p className="text-sm text-amber-800">
                            {membershipTypes[membershipType].documentTitle} yüklemeniz gerekmektedir.
                          </p>
                        </div>
                      </div>
                    </div>

                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {membershipTypes[membershipType].documentTitle} *
                    </label>
                    
                    {documentPreview ? (
                      <div className="relative border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-900">{documentFile.name}</p>
                              <p className="text-sm text-green-700">{(documentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDocumentFile(null);
                              setDocumentPreview(null);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-blue hover:bg-blue-50 transition-all">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Belgeyi Yüklemek İçin Tıklayın
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, JPG veya PNG (Maks. 10MB)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleDocumentUpload}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-blue hover:bg-blue-600 text-white font-bold py-4 rounded-lg disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
              </button>
            </form>
          )}

          {/* SUCCESS SCREEN */}
          {step === 99 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                {membershipType === 'normal' ? (
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                ) : (
                  <Clock className="w-12 h-12 text-amber-500" />
                )}
              </div>

              {membershipType === 'normal' ? (
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-3">🎉 Kayıt Başarılı!</h2>
                  <p className="text-gray-600 mb-6">
                    E-posta adresinize doğrulama linki gönderdik. Lütfen e-postanızı kontrol edin.
                  </p>
                  <button
                    onClick={() => navigate('/login-new')}
                    className="bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg"
                  >
                    Giriş Yap
                  </button>
                </>
              ) : registrationType === 'claim' ? (
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-3">✅ Talebiniz Alındı!</h2>
                  <p className="text-gray-600 mb-4">
                    <strong>{selectedProfile?.full_name}</strong> profilinin sahiplik talebi alınmıştır.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-left max-w-md mx-auto">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary-blue" />
                      Sonraki Adımlar
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-primary-blue">•</span>
                        Kimlik doğrulama ekibimiz tarafından bilgileriniz incelenecek
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-blue">•</span>
                        24-48 saat içinde e-posta ve SMS ile bilgilendirileceksiniz
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-blue">•</span>
                        Onay sonrası profilinize erişebilirsiniz
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Teşekkür ederiz, en kısa sürede size dönüş yapacağız.
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg"
                  >
                    Ana Sayfaya Dön
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-3">📋 Başvurunuz Alındı!</h2>
                  <p className="text-gray-600 mb-4">
                    <strong>{membershipTypes[membershipType].title}</strong> başvurunuz alınmıştır.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6 text-left max-w-md mx-auto">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      Sonraki Adımlar
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        Yüklediğiniz belgeler inceleme ekibimiz tarafından değerlendirilecek
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        48-72 saat içinde e-posta ve SMS ile bilgilendirileceksiniz
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        Onay sonrası hesabınız aktif olacak ve tüm özelliklerden yararlanabileceksiniz
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Teşekkür ederiz, en kısa sürede size dönüş yapacağız.
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-primary-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg"
                  >
                    Ana Sayfaya Dön
                  </button>
                </>
              )}
            </div>
          )}

          {/* Login Link */}
          {step !== 99 && (
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
