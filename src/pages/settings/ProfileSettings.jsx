import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, Camera } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    city_code: user?.city_code || '',
    phone: user?.phone || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
            Fotoğraf Yükle
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✓ Profil başarıyla güncellendi!
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad</label>
          <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Kullanıcı Adı</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none" />
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
