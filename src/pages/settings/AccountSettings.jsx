import { useState, useEffect, useRef } from 'react';
import { Save, Mail, Phone, MapPin, Calendar, AtSign, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

export const AccountSettings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city_code: user?.city_code || '',
    birth_date: user?.birth_date || '',
  });
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });
  
  const usernameTimeout = useRef(null);

  // Username değiştiğinde availability check
  useEffect(() => {
    const checkUsername = async () => {
      const username = formData.username;
      
      // Boş veya değişmediyse kontrol etme
      if (!username || username === user?.username) {
        setUsernameStatus({ checking: false, available: null, message: '' });
        return;
      }
      
      // Min 3 karakter kontrolü
      if (username.length < 3) {
        setUsernameStatus({ 
          checking: false, 
          available: false, 
          message: 'En az 3 karakter olmalı' 
        });
        return;
      }
      
      // Max 15 karakter kontrolü
      if (username.length > 15) {
        setUsernameStatus({ 
          checking: false, 
          available: false, 
          message: 'En fazla 15 karakter olabilir' 
        });
        return;
      }
      
      // Format kontrolü
      const usernameRegex = /^[a-zA-Z0-9._-]+$/;
      if (!usernameRegex.test(username)) {
        setUsernameStatus({ 
          checking: false, 
          available: false, 
          message: 'Sadece harf, rakam, alt çizgi (_), tire (-) ve nokta (.) kullanılabilir' 
        });
        return;
      }
      
      // API'ye sor
      setUsernameStatus({ checking: true, available: null, message: 'Kontrol ediliyor...' });
      
      try {
        const response = await apiCall(`/api/users/check-username/${username}`);
        
        if (response.success) {
          setUsernameStatus({
            checking: false,
            available: response.available,
            message: response.available ? 'Kullanıcı adı müsait! ✓' : response.message
          });
        }
      } catch (error) {
        console.error('Username check error:', error);
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Kontrol edilemedi'
        });
      }
    };
    
    // Debounce (500ms)
    if (usernameTimeout.current) {
      clearTimeout(usernameTimeout.current);
    }
    
    usernameTimeout.current = setTimeout(checkUsername, 500);
    
    return () => {
      if (usernameTimeout.current) {
        clearTimeout(usernameTimeout.current);
      }
    };
  }, [formData.username, user?.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    try {
      // Sadece username değiştiyse özel endpoint kullan
      if (formData.username !== user?.username) {
        const response = await apiCall('/api/users/username', {
          method: 'PUT',
          body: JSON.stringify({ username: formData.username })
        });
        
        if (!response.success) {
          setError(response.error || 'Kullanıcı adı güncellenemedi');
          return;
        }
        if (response.data) updateUser(response.data);
      }
      
      // Diğer alanları DB'ye yaz
      const baseMeta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
      const other = await apiCall('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          phone: formData.phone,
          city_code: formData.city_code,
          // birth_date column may not exist on some schemas; store in metadata to avoid PGRST204 errors.
          metadata: {
            ...baseMeta,
            birth_date: formData.birth_date || null,
          },
        })
      });
      if (!other.success) {
        setError(other.error || 'Hesap bilgileri güncellenemedi');
        return;
      }
      if (other.data) updateUser(other.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Bir hata oluştu');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Hesap Ayarları</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✓ Hesap ayarları güncellendi!
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
        
        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Kullanıcı Adı
            <span className="text-xs text-gray-500 font-normal ml-2">
              (polithane.com/<span className="font-medium">{formData.username || 'kullanici-adiniz'}</span>)
            </span>
          </label>
          <div className="relative">
            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
              className={`w-full pl-14 pr-12 py-3 border rounded-lg focus:ring-2 outline-none ${
                usernameStatus.available === false 
                  ? 'border-red-300 focus:ring-red-200' 
                  : usernameStatus.available === true 
                  ? 'border-green-300 focus:ring-green-200'
                  : 'border-gray-300 focus:ring-primary-blue'
              }`}
              placeholder="kullanici-adiniz"
              maxLength={15}
              minLength={3}
            />
            
            {/* Status Icon */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {usernameStatus.checking && (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              )}
              {!usernameStatus.checking && usernameStatus.available === true && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {!usernameStatus.checking && usernameStatus.available === false && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          
          {/* Status Message */}
          {usernameStatus.message && (
            <p className={`text-sm mt-2 ${
              usernameStatus.available ? 'text-green-600' : 'text-red-600'
            }`}>
              {usernameStatus.message}
            </p>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            • 3-15 karakter arası • Sadece harf, rakam, alt çizgi (_), tire (-) ve nokta (.) kullanılabilir
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">E-posta Adresi</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              disabled
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">E-posta adresi değiştirilemez</p>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
              placeholder="+90 555 123 45 67"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={usernameStatus.available === false || usernameStatus.checking}
            className="flex items-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-6 h-6 sm:w-5 sm:h-5" />
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
};
