import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { apiCall, posts as postsApi } from '../utils/api';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_DURATION_MS = 5000;

export const FastViewerPage = () => {
  const navigate = useNavigate();
  const { usernameOrId } = useParams();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [likedById, setLikedById] = useState({});
  const [likeCountById, setLikeCountById] = useState({});
  const [viewers, setViewers] = useState([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersSchemaSql, setViewersSchemaSql] = useState('');
  const timerRef = useRef(null);
  // UX: closing Fast should return to home.
  const closeToList = useCallback(() => navigate('/'), [navigate]);
  const goToProfile = useCallback(() => {
    const uname = String(user?.username || '').trim();
    const id = String(user?.id || '').trim();
    if (uname) navigate(`/@${encodeURIComponent(uname)}`);
    else if (id) navigate(`/profile/${encodeURIComponent(id)}`);
  }, [navigate, user?.id, user?.username]);

  const current = items[idx] || null;
  const prevItem = useMemo(() => (idx > 0 ? items[idx - 1] : null), [idx, items]);
  const nextItem = useMemo(() => (idx < items.length - 1 ? items[idx + 1] : null), [idx, items.length, items]);
  const isOwner = useMemo(() => {
    const mid = String(me?.id || '');
    const uid = String(user?.id || user?.user_id || '');
    return !!mid && !!uid && mid === uid;
  }, [me?.id, user?.id, user?.user_id]);

  const currentLiked = useMemo(() => {
    const id = current?.id != null ? String(current.id) : '';
    if (!id) return false;
    if (likedById && Object.prototype.hasOwnProperty.call(likedById, id)) return !!likedById[id];
    return !!current?.liked_by_me;
  }, [current, likedById]);
  const currentLikeCount = useMemo(() => {
    const id = current?.id != null ? String(current.id) : '';
    if (!id) return 0;
    if (likeCountById && Object.prototype.hasOwnProperty.call(likeCountById, id)) return Number(likeCountById[id] || 0) || 0;
    return Number(current?.like_count || 0) || 0;
  }, [current, likeCountById]);
  const progressCount = Math.max(items.length, 1);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const [videoRotate, setVideoRotate] = useState(false);

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
    // We do not auto-advance for audio/video; we advance on "ended".
    // Keep timer for image/text only.
    if (current.content_type === 'audio' || current.content_type === 'video') return 0;
    return DEFAULT_DURATION_MS;
  }, [current]);

  useEffect(() => {
    (async () => {
      const key = String(usernameOrId || '').trim();
      const isId = /^\d+$/.test(key) || /^[0-9a-fA-F-]{36}$/.test(key);
      const profileRes = isId
        ? await apiCall(`/api/users?id=${encodeURIComponent(key)}`).catch(() => null)
        : await apiCall(`/api/users?username=${encodeURIComponent(key)}`).catch(() => null);
      const profile = profileRes?.data ? profileRes.data : profileRes;
      setUser(profile || null);

      const userId = profile?.id || (isId ? key : null);
      if (!userId) return;

      const r = await apiCall(`/api/fast/${encodeURIComponent(userId)}`).catch(() => null);
      const rows = r?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
      setIdx(0);
      // Seed local like counts (best-effort)
      try {
        const next = {};
        for (const it of Array.isArray(rows) ? rows : []) {
          const id = it?.id != null ? String(it.id) : '';
          if (!id) continue;
          next[id] = Number(it?.like_count || 0) || 0;
        }
        setLikeCountById(next);
      } catch {
        setLikeCountById({});
      }
    })();
  }, [usernameOrId]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!items.length) return;
    if (!currentDuration) return;
    timerRef.current = setTimeout(() => {
      if (idx < items.length - 1) setIdx(idx + 1);
      else closeToList();
    }, currentDuration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, items.length, currentDuration, closeToList]);

  const mediaUrl = (p) => {
    const m = p?.media_urls ?? p?.media_url ?? [];
    return Array.isArray(m) ? m[0] : m;
  };

  const previewSrc = (p) => {
    if (!p) return '';
    const t = String(p?.thumbnail_url || '').trim();
    if (t) return t;
    return mediaUrl(p);
  };

  const toggleLike = useCallback(async () => {
    if (!current?.id) return;
    if (!me?.id) {
      navigate('/login-new');
      return;
    }
    const id = String(current.id);
    const prev = !!(likedById && likedById[id]);
    const prevCount = Number(
      likeCountById && Object.prototype.hasOwnProperty.call(likeCountById, id) ? likeCountById[id] : current?.like_count
    );
    const safePrevCount = Number.isFinite(prevCount) ? prevCount : 0;
    // optimistic UI: toggle immediately
    setLikedById((p) => ({ ...(p || {}), [id]: !prev }));
    setLikeCountById((p) => ({ ...(p || {}), [id]: Math.max(0, safePrevCount + (prev ? -1 : 1)) }));
    try {
      const r = await postsApi.like(id).catch(() => null);
      const action = String(r?.action || r?.data?.action || '').toLowerCase();
      if (action === 'liked') {
        setLikedById((p) => ({ ...(p || {}), [id]: true }));
        setLikeCountById((p) => ({ ...(p || {}), [id]: Math.max(0, safePrevCount + 1) }));
      } else if (action === 'unliked') {
        setLikedById((p) => ({ ...(p || {}), [id]: false }));
        setLikeCountById((p) => ({ ...(p || {}), [id]: Math.max(0, safePrevCount - 1) }));
      } else {
        // unknown: keep optimistic state
      }
    } catch {
      // revert on failure
      setLikedById((p) => ({ ...(p || {}), [id]: prev }));
      setLikeCountById((p) => ({ ...(p || {}), [id]: Math.max(0, safePrevCount) }));
    }
  }, [current?.id, current?.like_count, likedById, likeCountById, me?.id, navigate]);

  useEffect(() => {
    // Ensure media starts from the beginning when switching items.
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.pause?.();
      }
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.pause?.();
      }
    } catch {
      // ignore
    }
    setVideoRotate(false);
  }, [idx]);

  useEffect(() => {
    // Track view for active fast item (best-effort).
    if (!current?.id) return;
    if (isOwner) return;
    apiCall(`/api/fast/items/${encodeURIComponent(String(current.id))}/view`, { method: 'POST' }).catch(() => null);
  }, [current?.id, isOwner]);

  useEffect(() => {
    // Load viewers only for the fast owner.
    if (!current?.id) return;
    if (!isOwner) {
      setViewers([]);
      setViewersSchemaSql('');
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await apiCall(`/api/fast/items/${encodeURIComponent(String(current.id))}/viewers?limit=50`, { method: 'GET' }).catch(() => null);
      if (cancelled) return;
      if (r?.schemaMissing) {
        setViewersSchemaSql(String(r?.requiredSql || ''));
        setViewers([]);
        return;
      }
      const list = r?.data || [];
      setViewers(Array.isArray(list) ? list : []);
      setViewersSchemaSql('');
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id, isOwner]);

  useEffect(() => {
    // Autoplay for video when it becomes active (with mobile-friendly muted fallback).
    if (!current) return;
    if (current.content_type !== 'video') return;
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;
    const tryPlay = async () => {
      try {
        el.muted = false;
        await el.play();
      } catch {
        try {
          el.muted = true;
          await el.play();
        } catch {
          // ignore
        }
      }
    };
    setTimeout(() => {
      if (!cancelled) tryPlay();
    }, 50);
    return () => {
      cancelled = true;
    };
  }, [current, idx]);

  const SidePreview = ({ item, side }) => {
    if (!item) return null;
    const dir = side === 'left' ? -1 : 1;
    const pos =
      side === 'left'
        ? 'left-0 -translate-x-[45%]'
        : 'right-0 translate-x-[45%]';
    const label = side === 'left' ? 'Önceki Fast' : 'Sonraki Fast';
    const src = previewSrc(item);
    const isText = String(item?.content_type || '') === 'text';
    return (
      <button
        type="button"
        onClick={() => go(dir)}
        aria-label={label}
        className={`absolute top-1/2 -translate-y-1/2 ${pos} w-[220px] max-w-[38vw] h-[70vh] max-h-[520px] rounded-2xl overflow-hidden border border-white/10 bg-black/10 backdrop-blur-[2px] shadow-2xl opacity-60 hover:opacity-85 transition-opacity`}
      >
        {isText ? (
          <div className="h-full w-full p-4 flex items-start justify-center">
            <div className="text-center text-sm text-white/90 leading-relaxed max-h-full overflow-hidden">
              {String(item?.content_text || item?.content || '').slice(0, 320)}
            </div>
          </div>
        ) : src ? (
          <img src={src} alt="" className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/70 text-sm">Fast</div>
        )}
      </button>
    );
  };

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
        <button
          type="button"
          onClick={goToProfile}
          className="flex items-center gap-2 min-w-0 text-left"
          title="Profile git"
        >
          <Avatar src={user?.avatar_url} size="36px" verified={isUiVerifiedUser(user)} ring="fast" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{user?.full_name || 'Fast'}</div>
            <div className="text-xs text-white/70 truncate">@{user?.username || '-'}</div>
          </div>
        </button>
        <button onClick={closeToList} className="p-3 rounded-full bg-black/45 hover:bg-black/60">
          <X className="w-14 h-14" />
        </button>
      </div>

      {/* content */}
      <div className="absolute inset-0 px-4 pt-20 pb-16">
        {/* side previews */}
        {prevItem ? <SidePreview item={prevItem} side="left" /> : null}
        {nextItem ? <SidePreview item={nextItem} side="right" /> : null}

        <div
          className={`h-full w-full flex justify-center ${
            current?.content_type === 'text' ? 'items-start' : 'items-center'
          }`}
        >
        {!current ? (
          <div className="text-white/70">İçerik bulunamadı.</div>
        ) : current.content_type === 'image' ? (
          <img src={mediaUrl(current)} alt="" className="max-h-full max-w-full object-contain" />
        ) : current.content_type === 'video' ? (
          <video
            ref={videoRef}
            src={mediaUrl(current)}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full object-contain"
            onLoadedMetadata={(e) => {
              try {
                const el = e?.currentTarget;
                const w = Number(el?.videoWidth || 0);
                const h = Number(el?.videoHeight || 0);
                // If video is recorded as landscape but should be shown portrait, rotate.
                setVideoRotate(w > 0 && h > 0 && w > h);
              } catch {
                setVideoRotate(false);
              }
            }}
            style={videoRotate ? { transform: 'rotate(90deg)' } : undefined}
            onEnded={() => {
              if (idx < items.length - 1) setIdx(idx + 1);
              else closeToList();
            }}
          />
        ) : current.content_type === 'audio' ? (
          <div className="max-w-xl w-full">
            <div className="bg-black/40 border border-white/15 rounded-2xl p-4">
              <audio
                ref={audioRef}
                src={mediaUrl(current)}
                controls
                autoPlay
                className="w-full"
                onEnded={() => {
                  if (idx < items.length - 1) setIdx(idx + 1);
                  else closeToList();
                }}
              />
            </div>
            {current.content_text ? (
              <div className="mt-4 text-lg leading-relaxed whitespace-pre-wrap">{current.content_text}</div>
            ) : null}
          </div>
        ) : (
          <div className="max-w-xl w-full">
            <div className="pt-2 text-base sm:text-lg leading-relaxed whitespace-pre-wrap text-center opacity-95">
              {current.content_text || current.content}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* nav buttons (keep side previews clickable) */}
      <button
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
        aria-label="Önceki"
      >
        <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-transparent border border-white/25">
          <ChevronLeft className="w-14 h-14" />
        </span>
      </button>
      <button
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
        aria-label="Sonraki"
      >
        <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-transparent border border-white/25">
          <ChevronRight className="w-14 h-14" />
        </span>
      </button>

      {/* viewers (only owner) */}
      {isOwner && current?.id ? (
        <div className="absolute bottom-6 left-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewersOpen(true)}
            className="flex items-center"
            aria-label="Bakanlar"
            title="Bakanlar"
          >
            <div className="flex -space-x-2">
              {(viewers || []).slice(0, 3).map((v, i) => (
                <div key={String(v?.user?.id || i)} className="rounded-full border border-white/15 bg-black/20">
                  <Avatar src={v?.user?.avatar_url} size="28px" />
                </div>
              ))}
              {(viewers || []).length === 0 ? (
                <div className="text-xs text-white/60">Bakan yok</div>
              ) : null}
            </div>
          </button>
          {(viewers || []).length > 0 ? (
            <button
              type="button"
              onClick={() => setViewersOpen(true)}
              className="text-xs font-black text-white/80 hover:text-white underline"
            >
              diğerleri
            </button>
          ) : null}
        </div>
      ) : null}

      {/* like */}
      {current?.id ? (
        <button
          type="button"
          onClick={toggleLike}
          className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-black/25 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center"
          aria-label={currentLiked ? 'Beğeniyi kaldır' : 'Beğen'}
          title={currentLiked ? 'Beğeniyi kaldır' : 'Beğen'}
        >
          <Heart
            className="w-9 h-9"
            style={{
              color: currentLiked ? '#ffffff' : '#ffffff',
              fill: currentLiked ? '#E11D48' : 'transparent',
              opacity: currentLiked ? 1 : 0.92,
            }}
          />
          <div className="mt-0.5 text-[11px] font-black text-white/90 leading-none">{currentLikeCount}</div>
        </button>
      ) : null}

      <Modal
        isOpen={viewersOpen}
        onClose={() => setViewersOpen(false)}
        title="Bakanlar"
        size="small"
      >
        {viewersSchemaSql ? (
          <div className="text-sm text-gray-700">
            <div className="font-black text-gray-900 mb-2">Veritabanı tablosu eksik</div>
            <div className="text-xs text-gray-600 mb-2">Supabase SQL Editor’da bu SQL’i çalıştırın:</div>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {viewersSchemaSql}
            </pre>
          </div>
        ) : viewers.length === 0 ? (
          <div className="text-sm text-gray-600">Henüz bakan yok.</div>
        ) : (
          <div className="space-y-3">
            {viewers.map((v) => {
              const u = v?.user || {};
              return (
                <button
                  key={String(u.id)}
                  type="button"
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left"
                  onClick={() => {
                    setViewersOpen(false);
                    if (u?.username) navigate(`/@${encodeURIComponent(String(u.username))}`);
                    else if (u?.id) navigate(`/profile/${encodeURIComponent(String(u.id))}`);
                  }}
                >
                  <Avatar src={u.avatar_url} size="36px" verified={isUiVerifiedUser(u)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate">{u.full_name || '—'}</div>
                    <div className="text-xs text-gray-500 truncate">@{u.username || u.id}</div>
                  </div>
                  <div className="text-[11px] text-gray-400 whitespace-nowrap">{String(v?.viewed_at || '').slice(11, 16)}</div>
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};

