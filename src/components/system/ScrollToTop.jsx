import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Default: always start pages from top on navigation.
    // Exception: explicit deep-links that are expected to scroll (e.g. post detail "comment" shortcut).
    const q = new URLSearchParams(location.search || '');
    if (q.get('comment') === '1') return;
    if (location.hash) return;
    // If user is going back/forward, preserve scroll position like social apps.
    if (navType === 'POP') return;
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  }, [location.pathname, location.search, location.hash, navType]);

  return null;
};

