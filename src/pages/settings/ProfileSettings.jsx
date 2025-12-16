import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { isValidFileSize, isValidFileType } from '../../utils/validators';

export const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    city_code: user?.city_code || '',
    phone: user?.phone || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePickPhoto = () => {
    setError('');
    fileRef.current?.click();
  };

  const handleUploadPhoto = async (file) => {
    if (!file) return;
    setError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!isValidFileType(file, allowedTypes)) {
      setError('Sadece JPG / PNG / WEBP yükleyebilirsiniz.');
      return;
    }
    if (!isValidFileSize(file, 2)) {
      setError('Dosya boyutu çok büyük (max 2MB).');
      return;
    }
    if (!user?.id) {
      setError('Kullanıcı bilgisi bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.');
      return;
    }

    setUploading(true);
    try {
      // Upload via our API (service role) to avoid Storage RLS issues.
      const toDataUrl = (f) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Dosya okunamadı.'));
          reader.readAsDataURL(f);
        });
      const dataUrl = await toDataUrl(file);
      const res = await apiCall('/api/users/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ dataUrl, contentType: file.type || '' }),
      });
      if (!res?.success) throw new Error(res?.error || 'Fotoğraf yüklenemedi.');
      if (res.data) updateUser(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('row-level security')) {
        setError('Fotoğraf yüklenemedi: depolama izinleri kısıtlı. Lütfen daha sonra tekrar deneyin.');
      } else {
        setError(msg || 'Fotoğraf yüklenemedi.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      const res = await apiCall('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: formData.full_name,
          bio: formData.bio,
          phone: formData.phone,
          city_code: formData.city_code,
        }),
      });
      if (!res?.success) throw new Error(res?.error || 'Güncelleme başarısız.');
      if (res.data) updateUser(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Update failed:', error);
      setError(error?.message || 'Güncelleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Profil Düzenle</h2>
      
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Profil Fotoğrafı</label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user?.avatar_url || user?.profile_image ? (
              <img src={user.avatar_url || user.profile_image} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleUploadPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={handlePickPhoto}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
            </button>
            <p className="text-xs text-gray-500">JPG/PNG/WEBP • max 2MB</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Profil başarıyla güncellendi!
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad</label>
          <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Biyografi</label>
          <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none resize-none" placeholder="Kendinizden bahsedin..." />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon (Opsiyonel)</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            placeholder="05XXXXXXXXX"
          />
        </div>
        
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="flex items-center gap-2 bg-primary-blue hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50">
            <Save className="w-4 h-4" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};
