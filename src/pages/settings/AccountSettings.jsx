import { useState } from 'react';
import { Save, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AccountSettings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    city_code: user?.city_code || '',
    birth_date: user?.birth_date || '',
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email Adresi</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            />
          </div>
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
          <button type="submit" className="flex items-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600">
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
};
