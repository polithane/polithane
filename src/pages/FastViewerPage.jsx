import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { X, Heart, Volume2, VolumeX, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../components/common/Avatar';
import { LikeBurstHeart } from '../components/common/LikeBurstHeart';
import { Modal } from '../components/common/Modal';
import { apiCall, posts as postsApi } from '../utils/api';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { useAuth } from '../contexts/AuthContext';
import { normalizeAvatarUrl } from '../utils/avatarUrl';
import { getProfilePath } from '../utils/paths';

const DEFAULT_DURATION_MS = 3000; // image/text display duration
const HOLD_TO_PAUSE_MS = 120;
const SWIPE_MIN_PX = 50;
const SWIPE_DOWN_MIN_PX = 80;

export const FastViewerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { usernameOrId } = useParams();
  const { user: me } = useAuth();
  const [queue, setQueue] = useState([]);
  const [userIdx, setUserIdx] = useState(0);
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [likedById, setLikedById] = useState({});
  const [likeCountById, setLikeCountById] = useState({});
  const [likeBurstTickById, setLikeBurstTickById] = useState({});
  const [viewers, setViewers] = useState([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersSchemaSql, setViewersSchemaSql] = useState('');
  const rootRef = useRef(null);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const holdTimerRef = useRef(null);
  const gestureRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    zoneDir: 0,
    pausedByHold: false,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 for current item
  const [mediaBlocked, setMediaBlocked] = useState(false);
  // Initialize muted state from localStorage, default to false (sound ON by default)
  const [muted, setMuted] = useState(() => {
    try {
      const stored = localStorage.getItem('fast_sound_muted');
      // String comparison is safer than JSON.parse for boolean values
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [vT, setVT] = useState(0);
  const [vDur, setVDur] = useState(0);
  const [vMeta, setVMeta] = useState({ w: 0, h: 0 });
  const pendingStartRef = useRef(null); // null | 'first' | 'last'
  const pendingUserDirRef = useRef(0); // -1 | 0 | 1 (best-effort when a user has no items)
  const itemsCacheRef = useRef(new Map()); // key -> { ts, items, user }
  const inflightRef = useRef(new Map()); // key -> Promise
  const stageRef = useRef(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slide, setSlide] = useState({ x: 0, o: 1 });
  const [contentBox, setContentBox] = useState({ w: 0, h: 0 });
  const [imgMeta, setImgMeta] = useState({ w: 0, h: 0 });

  // UX: closing Fast should return to home.
  const closeToList = useCallback(() => navigate('/'), [navigate]);
  const goToProfile = useCallback(() => {
    // Ensure close works even if gesture overlay has active pointer capture
    try {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    } catch {
      // ignore
    }
    navigate(getProfilePath(user || {}));
  }, [navigate, user]);

  const current = items[idx] || null;
  const prevUser = useMemo(() => (userIdx > 0 ? queue[userIdx - 1] : null), [userIdx, queue]);
  const nextUser = useMemo(() => (userIdx < queue.length - 1 ? queue[userIdx + 1] : null), [userIdx, queue.length, queue]);
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
  // NOTE: Do not force-rotate videos by width/height heuristics.
  // It causes some landscape videos to appear sideways.

  const safeKey = useMemo(() => String(usernameOrId || '').trim(), [usernameOrId]);

  // Measure stage (content area) for "no upscale" rendering rules.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      try {
        const r = el.getBoundingClientRect();
        setContentBox({ w: Math.max(0, r.width || 0), h: Math.max(0, r.height || 0) });
      } catch {
        // ignore
      }
    };
    update();
    let ro = null;
    try {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } catch {
      // fallback: window resize
      window.addEventListener('resize', update);
    }
    return () => {
      try {
        if (ro) ro.disconnect();
      } catch {
        // ignore
      }
      try {
        window.removeEventListener('resize', update);
      } catch {
        // ignore
      }
    };
  }, []);

  const normalizeQueueUser = (x) => ({
    id: x?.id || x?.user_id,
    user_id: x?.user_id || x?.id,
    username: x?.username,
    full_name: x?.full_name,
    avatar_url: x?.avatar_url || x?.profile_image,
    profile_image: x?.profile_image || x?.avatar_url,
    story_count: x?.story_count,
    latest_created_at: x?.latest_created_at,
  });

  const fetchFastForKey = useCallback(
    async (key) => {
      const k = String(key || '').trim();
      if (!k) return { user: null, items: [] };
      const cached = itemsCacheRef.current.get(k);
      if (cached && Date.now() - Number(cached.ts || 0) < 60_000) return { user: cached.user, items: cached.items };

      if (inflightRef.current.has(k)) {
        try {
          return await inflightRef.current.get(k);
        } catch {
          // fall through
        }
      }

      const p = (async () => {
        // Fast endpoint accepts username or id; use it directly to avoid extra /users lookup in the critical path.
        const r = await apiCall(`/api/fast/${encodeURIComponent(k)}`).catch(() => null);
        const rows = r?.data || [];
        const list = Array.isArray(rows) ? rows : [];
        // user info: prefer queue snapshot (fastQueue carries avatar/name), else try to infer from first item.
        const inferredUser = normalizeQueueUser(queue?.find((q) => String(q?.key || '') === k) || {}) || null;
        const userFromItem = list?.[0]?.user || null;
        const resolvedUser = userFromItem || inferredUser || null;
        itemsCacheRef.current.set(k, { ts: Date.now(), items: list, user: resolvedUser });
        return { user: resolvedUser, items: list };
      })();

      inflightRef.current.set(k, p);
      try {
        const out = await p;
        return out;
      } finally {
        inflightRef.current.delete(k);
      }
    },
    [queue]
  );

  const prefetchNeighbor = useCallback(
    (k) => {
      const key = String(k || '').trim();
      if (!key) return;
      fetchFastForKey(key).catch(() => null);
    },
    [fetchFastForKey]
  );

  const navigateToUserIndex = useCallback(
    (nextIndex, { replace = true } = {}) => {
      const q = Array.isArray(queue) ? queue : [];
      const ni = Math.max(0, Math.min(q.length - 1, Number(nextIndex) || 0));
      const key = String(q?.[ni]?.key || '').trim();
      if (!key) return;
      // Keep URL in sync (so refresh/back behaves correctly).
      navigate(`/fast/${encodeURIComponent(key)}`, {
        replace,
        state: {
          fastQueue: q,
          fastStartIndex: ni,
          fastStartKey: key,
        },
      });
      setUserIdx(ni);
    },
    [navigate, queue]
  );

  const goUser = useCallback(
    (dir) => {
      const next = userIdx + dir;
      if (next < 0) {
        closeToList();
        return;
      }
      if (next >= (queue || []).length) {
        closeToList();
        return;
      }
      // UX rule:
      // - previous profile => open their LAST fast
      // - next profile => open their FIRST fast
      pendingStartRef.current = dir < 0 ? 'last' : 'first';
      pendingUserDirRef.current = dir;
      navigateToUserIndex(next, { replace: true });
    },
    [closeToList, navigateToUserIndex, queue, userIdx]
  );

  const goItem = useCallback(
    (dir) => {
      setIdx((prev) => {
        const next = prev + dir;
        if (next < 0) {
          // go to previous item; if none, previous user's last item; if none, close
          if (userIdx > 0) {
            pendingStartRef.current = 'last';
            pendingUserDirRef.current = -1;
            navigateToUserIndex(userIdx - 1, { replace: true });
            return prev; // idx will be set when new user loads
          }
          closeToList();
          return prev;
        }
        if (next >= items.length) {
          // next user
          if (userIdx < (queue || []).length - 1) {
            pendingStartRef.current = 'first';
            pendingUserDirRef.current = 1;
            navigateToUserIndex(userIdx + 1, { replace: true });
            return prev;
          }
          closeToList();
          return prev;
        }
        return next;
      });
    },
    [closeToList, items.length, navigateToUserIndex, queue, userIdx]
  );

  const animateItem = useCallback(
    async (dir, fn) => {
      if (isTransitioning || isSwitching) return;
      const d = Number(dir || 0);
      if (!d) return;
      setIsTransitioning(true);
      // slide out
      setSlide({ x: -d * 28, o: 0.25 });
      await new Promise((r) => setTimeout(r, 90));
      fn?.();
      // prepare slide in
      setSlide({ x: d * 28, o: 0.25 });
      requestAnimationFrame(() => setSlide({ x: 0, o: 1 }));
      await new Promise((r) => setTimeout(r, 180));
      setIsTransitioning(false);
    },
    [isSwitching, isTransitioning]
  );

  const currentDuration = useMemo(() => {
    if (!current) return DEFAULT_DURATION_MS;
    // We do not auto-advance for audio/video; we advance on "ended".
    // Keep timer for image/text only.
    if (current.content_type === 'audio' || current.content_type === 'video') return 0;
    return DEFAULT_DURATION_MS;
  }, [current]);

  // Load queue from navigation state / sessionStorage (deep-link fallback)
  useEffect(() => {
    const stateQueue = location?.state?.fastQueue;
    const stateIndex = location?.state?.fastStartIndex;
    const stateKey = location?.state?.fastStartKey;
    const normalize = (q) =>
      (Array.isArray(q) ? q : [])
        .map((x) => ({
          key: String(x?.key || x?.username || x?.user_id || '').trim(),
          user_id: x?.user_id,
          username: x?.username,
          full_name: x?.full_name,
          avatar_url: x?.avatar_url || x?.profile_image,
          profile_image: x?.profile_image || x?.avatar_url,
          story_count: x?.story_count,
          latest_created_at: x?.latest_created_at,
        }))
        .filter((x) => x.key);

    let q = normalize(stateQueue);
    if (!q.length) {
      try {
        const raw = sessionStorage.getItem('fast_queue_v1');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Date.now() - Number(parsed.ts || 0) < 30 * 60_000) {
          q = normalize(parsed.queue);
        }
      } catch {
        // ignore
      }
    }

    // If still empty, fall back to a single-user queue from route param
    if (!q.length && safeKey) q = [{ key: safeKey }];

    const idxByKey = q.findIndex((x) => x.key === safeKey || (stateKey && x.key === stateKey));
    const start = Number.isFinite(Number(stateIndex)) ? Math.max(0, Number(stateIndex)) : idxByKey >= 0 ? idxByKey : 0;
    setQueue(q);
    setUserIdx(Math.min(Math.max(0, start), Math.max(q.length - 1, 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state, safeKey]);

  // (responsive behavior is handled via Tailwind breakpoints in markup)

  // Persist current position so refresh can continue the same playlist.
  useEffect(() => {
    if (!queue || queue.length === 0) return;
    try {
      sessionStorage.setItem(
        'fast_queue_v1',
        JSON.stringify({
          ts: Date.now(),
          queue,
          startKey: String(queue?.[userIdx]?.key || '').trim(),
          startIndex: userIdx,
        })
      );
    } catch {
      // ignore
    }
  }, [queue, userIdx]);

  useEffect(() => {
    // Load current user + items by queue[userIdx]
    let cancelled = false;
    (async () => {
      const key = String(queue?.[userIdx]?.key || safeKey || '').trim();
      if (!key) return;
      // Optimistic: show cached immediately if possible to reduce "did it click?" feeling.
      const cached = itemsCacheRef.current.get(key);
      if (cached && !cancelled) {
        setUser(cached.user || queue?.[userIdx] || null);
        setItems(Array.isArray(cached.items) ? cached.items : []);
        const pending = pendingStartRef.current;
        pendingStartRef.current = null;
        pendingUserDirRef.current = 0;
        if (Array.isArray(cached.items) && cached.items.length) {
          if (pending === 'last') setIdx(Math.max(0, cached.items.length - 1));
          else setIdx(0);
        }
      }
      setMediaBlocked(false);
      setProgress(0);
      setIsPaused(false);
      setIsSwitching(true);
      try {
        const { user: resolvedUser, items: list } = await fetchFastForKey(key);
        if (cancelled) return;
        setUser(resolvedUser || queue?.[userIdx] || null);
        setItems(list);
        const pending = pendingStartRef.current;
        pendingStartRef.current = null;
        pendingUserDirRef.current = 0;
        if (list.length === 0) {
          // If we somehow landed on a user with no items, fall back to list.
          // (Queue is normally derived from /api/fast, so this should be rare.)
          setIdx(0);
          closeToList();
          return;
        }
        if (pending === 'last') setIdx(Math.max(0, list.length - 1));
        else setIdx(0);
        // Seed local like counts
        try {
          const next = {};
          for (const it of list) {
            const id = it?.id != null ? String(it.id) : '';
            if (!id) continue;
            next[id] = Number(it?.like_count || 0) || 0;
          }
          setLikeCountById(next);
        } catch {
          setLikeCountById({});
        }
      } catch {
        if (cancelled) return;
        setUser(queue?.[userIdx] || null);
        setItems([]);
        setIdx(0);
      } finally {
        if (!cancelled) setIsSwitching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [closeToList, fetchFastForKey, queue, safeKey, userIdx]);

  // Prefetch neighbors to make edge transitions faster.
  useEffect(() => {
    const prev = userIdx > 0 ? queue?.[userIdx - 1]?.key : null;
    const next = userIdx < (queue?.length || 0) - 1 ? queue?.[userIdx + 1]?.key : null;
    if (prev) prefetchNeighbor(prev);
    if (next) prefetchNeighbor(next);
  }, [prefetchNeighbor, queue, userIdx]);

  // Persist muted state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fast_sound_muted', String(muted));
    } catch {
      // ignore
    }
  }, [muted]);

  // Progress + auto-advance for image/text
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(0);
    if (!items.length) return;
    if (!currentDuration) return;
    if (isPaused) return;

    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const p = Math.max(0, Math.min(1, elapsed / currentDuration));
      setProgress(p);
      if (p >= 1) {
        animateItem(1, () => goItem(1));
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(() => animateItem(1, () => goItem(1)), currentDuration + 30);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animateItem, current?.id, currentDuration, goItem, isPaused, items.length]);

  const mediaUrl = (p) => {
    const m = p?.media_urls ?? p?.media_url ?? [];
    return Array.isArray(m) ? m[0] : m;
  };

  const itemSrc = useMemo(() => (current ? String(mediaUrl(current) || '') : ''), [current]);

  const canDelete = useMemo(() => {
    if (!current?.id) return false;
    const ownerId = String(current?.user_id || '').trim();
    const myId = String(me?.id || me?.user_id || '').trim();
    return !!ownerId && !!myId && ownerId === myId;
  }, [current?.id, current?.user_id, me?.id, me?.user_id]);

  const deleteCurrent = useCallback(async () => {
    if (!current?.id) return;
    if (!canDelete) return;
    const ok = window.confirm('Bu Fast silinsin mi?');
    if (!ok) return;
    try {
      await postsApi.delete(String(current.id));
      toast.success('Fast silindi.');
      setItems((prev) => (Array.isArray(prev) ? prev.filter((it) => String(it?.id || '') !== String(current.id)) : []));
      setIdx((prev) => Math.max(0, prev - 1));
      setTimeout(() => {
        try {
          const left = (items || []).filter((it) => String(it?.id || '') !== String(current.id));
          if (left.length === 0) goUser(1);
        } catch {
          // ignore
        }
      }, 0);
    } catch (e) {
      toast.error(String(e?.message || 'Fast silinemedi.'));
    }
  }, [canDelete, current?.id, goUser, items, setItems, setIdx]);

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
    if (!prev) {
      setLikeBurstTickById((p) => ({ ...(p || {}), [id]: Number((p || {})[id] || 0) + 1 }));
    }
    // optimistic UI: toggle immediately
    setLikedById((p) => ({ ...(p || {}), [id]: !prev }));
    setLikeCountById((p) => ({ ...(p || {}), [id]: Math.max(0, safePrevCount + (prev ? -1 : 1)) }));
    try {
      const r = await postsApi.like(id).catch(() => null);
      const action = String(r?.action || r?.data?.action || '').toLowerCase();
      if (action === 'liked') {
        if (prev) {
          setLikeBurstTickById((p) => ({ ...(p || {}), [id]: Number((p || {})[id] || 0) + 1 }));
        }
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
    setMediaBlocked(false);
    setVT(0);
    setVDur(0);
    setVMeta({ w: 0, h: 0 });
    setImgMeta({ w: 0, h: 0 });
  }, [idx]);

  useEffect(() => {
    // Track time/duration for video controls (best-effort).
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setVT(Number(el.currentTime || 0) || 0);
    const onMeta = () => {
      setVDur(Number(el.duration || 0) || 0);
      setVMeta({ w: Number(el.videoWidth || 0) || 0, h: Number(el.videoHeight || 0) || 0 });
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
    };
  }, [current?.id]);

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
      let r = null;
      try {
        r = await apiCall(`/api/fast/items/${encodeURIComponent(String(current.id))}/viewers?limit=50`, { method: 'GET' });
      } catch (e) {
        // If this fails, keep a helpful signal instead of silently showing "Bakan yok".
        setViewersSchemaSql('');
        setViewers([]);
        return;
      }
      if (cancelled) return;
      if (r?.schemaMissing) {
        setViewersSchemaSql(String(r?.requiredSql || ''));
        setViewers([]);
        return;
      }
      // api returns { success, data: [...] }
      const list = r?.data?.data || r?.data || [];
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
        el.muted = !!muted;
        await el.play();
        setMediaBlocked(false);
      } catch {
        try {
          el.muted = true;
          await el.play();
          setMediaBlocked(false);
          setMuted(true);
        } catch {
          setMediaBlocked(true);
        }
      }
    };
    setTimeout(() => {
      if (!cancelled) tryPlay();
    }, 50);
    return () => {
      cancelled = true;
    };
  }, [current, idx, muted]);

  useEffect(() => {
    // Autoplay for audio when active (best-effort; may be blocked until user gesture)
    if (!current) return;
    if (current.content_type !== 'audio') return;
    const el = audioRef.current;
    if (!el) return;
    let cancelled = false;
    const tryPlay = async () => {
      try {
        el.muted = !!muted;
        await el.play();
        setMediaBlocked(false);
      } catch {
        setMediaBlocked(true);
      }
    };
    setTimeout(() => {
      if (!cancelled) tryPlay();
    }, 50);
    return () => {
      cancelled = true;
    };
  }, [current, idx, muted]);

  // Handle mute state changes for active media
  useEffect(() => {
    try {
      if (current?.content_type === 'video' && videoRef.current) {
        videoRef.current.muted = !!muted;
      }
      if (current?.content_type === 'audio' && audioRef.current) {
        audioRef.current.muted = !!muted;
      }
    } catch {
      // ignore
    }
  }, [muted, current?.content_type]);

  // Pause behavior should pause media too
  useEffect(() => {
    try {
      if (current?.content_type === 'video' && videoRef.current) {
        if (isPaused) videoRef.current.pause?.();
        else if (!mediaBlocked) videoRef.current.play?.().catch(() => null);
      }
      if (current?.content_type === 'audio' && audioRef.current) {
        if (isPaused) audioRef.current.pause?.();
        else if (!mediaBlocked) audioRef.current.play?.().catch(() => null);
      }
    } catch {
      // ignore
    }
  }, [current?.id, current?.content_type, isPaused, mediaBlocked]);

  const videoSafeDur = Number.isFinite(vDur) && vDur > 0 ? vDur : 0;
  const videoSafeT = Number.isFinite(vT) && vT >= 0 ? vT : 0;
  const videoPct = videoSafeDur > 0 ? Math.max(0, Math.min(1, videoSafeT / videoSafeDur)) : 0;
  const videoRatio = vMeta?.w > 0 && vMeta?.h > 0 ? vMeta.w / vMeta.h : 0;
  const isPortraitVideo = videoRatio > 0 && videoRatio < 0.95;
  const isLandscapeVideo = videoRatio > 1.05;

  const imgRatio = imgMeta?.w > 0 && imgMeta?.h > 0 ? imgMeta.w / imgMeta.h : 0;
  const isLandscapeImage = imgRatio > 1.05;

  const computeScale = useCallback(
    ({ mediaW, mediaH, mode }) => {
      const mw = Number(mediaW || 0) || 0;
      const mh = Number(mediaH || 0) || 0;
      const cw = Number(contentBox?.w || 0) || 0;
      const ch = Number(contentBox?.h || 0) || 0;
      if (!(mw > 0 && mh > 0 && cw > 0 && ch > 0)) return 1;
      const contain = Math.min(cw / mw, ch / mh);
      const cover = Math.max(cw / mw, ch / mh);
      const s = mode === 'contain' ? contain : cover;
      return Math.min(1, Math.max(0, s));
    },
    [contentBox?.h, contentBox?.w]
  );

  const imageScale = useMemo(() => computeScale({ mediaW: imgMeta?.w, mediaH: imgMeta?.h, mode: isLandscapeImage ? 'contain' : 'cover' }), [
    computeScale,
    imgMeta?.h,
    imgMeta?.w,
    isLandscapeImage,
  ]);
  const videoScale = useMemo(() => computeScale({ mediaW: vMeta?.w, mediaH: vMeta?.h, mode: isLandscapeVideo ? 'contain' : 'cover' }), [
    computeScale,
    isLandscapeVideo,
    vMeta?.h,
    vMeta?.w,
  ]);

  const seekVideoPct = (p) => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number(el.duration || 0) || 0;
    if (!(d > 0)) return;
    const next = Math.max(0, Math.min(1, Number(p) || 0));
    try {
      el.currentTime = next * d;
    } catch {
      // ignore
    }
  };

  const seekVideoBySec = (deltaSec) => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number(el.duration || 0) || 0;
    if (!(d > 0)) return;
    const cur = Number(el.currentTime || 0) || 0;
    const next = Math.max(0, Math.min(d, cur + (Number(deltaSec) || 0)));
    try {
      el.currentTime = next;
    } catch {
      // ignore
    }
  };

  // For video/audio, drive progress from media time
  useEffect(() => {
    if (!current) return;
    if (current.content_type !== 'video' && current.content_type !== 'audio') return;
    const el = current.content_type === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;
    const onTime = () => {
      try {
        const d = Number(el.duration || 0);
        const t = Number(el.currentTime || 0);
        if (d > 0) setProgress(Math.max(0, Math.min(1, t / d)));
      } catch {
        // ignore
      }
    };
    const onEnd = () => animateItem(1, () => goItem(1));
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, [animateItem, current?.id, current?.content_type, goItem]);

  // Keyboard: left/right, esc, space
  useEffect(() => {
    const onKey = (e) => {
      const k = String(e.key || '');
      if (k === 'Escape') return closeToList();
      if (k === 'ArrowLeft') return animateItem(-1, () => goItem(-1));
      if (k === 'ArrowRight') return animateItem(1, () => goItem(1));
      if (k === ' ' || k === 'Spacebar') {
        e.preventDefault();
        setIsPaused((v) => !v);
      }
      return undefined;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [animateItem, closeToList, goItem]);

  // Tap / press-hold to pause + swipe gestures (Instagram-like)
  const finishGesture = () => {
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    gestureRef.current.zoneDir = 0;
    gestureRef.current.pausedByHold = false;
  };

  const onPointerDownZone = (e, dir) => {
    // Ignore gesture start on interactive elements (header/like/etc.)
    try {
      if (e?.target?.closest?.('button,a,input,textarea,select')) return;
    } catch {
      // ignore
    }
    const pid = e?.pointerId;
    if (pid == null) return;

    gestureRef.current.active = true;
    gestureRef.current.pointerId = pid;
    gestureRef.current.zoneDir = dir;
    gestureRef.current.startX = e.clientX;
    gestureRef.current.startY = e.clientY;
    gestureRef.current.lastX = e.clientX;
    gestureRef.current.lastY = e.clientY;
    gestureRef.current.moved = false;
    gestureRef.current.pausedByHold = false;

    try {
      e.currentTarget?.setPointerCapture?.(pid);
    } catch {
      // ignore
    }

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      gestureRef.current.pausedByHold = true;
      setIsPaused(true);
    }, HOLD_TO_PAUSE_MS);
  };

  const onPointerMoveZone = (e) => {
    const g = gestureRef.current;
    if (!g.active) return;
    if (g.pointerId != null && e.pointerId !== g.pointerId) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    const dx = g.lastX - g.startX;
    const dy = g.lastY - g.startY;
    if (!g.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      g.moved = true;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (g.pausedByHold) {
        g.pausedByHold = false;
        setIsPaused(false);
      }
    }
  };

  const onPointerUpZone = (e) => {
    const g = gestureRef.current;
    if (!g.active) return;
    if (g.pointerId != null && e.pointerId !== g.pointerId) return;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const dx = (g.lastX || e.clientX) - g.startX;
    const dy = (g.lastY || e.clientY) - g.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Swipe down to close
    if (dy > SWIPE_DOWN_MIN_PX && absY > absX * 1.2) {
      setIsPaused(false);
      finishGesture();
      closeToList();
      return;
    }

    // Swipe left/right: navigate USERS (profiles)
    if (absX > SWIPE_MIN_PX && absX > absY * 1.2) {
      setIsPaused(false);
      finishGesture();
      if (dx < 0) goUser(1); // swipe left => next profile
      else goUser(-1); // swipe right => previous profile
      return;
    }

    // Tap (no meaningful move): left/right zones navigate items
    if (!g.moved && !g.pausedByHold && !isPaused) {
      const tapDir = g.zoneDir || 0;
      if (tapDir) animateItem(tapDir, () => goItem(tapDir));
    }

    // Hold-to-pause resumes on release
    if (g.pausedByHold) setIsPaused(false);
    finishGesture();
  };

  const onPointerCancelZone = (e) => {
    const g = gestureRef.current;
    if (!g.active) return;
    if (g.pointerId != null && e.pointerId !== g.pointerId) return;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (g.pausedByHold) setIsPaused(false);
    finishGesture();
  };

  const SideAvatar = ({ u, side }) => {
    if (!u) return null;
    const pos = side === 'left' ? 'left-6' : 'right-6';
    const name = String(u?.username || '').trim() || String(u?.full_name || '').trim() || 'Fast';
    const img = normalizeAvatarUrl(u?.avatar_url || u?.profile_image || '');
    const dir = side === 'left' ? -1 : 1;
    return (
      <button
        type="button"
        onClick={() => goUser(dir)}
        className={[
          'hidden md:flex absolute top-1/2 -translate-y-1/2',
          pos,
          'items-center gap-3',
          'px-3 py-2 rounded-full',
          'bg-black/35 hover:bg-black/55 border border-white/10 backdrop-blur-sm',
          'shadow-[0_20px_80px_rgba(0,0,0,0.55)]',
          'opacity-80 hover:opacity-100 transition-opacity',
        ].join(' ')}
        aria-label={side === 'left' ? 'Önceki Fast' : 'Sonraki Fast'}
        title={side === 'left' ? 'Önceki Fast' : 'Sonraki Fast'}
      >
        <div className="w-14 h-14 rounded-full border border-white/20 bg-black/25 overflow-hidden flex-shrink-0">
          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="text-sm font-black text-white/90 max-w-[140px] truncate">@{name}</div>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="fixed inset-0 bg-black text-white z-50">
      {/* Backdrop + desktop stage */}
      <div className="absolute inset-0 flex items-center justify-center px-3 md:px-8">
        {/* neighbor user previews (desktop) */}
        {prevUser ? <SideAvatar u={prevUser} side="left" /> : null}
        {nextUser ? <SideAvatar u={nextUser} side="right" /> : null}

        {/* main story card (portrait stage: match Polit detail aspect) */}
        <div
          className={[
            'relative',
            // Mobile: slightly smaller so top progress + bottom actions never get clipped.
            'h-[calc(100dvh-36px)] md:h-[84vh]',
            'aspect-[9/16]',
            'rounded-[28px] overflow-hidden',
            'bg-[#0b0b0b] border border-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.75)]',
          ].join(' ')}
        >
          {/* progress (dashed segments + count) */}
          <div className="absolute top-0 left-0 right-0 px-3 pt-[calc(env(safe-area-inset-top)+12px)] z-20">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-1 min-w-0">
              {Array.from({ length: progressCount }).map((_, i) => {
                const w = i < idx ? 1 : i === idx ? progress : 0;
                return (
                  <div
                    key={i}
                    className="h-[3px] flex-1 rounded-full overflow-hidden border border-sky-300/60"
                    style={{ borderStyle: 'dashed' }}
                    aria-label={`Fast ${i + 1}/${progressCount}`}
                  >
                    <div className="h-full bg-sky-400" style={{ width: `${Math.round(w * 100)}%` }} />
                  </div>
                );
              })}
              </div>
              <div className="text-[11px] font-black text-sky-200/90 flex-shrink-0">
                {idx + 1}/{progressCount}
              </div>
            </div>
          </div>

          {/* header */}
          <div className="absolute top-0 left-0 right-0 px-3 pt-[calc(env(safe-area-inset-top)+24px)] z-20 flex items-center justify-between gap-3">
            <button type="button" onClick={goToProfile} className="flex items-center gap-2 min-w-0 text-left" title="Profile git">
              <Avatar src={user?.avatar_url || user?.profile_image} size="34px" verified={isUiVerifiedUser(user)} ring="fast" />
              <div className="min-w-0">
                <div className="text-sm font-black truncate">{user?.full_name || 'Fast'}</div>
                <div className="text-xs text-white/70 truncate">@{user?.username || user?.id || '-'}</div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                className="w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 border border-white/10 flex items-center justify-center"
                aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
                title={muted ? 'Sesi aç' : 'Sesi kapat'}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={closeToList}
                className="w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 border border-white/10 flex items-center justify-center"
                aria-label="Kapat"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* desktop item navigation (PC only): keep arrows vertically centered */}
          <button
            type="button"
            onClick={() => animateItem(-1, () => goItem(-1))}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-300/30 items-center justify-center backdrop-blur-sm"
            aria-label="Önceki Fast"
            title="Önceki Fast"
          >
            <ChevronLeft className="w-7 h-7 text-sky-200" />
          </button>
          <button
            type="button"
            onClick={() => animateItem(1, () => goItem(1))}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-300/30 items-center justify-center backdrop-blur-sm"
            aria-label="Sonraki Fast"
            title="Sonraki Fast"
          >
            <ChevronRight className="w-7 h-7 text-sky-200" />
          </button>

          {/* tap zones + hold-to-pause */}
          <div
            className="absolute inset-0 z-10"
            style={{
              touchAction: 'none',
              bottom: '0px',
            }}
          >
            <div
              className={[
                'absolute inset-0 grid',
                current?.content_type === 'video' || current?.content_type === 'audio' ? 'grid-cols-3' : 'grid-cols-2',
              ].join(' ')}
            >
              <div
                role="button"
                tabIndex={-1}
                aria-label="Önceki Fast"
                className="w-full h-full"
                onPointerDown={(e) => onPointerDownZone(e, -1)}
                onPointerMove={onPointerMoveZone}
                onPointerUp={onPointerUpZone}
                onPointerCancel={onPointerCancelZone}
                onTouchStart={(e) => {
                  const t = e.touches?.[0];
                  if (!t) return;
                  // emulate pointer down
                  gestureRef.current.active = true;
                  gestureRef.current.pointerId = 'touch';
                  gestureRef.current.zoneDir = -1;
                  gestureRef.current.startX = t.clientX;
                  gestureRef.current.startY = t.clientY;
                  gestureRef.current.lastX = t.clientX;
                  gestureRef.current.lastY = t.clientY;
                  gestureRef.current.moved = false;
                  gestureRef.current.pausedByHold = false;
                  if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = setTimeout(() => {
                    gestureRef.current.pausedByHold = true;
                    setIsPaused(true);
                  }, HOLD_TO_PAUSE_MS);
                }}
                onTouchMove={(e) => {
                  const t = e.touches?.[0];
                  if (!t) return;
                  const g = gestureRef.current;
                  if (!g.active || g.pointerId !== 'touch') return;
                  g.lastX = t.clientX;
                  g.lastY = t.clientY;
                  const dx = g.lastX - g.startX;
                  const dy = g.lastY - g.startY;
                  if (!g.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                    g.moved = true;
                    if (holdTimerRef.current) {
                      clearTimeout(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
                    if (g.pausedByHold) {
                      g.pausedByHold = false;
                      setIsPaused(false);
                    }
                  }
                }}
                onTouchEnd={(e) => {
                  const g = gestureRef.current;
                  if (!g.active || g.pointerId !== 'touch') return;
                  if (holdTimerRef.current) {
                    clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                  const t = e.changedTouches?.[0];
                  const endX = t?.clientX ?? g.lastX;
                  const endY = t?.clientY ?? g.lastY;
                  const dx = endX - g.startX;
                  const dy = endY - g.startY;
                  const absX = Math.abs(dx);
                  const absY = Math.abs(dy);
                  if (dy > SWIPE_DOWN_MIN_PX && absY > absX * 1.2) {
                    setIsPaused(false);
                    finishGesture();
                    closeToList();
                    return;
                  }
                  if (absX > SWIPE_MIN_PX && absX > absY * 1.2) {
                    setIsPaused(false);
                    finishGesture();
                    if (dx < 0) goUser(1);
                    else goUser(-1);
                    return;
                  }
                  if (!g.moved && !g.pausedByHold && !isPaused) animateItem(-1, () => goItem(-1));
                  if (g.pausedByHold) setIsPaused(false);
                  finishGesture();
                }}
                onTouchCancel={() => {
                  const g = gestureRef.current;
                  if (!g.active || g.pointerId !== 'touch') return;
                  if (holdTimerRef.current) {
                    clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                  if (g.pausedByHold) setIsPaused(false);
                  finishGesture();
                }}
              />
              {current?.content_type === 'video' || current?.content_type === 'audio' ? (
                <div
                  role="button"
                  tabIndex={-1}
                  aria-label={isPaused ? 'Devam et' : 'Durdur'}
                  className="w-full h-full"
                  onPointerDown={(e) => onPointerDownZone(e, 0)}
                  onPointerMove={onPointerMoveZone}
                  onPointerUp={(e) => {
                    // Tap center toggles play/pause for video/audio
                    const g = gestureRef.current;
                    if (holdTimerRef.current) {
                      clearTimeout(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
                    const dx = (g.lastX || e.clientX) - g.startX;
                    const dy = (g.lastY || e.clientY) - g.startY;
                    const absX = Math.abs(dx);
                    const absY = Math.abs(dy);
                    // swipe behaviors are handled by the left/right zones; center only toggles on tap
                    if (absX <= SWIPE_MIN_PX && absY <= SWIPE_MIN_PX && !g.moved) {
                      setIsPaused((v) => !v);
                    }
                    if (g.pausedByHold) setIsPaused(false);
                    finishGesture();
                  }}
                  onPointerCancel={onPointerCancelZone}
                />
              ) : null}
              <div
                role="button"
                tabIndex={-1}
                aria-label="Sonraki Fast"
                className="w-full h-full"
                onPointerDown={(e) => onPointerDownZone(e, 1)}
                onPointerMove={onPointerMoveZone}
                onPointerUp={onPointerUpZone}
                onPointerCancel={onPointerCancelZone}
                onTouchStart={(e) => {
                  const t = e.touches?.[0];
                  if (!t) return;
                  gestureRef.current.active = true;
                  gestureRef.current.pointerId = 'touch';
                  gestureRef.current.zoneDir = 1;
                  gestureRef.current.startX = t.clientX;
                  gestureRef.current.startY = t.clientY;
                  gestureRef.current.lastX = t.clientX;
                  gestureRef.current.lastY = t.clientY;
                  gestureRef.current.moved = false;
                  gestureRef.current.pausedByHold = false;
                  if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = setTimeout(() => {
                    gestureRef.current.pausedByHold = true;
                    setIsPaused(true);
                  }, HOLD_TO_PAUSE_MS);
                }}
                onTouchMove={(e) => {
                  const t = e.touches?.[0];
                  if (!t) return;
                  const g = gestureRef.current;
                  if (!g.active || g.pointerId !== 'touch') return;
                  g.lastX = t.clientX;
                  g.lastY = t.clientY;
                  const dx = g.lastX - g.startX;
                  const dy = g.lastY - g.startY;
                  if (!g.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                    g.moved = true;
                    if (holdTimerRef.current) {
                      clearTimeout(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
                    if (g.pausedByHold) {
                      g.pausedByHold = false;
                      setIsPaused(false);
                    }
                  }
                }}
                onTouchEnd={(e) => {
                  const g = gestureRef.current;
                  if (!g.active || g.pointerId !== 'touch') return;
                  if (holdTimerRef.current) {
                    clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                  const t = e.changedTouches?.[0];
                  const endX = t?.clientX ?? g.lastX;
                  const endY = t?.clientY ?? g.lastY;
                  const dx = endX - g.startX;
                  const dy = endY - g.startY;
                  const absX = Math.abs(dx);
                  const absY = Math.abs(dy);
                  if (dy > SWIPE_DOWN_MIN_PX && absY > absX * 1.2) {
                    setIsPaused(false);
                    finishGesture();
                    closeToList();
                    return;
                  }
                  if (absX > SWIPE_MIN_PX && absX > absY * 1.2) {
                    setIsPaused(false);
                    finishGesture();
                    if (dx < 0) goUser(1);
                    else goUser(-1);
                    return;
                  }
                  if (!g.moved && !g.pausedByHold && !isPaused) animateItem(1, () => goItem(1));
                  if (g.pausedByHold) setIsPaused(false);
                  finishGesture();
                }}
                onTouchCancel={() => {
                  const g = gestureRef.current;
                  if (!g.active || g.pointerId !== 'touch') return;
                  if (holdTimerRef.current) {
                    clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                  if (g.pausedByHold) setIsPaused(false);
                  finishGesture();
                }}
              />
            </div>
          </div>

          {/* content */}
          <div
            ref={stageRef}
            className="absolute inset-0 z-0"
            style={{
              transform: `translateX(${slide.x}px)`,
              opacity: slide.o,
              transition: isTransitioning ? 'transform 160ms ease, opacity 160ms ease' : undefined,
              willChange: isTransitioning ? 'transform, opacity' : undefined,
            }}
          >
            {!current ? (
              <div className="h-full w-full flex items-center justify-center text-white/70 text-sm">İçerik bulunamadı.</div>
            ) : current.content_type === 'image' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <img
                  src={itemSrc}
                  alt=""
                  draggable={false}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            ) : current.content_type === 'video' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {/* 
                  Single video element with videoRef - no duplicates
                  Uses custom controls via gesture zones to avoid native control overlay issues on mobile
                */}
                <video
                  ref={videoRef}
                  src={itemSrc}
                  playsInline
                  muted={muted}
                  autoPlay
                  controls={false}
                  preload="auto"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            ) : current.content_type === 'audio' ? (
              <div className="h-full w-full flex items-center justify-center p-6">
                <audio ref={audioRef} src={itemSrc} autoPlay preload="auto" />
                <div
                  className="w-full max-w-[360px] rounded-[22px] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.45)] overflow-hidden"
                  style={{
                    backgroundColor: '#0b1220',
                    backgroundImage:
                      'radial-gradient(circle at 20% 20%, rgba(29,78,216,0.35), transparent 55%),' +
                      'radial-gradient(circle at 80% 30%, rgba(56,189,248,0.22), transparent 55%),' +
                      'repeating-linear-gradient(to bottom, rgba(255,255,255,0) 0, rgba(255,255,255,0) 26px, rgba(59,130,246,0.22) 27px, rgba(59,130,246,0.22) 28px)',
                  }}
                >
                  <div className="px-6 py-7 flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full bg-[#1D4ED8] shadow-[0_20px_70px_rgba(29,78,216,0.55)] flex items-center justify-center">
                      <div className="w-10 h-16 rounded-2xl bg-white/95" />
                    </div>
                    <div className="mt-4 text-sm font-black text-white/90">Sesli Fast</div>
                    <div className="mt-2 text-xs text-white/80 max-w-[260px] text-center">
                      {String(current?.content_text || current?.content || '').trim()
                        ? 'Not: ' + String(current.content_text || current.content).slice(0, 110)
                        : 'Dinliyorsun…'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // text (notebook style)
              <div className="h-full w-full flex items-center justify-center p-6">
                <div
                  className="w-full max-w-[360px] rounded-[22px] border border-black/10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] overflow-hidden"
                  style={{
                    backgroundColor: '#fff7dc',
                    backgroundImage:
                      'linear-gradient(to right, rgba(220,38,38,0.25) 0, rgba(220,38,38,0.25) 2px, transparent 2px),' +
                      'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 26px, rgba(59,130,246,0.22) 27px, rgba(59,130,246,0.22) 28px)',
                  }}
                >
                  <div className="px-6 py-7">
                    <div className="text-[22px] leading-snug font-black text-gray-900 whitespace-pre-wrap text-center">
                      {String(current?.content_text || current?.content || '').trim() || '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Note: autoplay may be blocked on mobile. We intentionally avoid any dark overlay or play controls. */}
          </div>

          {/* bottom right actions: delete (owner) + like */}
          {current?.id ? (
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 z-30 flex items-end gap-3">
              {canDelete ? (
                <button
                  type="button"
                  onClick={deleteCurrent}
                  className="w-14 h-14 rounded-full bg-black/25 backdrop-blur-sm border border-white/15 flex items-center justify-center"
                  aria-label="Sil"
                  title="Sil"
                >
                  <Trash2 className="w-6 h-6 text-white/90" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleLike}
                className="relative w-14 h-14 rounded-full bg-black/25 backdrop-blur-sm border border-white/15 flex flex-col items-center justify-center"
                aria-label={currentLiked ? 'Beğeniyi kaldır' : 'Beğen'}
                title={currentLiked ? 'Beğeniyi kaldır' : 'Beğen'}
              >
                <LikeBurstHeart
                  trigger={Number(likeBurstTickById?.[String(current?.id || '')] || 0)}
                  sizeClass="w-10 h-10"
                />
                <Heart
                  className="w-7 h-7"
                  style={{
                    color: '#ffffff',
                    fill: currentLiked ? '#E11D48' : 'transparent',
                    opacity: currentLiked ? 1 : 0.92,
                  }}
                />
                <div className="mt-0.5 text-[10px] font-black text-white/90 leading-none">{currentLikeCount}</div>
              </button>
            </div>
          ) : null}

          {/* viewers (owner only) - Eye icon with count */}
          {isOwner && current?.id ? (
            <button
              type="button"
              onClick={() => setViewersOpen(true)}
              className="absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] left-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/25 border border-white/15 backdrop-blur-sm"
              aria-label="Bakanlar"
              title="Bakanlar"
            >
              <Eye className="w-4 h-4 text-white/90" />
              <span className="text-xs font-black text-white/90">{Array.isArray(viewers) ? viewers.length : 0}</span>
            </button>
          ) : null}
        </div>
      </div>

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
                    navigate(getProfilePath(u || {}));
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

