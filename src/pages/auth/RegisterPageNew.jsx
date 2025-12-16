import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Eye, EyeOff, Check, X, ChevronRight, AlertCircle, Search, 
  User, Users, Building, Award, Mic, ArrowLeft, ShieldCheck, HelpCircle 
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { parties as partiesApi, users as usersApi } from '../../utils/api';
import { CITY_CODES } from '../../utils/constants';

// Şifre kuralları
const PASSWORD_RULES = [
  { id: 'length', label: 'En az 8 karakter', validator: (p) => p.length >= 8 },
  { id: 'max_length', label: 'En fazla 50 karakter', validator: (p) => p.length <= 50 },
  { id: 'letter', label: 'En az 1 harf', validator: (p) => /[a-zA-Z]/.test(p) },
  { id: 'number', label: 'En az 1 rakam', validator: (p) => /[0-9]/.test(p) },
];

// Üyelik Tipleri ve İkonları
const MEMBERSHIP_TYPES = [
  { 
    id: 'citizen', 
    label: 'Vatandaş', 
    desc: 'Gündemi takip etmek ve etkileşime girmek için.',
    icon: User,
    color: 'bg-blue-100 text-blue-600',
    borderColor: 'hover:border-blue-500'
  },
  { 
    id: 'party_member', 
    label: 'Parti Üyesi', 
    desc: 'Parti kimliğinizi doğrulayarak rozet kazanın.',
    icon: Users,
    color: 'bg-red-100 text-red-600',
    borderColor: 'hover:border-red-500'
  },
  { 
    id: 'organization', 
    label: 'Teşkilat / Yönetim', 
    desc: 'İl/İlçe başkanı veya belediye başkanı.',
    icon: Building,
    color: 'bg-orange-100 text-orange-600',
    borderColor: 'hover:border-orange-500'
  },
  { 
    id: 'politician', 
    label: 'Milletvekili', 
    desc: 'TBMM üyeleri için resmi hesap.',
    icon: Award,
    color: 'bg-purple-100 text-purple-600',
    borderColor: 'hover:border-purple-500'
  },
  { 
    id: 'media', 
    label: 'Medya Mensubu', 
    desc: 'Gazeteci, yazar ve medya kuruluşları.',
    icon: Mic,
    color: 'bg-green-100 text-green-600',
    borderColor: 'hover:border-green-500'
  }
];

