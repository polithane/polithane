import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export const AdminLayout = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
    <div className="min-h-screen bg-gray-50 lg:flex admin-shell">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar
          onNavigate={() => setSidebarOpen(false)}
          onClose={() => setSidebarOpen(false)}
          showCloseButton
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:hidden">
          <div className="h-14 px-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label={sidebarOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              {sidebarOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
            </button>
            <div className="font-black text-gray-900">Admin Paneli</div>
            <div className="w-10" />
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
};
