import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Flag, Pencil, X, Check, Eye, TrendingUp, Users, Play, Pause, Music, Volume2, VolumeX, Rewind, FastForward } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LikeBurstHeart } from '../components/common/LikeBurstHeart';
import { formatNumber, formatPolitScore, formatTimeAgo, formatDate, formatDuration, getSourceDomain } from '../utils/formatters';
import { posts as postsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { getProfilePath } from '../utils/paths';
import { FollowButton } from '../components/common/FollowButton';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';
import { usePublicSite } from '../contexts/PublicSiteContext';

/**
 * SmartVideo - Custom video player component with unified controls
 * 
 * This component provides a consistent video playback experience with:
 * - Custom control bar (avoiding native controls that create dark overlays on mobile)
 * - Autoplay with mobile-friendly fallback (muted if needed)
 * - Seek controls (±10s buttons, scrubber)
 * - Play/pause, mute/unmute
 * - Time display showing current/total duration
 * 
 * Note: We use a single control bar element to avoid redundancy and ensure
 * clean, predictable UI across all devices.
 */
const SmartVideo = ({ src, autoPlay = false }) => {
  const videoRef = useRef(null);
  const url = String(src || '').trim();
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [meta, setMeta] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!url) return;
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onTime = () => setT(Number(el.currentTime || 0) || 0);
    const onMeta = () => {
      setDur(Number(el.duration || 0) || 0);
      setMeta({ w: Number(el.videoWidth || 0) || 0, h: Number(el.videoHeight || 0) || 0 });
    };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
    };
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const el = videoRef.current;
    if (!el) return;
    try {
      el.muted = !!muted;
    } catch {
      // ignore
    }
  }, [muted]);

  useEffect(() => {
    if (!url) return;
    if (!autoPlay) return;
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;
    const tryPlay = async () => {
      try {
        el.muted = !!muted;
        await el.play();
        setBlocked(false);
      } catch {
        try {
          el.muted = true; // mobile autoplay fallback
          await el.play();
          setBlocked(false);
          setMuted(true);
        } catch {
          setBlocked(true);
        }
      }
    };
    // small delay helps on some mobile browsers
    setTimeout(() => {
      if (!cancelled) tryPlay();
    }, 50);
    return () => {
      cancelled = true;
    };
  }, [autoPlay, muted, url]);

  const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 0;
  const safeT = Number.isFinite(t) && t >= 0 ? t : 0;
  const pct = safeDur > 0 ? Math.max(0, Math.min(1, safeT / safeDur)) : 0;
  const ratio = meta?.w > 0 && meta?.h > 0 ? meta.w / meta.h : 0;
  const isPortrait = ratio > 0 && ratio < 0.95;

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
        setBlocked(false);
      } else {
        el.pause();
      }
    } catch {
      setBlocked(true);
    }
  };

  const seekToPct = (nextPct) => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number(el.duration || 0) || 0;
    if (!(d > 0)) return;
    const p = Math.max(0, Math.min(1, Number(nextPct) || 0));
    try {
      el.currentTime = p * d;
    } catch {
      // ignore
    }
  };

  const seekBySec = (deltaSec) => {
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

  if (!url) return null;

  return (
    <div className="w-full">
      <video
        ref={videoRef}
        src={url}
        playsInline
        // IMPORTANT: native controls create the "dark overlay + controls on top"
        // effect on many mobile browsers. We use our own control bar below.
        controls={false}
        autoPlay={autoPlay}
        preload="metadata"
        className={['bg-black rounded-lg', isPortrait ? 'w-full object-cover' : 'max-w-full object-contain'].join(' ')}
        style={isPortrait ? { height: 'auto', minHeight: '60vh', maxHeight: '80vh' } : { maxHeight: '80vh', height: 'auto' }}
        onClick={togglePlay}
      />

      <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => seekBySec(-10)}
            className="w-11 h-11 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-900"
            aria-label="10 saniye geri"
            title="10 saniye geri"
          >
            <Rewind className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center"
            aria-label={isPlaying ? 'Durdur' : blocked ? 'Oynat (izin gerekli olabilir)' : 'Oynat'}
            title={isPlaying ? 'Durdur' : 'Oynat'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => seekBySec(10)}
            className="w-11 h-11 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-900"
            aria-label="10 saniye ileri"
            title="10 saniye ileri"
          >
            <FastForward className="w-5 h-5" />
          </button>

          <div className="flex-1 px-2">
            <input
              type="range"
              min="0"
              max="1000"
              value={Math.round(pct * 1000)}
              onChange={(e) => seekToPct(Number(e.target.value) / 1000)}
              className="w-full"
              aria-label="Zaman çizelgesi"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-primary-blue tabular-nums whitespace-nowrap">
              {formatDuration(safeT)} / {safeDur > 0 ? formatDuration(safeDur) : '0:00'}
            </div>

            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
              aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
              title={muted ? 'Sesi aç' : 'Sesi kapat'}
            >
              {muted ? <VolumeX className="w-5 h-5 text-gray-700" /> : <Volume2 className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SmartAudio - Custom audio player component with elegant controls
 * 
 * Provides a visually appealing audio player with:
 * - Play/pause button with icon
 * - Progress bar with scrubber (integrated, no redundant controls)
 * - Time display (current/total)
 * - Mute/unmute control
 * - Gradient design matching the site aesthetic
 * 
 * The control bar is designed as a single, unified element to ensure
 * clean UI and avoid redundant or conflicting controls.
 */
const SmartAudio = ({ src }) => {
  const audioRef = useRef(null);
  const url = String(src || '').trim();
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onTime = () => setT(Number(el.currentTime || 0) || 0);
    const onMeta = () => setDur(Number(el.duration || 0) || 0);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
    };
  }, [url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.muted = !!muted;
    } catch {
      // ignore
    }
  }, [muted]);

  if (!url) return null;

  const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 0;
  const safeT = Number.isFinite(t) && t >= 0 ? t : 0;
  const pct = safeDur > 0 ? Math.max(0, Math.min(1, safeT / safeDur)) : 0;

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) await el.play();
      else el.pause();
    } catch {
      // ignore
    }
  };

  const seekToPct = (nextPct) => {
    const el = audioRef.current;
    if (!el) return;
    const d = Number(el.duration || 0);
    if (!Number.isFinite(d) || d <= 0) return;
    try {
      el.currentTime = Math.max(0, Math.min(d, d * nextPct));
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-br from-slate-900 via-slate-900 to-primary-blue/70">
      <div className="relative p-6 sm:p-8">
        {/* big icon backdrop */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center flex-shrink-0"
            title={isPlaying ? 'Duraklat' : 'Oynat'}
            aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isPlaying ? <Pause className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white ml-1" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Music className="w-5 h-5 text-white/90 flex-shrink-0" />
                <div className="text-sm sm:text-base font-black text-white truncate">Sesli Polit</div>
              </div>
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex-shrink-0"
                title={muted ? 'Sesi aç' : 'Sesi kapat'}
                aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-3">
              <div className="relative h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-white/70" style={{ width: `${Math.round(pct * 100)}%` }} />
                {/* Invisible scrubber overlay (keeps UI as a single bar) */}
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(pct * 1000)}
                  onChange={(e) => seekToPct(Number(e.target.value || 0) / 1000)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Ses ilerletme"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-white/80 font-semibold tabular-nums">
                <span>{formatDuration(safeT)}</span>
                <span>{safeDur ? formatDuration(safeDur) : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden native element for actual playback */}
        <audio ref={audioRef} src={url} preload="metadata" />
      </div>
    </div>
  );
};

export const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { allowComments } = usePublicSite();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentNotice, setCommentNotice] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentEditSubmittingId, setCommentEditSubmittingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportDone, setReportDone] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [likeBurstTick, setLikeBurstTick] = useState(0);

  const [reportingPost, setReportingPost] = useState(false);
  const [postReportReason, setPostReportReason] = useState('spam');
  const [postReportDetails, setPostReportDetails] = useState('');
  const [postReportDone, setPostReportDone] = useState(false);

  const commentsRef = useRef(null);
  const commentBoxRef = useRef(null);

  const [showEditPost, setShowEditPost] = useState(false);
  const [editPostText, setEditPostText] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [showDeletePost, setShowDeletePost] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [expandedScoreCategory, setExpandedScoreCategory] = useState(null);

  const cacheKey = useMemo(() => `post:${String(postId || '').trim() || '-'}`, [postId]);
  const initialCache = useMemo(() => readSessionCache(cacheKey, { maxAgeMs: 10 * 60_000 }), [cacheKey]);

  // Hydrate instantly from session cache (for back/forward instant UX).
  useEffect(() => {
    if (!initialCache) return;
    try {
      if (initialCache.post) setPost(initialCache.post);
      if (Array.isArray(initialCache.comments)) setComments(initialCache.comments);
      if (initialCache.activeImageIdx !== undefined) setActiveImageIdx(Number(initialCache.activeImageIdx || 0) || 0);
      setLoading(false);
      setRefreshing(true);
      const q = new URLSearchParams(location.search || '');
      if (navType === 'POP' && q.get('comment') !== '1' && typeof initialCache.scrollY === 'number') {
        setTimeout(() => {
          try {
            window.scrollTo(0, Math.max(0, Number(initialCache.scrollY) || 0));
          } catch {
            // ignore
          }
        }, 0);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
  
  useEffect(() => {
    const load = async () => {
      const hasCached = !!initialCache;
      if (hasCached) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const detail = await postsApi.getById(postId);
        const dbPost = detail?.data ? detail.data : detail;
        setPost(dbPost);

        const c = await postsApi.getComments(postId).catch(() => null);
        const rows = c?.data?.data || c?.data || c || [];
        setComments(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Paylaşım yüklenemedi.');
        setPost(null);
        setComments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    load();
  }, [postId, initialCache]);

  // Save to session cache (so returning to this post is instant).
  useEffect(() => {
    const save = () => {
      writeSessionCache(cacheKey, {
        post,
        comments,
        activeImageIdx,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      });
    };
    return () => save();
  }, [cacheKey, post, comments, activeImageIdx]);

  // Detail pages should start at top, except when opened via the "comment" shortcut.
  useEffect(() => {
    const q = new URLSearchParams(location.search || '');
    if (q.get('comment') === '1') return;
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  }, [postId, location.search]);

  // Reset image selection when switching posts
  useEffect(() => {
    setActiveImageIdx(0);
  }, [postId]);

  const isReady = !loading && !error && !!post;
  const safePost = post || {};
  const uiPost = {
    post_id: safePost.post_id ?? safePost.id ?? null,
    user_id: safePost.user_id ?? null,
    content_type:
      safePost.content_type || (Array.isArray(safePost.media_urls) && safePost.media_urls.length > 0 ? 'image' : 'text'),
    content_text: safePost.content_text ?? safePost.content ?? '',
    media_url: safePost.media_url ?? safePost.media_urls ?? [],
    thumbnail_url: safePost.thumbnail_url,
    media_duration: safePost.media_duration,
    agenda_tag: safePost.agenda_tag,
    polit_score: safePost.polit_score,
    view_count: safePost.view_count,
    like_count: safePost.like_count,
    comment_count: safePost.comment_count,
    share_count: safePost.share_count,
    created_at: safePost.created_at,
    source_url: safePost.source_url,
    user: safePost.user || null,
  };

  const profilePath = useMemo(() => {
    if (uiPost.user) return getProfilePath(uiPost.user);
    if (uiPost.user_id) return `/profile/${uiPost.user_id}`;
    return '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiPost.user_id, uiPost.user]);

  const agendaSlug = useMemo(() => {
    if (!uiPost.agenda_tag) return '';
    return String(uiPost.agenda_tag)
      .toLowerCase()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, [uiPost.agenda_tag]);

  // If user came from a "comment" shortcut, jump to comment box after load.
  useEffect(() => {
    if (!isReady) return;
    const q = new URLSearchParams(location.search || '');
    if (q.get('comment') !== '1') return;
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => commentBoxRef.current?.focus?.(), 250);
  }, [isReady, location.search]);

  const isOwnPost = isAuthenticated && currentUser?.id && String(uiPost.user_id) === String(currentUser.id);

  // IMPORTANT: don't use hooks after early returns (React error #310).
  const imageList =
    uiPost.content_type !== 'image'
      ? []
      : (Array.isArray(uiPost.media_url) ? uiPost.media_url : uiPost.media_url ? [uiPost.media_url] : [])
          .map((x) => String(x || '').trim())
          .filter(Boolean);
  const safeActiveImageIdx = Math.max(0, Math.min(activeImageIdx, Math.max(0, imageList.length - 1)));
  const activeImageSrc = imageList[safeActiveImageIdx] || imageList[0] || '';

  const queryFlags = useMemo(() => {
    const q = new URLSearchParams(location.search || '');
    return {
      openEdit: q.get('edit') === '1',
      openDelete: q.get('delete') === '1',
    };
  }, [location.search]);

  const scoreBreakdown = useMemo(() => {
    const viewCount = Number(uiPost.view_count || 0);
    const likeCount = Number(uiPost.like_count || 0);
    const commentCount = Number(uiPost.comment_count || 0);
    const shareCount = Number(uiPost.share_count || 0);
    const storedScore = Number(uiPost.polit_score || 0);

    // Şeffaflık: Bu dağılım kalem kalem gösterim içindir (yaklaşık).
    // Gerçek skor backend tarafında hesaplanıp `polit_score` olarak saklanır.
    const breakdown = {
      views: {
        title: 'Görüntüleme Puanları',
        icon: <Eye className="w-5 h-5" />,
        total: Math.floor(viewCount * 0.1),
        details: [
          { label: 'Üye Olmayanların Görüntülemesi', count: Math.floor(viewCount * 0.4), unitPoint: '0,05 P.', points: Math.floor(viewCount * 0.4 * 0.05) },
          { label: 'Parti Üyelerinin Görüntülemesi', count: Math.floor(viewCount * 0.3), unitPoint: '0,1 P.', points: Math.floor(viewCount * 0.3 * 0.1) },
          { label: 'Rakip Parti Üyelerinin Görüntülemesi', count: Math.floor(viewCount * 0.2), unitPoint: '0,15 P.', points: Math.floor(viewCount * 0.2 * 0.15) },
          { label: 'Siyasetçilerin Görüntülemesi', count: Math.floor(viewCount * 0.1), unitPoint: '0,5 P.', points: Math.floor(viewCount * 0.1 * 0.5) },
        ],
      },
      likes: {
        title: 'Beğeni Puanları',
        icon: <Heart className="w-5 h-5" />,
        total: Math.floor(likeCount * 2),
        details: [
          { label: 'Üye Olmayanların Beğenisi', count: Math.floor(likeCount * 0.3), unitPoint: '1 P.', points: Math.floor(likeCount * 0.3 * 1) },
          { label: 'Parti Üyelerinin Beğenisi', count: Math.floor(likeCount * 0.35), unitPoint: '2 P.', points: Math.floor(likeCount * 0.35 * 2) },
          { label: 'Rakip Parti Üyelerinin Beğenisi', count: Math.floor(likeCount * 0.25), unitPoint: '3 P.', points: Math.floor(likeCount * 0.25 * 3) },
          { label: 'Siyasetçilerin Beğenisi', count: Math.floor(likeCount * 0.1), unitPoint: '10 P.', points: Math.floor(likeCount * 0.1 * 10) },
        ],
      },
      comments: {
        title: 'Yorum Puanları',
        icon: <MessageCircle className="w-5 h-5" />,
        total: Math.floor(commentCount * 5),
        details: [
          { label: 'Üye Olmayanların Yorumu', count: Math.floor(commentCount * 0.2), unitPoint: '2 P.', points: Math.floor(commentCount * 0.2 * 2) },
          { label: 'Parti Üyelerinin Yorumu', count: Math.floor(commentCount * 0.4), unitPoint: '5 P.', points: Math.floor(commentCount * 0.4 * 5) },
          { label: 'Rakip Parti Üyelerinin Yorumu', count: Math.floor(commentCount * 0.3), unitPoint: '8 P.', points: Math.floor(commentCount * 0.3 * 8) },
          { label: 'Siyasetçilerin Yorumu', count: Math.floor(commentCount * 0.1), unitPoint: '20 P.', points: Math.floor(commentCount * 0.1 * 20) },
        ],
      },
      shares: {
        title: 'Paylaşım Puanları',
        icon: <Share2 className="w-5 h-5" />,
        total: Math.floor(shareCount * 50),
        details: [
          { label: 'Dış Paylaşımlar (Sosyal Medya)', count: Math.floor(shareCount * 0.7), unitPoint: '50 P.', points: Math.floor(shareCount * 0.7 * 50) },
          { label: 'Platform İçi Paylaşımlar', count: Math.floor(shareCount * 0.3), unitPoint: '25 P.', points: Math.floor(shareCount * 0.3 * 25) },
        ],
      },
    };

    const totalCalculated = Object.values(breakdown).reduce((sum, cat) => sum + (Number(cat.total) || 0), 0);
    const engagementBonus = Math.floor(totalCalculated * 0.1);
    breakdown.engagement = {
      title: 'Etkileşim Bonusu',
      icon: <TrendingUp className="w-5 h-5" />,
      total: engagementBonus,
      details: [
        { label: 'Gündem Oluşturma Bonusu', count: 1, unitPoint: `${Math.floor(engagementBonus * 0.5)} P.`, points: Math.floor(engagementBonus * 0.5) },
        { label: 'Hızlı Etkileşim Bonusu', count: 1, unitPoint: `${Math.floor(engagementBonus * 0.3)} P.`, points: Math.floor(engagementBonus * 0.3) },
        { label: 'Çeşitli Kitleden Etkileşim', count: 1, unitPoint: `${Math.floor(engagementBonus * 0.2)} P.`, points: Math.floor(engagementBonus * 0.2) },
      ],
    };

    const totalWithBonus = totalCalculated + engagementBonus;

    return {
      breakdown,
      totalCalculated: totalWithBonus,
      storedScore,
    };
  }, [uiPost.view_count, uiPost.like_count, uiPost.comment_count, uiPost.share_count, uiPost.polit_score]);

  // Allow deep-linking to edit/delete for the owner (e.g. from Profile).
  useEffect(() => {
    if (!isReady || !isOwnPost) return;
    if (queryFlags.openEdit && !showEditPost) {
      setEditPostText(uiPost.content_text || '');
      setShowEditPost(true);
    }
    if (queryFlags.openDelete && !showDeletePost) {
      setShowDeletePost(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isOwnPost, queryFlags.openEdit, queryFlags.openDelete]);

  const handleToggleLike = async () => {
    if (!uiPost.post_id) return;
    if (!isAuthenticated) {
      navigate('/login-new');
      return;
    }
    setLikeBurstTick((t) => t + 1);
    try {
      const r = await postsApi.like(uiPost.post_id);
      if (r?.success) {
        // Refresh counts
        const detail = await postsApi.getById(uiPost.post_id);
        setPost(detail?.data ? detail.data : detail);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async () => {
    if (!uiPost.post_id) return;
    if (!isAuthenticated) {
      navigate('/login-new');
      return;
    }
    if (!allowComments) {
      setCommentError('Yorumlar şu anda kapalı.');
      return;
    }
    if (commentSubmitting) return;
    const text = newComment.trim();
    if (!text) return;
    if (text.length > 300) {
      setCommentError('Yorum en fazla 300 karakter olabilir.');
      return;
    }
    try {
      setCommentError('');
      setCommentNotice('');
      setCommentSubmitting(true);
      const r = await postsApi.addComment(uiPost.post_id, text);
      setNewComment('');
      // Fast UI feedback: update list immediately by reloading once
      const c = await postsApi.getComments(uiPost.post_id).catch(() => null);
      const rows = c?.data?.data || c?.data || c || [];
      setComments(Array.isArray(rows) ? rows : []);
      if (r?.message) setCommentNotice(String(r.message));
    } catch (e) {
      console.error(e);
      setCommentError(e?.message || 'Yorum gönderilemedi.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const nowMs = Date.now();
  const myCommentCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return (comments || []).filter((c) => String(c.user_id || c.user?.id) === String(currentUser.id)).length;
  }, [comments, currentUser?.id]);

  const canEditComment = (comment) => {
    if (!currentUser?.id) return false;
    if (String(comment.user_id || comment.user?.id) !== String(currentUser.id)) return false;
    const created = new Date(comment.created_at || 0).getTime();
    if (!Number.isFinite(created)) return false;
    return nowMs - created <= 10 * 60 * 1000;
  };

  const isPendingComment = (comment) => !!comment?.is_deleted;

  const postUrl = (() => {
    try {
      return `${window.location.origin}/post/${uiPost.post_id}`;
    } catch {
      return `/post/${uiPost.post_id}`;
    }
  })();

  const copyToClipboard = async (text) => {
    const t = String(text || '');
    if (!t) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch {
      // fallback below
    }
    try {
      const el = document.createElement('textarea');
      el.value = t;
      el.setAttribute('readonly', 'true');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        {loading ? (
          <div className="text-center">Yükleniyor...</div>
        ) : error || !post ? (
          <div className="text-center text-gray-700">{error || 'Paylaşım bulunamadı.'}</div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Kullanıcı Bilgisi */}
            <div className="card mb-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (profilePath) navigate(profilePath);
                  }}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  title="Profili görüntüle"
                >
                  <Avatar
                    src={uiPost.user?.avatar_url || uiPost.user?.profile_image}
                    size="60px"
                    verified={isUiVerifiedUser(uiPost.user)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg break-words">{uiPost.user?.full_name}</h3>
                      {uiPost.user?.party_id && uiPost.user?.party?.short_name && (
                        <Badge variant="secondary" size="small">
                          {uiPost.user.party.short_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 break-words">{formatDate(uiPost.created_at)}</p>
                  </div>
                </button>
                {uiPost.user_id ? (
                  <FollowButton targetUserId={uiPost.user_id} size="md" />
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (profilePath) navigate(profilePath);
                    }}
                  >
                    Takip Et
                  </Button>
                )}
              </div>

              {/* İçerik */}
              <div className="mb-4">
                {uiPost.content_type === 'text' && (
                  <div className="border-t border-gray-300 pt-6">
                    <p className="text-gray-900 text-2xl leading-relaxed font-medium whitespace-pre-wrap">{uiPost.content_text}</p>
                    <div className="h-[30px]" />
                    <div className="border-t border-gray-300" />
                  </div>
                )}
                {uiPost.content_type === 'image' && (
                  <div>
                    {activeImageSrc ? (
                      <>
                        <img 
                          src={activeImageSrc} 
                          alt="" 
                          className="max-w-full rounded-lg mb-3" 
                          style={{ height: 'auto' }}
                        />
                        {imageList.length > 1 && (
                          <div className="mb-3 overflow-x-auto">
                            <div className="flex gap-2 w-max">
                              {imageList.map((src, idx) => (
                                <button
                                  key={`${src}_${idx}`}
                                  type="button"
                                  onClick={() => setActiveImageIdx(idx)}
                                  className={`rounded-lg border ${
                                    idx === safeActiveImageIdx ? 'border-primary-blue ring-2 ring-primary-blue/30' : 'border-gray-200'
                                  } flex-shrink-0`}
                                  style={{ width: 88, height: 88 }}
                                  title={`Resim ${idx + 1}`}
                                >
                                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500 text-sm mb-3">Resim bulunamadı.</div>
                    )}
                    {uiPost.content_text && <p className="text-gray-800">{uiPost.content_text}</p>}
                  </div>
                )}
                {uiPost.content_type === 'video' && (
                  <div>
                    <SmartVideo src={Array.isArray(uiPost.media_url) ? uiPost.media_url[0] : uiPost.media_url} autoPlay />
                    {uiPost.content_text && <p className="text-gray-800 mt-3">{uiPost.content_text}</p>}
                  </div>
                )}
                {uiPost.content_type === 'audio' && (
                  <div className="space-y-3">
                    <SmartAudio src={Array.isArray(uiPost.media_url) ? uiPost.media_url[0] : uiPost.media_url} />
                    {uiPost.content_text && <p className="text-gray-800 mt-3">{uiPost.content_text}</p>}
                  </div>
                )}
              </div>
            
            {/* Gündem */}
            {uiPost.agenda_tag && (
              <button
                type="button"
                className="mb-4 inline-block"
                onClick={() => {
                  if (!agendaSlug) return;
                  navigate(`/agenda/${agendaSlug}`);
                }}
                title="Gündem sayfasına git"
              >
                <Badge variant="primary">{uiPost.agenda_tag}</Badge>
              </button>
            )}

            {/* Kaynak / Otomatik paylaşım şeffaflık satırı */}
            {uiPost.source_url && (
              <div className="mt-2 text-xs text-gray-500 leading-snug">
                Bu paylaşım <span className="font-semibold">{getSourceDomain(uiPost.source_url)}</span> adresinden alınmış olup otomatik olarak paylaşılmıştır.
              </div>
            )}
            
            {/* Etkileşim Butonları - Büyük ikonlar (mobil öncelikli) */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t">
              {/* BEĞEN - Özel Vurgulu */}
              <button
                onClick={handleToggleLike}
                className="relative flex items-center justify-center gap-2 bg-gradient-to-br from-red-500 via-pink-500 to-red-600 hover:from-red-600 hover:via-pink-600 hover:to-red-700 text-white py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <LikeBurstHeart trigger={likeBurstTick} sizeClass="w-12 h-12" />
                <Heart className="w-7 h-7 md:w-6 md:h-6" fill="currentColor" />
                <span className="text-base md:text-sm font-black tracking-tight">BEĞEN ({formatNumber(uiPost.like_count)})</span>
              </button>
              
              {/* YORUM */}
              <button
                onClick={() => {
                  commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTimeout(() => commentBoxRef.current?.focus?.(), 250);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-br from-primary-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <MessageCircle className="w-7 h-7 md:w-6 md:h-6" />
                <span className="text-base md:text-sm font-black tracking-tight">YORUM ({formatNumber(uiPost.comment_count)})</span>
              </button>
              
              {/* PAYLAŞ */}
              <button
                onClick={async () => {
                  setShareCopied(false);
                  // Track share (best-effort) so the post owner gets a notification.
                  try {
                    if (isAuthenticated && uiPost.post_id) {
                      await postsApi.share(uiPost.post_id);
                    }
                  } catch {
                    // ignore
                  }
                  setShowShare(true);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Share2 className="w-7 h-7 md:w-6 md:h-6" />
                <span className="text-base md:text-sm font-black tracking-tight">PAYLAŞ ({formatNumber(uiPost.share_count || 0)})</span>
              </button>
            </div>
            
            {/* Şikayet Et - Alt Satırda */}
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => {
                  setReportingPost(true);
                  setPostReportReason('spam');
                  setPostReportDetails('');
                  setPostReportDone(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 text-sm font-black transition-colors"
              >
                <Flag className="w-7 h-7 md:w-6 md:h-6" />
                <span className="tracking-tight">Şikayet Et</span>
              </button>
            </div>

            {/* Yönetim (sadece kendi postu) */}
            {isOwnPost && (
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditPostText(String(uiPost.content_text || ''));
                    setShowEditPost(true);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold"
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeletePost(true)}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Sil
                </button>
              </div>
            )}
            
            {/* Polit Puan - Sadece P. ile */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                    <div className="text-3xl font-bold text-primary-blue">{formatPolitScore(uiPost.polit_score)}</div>
                </div>
                <Button variant="outline" onClick={() => setShowScoreModal(true)}>
                  Detaylı Hesaplama
                </Button>
              </div>
            </div>
          </div>
          
          {/* Yorumlar */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Yorumlar ({comments.length})</h3>
            
            {/* Yorum Ekleme */}
            <div ref={commentsRef} className="mb-6 pb-6 border-b scroll-mt-24">
              <div className="flex gap-3">
                <Avatar src={currentUser?.avatar_url || currentUser?.profile_image} size="40px" />
                <div className="flex-1">
                  <textarea
                    ref={commentBoxRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    rows="3"
                    maxLength={300}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-500">
                      {300 - (newComment?.length || 0)} karakter kaldı • {myCommentCount}/3 yorum
                    </div>
                    <Button
                      className="mt-0"
                      onClick={handleAddComment}
                      disabled={commentSubmitting || !newComment.trim()}
                    >
                      {commentSubmitting ? 'Kaydediliyor…' : 'Gönder'}
                    </Button>
                  </div>
                  {commentNotice && <div className="mt-2 text-sm text-gray-700 font-semibold">{commentNotice}</div>}
                  {commentError && <div className="mt-2 text-sm text-red-600 font-semibold">{commentError}</div>}
                </div>
              </div>
            </div>
            
            {/* Yorum Listesi */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id || comment.comment_id} className="flex gap-3">
                  <Avatar src={comment.user?.avatar_url || comment.user?.profile_image} size="40px" verified={isUiVerifiedUser(comment.user)} />
                  <div className="flex-1">
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-1 pr-9">
                        <span className="font-semibold">{comment.user?.full_name}</span>
                        <span className="text-sm text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                      </div>

                      {/* Report flag: top-right of the comment area (no button background) */}
                      <button
                        type="button"
                        className="absolute right-0 top-0 text-gray-400 hover:text-red-600 transition-colors"
                        onClick={() => {
                          setReporting(comment);
                          setReportReason('spam');
                          setReportDetails('');
                          setReportDone(false);
                        }}
                        title="Bildir"
                      >
                        <Flag className="w-7 h-7" />
                      </button>
                    </div>
                    {editingId === (comment.id || comment.comment_id) ? (
                      <div className="mb-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          maxLength={300}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-semibold"
                            onClick={() => {
                              setEditingId(null);
                              setEditingText('');
                            }}
                            type="button"
                          >
                            <div className="flex items-center gap-2">
                              <X className="w-6 h-6 sm:w-5 sm:h-5" />
                              Vazgeç
                            </div>
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white font-black"
                            onClick={async () => {
                              const text = editingText.trim();
                              if (!text) return;
                              try {
                                setCommentError('');
                                setCommentNotice('');
                                const id = comment.id || comment.comment_id;
                                setCommentEditSubmittingId(id);
                                const r = await postsApi.updateComment(id, text);
                                setEditingId(null);
                                setEditingText('');
                                const c = await postsApi.getComments(uiPost.post_id).catch(() => null);
                                const rows = c?.data?.data || c?.data || c || [];
                                setComments(Array.isArray(rows) ? rows : []);
                                if (r?.message) setCommentNotice(String(r.message));
                              } catch (e) {
                                setCommentError(e?.message || 'Yorum güncellenemedi.');
                              } finally {
                                setCommentEditSubmittingId(null);
                              }
                            }}
                            type="button"
                            disabled={commentEditSubmittingId === (comment.id || comment.comment_id)}
                          >
                            <div className="flex items-center gap-2">
                              <Check className="w-6 h-6 sm:w-5 sm:h-5" />
                              {commentEditSubmittingId === (comment.id || comment.comment_id) ? 'Kaydediliyor…' : 'Kaydet'}
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={`mb-2 ${isPendingComment(comment) ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                          {comment.content || comment.comment_text}
                        </p>
                        {isPendingComment(comment) && (
                          <div className="mb-2 text-xs text-gray-500">
                            Bu mesaj güvenlik önlemleri nedeniyle sistem tarafından onaylanana kadar diğer kullanıcılara gösterilmez.
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      {canEditComment(comment) && editingId !== (comment.id || comment.comment_id) && (
                        <button
                          type="button"
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-black text-gray-800"
                          onClick={() => {
                            setCommentError('');
                            setEditingId(comment.id || comment.comment_id);
                            setEditingText(String(comment.content || comment.comment_text || ''));
                          }}
                          title="Düzenle (10 dk)"
                        >
                          <div className="flex items-center gap-2">
                            <Pencil className="w-5 h-5" />
                            Düzenle
                          </div>
                        </button>
                      )}

                      {/* Like button: red heart + count (no square background) */}
                      <button
                        className={`flex items-center gap-1.5 disabled:opacity-50 ${
                          comment.liked_by_me ? 'text-red-600 hover:text-red-700' : 'text-red-600/80 hover:text-red-600'
                        }`}
                        type="button"
                        disabled={isPendingComment(comment)}
                        onClick={async () => {
                          try {
                            setCommentError('');
                            if (!isAuthenticated) {
                              navigate('/login-new');
                              return;
                            }
                            const id = comment.id || comment.comment_id;
                            if (!id) return;
                            const r = await postsApi.likeComment(id);
                            setComments((prev) =>
                              prev.map((c) => {
                                const cid = c.id || c.comment_id;
                                if (cid !== id) return c;
                                const nextLiked =
                                  r?.action === 'liked' ? true : r?.action === 'unliked' ? false : !Boolean(c.liked_by_me);
                                return { ...c, like_count: r?.like_count ?? c.like_count, liked_by_me: nextLiked };
                              })
                            );
                          } catch (e) {
                            setCommentError(e?.message || 'Beğeni işlemi başarısız.');
                          }
                        }}
                        title={isPendingComment(comment) ? 'Bu yorum incelemede' : 'Beğen'}
                      >
                        <Heart className="w-7 h-7" fill={comment.liked_by_me ? 'currentColor' : 'none'} />
                        <span className="text-lg font-black text-gray-800">{formatNumber(comment.like_count)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
      
      {/* Polit Puan Detay Modal */}
      <Modal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        title="Polit Puan Detaylı Hesaplama"
      >
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-5 rounded-2xl">
            <div className="text-center">
              <div className="text-xs font-black tracking-widest opacity-90">TOPLAM POLİT PUAN</div>
              <div className="text-4xl font-black mt-2">{formatPolitScore(scoreBreakdown.storedScore)}</div>
              <div className="text-xs opacity-90 mt-2">
                Kalem kalem hesaplanan (yaklaşık): {formatPolitScore(scoreBreakdown.totalCalculated)}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="bg-primary-blue rounded-full p-2 flex-shrink-0">
              <Users className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-gray-900">Şeffaflık</div>
              <div className="text-xs text-gray-700 leading-relaxed mt-1">
                Aşağıdaki liste, puanın hangi kalemlerden oluştuğunu anlaşılır şekilde gösterir.
                (Dağılım, ekranda şeffaf anlatım amaçlıdır; nihai skor sunucuda hesaplanıp saklanır.)
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(scoreBreakdown.breakdown).map(([key, category]) => (
              <div key={key} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedScoreCategory(expandedScoreCategory === key ? null : key)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-primary-blue">{category.icon}</div>
                    <div className="text-left">
                      <div className="font-black text-gray-900">{category.title}</div>
                      <div className="text-xs text-gray-500">Toplam katkı</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-primary-blue">{formatPolitScore(category.total)}</div>
                    <div className="text-xs text-gray-500">{expandedScoreCategory === key ? 'Gizle ▲' : 'Detay ▼'}</div>
                  </div>
                </button>

                {expandedScoreCategory === key && (
                  <div className="bg-white p-4 space-y-2 border-t border-gray-200">
                    {category.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="min-w-0 pr-3">
                          <div className="text-sm font-bold text-gray-900 truncate">{detail.label}</div>
                          <div className="text-xs text-gray-600">
                            {formatNumber(detail.count)} adet × {detail.unitPoint}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-base font-black text-primary-blue">{formatPolitScore(detail.points)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Report modal */}
      {reporting && (
        <Modal isOpen={true} onClose={() => setReporting(null)} title="Yorumu Bildir">
          {reportDone ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-800 font-semibold">
                Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.
              </div>
              <Button onClick={() => setReporting(null)}>Kapat</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">Neden bildirmek istiyorsunuz?</div>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="spam">Spam</option>
                <option value="hakaret">Hakaret / Küfür</option>
                <option value="taciz">Taciz / Nefret</option>
                <option value="yaniltici">Yanıltıcı bilgi</option>
                <option value="zararli_link">Zararlı link</option>
                <option value="diger">Diğer</option>
              </select>

              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                placeholder="İsterseniz kısa bir açıklama ekleyin (opsiyonel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReporting(null)}>
                  Vazgeç
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setCommentError('');
                      const id = reporting.id || reporting.comment_id;
                      await postsApi.reportComment(id, reportReason, reportDetails);
                      setReportDone(true);
                    } catch (e) {
                      setCommentError(e?.message || 'Şikayet gönderilemedi.');
                      setReporting(null);
                    }
                  }}
                >
                  Gönder
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Share modal */}
      <Modal isOpen={showShare} onClose={() => setShowShare(false)} title="Paylaş">
        <div className="space-y-4">
          {(() => {
            const author = String(uiPost?.user?.full_name || '').trim();
            const agenda = String(uiPost?.agenda_tag || '').trim();
            const score = formatPolitScore(uiPost?.polit_score || 0);
            const content = String(uiPost?.content_text || uiPost?.content || '').trim();
            const excerpt = content ? (content.length > 160 ? `${content.slice(0, 160)}…` : content) : 'Bir polit paylaşıldı.';
            const shareText = [
              author ? `${author}` : null,
              agenda ? `Gündem: ${agenda}` : null,
              `Polit Puan: ${score}`,
              '',
              excerpt,
              '',
              `Polithane'de gör: ${postUrl}`,
            ].filter((x) => x !== null).join('\n');
            const encodedShareText = encodeURIComponent(shareText);

            return (
              <>
                <div className="text-sm text-gray-700">
                  Paylaşım metni:
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 break-all text-xs text-gray-800">
                    {shareText}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/?text=${encodedShareText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 rounded-xl bg-[#25D366] text-white font-black text-center hover:opacity-90"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodedShareText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 rounded-xl bg-[#229ED9] text-white font-black text-center hover:opacity-90"
                  >
                    Telegram
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodedShareText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 rounded-xl bg-black text-white font-black text-center hover:bg-gray-900"
                  >
                    X
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 rounded-xl bg-[#1877F2] text-white font-black text-center hover:opacity-90"
                  >
                    Facebook
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 rounded-xl bg-[#0A66C2] text-white font-black text-center hover:opacity-90"
                  >
                    LinkedIn
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      // Track share (best-effort) so the post owner gets a notification.
                      try {
                        if (isAuthenticated && uiPost.post_id) {
                          await postsApi.share(uiPost.post_id);
                        }
                      } catch {
                        // ignore
                      }
                      const ok = await copyToClipboard(postUrl);
                      setShareCopied(ok);
                    }}
                    className="px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-black hover:bg-gray-50"
                  >
                    {shareCopied ? 'Link Kopyalandı' : 'Linki Kopyala'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(shareText);
                      setShareCopied(ok);
                    }}
                    className="px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-black hover:bg-gray-50"
                  >
                    Metni Kopyala
                  </button>
                </div>
              </>
            );
          })()}

          <div className="text-xs text-gray-500">
            Instagram web üzerinden direkt paylaşımı desteklemez; linki kopyalayıp Instagram’da paylaşabilirsiniz.
          </div>
        </div>
      </Modal>

      {/* Post report modal */}
      {reportingPost && (
        <Modal isOpen={true} onClose={() => setReportingPost(false)} title="Paylaşımı Şikayet Et">
          {postReportDone ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-800 font-semibold">
                Bildiriminiz alındı. İnceleme sonrası gerekli işlem yapılacaktır.
              </div>
              <Button onClick={() => setReportingPost(false)}>Kapat</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">Neden şikayet etmek istiyorsunuz?</div>
              <select
                value={postReportReason}
                onChange={(e) => setPostReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="spam">Spam</option>
                <option value="hakaret">Hakaret / Küfür</option>
                <option value="taciz">Taciz / Nefret</option>
                <option value="yaniltici">Yanıltıcı bilgi</option>
                <option value="zararli_link">Zararlı link</option>
                <option value="diger">Diğer</option>
              </select>

              <textarea
                value={postReportDetails}
                onChange={(e) => setPostReportDetails(e.target.value)}
                rows={3}
                placeholder="İsterseniz kısa bir açıklama ekleyin (opsiyonel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReportingPost(false)}>
                  Vazgeç
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setCommentError('');
                      await postsApi.reportPost(uiPost.post_id, postReportReason, postReportDetails);
                      setPostReportDone(true);
                    } catch (e) {
                      setCommentError(e?.message || 'Şikayet gönderilemedi.');
                      setReportingPost(false);
                    }
                  }}
                >
                  Gönder
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Edit post modal */}
      <Modal isOpen={showEditPost} onClose={() => setShowEditPost(false)} title="Paylaşımı Düzenle">
        <div className="space-y-3">
          <textarea
            value={editPostText}
            onChange={(e) => setEditPostText(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">{5000 - (editPostText?.length || 0)} karakter kaldı</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditPost(false)} disabled={savingPost}>
                Vazgeç
              </Button>
              <Button
                onClick={async () => {
                  const text = String(editPostText || '').trim();
                  if (!text) {
                    setCommentError('İçerik boş olamaz.');
                    return;
                  }
                  setSavingPost(true);
                  try {
                    setCommentError('');
                    const r = await postsApi.update(uiPost.post_id, { content_text: text });
                    if (r?.success && r?.data) {
                      setPost(r.data);
                    } else {
                      // fallback: refetch
                      const detail = await postsApi.getById(uiPost.post_id);
                      setPost(detail?.data ? detail.data : detail);
                    }
                    setShowEditPost(false);
                  } catch (e) {
                    setCommentError(e?.message || 'Paylaşım güncellenemedi.');
                  } finally {
                    setSavingPost(false);
                  }
                }}
                disabled={savingPost}
              >
                {savingPost ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete post modal */}
      <Modal isOpen={showDeletePost} onClose={() => setShowDeletePost(false)} title="Paylaşımı Sil">
        <div className="space-y-4">
          <div className="text-sm text-gray-800">
            Bu paylaşımı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeletePost(false)}>
              Vazgeç
            </Button>
            <Button
              onClick={async () => {
                try {
                  setCommentError('');
                  await postsApi.delete(uiPost.post_id);
                  setShowDeletePost(false);
                  navigate('/');
                } catch (e) {
                  setCommentError(e?.message || 'Paylaşım silinemedi.');
                  setShowDeletePost(false);
                }
              }}
            >
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
