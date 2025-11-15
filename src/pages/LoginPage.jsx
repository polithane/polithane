import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { toast } from 'react-hot-toast';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock login
    setTimeout(() => {
      setLoading(false);
      toast.success('Giriş başarılı!');
      navigate('/');
    }, 1000);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-blue mb-2">POLITHANE</h1>
          <p className="text-gray-600">Giriş yapın</p>
        </div>
        
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Giriş Yap
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Hesabınız yok mu?{' '}
              <a href="/register" className="text-primary-blue hover:underline">
                Kayıt olun
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
