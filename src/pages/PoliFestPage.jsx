import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Legacy PoliFest page - redirect to Fast
export const PoliFestPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/fast', { replace: true });
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Fast sayfasına yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );
};

