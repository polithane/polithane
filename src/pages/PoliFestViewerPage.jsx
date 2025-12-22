import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { apiCall } from '../utils/api';
import { isUiVerifiedUser } from '../utils/titleHelpers';

const DEFAULT_DURATION_MS = 5000;

export const PoliFestViewerPage = () => {
  const navigate = useNavigate();
  const { usernameOrId } = useParams();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const closeToList = useCallback(() => navigate('/polifest'), [navigate]);

  const current = items[idx] || null;
  const progressCount = Math.max(items.length, 1);

  const go = (dir) => {
    setIdx((prev) => {
      const next = prev + dir;
      if (next < 0) return 0;
      if (next >= items.length) return prev;
      return next;
    });
  };

  const currentDuration = useMemo(() => {
    if (!current) return DEFAULT_DURATION_MS;
    if (current.content_type === 'video' && current.media_duration) return Math.max(2000, current.media_duration * 1000);
    return DEFAULT_DURATION_MS;
  }, [current]);

  useEffect(() => {
    (async () => {
      // Resolve user by id (numeric/uuid) or username
      const key = String(usernameOrId || '').trim();
      const isId = /^\d+$/.test(key) || /^[0-9a-fA-F-]{36}$/.test(key);
      const profileRes = isId
        ? await apiCall(`/api/users?id=${encodeURIComponent(key)}`).catch(() => null)
        : await apiCall(`/api/users?username=${encodeURIComponent(key)}`).catch(() => null);
      const profile = profileRes?.data ? profileRes.data : profileRes;
      setUser(profile || null);

      const userId = profile?.id || (isId ? key : null);
      if (!userId) return;

      const posts = await apiCall(`/api/posts?user_id=${encodeURIComponent(userId)}&limit=20&order=created_at.desc`).catch(
        () => []
      );
      setItems(Array.isArray(posts) ? posts : []);
      setIdx(0);
    })();
  }, [usernameOrId]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!items.length) return;
    timerRef.current = setTimeout(() => {
      if (idx < items.length - 1) setIdx(idx + 1);
      else closeToList();
    }, currentDuration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, items.length, currentDuration, closeToList]);

  return (
    <div className="fixed inset-0 bg-black text-white z-50">
      {/* top progress bar */}
      <div className="absolute top-0 left-0 right-0 px-3 pt-3">
        <div className="flex gap-1">
          {Array.from({ length: progressCount }).map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
              <div className={`h-full bg-white ${i < idx ? 'w-full' : i === idx ? 'w-1/2' : 'w-0'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* header */}
      <div className="absolute top-0 left-0 right-0 px-3 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar src={user?.avatar_url} size="36px" verified={isUiVerifiedUser(user)} />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{user?.full_name || 'PoliFest'}</div>
            <div className="text-xs text-white/70 truncate">@{user?.username || '-'}</div>
          </div>
        </div>
        <button onClick={closeToList} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-8 h-8" />
        </button>
      </div>

      {/* content */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-20 pb-16">
        {!current ? (
          <div className="text-white/70">İçerik bulunamadı.</div>
        ) : current.content_type === 'image' ? (
          <img
            src={Array.isArray(current.media_urls) ? current.media_urls[0] : current.media_urls}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : current.content_type === 'video' ? (
          <img
            src={current.thumbnail_url || (Array.isArray(current.media_urls) ? current.media_urls[0] : current.media_urls)}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="max-w-xl w-full">
            <div className="text-lg leading-relaxed whitespace-pre-wrap">{current.content_text || current.content}</div>
          </div>
        )}
      </div>

      {/* nav tap areas */}
      <button
        onClick={() => go(-1)}
        className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start px-2 text-white/60 hover:text-white"
        aria-label="Önceki"
      >
        <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/25 backdrop-blur-sm border border-white/20">
          <ChevronLeft className="w-14 h-14" />
        </span>
      </button>
      <button
        onClick={() => go(1)}
        className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end px-2 text-white/60 hover:text-white"
        aria-label="Sonraki"
      >
        <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/25 backdrop-blur-sm border border-white/20">
          <ChevronRight className="w-14 h-14" />
        </span>
      </button>
    </div>
  );
};

