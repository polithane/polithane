import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Check, X, ChevronDown, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { parties as partiesApi } from '../../utils/api';
import { CITY_CODES } from '../../utils/constants';

// Şifre kuralları
const PASSWORD_RULES = [
  { id: 'length', label: 'En az 8 karakter', validator: (p) => p.length >= 8 },
  { id: 'max_length', label: 'En fazla 50 karakter', validator: (p) => p.length <= 50 },
  { id: 'letter', label: 'En az 1 harf', validator: (p) => /[a-zA-Z]/.test(p) },
  { id: 'number', label: 'En az 1 rakam', validator: (p) => /[0-9]/.test(p) },
];

export const RegisterPageNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, login } = useAuth();
  
  // URL parametreleri
  const mode = searchParams.get('mode'); // 'claim' or undefined
  const claimUserId = searchParams.get('claimUserId');

  // State
  const [step, setStep] = useState(mode === 'claim' ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parties, setParties] = useState([]);
  
  // Availability Check State
  const [emailStatus, setEmailStatus] = useState('idle'); // idle, checking, available, taken
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [availabilityTimeout, setAvailabilityTimeout] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    membership_type: '', // normal, party_member, organization, politician, media
    role_type: '', // il_baskani, ilce_baskani etc. (organization için)
    full_name: '',
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    phone: '',
    province: '',
    district: '',
    party_id: '',
    // Medya için
    media_title: '',
    media_outlet: '',
    media_website: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  // Load parties
  useEffect(() => {
    const loadParties = async () => {
      try {
        const data = await partiesApi.getAll();
        setParties(data);
      } catch (err) {
        console.error('Parties load error:', err);
      }
    };
    loadParties();
  }, []);

  // Debounce availability check
  const checkAvailability = async (field, value) => {
    if (!value || value.length < 3) return;
    
    // Clear previous timeout
    if (availabilityTimeout) clearTimeout(availabilityTimeout);

    // Set checking status
    if (field === 'email') setEmailStatus('checking');
    if (field === 'username') setUsernameStatus('checking');

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        // API URL'ini ortam değişkenine göre ayarla
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/auth/check-availability?${field}=${encodeURIComponent(value)}`);
        const data = await response.json();
        
        if (data.success) {
          if (field === 'email') setEmailStatus(data.emailAvailable ? 'available' : 'taken');
          if (field === 'username') setUsernameStatus(data.usernameAvailable ? 'available' : 'taken');
        }
      } catch (err) {
        console.error('Availability check failed:', err);
      }
    }, 500); // 500ms debounce

    setAvailabilityTimeout(timeout);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');

    if (name === 'email') checkAvailability('email', value);
    if (name === 'username') checkAvailability('username', value);
  };

  const isPasswordValid = () => {
    return PASSWORD_RULES.every(rule => rule.validator(formData.password)) && 
           formData.password === formData.password_confirm;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid()) return;
    if (emailStatus === 'taken' || usernameStatus === 'taken') {
      setError('Lütfen kullanımda olmayan bilgiler girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Map form data to backend expected format
      const registerData = {
        full_name: formData.full_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        user_type: mapMembershipToUserType(formData.membership_type, formData.role_type),
        politician_type: formData.role_type || null,
        party_id: formData.party_id || null,
        province: formData.province || null,
        // Claim mode params
        is_claim: mode === 'claim',
        claim_user_id: claimUserId
      };

      await register(registerData);
      
      // Auto login success -> redirect
      navigate('/');
    } catch (err) {
      console.error('Register error:', err);
      setError(err.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Membership type mapping
  const mapMembershipToUserType = (membership, role) => {
    if (membership === 'organization') {
      if (role.includes('mayor')) return 'politician'; // Belediye başkanları siyasetçi
      return 'party_member'; // İl/ilçe başkanları şimdilik teşkilat üyesi (veya politician yapılabilir)
    }
    if (membership === 'politician') return 'politician'; // Milletvekili
    if (membership === 'media') return 'media';
    if (membership === 'party_member') return 'party_member';
    return 'citizen';
  };

  // --- RENDER STEPS ---

  const renderMembershipSelection = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Nasıl Katılmak İstersiniz?</h2>
      
      {/* Vatandaş */}
      <button
        onClick={() => { setFormData({...formData, membership_type: 'normal'}); setStep(2); }}
        className="w-full p-4 text-left border rounded-xl hover:border-primary-blue hover:bg-blue-50 transition-all group"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary-blue">Vatandaş Üyeliği</h3>
            <p className="text-sm text-gray-500">Gündemi takip etmek ve etkileşime girmek için.</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-primary-blue" />
        </div>
      </button>

      {/* Parti Üyesi */}
      <button
        onClick={() => { setFormData({...formData, membership_type: 'party_member'}); setStep(2); }}
        className="w-full p-4 text-left border rounded-xl hover:border-primary-blue hover:bg-blue-50 transition-all group"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary-blue">Parti Üyesi</h3>
            <p className="text-sm text-gray-500">Parti üyeliğinizi doğrulayarak rozet kazanın.</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-primary-blue" />
        </div>
      </button>

      {/* Teşkilat */}
      <div className="border rounded-xl overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-bold text-lg">Teşkilat / Yönetim</h3>
          <p className="text-sm text-gray-500">Parti teşkilatı veya yerel yönetim görevleri.</p>
        </div>
        <div className="divide-y">
          {[
            { id: 'party_official', label: 'Parti Teşkilatı Görevlisi' },
            { id: 'provincial_chair', label: 'İl Başkanı' },
            { id: 'district_chair', label: 'İlçe Başkanı' },
            { id: 'metropolitan_mayor', label: 'Büyükşehir Belediye Başkanı' },
            { id: 'district_mayor', label: 'İlçe Belediye Başkanı' } // İl belediye başkanı yerine district/provincial mayor ayrımı
          ].map((role) => (
            <button
              key={role.id}
              onClick={() => { 
                setFormData({
                  ...formData, 
                  membership_type: 'organization',
                  role_type: role.id
                }); 
                setStep(2); 
              }}
              className="w-full p-3 text-left hover:bg-blue-50 text-sm font-medium pl-6 flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Milletvekili */}
      <button
        onClick={() => { 
          setFormData({
            ...formData, 
            membership_type: 'politician',
            role_type: 'mp'
          }); 
          setStep(2); 
        }}
        className="w-full p-4 text-left border rounded-xl hover:border-primary-blue hover:bg-blue-50 transition-all group"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary-blue">Milletvekili</h3>
            <p className="text-sm text-gray-500">TBMM üyeleri için resmi hesap.</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-primary-blue" />
        </div>
      </button>

      {/* Medya */}
      <button
        onClick={() => { setFormData({...formData, membership_type: 'media'}); setStep(2); }}
        className="w-full p-4 text-left border rounded-xl hover:border-primary-blue hover:bg-blue-50 transition-all group"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary-blue">Medya Mensubu</h3>
            <p className="text-sm text-gray-500">Gazeteci, yazar ve medya kuruluşları.</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-primary-blue" />
        </div>
      </button>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <button 
          type="button" 
          onClick={() => setStep(1)}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Geri Dön
        </button>
        <h2 className="text-xl font-bold flex-1 text-center">
          {formData.membership_type === 'normal' && 'Vatandaş Üyeliği'}
          {formData.membership_type === 'party_member' && 'Parti Üyesi'}
          {formData.membership_type === 'organization' && 'Teşkilat Üyeliği'}
          {formData.membership_type === 'politician' && 'Milletvekili Kaydı'}
          {formData.membership_type === 'media' && 'Medya Mensubu'}
        </h2>
      </div>

      {/* Ortak Alanlar */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
          <input
            type="text"
            name="full_name"
            required
            className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            value={formData.full_name}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Adresi</label>
          <div className="relative">
            <input
              type="email"
              name="email"
              required
              className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-blue focus:border-transparent ${
                emailStatus === 'taken' ? 'border-red-500 bg-red-50' : 
                emailStatus === 'available' ? 'border-green-500 bg-green-50' : ''
              }`}
              value={formData.email}
              onChange={handleInputChange}
            />
            {emailStatus === 'checking' && <div className="absolute right-3 top-3 animate-spin w-4 h-4 border-2 border-primary-blue border-t-transparent rounded-full"></div>}
            {emailStatus === 'taken' && <div className="text-xs text-red-600 mt-1">Bu email kullanımda!</div>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Benzersiz İsim (Kullanıcı Adı)</label>
          <div className="relative">
            <input
              type="text"
              name="username"
              placeholder="ozgur_ozel, mansur_yavas..."
              required
              className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-blue focus:border-transparent ${
                usernameStatus === 'taken' ? 'border-red-500 bg-red-50' : 
                usernameStatus === 'available' ? 'border-green-500 bg-green-50' : ''
              }`}
              value={formData.username}
              onChange={handleInputChange}
            />
            {usernameStatus === 'checking' && <div className="absolute right-3 top-3 animate-spin w-4 h-4 border-2 border-primary-blue border-t-transparent rounded-full"></div>}
            {usernameStatus === 'taken' && <div className="text-xs text-red-600 mt-1">Bu isim kullanımda!</div>}
          </div>
        </div>

        {/* Özel Alanlar - Role Göre */}
        {(formData.membership_type === 'party_member' || 
          formData.membership_type === 'organization' || 
          formData.membership_type === 'politician') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parti</label>
            <select
              name="party_id"
              required
              className="w-full border rounded-lg p-2.5"
              value={formData.party_id}
              onChange={handleInputChange}
            >
              <option value="">Seçiniz...</option>
              {parties.map(p => (
                <option key={p.party_id} value={p.party_id}>{p.party_name} ({p.party_short_name})</option>
              ))}
            </select>
          </div>
        )}

        {(formData.membership_type === 'organization' || 
          (formData.membership_type === 'normal' && mode !== 'claim') || // Vatandaş isterse seçebilir
          formData.membership_type === 'party_member') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
              <select
                name="province"
                required={formData.membership_type !== 'normal'}
                className="w-full border rounded-lg p-2.5"
                value={formData.province}
                onChange={handleInputChange}
              >
                <option value="">Seçiniz...</option>
                {Object.values(CITY_CODES).sort().map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            {(formData.role_type === 'district_chair' || formData.role_type === 'district_mayor') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                <input
                  type="text"
                  name="district"
                  required
                  placeholder="İlçe adı"
                  className="w-full border rounded-lg p-2.5"
                  value={formData.district}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Şifre Alanları */}
        <div className="border-t pt-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                className="w-full border rounded-lg p-2.5 pr-10"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
            <input
              type="password"
              name="password_confirm"
              required
              className="w-full border rounded-lg p-2.5"
              value={formData.password_confirm}
              onChange={handleInputChange}
            />
          </div>

          {/* Şifre Checklist */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Şifre Politikası:</h4>
            <div className="space-y-1">
              {PASSWORD_RULES.map(rule => {
                const isValid = rule.validator(formData.password);
                return (
                  <div key={rule.id} className={`flex items-center gap-2 ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
                    {isValid ? <Check size={14} /> : <div className="w-3.5 h-3.5 border rounded-full border-gray-400" />}
                    <span className={isValid ? 'line-through opacity-70' : ''}>{rule.label}</span>
                  </div>
                );
              })}
              <div className={`flex items-center gap-2 ${formData.password && formData.password === formData.password_confirm ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.password && formData.password === formData.password_confirm ? <Check size={14} /> : <div className="w-3.5 h-3.5 border rounded-full border-gray-400" />}
                <span className={formData.password && formData.password === formData.password_confirm ? 'line-through opacity-70' : ''}>Şifreler uyuşuyor</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          variant="primary" 
          fullWidth 
          loading={loading}
          disabled={!isPasswordValid() || emailStatus === 'taken' || usernameStatus === 'taken'}
        >
          Kayıt Ol
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8">
        {step === 1 ? renderMembershipSelection() : renderForm()}
      </div>
    </div>
  );
};
