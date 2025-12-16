import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const LoginPage = () => {
  const navigate = useNavigate();

  // Legacy route: redirect to the real login page.
  useEffect(() => {
    navigate('/login-new', { replace: true });
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Yönlendiriliyor...</p>
      </div>
    </div>
  );
};
