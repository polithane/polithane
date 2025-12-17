import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Eye, EyeOff, Check, X, ChevronRight, AlertCircle, Search, 
  User, Users, Building, Award, Mic, ArrowLeft, ShieldCheck, Upload, FileText, CheckCircle, Mail, Lock
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { parties as partiesApi, users as usersApi } from '../../utils/api';
import { CITY_CODES } from '../../utils/constants';
import { isValidEmail, isValidPhone, isValidFileSize, isValidFileType } from '../../utils/validators';

// Şifre kuralları
const PASSWORD_RULES = [
  { id: 'length', label: 'En az 8 karakter', validator: (p) => p.length >= 8 },
  { id: 'max_length', label: 'En fazla 50 karakter', validator: (p) => p.length <= 50 },
  { id: 'letter', label: 'En az 1 harf', validator: (p) => /[a-zA-Z]/.test(p) },
  { id: 'number', label: 'En az 1 rakam', validator: (p) => /[0-9]/.test(p) },
];

// Üyelik Tipleri
const MEMBERSHIP_TYPES = [
  { 
    id: 'citizen', 
    label: 'Vatandaş', 
    desc: 'Gündemi takip etmek ve etkileşime girmek için.',
    icon: User,
    color: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
    borderColor: 'hover:border-blue-500'
  },
  { 
    id: 'party_member', 
    label: 'Parti Üyesi', 
    desc: 'Parti kimliğinizi doğrulayarak rozet kazanın.',
    icon: Users,
    color: 'bg-gradient-to-br from-red-50 to-red-100 text-red-600',
    iconBg: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    borderColor: 'hover:border-red-500'
  },
  { 
    id: 'organization', 
    label: 'Teşkilat / Yönetim', 
    desc: 'İl/İlçe başkanı veya belediye başkanı.',
    icon: Building,
    color: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    borderColor: 'hover:border-orange-500'
  },
  { 
    id: 'politician', 
    label: 'Milletvekili', 
    desc: 'TBMM üyeleri için resmi hesap.',
    icon: Award,
    color: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
    borderColor: 'hover:border-purple-500'
  },
  { 
    id: 'media', 
    label: 'Medya Mensubu', 
    desc: 'Gazeteci, yazar ve medya kuruluşları.',
    icon: Mic,
    color: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600',
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
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
  const [availabilityTimeout, setAvailabilityTimeout] = useState(null);

  // Honeypot (Spam Trap)
  const [honeypot, setHoneypot] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    membership_type: '', 
    role_type: '', 
    full_name: '',
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    province: '',
    district: '',
    party_id: '',
    media_title: '',
    media_outlet: '',
    media_website: '',
    media_bio: '',
    org_position: '',
    start_date: '',
    previous_roles: '',
    bio: ''
  });
  
  const [file, setFile] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Init
  useEffect(() => {
    loadParties();
    if (initialUserId) {
      loadClaimUser(initialUserId);
    }
  }, []);

  const loadParties = async () => {
    try {
      const apiUrl = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
      const res = await fetch(`${apiUrl}/parties`);
      const data = await res.json();
      // Ensure array
      if (Array.isArray(data)) {
        setParties(data);
      } else if (data.data && Array.isArray(data.data)) {
        setParties(data.data);
      }
    } catch (err) {
      console.error('Parties error:', err);
    }
  };

  const loadClaimUser = async (id) => {
    try {
      setLoading(true);
      const data = await usersApi.getById(id);
      if (data && data.success) {
        setClaimUser(data.data);
        setStep(3); // Directly to form
        setFormData(prev => ({
          ...prev,
          full_name: data.data.full_name,
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

  const mapUserTypeToMembership = (userType, politicianType) => {
    if (userType === 'mp') return 'politician';
    if (userType === 'media') return 'media';
    if (userType === 'party_member') return 'party_member';
    if (politicianType) return 'organization';
    return 'citizen';
  };

  // Availability Check
  const checkAvailability = async (field, value) => {
    if (!value || value.length < 5) return;
    
    // Regex Check First
    if (field === 'email') {
        const hasTurkish = /[çğıöşüİÇĞÖŞÜ]/.test(String(value || ''));
        if (!isValidEmail(value) || hasTurkish) {
            setEmailStatus('idle');
            return;
        }
    }
    
    if (availabilityTimeout) clearTimeout(availabilityTimeout);
    
    if (field === 'email') setEmailStatus('checking');

    const timeout = setTimeout(async () => {
      try {
        const apiUrl = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
        const response = await fetch(`${apiUrl}/auth/check-availability?${field}=${encodeURIComponent(value)}`);
        const data = await response.json();
        
        if (data.success) {
          if (field === 'email') setEmailStatus(data.emailAvailable ? 'available' : 'taken');
        }
      } catch (err) {
        console.error('Check failed:', err);
      }
    }, 500);

    setAvailabilityTimeout(timeout);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Limits
    if (name === 'full_name' && value.length > 50) return;
    if (name === 'district' && value.length > 50) return;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    setGlobalError('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'email') checkAvailability('email', value);
    if (name === 'phone' && value) {
      if (!isValidPhone(value)) {
        setFieldErrors((prev) => ({ ...prev, phone: 'Telefon 05XXXXXXXXX formatında olmalı.' }));
      }
    }
    if (name === 'email' && value) {
      const hasTurkish = /[çğıöşüİÇĞÖŞÜ]/.test(String(value || ''));
      if (!isValidEmail(value) || hasTurkish) {
        setFieldErrors((prev) => ({ ...prev, email: 'Geçerli bir e‑posta girin (Türkçe karakter olmadan).' }));
      }
    }
  };

  // Search Profile
  const handleSearch = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const apiUrl = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
      const res = await fetch(`${apiUrl}/users?search=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.data && Array.isArray(data.data)) {
        setSearchResults(data.data);
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
    
    // Honeypot Check
    if (honeypot) {
        console.log('Bot detected');
        return;
    }
    
    if (emailStatus === 'taken' && !claimUser) {
      setGlobalError('Bu email adresi zaten kullanımda.');
      return;
    }
    if (formData.email && (/[çğıöşüİÇĞÖŞÜ]/.test(formData.email) || !isValidEmail(formData.email))) {
      setGlobalError('Geçerli bir email adresi giriniz (Türkçe karakter olmadan).');
      return;
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      setGlobalError('Telefon 05XXXXXXXXX formatında olmalı.');
      return;
    }

    setLoading(true);
    setGlobalError('');

    try {
      let documentData = null;
      if (file) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!isValidFileType(file, allowedTypes)) {
          throw new Error('Belge türü desteklenmiyor. PDF/JPG/PNG yükleyin.');
        }
        if (!isValidFileSize(file, 5)) {
          throw new Error('Belge boyutu çok büyük. En fazla 5MB yükleyin.');
        }
        const toBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        
        try {
            const base64Content = await toBase64(file);
            documentData = {
                name: file.name,
                type: file.type,
                content: base64Content
            };
        } catch (e) {
            console.error('File conversion error', e);
            throw new Error('Dosya yüklenirken hata oluştu.');
        }
      }

      const membershipToUserType = (m) => {
        if (m === 'citizen') return 'citizen';
        if (m === 'party_member') return 'party_member';
        if (m === 'organization') return 'party_official';
        if (m === 'politician') return 'mp';
        if (m === 'media') return 'media';
        return 'citizen';
      };
      const userType = membershipToUserType(formData.membership_type);
      
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        user_type: userType,
        party_id: formData.party_id,
        province: formData.province,
        district: formData.district,
        politician_type: formData.role_type || null,
        metadata: {
            phone: formData.phone,
            media_title: formData.media_title,
            media_outlet: formData.media_outlet,
            media_website: formData.media_website,
            media_bio: formData.media_bio,
            org_position: formData.org_position,
            start_date: formData.start_date,
            previous_roles: formData.previous_roles,
            bio: formData.bio,
        },
        document: documentData,
        is_claim: claimUser ? 'true' : 'false',
        claim_user_id: claimUser?.id
      };

      const apiUrl = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.error.includes('metadata')) {
            throw new Error('Teknik Hata: Veritabanında "metadata" sütunu eksik. Lütfen yöneticiye bildirin.');
        }
        throw new Error(result.error || 'Kayıt başarısız.');
      }

      const requiresApproval = !!(result?.requiresApproval ?? result?.data?.requiresApproval);
      if (requiresApproval) {
        setSuccessMessage(result?.message || 'Başvurunuz alındı. İnceleme sonrası bilgilendirileceksiniz.');
      } else {
        if (result.data?.token) {
            localStorage.setItem('auth_token', result.data.token);
            window.location.href = '/'; 
        } else {
            navigate('/login-new');
        }
      }
    } catch (err) {
      setGlobalError(err.message || 'Kayıt başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-10 text-center border border-blue-50">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ShieldCheck className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Başvurunuz Alındı</h2>
          <div className="bg-blue-50 p-6 rounded-2xl mb-8 text-left">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Süreç Başlatıldı
            </h4>
            <p className="text-blue-800 text-sm leading-relaxed">
              Değerli kullanıcımız, üyelik başvurunuz ve ilettiğiniz belgeler sistemimize güvenli bir şekilde kaydedilmiştir. 
              <br/><br/>
              Ekibimiz başvurunuzu <strong>en kısa sürede</strong> titizlikle inceleyecek ve sonuç hakkında size e-posta/SMS yoluyla bilgilendirme yapacaktır.
            </p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline" fullWidth size="lg">Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  // Helper renderers omitted for brevity, will include full content in Write.
  // ...
  // Same logic for choice, search, type selection.
  
  // 3. Registration Form
  const renderForm = () => {
    const isTeşkilat = formData.membership_type === 'organization';
    const isMedia = formData.membership_type === 'media';
    const isPolitician = formData.membership_type === 'politician';
    const isPartyMember = formData.membership_type === 'party_member' || isTeşkilat || isPolitician;
    
    const isDistrictRole = formData.role_type === 'district_chair' || formData.role_type === 'district_mayor';

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Honeypot Field (Hidden) */}
        <input 
            type="text" 
            name="website_url_check" 
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="opacity-0 absolute -z-10 h-0 w-0"
            tabIndex={-1}
            autoComplete="off"
        />

        {/* Dynamic Fields */}
        {isTeşkilat && (
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4 space-y-4">
            <div>
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
            
            {formData.role_type === 'party_official' && (
              <div>
                <label className="block text-sm font-bold text-orange-800 mb-1">Görev Ünvanı</label>
                <input type="text" name="org_position" className="w-full border-orange-200 rounded-lg p-2" onChange={handleInputChange} required placeholder="Örn: Gençlik Kolları Bşk." maxLength={100} />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-orange-800 mb-1">Göreve Başlama Tarihi</label>
              <input type="date" name="start_date" className="w-full border-orange-200 rounded-lg p-2" onChange={handleInputChange} required />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                name="full_name"
                className="w-full border border-gray-300 rounded-lg p-3 pl-14 focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                readOnly={!!claimUser}
                maxLength={50}
              />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Adresi</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="email"
                name="email"
                className={`w-full border rounded-lg p-3 pl-14 pr-10 focus:ring-2 transition-all ${
                  emailStatus === 'taken' ? 'border-red-500 bg-red-50' : 
                  emailStatus === 'available' ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                value={formData.email}
                onChange={handleInputChange}
                required
                maxLength={100}
              />
              <div className="absolute right-3 top-3.5">
                {emailStatus === 'checking' && <div className="animate-spin w-5 h-5 border-2 border-primary-blue border-t-transparent rounded-full" />}
                {emailStatus === 'available' && <Check className="w-5 h-5 text-green-600" />}
                {emailStatus === 'taken' && <X className="w-5 h-5 text-red-600" />}
              </div>
            </div>
            {emailStatus === 'taken' && <p className="text-xs text-red-600 mt-1">Bu email kullanımda.</p>}
            {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
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
                  <option key={p.id || p.party_id} value={p.id || p.party_id}>{p.name || p.party_name} ({p.short_name || p.party_short_name})</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
            <input
              type="text"
              name="district"
              className="w-full border border-gray-300 rounded-lg p-3"
              value={formData.district}
              onChange={handleInputChange}
              required={isDistrictRole}
              placeholder={isDistrictRole ? 'Zorunlu alan' : 'Opsiyonel'}
              maxLength={50}
            />
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (Opsiyonel)</label>
            <input
              type="tel"
              name="phone"
              className={`w-full border rounded-lg p-3 ${
                fieldErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="05XXXXXXXXX"
              maxLength={11}
            />
            {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
          </div>

          {/* Media Specific */}
          {isMedia && (
            <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900 flex items-center"><Mic className="w-4 h-4 mr-2"/> Medya Bilgileri</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kurum Adı</label>
                  <input type="text" name="media_outlet" className="w-full border border-gray-300 rounded-lg p-2" onChange={handleInputChange} maxLength={100} placeholder="Opsiyonel" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ünvan</label>
                  <input type="text" name="media_title" className="w-full border border-gray-300 rounded-lg p-2" onChange={handleInputChange} maxLength={50} placeholder="Opsiyonel" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Web Sitesi</label>
                <input type="url" name="media_website" className="w-full border border-gray-300 rounded-lg p-2" onChange={handleInputChange} maxLength={200} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kısa Biyografi</label>
                <textarea name="media_bio" className="w-full border border-gray-300 rounded-lg p-2" rows="2" onChange={handleInputChange} maxLength={500}></textarea>
              </div>
            </div>
          )}

          {/* Dosya Yükleme (Belge) */}
          {(isPartyMember || isTeşkilat || isPolitician) && (
            <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2"/> 
                Resmi Belge Yükleme (Zorunlu)
              </label>
              <p className="text-xs text-blue-700 mb-3">
                {isPolitician && 'Lütfen mazbatanızın net bir fotoğrafını yükleyiniz.'}
                {formData.role_type && formData.role_type.includes('chair') && 'Lütfen mazbatanızın veya atama yazınızın fotoğrafını yükleyiniz.'}
                {formData.role_type === 'party_official' && 'Lütfen görevlendirme yazınızı yükleyiniz.'}
                {formData.membership_type === 'party_member' && 'Lütfen E-Devlet üzerinden alacağınız parti üyelik belgesini yükleyiniz.'}
              </p>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
                    if (!isValidFileType(f, allowedTypes)) {
                      setGlobalError('Belge türü desteklenmiyor. PDF/JPG/PNG yükleyin.');
                      setFile(null);
                      return;
                    }
                    if (!isValidFileSize(f, 5)) {
                      setGlobalError('Belge boyutu çok büyük. En fazla 5MB yükleyin.');
                      setFile(null);
                      return;
                    }
                    setGlobalError('');
                    setFile(f);
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* Extra Info */}
          {(isTeşkilat || isPolitician) && (
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Önceki Görevler (Opsiyonel)</label>
              <textarea name="previous_roles" className="w-full border border-gray-300 rounded-lg p-3" rows="2" onChange={handleInputChange} maxLength={500}></textarea>
            </div>
          )}

          {/* Password */}
          <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="w-full border border-gray-300 rounded-lg p-3 pl-14 pr-10"
                value={formData.password}
                onChange={handleInputChange}
                required
                maxLength={50}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
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
              maxLength={50}
            />
            
            {/* Password Rules moved below confirm */}
            <div className="flex flex-wrap gap-2 mt-3">
              {PASSWORD_RULES.map(rule => {
                const isValid = rule.validator(formData.password);
                return (
                  <span 
                    key={rule.id} 
                    className={`text-xs px-2 py-1 rounded-full flex items-center transition-colors ${
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
        </div>

        {globalError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{globalError}</p>
          </div>
        )}

        <div className="flex justify-center pt-4">
            <button
                type="submit"
                disabled={
                    loading || 
                    emailStatus === 'taken' || 
                    !formData.password || 
                    formData.password !== formData.password_confirm
                }
                className="w-full md:w-2/3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
            >
                {loading ? (
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                    claimUser ? 'Profili Sahiplen ve Kaydol' : 'Kaydı Tamamla'
                )}
            </button>
        </div>
      </form>
    );
  };

  // 0. Initial Choice
  const renderChoice = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Üyelik Seçenekleri</h1>
        <p className="text-gray-600">Yeni üyelik veya mevcut profili sahiplenme.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 md:p-10 border border-gray-100">
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
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-20 h-20 bg-primary-blue rounded-2xl shadow-lg">
              <span className="text-4xl font-black text-white">P</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Polithane. Üye Ol</h1>
          <p className="text-gray-600">Özgür, açık, şeffaf siyaset, bağımsız medya!</p>
        </div>

        {step === 0 && renderChoice()}
        {step === 1 && (
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
                        membership_type: mapUserTypeToMembership(user.user_type, user.politician_type),
                        party_id: user.party_id || '',
                        province: user.province || ''
                      }));
                      setStep(3);
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
        )}
        {step === 2 && (
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
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${type.iconBg}`}>
                <Icon className="w-8 h-8" />
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
        )}
        {step === 3 && renderForm()}
      </div>
    </div>
  );
};
