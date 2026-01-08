import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Legacy PoliFest viewer - redirect to Fast viewer
export const PoliFestViewerPage = () => {
  const navigate = useNavigate();
  const { usernameOrId } = useParams();

  useEffect(() => {
    navigate(`/fast/${usernameOrId}`, { replace: true });
  }, [navigate, usernameOrId]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Fast viewer'a yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );
};

