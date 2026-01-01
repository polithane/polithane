import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiCall } from '../utils/api';
 
const PublicSiteContext = createContext(null);
 
export const usePublicSite = () => {
  const ctx = useContext(PublicSiteContext);
  if (!ctx) throw new Error('usePublicSite must be used within PublicSiteProvider');
  return ctx;
};
 
export const PublicSiteProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState(null);
  const [error, setError] = useState('');
 
  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await apiCall('/api/public/site', { method: 'GET' }).catch(() => null);
      if (r?.success && r?.data && typeof r.data === 'object') {
        setSite(r.data);
      } else {
        setSite(null);
      }
    } catch (e) {
      setError(String(e?.message || 'Site bilgisi alınamadı.'));
      setSite(null);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  const value = useMemo(
    () => ({
      loading,
      error,
      site,
      refresh,
      maintenanceMode: !!site?.maintenanceMode,
      allowRegistration: site?.allowRegistration !== false,
      allowComments: site?.allowComments !== false,
      allowMessages: site?.allowMessages !== false,
    }),
    [loading, error, site]
  );
 
  return <PublicSiteContext.Provider value={value}>{children}</PublicSiteContext.Provider>;
};

