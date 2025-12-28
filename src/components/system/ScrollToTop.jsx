import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Default: always start pages from top on navigation.
    // Exception: explicit deep-links that are expected to scroll (e.g. post detail "comment" shortcut).
    const q = new URLSearchParams(location.search || '');
    if (q.get('comment') === '1') return;
    if (location.hash) return;
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
};

