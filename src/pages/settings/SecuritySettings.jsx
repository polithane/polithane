import { useState } from 'react';
import { Save, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const SecuritySettings = () => {
  const { changePassword } = useAuth();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [twoFactor, setTwoFactor] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (passwords.new !== passwords.confirm) {
      setError('Yeni şifreler eşleşmiyor!');
      return;
    }
    if (!passwords.current || !passwords.new) {
      setError('Lütfen mevcut şifre ve yeni şifreyi girin.');
      return;
    }
    if (String(passwords.new).length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(passwords.current, passwords.new);
      if (!res?.success) throw new Error(res?.error || 'Şifre değiştirilemedi.');
      setSuccess(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (e2) {
      setError(e2?.message || 'Şifre değiştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Güvenlik Ayarları</h2>
      
      {/* Password Change */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Şifre Değiştir</h3>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Şifre başarıyla değiştirildi!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mevcut Şifre</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>
        </form>
      </div>
      
      {/* Two-Factor Auth */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">İki Faktörlü Doğrulama</h3>
        
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary-blue" />
            <div>
              <div className="font-semibold text-gray-900">2FA Aktif</div>
              <div className="text-sm text-gray-600">Ek güvenlik katmanı</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={twoFactor}
            onChange={(e) => setTwoFactor(e.target.checked)}
            className="w-5 h-5 text-primary-blue rounded"
          />
        </label>
      </div>
    </div>
  );
};
