import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const AdminLayout = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  // While auth state is being restored/verified, don't redirect.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md">
          <div className="text-xl font-black text-gray-900">Admin Paneli</div>
          <div className="text-sm text-gray-600 mt-1">Oturum kontrol ediliyor…</div>
          <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary-blue rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  
  // Redirect if not authenticated or not admin
  if (!isAuthenticated) {
    return <Navigate to="/login-new" />;
  }
  
  if (!isAdmin()) {
    return <Navigate to="/" />;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
};