export const RegisterPageNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  
  // URL Params
  const initialMode = searchParams.get('mode'); // 'claim'
  const initialUserId = searchParams.get('claimUserId');

  // Steps: 0=Choice, 1=Search(Claim), 2=TypeSelection, 3=Form
  const [step, setStep] = useState(initialMode === 'claim' ? 1 : 0);
  const [claimUser, setClaimUser] = useState(null);
  
  // Data
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Availability
  const [emailStatus, setEmailStatus] = useState('idle');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [availabilityTimeout, setAvailabilityTimeout] = useState(null);

  // Captcha
  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [captchaInput, setCaptchaInput] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    membership_type: '', 
    role_type: '', 
    full_name: '',
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    phone: '',
    province: '',
    district: '',
    party_id: '',
    // Metadata fields
    media_title: '',
    media_outlet: '',
    media_website: '',
    media_bio: '',
    org_position: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Init
  useEffect(() => {
    loadParties();
    generateCaptcha();
    if (initialUserId) {
      loadClaimUser(initialUserId);
    }
  }, []);

  const loadParties = async () => {
    try {
      const data = await partiesApi.getAll();
      setParties(data);
    } catch (err) {
      console.error('Parties error:', err);
    }
  };

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${a} + ${b} = ?`, a: a + b });
    setCaptchaInput('');
  };

  const loadClaimUser = async (id) => {
    try {
      setLoading(true);
      const data = await usersApi.getById(id);
      if (data && data.success) {
        setClaimUser(data.data);
        setStep(3); // Directly to form
        // Pre-fill form
        setFormData(prev => ({
          ...prev,
          full_name: data.data.full_name,
          username: data.data.username, // Keep username but validate ownership
          membership_type: mapUserTypeToMembership(data.data.user_type, data.data.politician_type),
          party_id: data.data.party_id || '',
          province: data.data.province || '',
        }));
      }
    } catch (err) {
      console.error('Claim user load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper
  const mapUserTypeToMembership = (userType, politicianType) => {
    if (userType === 'mp') return 'politician';
    if (userType === 'media') return 'media';
    if (userType === 'party_member') return 'party_member';
    if (politicianType) return 'organization';
    return 'citizen';
  };

  // Availability Check
  const checkAvailability = async (field, value) => {
    if (!value || value.length < 3) return;
    if (field === 'username' && claimUser && value === claimUser.username) {
      setUsernameStatus('available'); // Claiming own username is allowed (backend logic handles linking)
      return;
    }

    if (availabilityTimeout) clearTimeout(availabilityTimeout);
    
    if (field === 'email') setEmailStatus('checking');
    if (field === 'username') setUsernameStatus('checking');

    const timeout = setTimeout(async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/auth/check-availability?${field}=${encodeURIComponent(value)}`);
        const data = await response.json();
        
        if (data.success) {
          if (field === 'email') setEmailStatus(data.emailAvailable ? 'available' : 'taken');
          if (field === 'username') setUsernameStatus(data.usernameAvailable ? 'available' : 'taken');
        }
      } catch (err) {
        console.error('Check failed:', err);
      }
    }, 500);

    setAvailabilityTimeout(timeout);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setGlobalError('');

    if (name === 'email') checkAvailability('email', value);
    if (name === 'username') checkAvailability('username', value);
  };

  // Search Profile
  const handleSearch = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Mock search or real API if available
      // Using direct API call pattern
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/users?search=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseInt(captchaInput) !== captcha.a) {
      setGlobalError('Güvenlik sorusu yanlış. Lütfen tekrar deneyiniz.');
      return;
    }
    
    if (emailStatus === 'taken' && !claimUser) {
      setGlobalError('Bu email adresi zaten kullanımda.');
      return;
    }

    setLoading(true);
    setGlobalError('');

    try {
      const registerData = {
        ...formData,
        user_type: formData.membership_type === 'organization' ? 'party_member' : formData.membership_type, // Org maps to party_member with politician_type in backend logic usually
        politician_type: formData.role_type || formData.org_position || null,
        metadata: {
          media_title: formData.media_title,
          media_outlet: formData.media_outlet,
          media_website: formData.media_website,
          media_bio: formData.media_bio,
          phone: formData.phone
        },
        is_claim: !!claimUser,
        claim_user_id: claimUser?.id
      };

      // Backend expects specific user_type strings
      // Mapping:
      // citizen -> citizen
      // party_member -> party_member
      // organization -> party_member (with politician_type set) OR politician (if mayor)
      // politician -> politician (mp)
      // media -> media

      await register(registerData);
      navigate('/');
    } catch (err) {
      setGlobalError(err.message || 'Kayıt başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS ---

  // 0. Initial Choice
  const renderChoice = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Aramıza Katılın</h1>
        <p className="text-gray-600">Siyasetin nabzını tutun, şeffaf ve özgür platformda yerinizi alın.</p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={() => setStep(2)}
          className="flex items-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-primary-blue hover:shadow-lg transition-all group text-left"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-blue">Yeni Üye Ol</h3>
            <p className="text-gray-500 text-sm">Henüz bir profiliniz yoksa buradan yeni hesap oluşturun.</p>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-primary-blue" />
        </button>

        <button
          onClick={() => setStep(1)}
          className="flex items-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-purple-500 hover:shadow-lg transition-all group text-left"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600">Mevcut Profili Sahiplen</h3>
            <p className="text-gray-500 text-sm">Adınıza açılmış otomatik profili doğrulayın ve yönetmeye başlayın.</p>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-purple-600" />
        </button>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">Zaten hesabınız var mı? <a href="/login-new" className="text-primary-blue font-bold hover:underline">Giriş Yap</a></p>
      </div>
    </div>
  );

  // 1. Search Profile (Claim)
  const renderSearch = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button onClick={() => setStep(0)} className="p-2 hover:bg-gray-100 rounded-full mr-2">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold">Profilinizi Bulun</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Ad Soyad veya Kullanıcı Adı Ara..."
          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 text-lg"
          onChange={(e) => handleSearch(e.target.value)}
        />
        {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />}
      </div>

      <div className="space-y-3 mt-4">
        {searchResults.map(user => (
          <div 
            key={user.id}
            onClick={() => {
              setClaimUser(user);
              setFormData(prev => ({
                ...prev,
                full_name: user.full_name,
                username: user.username,
                membership_type: mapUserTypeToMembership(user.user_type, user.politician_type),
                party_id: user.party_id || '',
                province: user.province || ''
              }));
              setStep(3); // Go to form
            }} 
            className="flex items-center p-4 border rounded-xl hover:border-purple-500 cursor-pointer hover:bg-purple-50 transition-all"
          >
            <Avatar src={user.avatar_url} size="50px" />
            <div className="ml-4">
              <h4 className="font-bold text-gray-900">{user.full_name}</h4>
              <p className="text-sm text-gray-500">@{user.username} • {user.user_type}</p>
            </div>
            <div className="ml-auto">
              <Button size="sm" variant="outline">Seç</Button>
            </div>
          </div>
        ))}
        {searchResults.length === 0 && !isSearching && (
          <div className="text-center py-8 text-gray-500">
            <p>Aradığınız profili bulamadınız mı?</p>
            <button onClick={() => setStep(2)} className="text-purple-600 font-bold hover:underline mt-2">
              Yeni Profil Oluşturun
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // 2. Type Selection
  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button onClick={() => setStep(0)} className="p-2 hover:bg-gray-100 rounded-full mr-2">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold">Üyelik Tipi Seçin</h2>
      </div>

      <div className="grid gap-3">
        {MEMBERSHIP_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => {
                setFormData(prev => ({ ...prev, membership_type: type.id }));
                setStep(3);
              }}
              className={`flex items-start p-4 bg-white border-2 border-gray-100 rounded-xl transition-all group text-left ${type.borderColor} hover:shadow-md`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 ${type.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
                <p className="text-xs text-gray-500">{type.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 mt-3" />
            </button>
          );
        })}
      </div>
    </div>
  );

  // 3. Registration Form
  const renderForm = () => {
    const isTeşkilat = formData.membership_type === 'organization';
    const isMedia = formData.membership_type === 'media';
    const isPolitician = formData.membership_type === 'politician';
    const isPartyMember = formData.membership_type === 'party_member' || isTeşkilat || isPolitician;

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center mb-6">
          <button onClick={() => setStep(claimUser ? 1 : 2)} className="p-2 hover:bg-gray-100 rounded-full mr-2">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Bilgilerinizi Girin</h2>
            <p className="text-sm text-gray-500">
              {claimUser ? 'Profil sahiplenme başvurusu' : 'Yeni üyelik formu'}
            </p>
          </div>
        </div>

        {/* Dynamic Fields based on Type */}
        {isTeşkilat && (
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
            <label className="block text-sm font-bold text-orange-800 mb-2">Göreviniz</label>
            <select
              name="role_type"
              className="w-full border-orange-200 rounded-lg p-2.5 bg-white"
              onChange={handleInputChange}
              required
            >
              <option value="">Seçiniz...</option>
              <option value="party_official">Parti Teşkilatı Görevlisi</option>
              <option value="provincial_chair">İl Başkanı</option>
              <option value="district_chair">İlçe Başkanı</option>
              <option value="metropolitan_mayor">Büyükşehir Bld. Başkanı</option>
              <option value="district_mayor">İlçe Bld. Başkanı</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              name="full_name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
              value={formData.full_name}
              onChange={handleInputChange}
              required
              readOnly={!!claimUser}
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Adresi</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                className={`w-full border rounded-lg p-3 pr-10 focus:ring-2 transition-all ${
                  emailStatus === 'taken' ? 'border-red-500 bg-red-50' : 
                  emailStatus === 'available' ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <div className="absolute right-3 top-3.5">
                {emailStatus === 'checking' && <div className="animate-spin w-5 h-5 border-2 border-primary-blue border-t-transparent rounded-full" />}
                {emailStatus === 'available' && <Check className="w-5 h-5 text-green-600" />}
                {emailStatus === 'taken' && <X className="w-5 h-5 text-red-600" />}
              </div>
            </div>
            {emailStatus === 'taken' && <p className="text-xs text-red-600 mt-1">Bu email kullanımda.</p>}
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı (Benzersiz)</label>
            <div className="relative">
              <input
                type="text"
                name="username"
                className={`w-full border rounded-lg p-3 pr-10 focus:ring-2 transition-all ${
                  usernameStatus === 'taken' ? 'border-red-500 bg-red-50' : 
                  usernameStatus === 'available' ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                value={formData.username}
                onChange={handleInputChange}
                required
                readOnly={!!claimUser} // Claiming requires keeping the username usually
              />
              <div className="absolute right-3 top-3.5">
                {usernameStatus === 'checking' && <div className="animate-spin w-5 h-5 border-2 border-primary-blue border-t-transparent rounded-full" />}
                {usernameStatus === 'available' && <Check className="w-5 h-5 text-green-600" />}
                {usernameStatus === 'taken' && <X className="w-5 h-5 text-red-600" />}
              </div>
            </div>
            {usernameStatus === 'taken' && <p className="text-xs text-red-600 mt-1">Bu kullanıcı adı kullanımda.</p>}
          </div>

          {/* Party & Location */}
          {isPartyMember && (
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Parti</label>
              <select
                name="party_id"
                className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                value={formData.party_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Seçiniz...</option>
                {parties.map(p => (
                  <option key={p.party_id} value={p.party_id}>{p.party_name} ({p.party_short_name})</option>
                ))}
              </select>
            </div>
          )}

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
            <select
              name="province"
              className="w-full border border-gray-300 rounded-lg p-3 bg-white"
              value={formData.province}
              onChange={handleInputChange}
              required={isPartyMember || isTeşkilat}
            >
              <option value="">Seçiniz...</option>
              {Object.values(CITY_CODES).sort().map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">İlçe (Opsiyonel)</label>
            <input
              type="text"
              name="district"
              className="w-full border border-gray-300 rounded-lg p-3"
              value={formData.district}
              onChange={handleInputChange}
            />
          </div>

          {/* Media Specific */}
          {isMedia && (
            <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900 flex items-center"><Mic className="w-4 h-4 mr-2"/> Medya Bilgileri</h4>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kurum Adı</label>
                <input
                  type="text"
                  name="media_outlet"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Örn: Hürriyet, Fox TV..."
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ünvan</label>
                <input
                  type="text"
                  name="media_title"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Örn: Muhabir, Köşe Yazarı..."
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Web Sitesi (Opsiyonel)</label>
                <input
                  type="url"
                  name="media_website"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="https://..."
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="w-full border border-gray-300 rounded-lg p-3 pr-10"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* Checklist */}
            <div className="flex flex-wrap gap-2 mt-2">
              {PASSWORD_RULES.map(rule => {
                const isValid = rule.validator(formData.password);
                return (
                  <span 
                    key={rule.id} 
                    className={`text-xs px-2 py-1 rounded-full flex items-center ${
                      isValid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isValid ? <Check size={10} className="mr-1" /> : <div className="w-2 h-2 rounded-full bg-gray-400 mr-1" />}
                    {rule.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
            <input
              type="password"
              name="password_confirm"
              className={`w-full border rounded-lg p-3 ${
                formData.password && formData.password !== formData.password_confirm 
                  ? 'border-red-300 focus:ring-red-200' 
                  : 'border-gray-300'
              }`}
              value={formData.password_confirm}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Captcha */}
          <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-blue-600" />
              <div className="flex-1">
                <label className="block text-sm font-bold text-blue-900 mb-1">Güvenlik Sorusu</label>
                <p className="text-sm text-blue-700 mb-2">{captcha.q}</p>
                <input
                  type="number"
                  placeholder="Sonucu yazın"
                  className="w-32 border border-blue-200 rounded-lg p-2"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {globalError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{globalError}</p>
          </div>
        )}

        <Button 
          type="submit" 
          variant="primary" 
          size="lg"
          fullWidth 
          loading={loading}
          disabled={
            emailStatus === 'taken' || 
            (usernameStatus === 'taken' && !claimUser) ||
            !formData.password || 
            formData.password !== formData.password_confirm
          }
          className="shadow-xl shadow-blue-200"
        >
          {claimUser ? 'Profili Sahiplen ve Kaydol' : 'Kaydı Tamamla'}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 md:p-10 border border-gray-100">
        {step === 0 && renderChoice()}
        {step === 1 && renderSearch()}
        {step === 2 && renderTypeSelection()}
        {step === 3 && renderForm()}
      </div>
    </div>
  );
};
