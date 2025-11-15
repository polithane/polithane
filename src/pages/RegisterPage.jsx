import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toast } from 'react-hot-toast';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
    user_type: 'normal'
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      toast.success('Kayıt başarılı!');
      navigate('/login');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-blue mb-2">POLITHANE</h1>
          <p className="text-gray-600">Yeni hesap oluşturun</p>
        </div>
        
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= s ? 'bg-primary-blue text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-primary-blue' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <Input
                  label="Ad Soyad"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                />
                <Input
                  label="Kullanıcı Adı"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
                <Input
                  label="E-posta"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
                <Input
                  label="Telefon"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
                <Input
                  label="Şifre"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
                <Input
                  label="Şifre Tekrar"
                  type="password"
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({...formData, password_confirm: e.target.value})}
                  required
                />
              </>
            )}
            
            {step === 2 && (
              <div className="space-y-4">
                <p className="font-semibold mb-4">Üyelik Tipi Seçin</p>
                {['normal', 'party_member', 'politician', 'media'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, user_type: type})}
                    className={`w-full p-4 border-2 rounded-lg text-left ${
                      formData.user_type === type 
                        ? 'border-primary-blue bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold capitalize">{type}</div>
                  </button>
                ))}
              </div>
            )}
            
            {step === 3 && (
              <div className="text-center py-8">
                <p className="text-lg mb-4">Kayıt işlemi tamamlanacak</p>
                <p className="text-sm text-gray-600">
                  E-posta adresinize doğrulama kodu gönderilecektir.
                </p>
              </div>
            )}
            
            <div className="flex gap-4 mt-6">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Geri
                </Button>
              )}
              <Button type="submit" className="flex-1">
                {step < 3 ? 'İleri' : 'Kayıt Ol'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
