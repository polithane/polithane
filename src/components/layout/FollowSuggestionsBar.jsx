import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { FollowSuggestionsSidebar } from '../home/FollowSuggestionsSidebar';

export const FollowSuggestionsBar = ({ limit = 8 }) => {
  const STORAGE_KEY = 'polithane_followbar_collapsed';
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setCollapsed(false);
    }
  }, []);

  const collapse = () => {
    setCollapsed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };
  const expand = () => {
    setCollapsed(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Expanded sidebar */}
      {!collapsed ? (
        <div className="hidden lg:block fixed right-2 top-1/2 -translate-y-1/2 z-30 w-[170px] xl:w-[190px] 2xl:w-[210px] overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
            <FollowSuggestionsSidebar limit={limit} onCollapse={collapse} />
          </div>
        </div>
      ) : null}

      {/* Collapsed (session-only) icon */}
      {collapsed ? (
        <button
          type="button"
          onClick={expand}
          className="hidden lg:flex fixed right-2 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-gray-900/90 hover:bg-gray-900 text-white shadow-xl items-center justify-center"
          title="Takip önerilerini aç"
        >
          <Compass className="w-6 h-6" />
        </button>
      ) : null}
    </>
  );
};

