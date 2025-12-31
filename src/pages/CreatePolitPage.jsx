import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Trash2, Video, Image as ImageIcon, Music, PenTool, UploadCloud, Mic, StopCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, posts as postsApi } from '../utils/api';
import { Avatar } from '../components/common/Avatar';
import { isUiVerifiedUser } from '../utils/titleHelpers';
import { supabase } from '../services/supabase';

export const CreatePolitPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isFastMode = useMemo(() => String(location?.pathname || '') === '/fast-at', [location?.pathname]);

  const [step, setStep] = useState('type'); // type | agenda | media | desc | success
  const [contentType, setContentType] = useState(''); // video | image | audio | text
  const [agendaTag, setAgendaTag] = useState(''); // '' => gündem dışı
  const [agendas, setAgendas] = useState([]);
  const [agendaVisibleCount, setAgendaVisibleCount] = useState(10);

  // Use user-provided icon images from Storage (ikons folder/bucket), fallback to local /icons.
  const iconBaseUrls = useMemo(() => {
    try {
      const explicit = String(import.meta.env?.VITE_ICON_BASE_URL || '').trim();
      const supabaseUrl = String(import.meta.env?.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
      const bases = [];
      if (explicit) bases.push(explicit.replace(/\/+$/, ''));
      if (supabaseUrl) {
        bases.push(`${supabaseUrl}/storage/v1/object/public/uploads/ikons`);
        bases.push(`${supabaseUrl}/storage/v1/object/public/ikons`);
      }
      return Array.from(new Set(bases)).filter(Boolean);
    } catch {
      return [];
    }
  }, []);

  const iconCandidates = useMemo(() => {
    const join = (base, name) => `${String(base).replace(/\/+$/, '')}/${name}`;
    const names = {
      video: ['videoikon.png', 'video.png', 'videoikon.webp', 'video.webp', 'videoikon.jpg', 'video.jpg'],
      image: ['resimikon.png', 'resim.png', 'resimikon.webp', 'resim.webp', 'resimikon.jpg', 'resim.jpg'],
      audio: ['sesikon.png', 'ses.png', 'sesikon.webp', 'ses.webp', 'sesikon.jpg', 'ses.jpg'],
      text: ['yaziikon.png', 'yazi.png', 'yaziikon.webp', 'yazi.webp', 'yaziikon.jpg', 'yazi.jpg'],
    };
    const out = {};
    (['video', 'image', 'audio', 'text'] || []).forEach((k) => {
      const list = [];
      if (k === 'video') list.push('/icons/videoikon.png');
      if (k === 'image') list.push('/icons/resimikon.png');
      if (k === 'audio') list.push('/icons/sesikon.png');
      if (k === 'text') list.push('/icons/yaziikon.png');
      for (const b of iconBaseUrls || []) {
        for (const n of names[k] || []) list.push(join(b, n));
      }
      if (k === 'video') list.push('/icons/videoikon.svg');
      if (k === 'image') list.push('/icons/resimikon.svg');
      if (k === 'audio') list.push('/icons/sesikon.svg');
      if (k === 'text') list.push('/icons/yaziikon.svg');
      out[k] = Array.from(new Set(list));
    });
    return out;
  }, [iconBaseUrls]);

  useEffect(() => {
    try {
      (['video', 'image', 'audio', 'text'] || []).forEach((k) => {
        const list = iconCandidates?.[k] || [];
        list.slice(0, 3).forEach((src) => {
          const img = new Image();
          img.src = src;
        });
      });
    } catch {
      // ignore
    }
  }, [iconCandidates]);

  const [brokenIcons, setBrokenIcons] = useState({});
  const [iconTryIndex, setIconTryIndex] = useState({});

  const themeFast = useMemo(
    () => ({
      primary: '#E11D48',
      borderClass: 'border-rose-600',
      btnClass: 'bg-rose-600 hover:bg-rose-700',
      btnAltClass: 'border-rose-300 text-rose-700',
      ringClass: 'ring-rose-500/20',
    }),
    []
  );
  const themePolit = useMemo(
    () => ({
      primary: '#0B3D91',
      borderClass: 'border-primary-blue',
      btnClass: 'bg-primary-blue hover:bg-blue-600',
      btnAltClass: 'border-blue-300 text-primary-blue',
      ringClass: 'ring-primary-blue/20',
    }),
    []
  );
  const baseTheme = useMemo(() => (isFastMode ? themeFast : themePolit), [isFastMode, themeFast, themePolit]);
  // On the cross-post offer screen, use the TARGET's theme:
  // - Polit → offer Fast => Fast (red)
  // - Fast → offer Polit => Polit (blue)
  const offerTheme = useMemo(() => (isFastMode ? themePolit : themeFast), [isFastMode, themeFast, themePolit]);
  const theme = useMemo(() => (step === 'success' ? offerTheme : baseTheme), [baseTheme, offerTheme, step]);

  const approvalPending = useMemo(() => {
    if (!isAuthenticated) return false;
    if (user?.is_admin) return false;
    const ut = String(user?.user_type || 'citizen');
    return ut !== 'citizen' && !user?.is_verified;
  }, [isAuthenticated, user?.is_admin, user?.user_type, user?.is_verified]);

  const [files, setFiles] = useState([]);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [preparingMedia, setPreparingMedia] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [mediaDurationSec, setMediaDurationSec] = useState(0);
  const [videoThumbs, setVideoThumbs] = useState([]); // [{ timeSec, previewUrl, blob }]
  const [selectedVideoThumbIdx, setSelectedVideoThumbIdx] = useState(0);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadHint, setUploadHint] = useState('');
  const publishLockRef = useRef(false);

  const [primaryPost, setPrimaryPost] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [descTarget, setDescTarget] = useState('primary'); // primary | cross

  const [isMobileLike, setIsMobileLike] = useState(() => {
    try {
      return (typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth < 768)) || false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const onResize = () => {
      try {
        setIsMobileLike(window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth < 768);
      } catch {
        setIsMobileLike(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const previewRef = useRef(null);
  const recordTimeoutRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const recordStartTsRef = useRef(0);
  const recordStopFiredRef = useRef(false);
  const MAX_RECORD_SEC = 60;
  const [recordSecLeft, setRecordSecLeft] = useState(60);
  const [videoFacingMode, setVideoFacingMode] = useState('user'); // user | environment
  // NOTE: Mobile browsers often handle rotation metadata automatically.
  // Applying a manual rotate(90deg) can cause sideways previews on some devices.
  const [videoRotate, setVideoRotate] = useState(false);

  const imageUploadRef = useRef(null);
  const imageCaptureRef = useRef(null);
  const videoUploadRef = useRef(null);
  const audioUploadRef = useRef(null);

  const TEXT_MIN = 10;
  const TEXT_MAX = 300;

  const agendaScoreOf = (a) => {
    const v =
      a?.total_polit_score ??
      a?.polit_score ??
      a?.trending_score ??
      a?.trend_score ??
      a?.trend_skoru ??
      a?.score ??
      a?.politPuan ??
      a?.polit_puan ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const sortedAgendas = useMemo(() => {
    const list = (Array.isArray(agendas) ? agendas : []).filter((a) => a?.is_active !== false && (a?.title || a?.name));
    return list
      .slice()
      .sort((a, b) => agendaScoreOf(b) - agendaScoreOf(a) || String(a?.title || '').localeCompare(String(b?.title || ''), 'tr-TR'));
  }, [agendas]);

  const hasMedia = useMemo(() => files.length > 0 || !!recordedUrl, [files.length, recordedUrl]);
  const canShowSubmitInMediaStep = useMemo(() => {
    // Hide submit button during picking/recording; show only when we have a preview-ready media.
    if (step !== 'media') return false;
    if (isRecording) return false;
    if (preparingMedia) return false;
    return hasMedia;
  }, [hasMedia, isRecording, preparingMedia, step]);

  const optimizeImageFile = async (file) => {
    try {
      const t = String(file?.type || '').toLowerCase();
      if (!t.startsWith('image/')) return file;
      const bytes = Number(file?.size || 0) || 0;
      if (bytes > 0 && bytes < 350 * 1024) return file;

      const blob = file instanceof Blob ? file : new Blob([file]);
      let bitmap = null;
      try {
        bitmap = await createImageBitmap(blob);
      } catch {
        bitmap = null;
      }
      if (!bitmap) return file;

      const maxW = 1440;
      const maxH = 1440;
      const w0 = Number(bitmap.width || 0) || 0;
      const h0 = Number(bitmap.height || 0) || 0;
      if (!w0 || !h0) return file;

      const scale = Math.min(1, maxW / w0, maxH / h0);
      const w = Math.max(1, Math.round(w0 * scale));
      const h = Math.max(1, Math.round(h0 * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      try {
        bitmap.close?.();
      } catch {
        // ignore
      }

      const outBlob = await new Promise((resolve) => {
        try {
          canvas.toBlob((b) => resolve(b), 'image/webp', 0.82);
        } catch {
          resolve(null);
        }
      });
      if (!outBlob) return file;

      const outBytes = Number(outBlob.size || 0) || 0;
      if (bytes && outBytes && outBytes > bytes * 0.92) return file;

      const name = String(file?.name || 'image').trim();
      const base = name.includes('.') ? name.split('.').slice(0, -1).join('.') : name;
      return new File([outBlob], `${base || 'image'}.webp`, { type: 'image/webp' });
    } catch {
      return file;
    }
  };

  const optimizeImageFiles = async (picked) => {
    const list = (Array.isArray(picked) ? picked : []).slice(0, 10);
    if (list.length === 0) return [];
    setPreparingMedia(true);
    setUploadHint('Resimler optimize ediliyor…');
    try {
      const out = [];
      for (const f of list) {
        // eslint-disable-next-line no-await-in-loop
        out.push(await optimizeImageFile(f));
      }
      return out;
    } finally {
      setPreparingMedia(false);
      setUploadHint('');
    }
  };

  const getUploadHeaders = async () => {
    const headers = {};
    try {
      const anon = String(import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
      if (anon) headers.apikey = anon;
    } catch {
      // ignore
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || '';
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore
    }
    return headers;
  };

  const xhrPutWithProgress = async ({ url, body, headers, onProgress }) =>
    new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        try {
          Object.entries(headers || {}).forEach(([k, v]) => {
            if (!k || !v) return;
            xhr.setRequestHeader(k, String(v));
          });
        } catch {
          // ignore
        }
        xhr.upload.onprogress = (e) => {
          try {
            if (!e.lengthComputable) return;
            const pct = e.total > 0 ? e.loaded / e.total : 0;
            onProgress?.(Math.max(0, Math.min(1, pct)));
          } catch {
            // ignore
          }
        };
        xhr.onerror = () => reject(new Error('Yükleme sırasında bağlantı hatası.'));
        xhr.onabort = () => reject(new Error('Yükleme iptal edildi.'));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) return resolve(true);
          const msg = String(xhr.responseText || '').trim();
          return reject(new Error(msg || `Yükleme başarısız (HTTP ${xhr.status}).`));
        };
        xhr.send(body);
      } catch (e) {
        reject(e);
      }
    });

  const resetMedia = () => {
    setFiles([]);
    try {
      (videoThumbs || []).forEach((t) => {
        if (t?.previewUrl) URL.revokeObjectURL(t.previewUrl);
      });
    } catch {
      // ignore
    }
    setVideoThumbs([]);
    setSelectedVideoThumbIdx(0);
    if (recordedUrl) {
      try {
        URL.revokeObjectURL(recordedUrl);
      } catch {
        // ignore
      }
    }
    setRecordedUrl('');
    setVideoRotate(false);
    setRecordSecLeft(MAX_RECORD_SEC);
    recordStopFiredRef.current = false;
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    recordIntervalRef.current = null;
    setPreparingMedia(false);
    setUploadPct(0);
    setUploadHint('');
    chunksRef.current = [];
    setIsRecording(false);
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    recordTimeoutRef.current = null;
    try {
      if (videoUploadRef.current) videoUploadRef.current.value = '';
      if (audioUploadRef.current) audioUploadRef.current.value = '';
      if (imageUploadRef.current) imageUploadRef.current.value = '';
      if (imageCaptureRef.current) imageCaptureRef.current.value = '';
    } catch {
      // ignore
    }
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    } catch {
      // ignore
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (previewRef.current) {
      try {
        previewRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
  };

  const resetAll = () => {
    setStep('type');
    setContentType('');
    setAgendaTag('');
    setText('');
    setPrimaryPost(null);
    resetMedia();
  };

  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFastMode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiCall('/api/agendas?limit=200');
        const list = Array.isArray(res) ? res : res?.data || [];
        if (!mounted) return;
        setAgendas(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setAgendas([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (contentType !== 'image') {
      setImagePreviews([]);
      return;
    }
    const urls = (files || []).slice(0, 10).map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => {
      urls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      });
    };
  }, [contentType, files]);

  useEffect(() => {
    let cancelled = false;
    const cleanupPrev = (list) => {
      try {
        (list || []).forEach((t) => {
          if (t?.previewUrl) URL.revokeObjectURL(t.previewUrl);
        });
      } catch {
        // ignore
      }
    };

    if (contentType !== 'video') {
      cleanupPrev(videoThumbs);
      setVideoThumbs([]);
      setSelectedVideoThumbIdx(0);
      return;
    }
    if (isRecording) return;
    const src = String(recordedUrl || '').trim();
    if (!src) {
      cleanupPrev(videoThumbs);
      setVideoThumbs([]);
      setSelectedVideoThumbIdx(0);
      return;
    }

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const waitForFrame = (videoEl) =>
      new Promise((resolve) => {
        try {
          // Prefer requestVideoFrameCallback where available (more reliable on mobile)
          if (typeof videoEl?.requestVideoFrameCallback === 'function') {
            // eslint-disable-next-line no-unused-vars
            return videoEl.requestVideoFrameCallback((_now, _meta) => resolve(true));
          }
        } catch {
          // ignore
        }
        setTimeout(() => resolve(true), 160);
      });

    const captureAt = (videoEl, timeSec, fallbackDurationSec) =>
      new Promise((resolve) => {
        try {
          const dur0 = Number(videoEl.duration || 0);
          const duration =
            Number.isFinite(dur0) && dur0 > 0 ? dur0 : Math.max(0.4, Number(fallbackDurationSec || 0) || 0.4);
          const maxT = Math.max(0.05, duration - 0.12);
          let t = clamp(Number(timeSec || 0), 0.05, maxT);
          let done = false;
          const finish = (v) => {
            if (done) return;
            done = true;
            resolve(v);
          };

          const onSeeked = async () => {
            try {
              videoEl.removeEventListener('seeked', onSeeked);
            } catch {
              // ignore
            }
            try {
              // On some mobile browsers, seeked fires before the frame is actually ready to draw.
              await waitForFrame(videoEl);

              const vw = Number(videoEl.videoWidth || 0);
              const vh = Number(videoEl.videoHeight || 0);
              if (!vw || !vh) return finish(null);

              const canvas = document.createElement('canvas');
              canvas.width = vw;
              canvas.height = vh;
              const ctx = canvas.getContext('2d');
              if (!ctx) return finish(null);

              ctx.drawImage(videoEl, 0, 0, vw, vh);
              canvas.toBlob(
                (blob) => {
                  if (!blob) return finish(null);
                  const previewUrl = URL.createObjectURL(blob);
                  finish({ timeSec: t, previewUrl, blob });
                },
                'image/jpeg',
                0.86
              );
            } catch {
              finish(null);
            }
          };

          videoEl.addEventListener('seeked', onSeeked);
          try {
            // Ensure data is available around the target time
            if (videoEl.readyState < 2) videoEl.load?.();
          } catch {
            // ignore
          }
          // If currentTime is already at `t`, some browsers won't fire `seeked`.
          try {
            if (Math.abs(Number(videoEl.currentTime || 0) - t) < 0.02) {
              const bumped = clamp(t + 0.06, 0.05, maxT);
              if (Math.abs(bumped - t) >= 0.02) t = bumped;
            }
          } catch {
            // ignore
          }
          videoEl.currentTime = t;

          // safety timeout
          setTimeout(() => {
            try {
              videoEl.removeEventListener('seeked', onSeeked);
            } catch {
              // ignore
            }
            finish(null);
          }, 2600);
        } catch {
          resolve(null);
        }
      });

    (async () => {
      const prev = videoThumbs;
      cleanupPrev(prev);
      setVideoThumbs([]);
      setSelectedVideoThumbIdx(0);

      try {
        const videoEl = document.createElement('video');
        videoEl.preload = 'auto';
        videoEl.src = src;
        videoEl.muted = true;
        videoEl.playsInline = true;
        try {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('webkit-playsinline', 'true');
        } catch {
          // ignore
        }
        await new Promise((resolve) => {
          const done = () => resolve();
          videoEl.onloadedmetadata = done;
          videoEl.onloadeddata = done;
          videoEl.onerror = done;
          setTimeout(done, 1200);
        });
        try {
          // warm up decoder on mobile (helps avoid black canvas)
          videoEl.currentTime = 0.1;
          await waitForFrame(videoEl);
        } catch {
          // ignore
        }
        const duration = Number(videoEl.duration || 0);
        const d = Number.isFinite(duration) && duration > 0 ? duration : Math.max(1, Number(mediaDurationSec || 0) || 1);

        // Always TRY to produce 3 distinct thumbnails, even if metadata duration is missing.
        const maxT = Math.max(0.05, d - 0.12);
        const rawTimes = [Math.min(0.12, maxT), d * 0.45, d * 0.82].map((t) => clamp(t, 0.05, maxT));
        // De-dupe, but keep enough by nudging with a tiny epsilon when needed.
        const uniqTimes = [];
        for (const rt of rawTimes) {
          const base = Number(rt.toFixed(2));
          if (!uniqTimes.some((x) => Math.abs(x - base) < 0.02)) {
            uniqTimes.push(base);
            continue;
          }
          const nudged = clamp(base + 0.08, 0.05, maxT);
          if (!uniqTimes.some((x) => Math.abs(x - nudged) < 0.02)) uniqTimes.push(Number(nudged.toFixed(2)));
        }
        while (uniqTimes.length < 3) {
          const last = uniqTimes.length ? uniqTimes[uniqTimes.length - 1] : 0.05;
          const next = clamp(last + 0.12, 0.05, maxT);
          if (Math.abs(next - last) < 0.02) break;
          uniqTimes.push(Number(next.toFixed(2)));
        }
        uniqTimes.splice(3);

        const captured = [];
        for (const t of uniqTimes) {
          if (cancelled) break;
          // eslint-disable-next-line no-await-in-loop
          const one = await captureAt(videoEl, t, d);
          if (one) captured.push(one);
        }
        // If we couldn't seek for some reason (common on some mobile/webm combos),
        // still show 3 thumbnails by reusing the first successful capture.
        if (captured.length > 0 && captured.length < 3) {
          const first = captured[0];
          while (captured.length < 3) captured.push(first);
        }
        if (cancelled) {
          cleanupPrev(captured);
          return;
        }
        setVideoThumbs(captured);
        setSelectedVideoThumbIdx(0);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, recordedUrl, isRecording]);

  useEffect(() => {
    let cancelled = false;
    const f = files?.[0];
    if (!f) {
      setMediaDurationSec(0);
      return;
    }
    if (contentType !== 'audio' && contentType !== 'video') {
      setMediaDurationSec(0);
      return;
    }
    const readDuration = () =>
      new Promise((resolve) => {
        // Some browsers (esp. MediaRecorder webm) report Infinity/NaN duration on metadata load.
        // Workaround: seek to a very large time to force duration computation.
        try {
          const url = URL.createObjectURL(f);
          const el = document.createElement(contentType === 'audio' ? 'audio' : 'video');
          let settled = false;

          const cleanup = () => {
            if (settled) return;
            settled = true;
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
          };

          const finish = (d) => {
            cleanup();
            resolve(Number.isFinite(d) && d > 0 ? d : 0);
          };

          el.preload = 'metadata';
          el.onloadedmetadata = () => {
            const d0 = Number(el.duration);
            if (Number.isFinite(d0) && d0 > 0) return finish(d0);
            // Infinity / NaN workaround
            const onFix = () => {
              el.removeEventListener('timeupdate', onFix);
              const d1 = Number(el.duration);
              finish(d1);
            };
            el.addEventListener('timeupdate', onFix);
            try {
              el.currentTime = 1e101;
            } catch {
              el.removeEventListener('timeupdate', onFix);
              finish(0);
            }
            // Safety timeout
            setTimeout(() => {
              try { el.removeEventListener('timeupdate', onFix); } catch { /* ignore */ }
              finish(Number(el.duration));
            }, 1200);
          };
          el.onerror = () => finish(0);
          el.src = url;
        } catch {
          resolve(0);
        }
      });
    (async () => {
      const d = await readDuration();
      if (!cancelled) setMediaDurationSec(Math.max(0, Math.floor(d || 0)));
    })();
    return () => {
      cancelled = true;
    };
  }, [files, contentType]);

  useEffect(() => {
    return () => {
      resetMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IMPORTANT: During recording, the preview <video> is mounted only after `isRecording` is set.
  // We must attach the stream in an effect (otherwise preview stays black).
  useEffect(() => {
    if (!isRecording) return;
    if (contentType !== 'video') return;
    const stream = streamRef.current;
    const el = previewRef.current;
    if (!stream || !el) return;
    try {
      el.srcObject = stream;
      el.muted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      el.play?.().catch(() => null);
      setTimeout(() => {
        try { el.play?.().catch(() => null); } catch { /* ignore */ }
      }, 250);
    } catch {
      // ignore
    }
  }, [isRecording, contentType]);

  const pickType = (t) => {
    setContentType(t);
    setAgendaTag('');
    setText('');
    setPrimaryPost(null);
    setAgendaVisibleCount(10);
    resetMedia();
    setStep('agenda');
  };

  const goBack = () => {
    if (step === 'agenda') return setStep('type');
    if (step === 'media') return setStep('agenda');
    if (step === 'desc') return setStep(contentType === 'text' ? 'agenda' : 'media');
    return setStep('type');
  };

  const pickAgenda = (tag) => {
    setAgendaTag(String(tag || ''));
    if (contentType === 'text') setStep('desc');
    else setStep('media');
  };

  const getVideoDurationSec = (file) =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const v = document.createElement('video');
        let settled = false;
        const cleanup = () => {
          if (settled) return;
          settled = true;
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        };
        const finish = (d) => {
          cleanup();
          resolve(Number.isFinite(d) && d > 0 ? d : 0);
        };
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          const d0 = Number(v.duration);
          if (Number.isFinite(d0) && d0 > 0) return finish(d0);
          const onFix = () => {
            v.removeEventListener('timeupdate', onFix);
            finish(Number(v.duration));
          };
          v.addEventListener('timeupdate', onFix);
          try {
            v.currentTime = 1e101;
          } catch {
            v.removeEventListener('timeupdate', onFix);
            finish(0);
          }
          setTimeout(() => {
            try { v.removeEventListener('timeupdate', onFix); } catch { /* ignore */ }
            finish(Number(v.duration));
          }, 1200);
        };
        v.onerror = () => finish(0);
        v.src = url;
      } catch {
        resolve(0);
      }
    });

  const getAudioDurationSec = (file) =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const a = document.createElement('audio');
        let settled = false;
        const cleanup = () => {
          if (settled) return;
          settled = true;
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        };
        const finish = (d) => {
          cleanup();
          resolve(Number.isFinite(d) && d > 0 ? d : 0);
        };
        a.preload = 'metadata';
        a.onloadedmetadata = () => {
          const d0 = Number(a.duration);
          if (Number.isFinite(d0) && d0 > 0) return finish(d0);
          const onFix = () => {
            a.removeEventListener('timeupdate', onFix);
            finish(Number(a.duration));
          };
          a.addEventListener('timeupdate', onFix);
          try {
            a.currentTime = 1e101;
          } catch {
            a.removeEventListener('timeupdate', onFix);
            finish(0);
          }
          setTimeout(() => {
            try { a.removeEventListener('timeupdate', onFix); } catch { /* ignore */ }
            finish(Number(a.duration));
          }, 1200);
        };
        a.onerror = () => finish(0);
        a.src = url;
      } catch {
        resolve(0);
      }
    });

  const startRecording = async () => {
    if (isRecording) return;
    resetMedia();
    try {
      const constraints =
        contentType === 'video'
          ? {
              video: {
                facingMode: { ideal: videoFacingMode },
                // Try to keep mobile capture vertical and predictable.
                // Not all browsers honor these, but it reduces "sideways" recordings on many devices.
                width: { ideal: 720 },
                height: { ideal: 1280 },
                aspectRatio: { ideal: 9 / 16 },
              },
              audio: true,
            }
          : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Live preview for video recording
      if (contentType === 'video' && previewRef.current) {
        try {
          previewRef.current.srcObject = stream;
          previewRef.current.muted = true;
          previewRef.current.playsInline = true;
          // Some mobile browsers require the attribute for inline playback.
          previewRef.current.setAttribute('playsinline', 'true');
          previewRef.current.setAttribute('webkit-playsinline', 'true');
          await previewRef.current.play().catch(() => null);
          // Retry shortly (iOS sometimes needs a second tick)
          setTimeout(() => {
            try { previewRef.current?.play?.().catch(() => null); } catch { /* ignore */ }
          }, 250);
        } catch {
          // ignore
        }
      }

      const mimeType =
        contentType === 'audio'
          ? MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : ''
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : '';
      // Target: 720p story-like recording with reasonable bitrate for fast uploads.
      // These are best-effort; some browsers ignore/reject them.
      const recorderOptions =
        contentType === 'video'
          ? {
              ...(mimeType ? { mimeType } : {}),
              videoBitsPerSecond: 2_800_000, // ~2.8 Mbps
              audioBitsPerSecond: 96_000,
            }
          : {
              ...(mimeType ? { mimeType } : {}),
              audioBitsPerSecond: 96_000,
            };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      }
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (contentType === 'audio' ? 'audio/webm' : 'video/webm') });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const t = String(blob.type || '').toLowerCase();
        const ext =
          contentType === 'audio'
            ? (t.includes('mpeg') ? 'mp3' : t.includes('mp4') ? 'm4a' : 'webm')
            : (t.includes('quicktime') ? 'mov' : t.includes('mp4') ? 'mp4' : 'webm');
        const filename = contentType === 'audio' ? `polit-audio.${ext}` : `polit-video.${ext}`;
        const file = new File([blob], filename, { type: blob.type });
        setFiles([file]);
      };

      recorder.start();
      setIsRecording(true);
      recordStartTsRef.current = Date.now();
      setRecordSecLeft(MAX_RECORD_SEC);
      recordStopFiredRef.current = false;
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = setInterval(() => {
        try {
          const start = Number(recordStartTsRef.current || 0);
          if (!start) return;
          const elapsedSec = Math.floor((Date.now() - start) / 1000);
          const left = Math.max(0, MAX_RECORD_SEC - elapsedSec);
          setRecordSecLeft(left);
          if (left <= 0 && !recordStopFiredRef.current) {
            recordStopFiredRef.current = true;
            stopRecording();
          }
        } catch {
          // ignore
        }
      }, 200);

      // Limit: max 1 minute (video + audio)
      recordTimeoutRef.current = setTimeout(() => {
        if (recordStopFiredRef.current) return;
        recordStopFiredRef.current = true;
        stopRecording();
      }, MAX_RECORD_SEC * 1000 + 50);
    } catch {
      toast.error('Kayıt başlatılamadı. Tarayıcı izinlerini kontrol edin.');
    }
  };

  const stopRecording = () => {
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    recordTimeoutRef.current = null;
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    recordIntervalRef.current = null;
    setRecordSecLeft(MAX_RECORD_SEC);
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    } catch {
      // ignore
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (previewRef.current) {
      try {
        previewRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const fileToDataUrl = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Dosya okunamadı.'));
      reader.readAsDataURL(f);
    });

  const uploadOne = async (file, progress) => {
    // IMPORTANT:
    // - Base64 uploads hit Vercel request-body limits quickly (esp. video).
    // - Use signed upload so the file goes directly to Supabase Storage.
    // Soft client limits (we still rely on provider limits on upload).
    // Keep generous enough to avoid the old 12MB issue.
    const bytes = Number(file?.size || 0) || 0;
    const maxBytes =
      contentType === 'video'
        ? 80 * 1024 * 1024
        : contentType === 'audio'
          ? 40 * 1024 * 1024
          : 15 * 1024 * 1024;
    if (bytes > maxBytes) {
      const mb = Math.round(maxBytes / 1024 / 1024);
      throw new Error(`Dosya çok büyük. Şimdilik maksimum ${mb}MB yükleyebilirsiniz.`);
    }

    const guessContentType = (f) => {
      const t = String(f?.type || '').trim();
      if (t) return t.split(';')[0].trim();
      const name = String(f?.name || '').trim().toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      if (!ext) return '';
      if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
      if (ext === 'jpg') return 'image/jpg';
      if (ext === 'png') return 'image/png';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'gif') return 'image/gif';
      if (ext === 'mp4') return 'video/mp4';
      if (ext === 'm4v') return 'video/x-m4v';
      if (ext === 'mov') return 'video/quicktime';
      if (ext === 'webm') return 'video/webm';
      if (ext === '3gp') return 'video/3gpp';
      if (ext === '3g2') return 'video/3gpp2';
      if (ext === 'mp3') return 'audio/mpeg';
      if (ext === 'm4a') return 'audio/mp4';
      if (ext === 'aac') return 'audio/aac';
      return '';
    };

    const ct = guessContentType(file);
    if (!ct) throw new Error('Dosya türü bulunamadı. Lütfen farklı bir dosya seçin.');

    const sign = await apiCall('/api/storage/sign-upload', {
      method: 'POST',
      body: JSON.stringify({
        bucket: 'uploads',
        folder: file?.__uploadFolder || 'posts',
        contentType: ct,
      }),
    });
    if (!sign?.success) throw new Error(sign?.error || 'Yükleme hazırlığı başarısız.');
    const { publicUrl, signedUrl } = sign?.data || {};
    if (!publicUrl || !signedUrl) throw new Error('Yükleme anahtarı alınamadı.');

    // Progress-capable signed upload (XHR PUT) to match Supabase's `uploadToSignedUrl` endpoint behavior.
    // Supabase expects a multipart/form-data body with cacheControl and the file under an empty field name.
    const url = String(signedUrl).trim();
    const fd = new FormData();
    fd.append('cacheControl', '3600');
    fd.append('', file);
    const headers = await getUploadHeaders();
    await xhrPutWithProgress({
      url,
      body: fd,
      headers,
      onProgress: (p) => progress?.(p),
    });
    return String(publicUrl);
  };

  const publishPrimary = async () => {
    // Hard guard against double-click / double-submit (React state updates are async).
    if (publishLockRef.current) return;
    if (loading) return;
    if (!isAuthenticated) {
      toast.error('Paylaşım yapmak için giriş yapmalısınız.');
      navigate('/login-new');
      return;
    }
    if (!contentType) return;
    if (approvalPending) {
      toast.error('Üyeliğiniz onay bekliyor. Onay gelene kadar paylaşım yapamazsınız.');
      return;
    }

    const isText = contentType === 'text';
    const requiresText = isText || !isFastMode; // polit always requires text; fast requires text only for text posts
    let trimmed = String(text || '').trim();
    if (requiresText) {
      if (trimmed.length < TEXT_MIN) return toast.error(`Metin en az ${TEXT_MIN} karakter olmalı.`);
      if (trimmed.length > TEXT_MAX) return toast.error(`Metin en fazla ${TEXT_MAX} karakter olabilir.`);
    }

    if (!isText && !hasMedia) {
      return toast.error(contentType === 'image' ? 'Önce resim ekleyin.' : contentType === 'audio' ? 'Önce ses ekleyin.' : 'Önce video ekleyin.');
    }

    // Fast medya gönderilerinde metin zorunlu değil ama backend boş içerik kabul etmiyor:
    // medyaya göre kısa bir placeholder koyuyoruz.
    if (!requiresText && !trimmed && hasMedia) {
      trimmed = contentType === 'video' ? '🎥' : contentType === 'audio' ? '🎙️' : contentType === 'image' ? '📷' : '📝';
    }

    // Basic file type checks
    // NOTE: Some mobile browsers provide empty/incorrect MIME types (e.g. application/octet-stream),
    // so we validate by a best-effort guess (MIME or extension) instead of strict `file.type`.
    const guessKind = (f) => {
      const t = String(f?.type || '').trim().toLowerCase();
      if (t.startsWith('video/')) return 'video';
      if (t.startsWith('audio/')) return 'audio';
      if (t.startsWith('image/')) return 'image';
      const name = String(f?.name || '').trim().toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      if (!ext) return '';
      if (['mp4', 'm4v', 'mov', 'webm', '3gp', '3g2'].includes(ext)) return 'video';
      if (['mp3', 'm4a', 'aac', 'wav', 'ogg', 'webm'].includes(ext)) return 'audio';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
      return '';
    };
    if (contentType === 'video' && files.some((f) => guessKind(f) !== 'video')) return toast.error('Sadece video dosyası (mp4/mov/m4v/webm/3gp).');
    if (contentType === 'audio' && files.some((f) => guessKind(f) !== 'audio')) return toast.error('Sadece ses dosyası (mp3/m4a/aac/wav/ogg).');
    if (contentType === 'image' && files.some((f) => guessKind(f) !== 'image')) return toast.error('Sadece resim dosyası (jpg/png/webp/gif).');

    publishLockRef.current = true;
    setLoading(true);
    setUploadPct(0);
    setUploadHint('');
    try {
      let media_urls = [];
      if (files.length > 0) {
        const list = files.slice(0, contentType === 'image' ? 10 : 1);
        const totalBytes = list.reduce((acc, f) => acc + (Number(f?.size || 0) || 0), 0) || 0;
        let doneBytes = 0;
        const out = [];
        let idxFile = 0;
        for (const f of list) {
          idxFile += 1;
          setUploadHint(`Yükleniyor… (${idxFile}/${list.length})`);
          // eslint-disable-next-line no-await-in-loop
          const url = await uploadOne(f, (p) => {
            const pct = totalBytes > 0 ? (doneBytes + (Number(f?.size || 0) || 0) * p) / totalBytes : p;
            setUploadPct(Math.max(0, Math.min(1, pct)));
          });
          out.push(url);
          doneBytes += Number(f?.size || 0) || 0;
          setUploadPct(totalBytes > 0 ? Math.min(1, doneBytes / totalBytes) : 1);
        }
        media_urls = out;
      }

      let thumbnail_url = null;
      if (contentType === 'video' && videoThumbs?.length > 0) {
        const chosen = videoThumbs[Math.min(Math.max(0, selectedVideoThumbIdx), videoThumbs.length - 1)] || null;
        if (chosen?.blob) {
          const thumbFile = new File([chosen.blob], 'thumb.jpg', { type: 'image/jpeg' });
          // mark folder without changing uploadOne signature
          thumbFile.__uploadFolder = 'posts/thumbnails';
          setUploadHint('Kapak yükleniyor…');
          thumbnail_url = await uploadOne(thumbFile, (p) => setUploadPct(Math.max(0, Math.min(1, p))));
        }
      }

      const payload = {
        content: trimmed,
        content_text: trimmed,
        content_type: contentType,
        category: 'general',
        agenda_tag: agendaTag || null,
        media_urls,
        ...(thumbnail_url ? { thumbnail_url } : {}),
        ...(mediaDurationSec > 0 ? { media_duration: mediaDurationSec } : {}),
        ...(isFastMode ? { is_trending: true } : {}),
      };

      const r = await postsApi.create(payload);
      const ok = !!(r?.success && r?.data?.id);
      if (!ok) throw new Error(r?.error || 'Paylaşım oluşturulamadı.');
      setPrimaryPost(r.data);
      setStep('success');
    } catch (e) {
      toast.error(String(e?.message || 'Paylaşım oluşturulurken hata oluştu.'));
    } finally {
      setLoading(false);
      publishLockRef.current = false;
    }
  };

  const publishCross = async () => {
    if (!primaryPost) return;
    if (offerBusy) return;
    if (publishLockRef.current) return;
    publishLockRef.current = true;
    setOfferBusy(true);
    try {
      const base = {
        content: String(primaryPost?.content_text ?? primaryPost?.content ?? text ?? '').trim(),
        content_text: String(primaryPost?.content_text ?? primaryPost?.content ?? text ?? '').trim(),
        content_type: String(primaryPost?.content_type || contentType || 'text').trim(),
        category: String(primaryPost?.category || 'general'),
        agenda_tag: agendaTag || null,
        media_urls: Array.isArray(primaryPost?.media_urls) ? primaryPost.media_urls : [],
        thumbnail_url: primaryPost?.thumbnail_url || null,
      };
      const payload = {
        ...base,
        ...(isFastMode ? { is_trending: false } : { is_trending: true }),
      };
      const r = await postsApi.create(payload).catch(() => null);
      const ok = !!(r?.success && r?.data?.id);
      if (!ok) {
        toast.error('Çapraz paylaşım oluşturulamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setOfferBusy(false);
      publishLockRef.current = false;
    }
  };

  const publishCrossWithText = async () => {
    if (!primaryPost) return;
    if (!isFastMode) return; // only needed for Fast -> Polit flow
    if (offerBusy) return;
    if (publishLockRef.current) return;

    const trimmed = String(text || '').trim();
    if (trimmed.length < TEXT_MIN) return toast.error(`Metin en az ${TEXT_MIN} karakter olmalı.`);
    if (trimmed.length > TEXT_MAX) return toast.error(`Metin en fazla ${TEXT_MAX} karakter olabilir.`);

    publishLockRef.current = true;
    setOfferBusy(true);
    try {
      const base = {
        content: trimmed,
        content_text: trimmed,
        content_type: String(primaryPost?.content_type || contentType || 'text').trim(),
        category: String(primaryPost?.category || 'general'),
        agenda_tag: primaryPost?.agenda_tag ?? agendaTag ?? null,
        media_urls: Array.isArray(primaryPost?.media_urls) ? primaryPost.media_urls : [],
        thumbnail_url: primaryPost?.thumbnail_url || null,
        ...(primaryPost?.media_duration ? { media_duration: primaryPost.media_duration } : {}),
      };
      const payload = { ...base, is_trending: false };
      const r = await postsApi.create(payload).catch(() => null);
      const id = r?.data?.id;
      const ok = !!(r?.success && id);
      if (!ok) return toast.error('Polit yayınlanamadı. Lütfen tekrar deneyin.');
      toast.success('Polit yayınlandı.');
      navigate(`/post/${encodeURIComponent(id)}`);
    } finally {
      setOfferBusy(false);
      publishLockRef.current = false;
    }
  };

  const finishNo = () => {
    if (isFastMode) navigate('/fast');
    else navigate(primaryPost?.id ? `/post/${primaryPost.id}` : '/');
  };

  const finishYes = async () => {
    if (offerBusy) return;
    await publishCross();
    if (isFastMode) navigate('/fast');
    else navigate(primaryPost?.id ? `/post/${primaryPost.id}` : '/');
  };

  const typeButtons = useMemo(
    () => [
      { key: 'video', label: 'Video', Icon: Video },
      { key: 'image', label: 'Resim', Icon: ImageIcon },
      { key: 'audio', label: 'Ses', Icon: Music },
      { key: 'text', label: 'Yazı', Icon: PenTool },
    ],
    []
  );

  const canSubmitText = useMemo(() => {
    const trimmed = String(text || '').trim();
    return trimmed.length >= TEXT_MIN && trimmed.length <= TEXT_MAX;
  }, [text]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <div className="container-main py-6">
        <div className="max-w-xl mx-auto">
          <div className={['bg-white rounded-3xl border-2 overflow-hidden', theme.borderClass].join(' ')}>
            {/* Fixed top identity + back */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={user?.avatar_url || user?.profile_image} size="46px" verified={isUiVerifiedUser(user)} className="border border-gray-200 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-black text-gray-900 truncate">{user?.full_name || 'Misafir'}</div>
                  <div className="text-xs text-gray-500 truncate">@{user?.username || '-'}</div>
                </div>
              </div>
              {step !== 'success' ? (
                <button
                  type="button"
                  onClick={step === 'type' ? () => navigate(-1) : goBack}
                  className={['px-4 py-2 rounded-2xl border-2 font-black bg-white hover:bg-gray-50', theme.btnAltClass].join(' ')}
                >
                  Geri Dön
                </button>
              ) : null}
            </div>

            <div className="p-5 space-y-4">
              {/* STEP: TYPE */}
              {step === 'type' ? (
                <div className="grid grid-cols-2 gap-3">
                  {typeButtons.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickType(key)}
                      className="rounded-3xl p-2 bg-transparent hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2"
                    >
                      {(() => {
                        const candidates = iconCandidates?.[key] || [];
                        const idx = Number(iconTryIndex?.[key] || 0);
                        const src = candidates[idx] || '';
                        const showImage = !!src && !brokenIcons[key];
                        if (showImage) {
                          return (
                            <img
                              src={src}
                              alt={label}
                              className="w-[104px] h-[104px] sm:w-[120px] sm:h-[120px] object-contain"
                              loading="eager"
                              fetchpriority="high"
                              onError={() => {
                                const next = idx + 1;
                                if (next < candidates.length) {
                                  setIconTryIndex((p) => ({ ...p, [key]: next }));
                                } else {
                                  setBrokenIcons((p) => ({ ...p, [key]: true }));
                                }
                              }}
                            />
                          );
                        }
                        return <Icon className="w-16 h-16" style={{ color: theme.primary }} />;
                      })()}
                      <div className="text-sm font-black text-gray-900">{label}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* STEP: AGENDA */}
              {step === 'agenda' ? (
                <div className="space-y-3">
                  <div className="text-sm font-black text-gray-900">Gündem Seçin</div>
                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                    {sortedAgendas.slice(0, agendaVisibleCount).map((a) => {
                      const title = String(a?.title || a?.name || '').trim();
                      if (!title) return null;
                      const score = agendaScoreOf(a);
                      return (
                        <button
                          key={a?.id || a?.slug || title}
                          type="button"
                          onClick={() => pickAgenda(title)}
                          className="w-full rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <span className="font-black text-gray-900 truncate">{title}</span>
                          <span className="font-black text-gray-700 flex-shrink-0">{score}</span>
                        </button>
                      );
                    })}
                    {sortedAgendas.length > agendaVisibleCount ? (
                      <button
                        type="button"
                        onClick={() => setAgendaVisibleCount((v) => Math.min(sortedAgendas.length, v + 10))}
                        className="w-full py-4 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                      >
                        + DİĞER GÜNDEMLERİ YÜKLE
                      </button>
                    ) : null}
                    {sortedAgendas.length === 0 ? (
                      <div className="text-sm text-gray-600">Gündem listesi boş.</div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => pickAgenda('')}
                    className={['w-full py-4 rounded-2xl text-white font-black', theme.btnClass].join(' ')}
                  >
                    Gündem Dışı Paylaşım
                  </button>
                </div>
              ) : null}

              {/* STEP: MEDIA */}
              {step === 'media' ? (
                <div className="space-y-4">
                  {/* Preview */}
                  {contentType === 'video' ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl border border-gray-200 bg-black overflow-hidden">
                        {isRecording ? (
                          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-xs font-semibold text-white">Kayıt Yapıyor!</span>
                          </div>
                        ) : null}
                        {isRecording ? (
                          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                            <div
                              className={[
                                'px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg bg-gray-800/90 border border-white/10',
                                'font-black text-xs md:text-sm tabular-nums',
                                recordSecLeft <= 9 ? 'text-red-400 animate-pulse' : 'text-sky-300',
                              ].join(' ')}
                              aria-label="Kalan süre"
                              title="Kalan süre"
                            >
                              {String(recordSecLeft).padStart(2, '0')}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                recordStopFiredRef.current = true;
                                stopRecording();
                              }}
                              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center leading-none overflow-hidden"
                              aria-label="Durdur"
                              title="Durdur"
                            >
                              <span className="absolute inset-0 rounded-full ring-4 ring-red-400/35 animate-pulse" />
                              <span className="relative text-[8px] md:text-[11px] font-black leading-none">BİTİR</span>
                              <span className="relative mt-0.5 md:mt-2 w-3 h-3 md:w-5 md:h-5 bg-white rounded-sm" />
                            </button>
                          </div>
                        ) : null}
                        {isRecording ? (
                          <video
                            ref={previewRef}
                            className="w-full aspect-video bg-black object-cover"
                            playsInline
                            muted
                            autoPlay
                          />
                        ) : recordedUrl ? (
                          <video
                            src={recordedUrl}
                            controls
                            className="w-full aspect-video bg-black object-contain"
                            playsInline
                          />
                        ) : (
                          <div className="p-6 text-sm text-white/80">Video önizleme burada görünecek.</div>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-[11px] text-gray-600">
                        <Smartphone className="w-4 h-4 text-gray-500" />
                        <span>Telefonu dik tutunuz</span>
                      </div>

                      {videoThumbs.length > 0 ? (
                        <div>
                          <div className="text-xs font-black text-gray-900 mb-2">Önizleme seçin</div>
                          <div className="grid grid-cols-3 gap-2">
                            {videoThumbs.map((t, i) => (
                              <button
                                key={`${t?.previewUrl || ''}_${i}`}
                                type="button"
                                onClick={() => setSelectedVideoThumbIdx(i)}
                                className={[
                                  'rounded-2xl overflow-hidden border-2 bg-gray-50',
                                  i === selectedVideoThumbIdx ? theme.borderClass : 'border-gray-200',
                                ].join(' ')}
                                title={`Önizleme ${i + 1}`}
                              >
                                <img src={t.previewUrl} alt="" className="w-full aspect-video object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : contentType === 'audio' ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl border border-gray-200 bg-black overflow-hidden">
                        {isRecording ? (
                          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-xs font-semibold text-white">Kayıt Yapıyor!</span>
                          </div>
                        ) : null}
                        {isRecording ? (
                          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                            <div
                              className={[
                                'px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg bg-gray-800/90 border border-white/10',
                                'font-black text-xs md:text-sm tabular-nums',
                                recordSecLeft <= 9 ? 'text-red-400 animate-pulse' : 'text-sky-300',
                              ].join(' ')}
                              aria-label="Kalan süre"
                              title="Kalan süre"
                            >
                              {String(recordSecLeft).padStart(2, '0')}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                recordStopFiredRef.current = true;
                                stopRecording();
                              }}
                              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center leading-none overflow-hidden"
                              aria-label="Durdur"
                              title="Durdur"
                            >
                              <span className="absolute inset-0 rounded-full ring-4 ring-red-400/35 animate-pulse" />
                              <span className="relative text-[8px] md:text-[11px] font-black leading-none">BİTİR</span>
                              <span className="relative mt-0.5 md:mt-2 w-3 h-3 md:w-5 md:h-5 bg-white rounded-sm" />
                            </button>
                          </div>
                        ) : null}
                        <div className="w-full aspect-video flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full bg-blue-600/25 border border-blue-300/30 flex items-center justify-center">
                            <Mic className="w-12 h-12 text-blue-200" />
                          </div>
                        </div>
                      </div>

                      {recordedUrl ? <audio src={recordedUrl} controls className="w-full" /> : <div className="text-sm text-gray-600">Ses önizleme burada.</div>}
                    </div>
                  ) : contentType === 'image' ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      {imagePreviews.length > 0 ? (
                        <div className="space-y-3">
                          {/* Main preview (large, button-sized feel) */}
                          <div className="rounded-3xl border border-gray-200 bg-gray-50 overflow-hidden">
                            <img
                              src={imagePreviews[0]}
                              alt="Seçilen resim"
                              className="w-full aspect-square object-cover"
                            />
                          </div>

                          {/* Extra thumbnails */}
                          {imagePreviews.length > 1 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {imagePreviews.slice(1).map((u) => (
                                <img key={u} src={u} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">Resim önizleme burada görünecek.</div>
                      )}
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  {!hasMedia && !isRecording ? (
                  <div className="grid grid-cols-2 gap-3">
                    {contentType === 'video' ? (
                      <>
                        <button
                          type="button"
                          onClick={startRecording}
                          className={[
                            'rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 text-white font-black',
                            theme.btnClass,
                          ].join(' ')}
                        >
                          <Video className="w-14 h-14" />
                          <div>Kayda Başla</div>
                          <div className="text-[11px] font-semibold opacity-90">
                            Maximum <span className="font-black">1 Dk.</span> uzunluğunda olabilir
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => videoUploadRef.current?.click()}
                          className="rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                        >
                          <UploadCloud className="w-14 h-14" style={{ color: theme.primary }} />
                          <div>{isMobileLike ? 'Telefondan Yükle' : 'Bilgisayardan Yükle'}</div>
                        </button>
                        <button
                          type="button"
                          disabled={isRecording}
                          onClick={() => setVideoFacingMode((p) => (p === 'user' ? 'environment' : 'user'))}
                          className="col-span-2 px-4 py-3 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black disabled:opacity-60"
                        >
                          Kamera Değiştir ({videoFacingMode === 'user' ? 'Ön Kamera' : 'Arka Kamera'})
                        </button>
                      </>
                    ) : contentType === 'image' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => imageCaptureRef.current?.click()}
                          className={['rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 text-white font-black', theme.btnClass].join(' ')}
                        >
                          <Camera className="w-14 h-14" />
                          <div>Resim Çek</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => imageUploadRef.current?.click()}
                          className="rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                        >
                          <UploadCloud className="w-14 h-14" style={{ color: theme.primary }} />
                          <div>{isMobileLike ? 'Telefondan Yükle' : 'Bilgisayardan Yükle'}</div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={startRecording}
                          className={[
                            'rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 text-white font-black',
                            theme.btnClass,
                          ].join(' ')}
                        >
                          <Mic className="w-14 h-14" />
                          <div>Kayda Başla</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => audioUploadRef.current?.click()}
                          className="rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                        >
                          <UploadCloud className="w-14 h-14" style={{ color: theme.primary }} />
                          <div>{isMobileLike ? 'Telefondan Yükle' : 'Bilgisayardan Yükle'}</div>
                        </button>
                      </>
                    )}
                  </div>
                  ) : null}

                  <input
                    ref={videoUploadRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const duration = await getVideoDurationSec(f).catch(() => 0);
                        if (duration && duration > 60.5) {
                          toast.error('Video maksimum 1 dakika olmalı.');
                          e.target.value = '';
                          return;
                        }
                      } catch {
                        // ignore duration check
                      }
                      resetMedia();
                      setFiles([f]);
                      try {
                        setRecordedUrl(URL.createObjectURL(f));
                      } catch {
                        // ignore
                      }
                    }}
                  />
                  <input
                    ref={audioUploadRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const duration = await getAudioDurationSec(f).catch(() => 0);
                        if (duration && duration > 60.5) {
                          toast.error('Ses maksimum 1 dakika olmalı.');
                          e.target.value = '';
                          return;
                        }
                      } catch {
                        // ignore duration check
                      }
                      resetMedia();
                      setFiles([f]);
                      try {
                        setRecordedUrl(URL.createObjectURL(f));
                      } catch {
                        // ignore
                      }
                    }}
                  />
                  <input
                    ref={imageUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const picked = Array.from(e.target.files || []).slice(0, 10);
                      if (picked.length === 0) return;
                      resetMedia();
                      const optimized = await optimizeImageFiles(picked);
                      setFiles(optimized);
                    }}
                  />
                  <input
                    ref={imageCaptureRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const picked = Array.from(e.target.files || []).slice(0, 10);
                      if (picked.length === 0) return;
                      resetMedia();
                      const optimized = await optimizeImageFiles(picked);
                      setFiles(optimized);
                    }}
                  />

                  {hasMedia ? (
                    <button
                      type="button"
                      onClick={resetMedia}
                      className="w-full py-3 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-7 h-7" />
                      Temizle
                    </button>
                  ) : null}

                  {/* Continue / Publish */}
                  {canShowSubmitInMediaStep ? (
                    !isFastMode ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setDescTarget('primary');
                          setStep('desc');
                        }}
                        className={[
                          'w-full rounded-3xl text-white font-black disabled:opacity-60',
                          'bg-emerald-600 hover:bg-emerald-700',
                          'py-5',
                        ].join(' ')}
                      >
                        <div className="text-lg leading-none">Gönder</div>
                        <div className="text-xs font-semibold opacity-90 mt-1">Açıklama ekleyip paylaş</div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={publishPrimary}
                        className={[
                          'w-full rounded-3xl text-white font-black disabled:opacity-60',
                          'bg-emerald-600 hover:bg-emerald-700',
                          'py-5',
                        ].join(' ')}
                      >
                        <div className="text-lg leading-none">
                          {preparingMedia ? 'Hazırlanıyor…' : loading ? `Yükleniyor… %${Math.round(uploadPct * 100)}` : 'Gönder'}
                        </div>
                        <div className="text-xs font-semibold opacity-90 mt-1">{uploadHint || (isFastMode ? 'Fast paylaşımı' : 'Polit paylaşımı')}</div>
                        {loading ? (
                          <div className="mt-3 w-full h-2 rounded-full bg-white/20 overflow-hidden">
                            <div className="h-full bg-white/90" style={{ width: `${Math.round(uploadPct * 100)}%` }} />
                          </div>
                        ) : null}
                      </button>
                    )
                  ) : null}
                </div>
              ) : null}

              {/* STEP: DESC */}
              {step === 'desc' ? (
                <div className="space-y-3">
                  <div className="text-lg font-black text-gray-900">
                    {descTarget === 'cross' ? 'Polit için kısa bir başlık yada açıklama giriniz!' : 'Kısa bir başlık yada açıklama giriniz!'}
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    maxLength={TEXT_MAX}
                    className={[
                      'w-full px-4 py-3 border-2 rounded-2xl outline-none resize-none',
                      isFastMode ? 'border-rose-200 focus:border-rose-500' : 'border-blue-200 focus:border-primary-blue',
                    ].join(' ')}
                    placeholder="En az 10, en fazla 300 karakter…"
                  />
                  <div className="text-xs text-gray-600 flex items-center justify-between">
                    <span>
                      Minimum <span className="font-black">{TEXT_MIN}</span> / Maksimum <span className="font-black">{TEXT_MAX}</span>
                    </span>
                    <span className="font-black">{String(text || '').trim().length}/{TEXT_MAX}</span>
                  </div>

                  <button
                    type="button"
                    disabled={loading || !canSubmitText}
                    onClick={descTarget === 'cross' ? publishCrossWithText : publishPrimary}
                    className={['w-full py-4 rounded-2xl text-white font-black disabled:opacity-60', theme.btnClass].join(' ')}
                  >
                    {loading
                      ? 'Gönderiliyor…'
                      : descTarget === 'cross'
                        ? 'Polit At'
                        : isFastMode
                          ? 'Fast At'
                          : 'Polit At'}
                  </button>
                </div>
              ) : null}

              {/* STEP: SUCCESS */}
              {step === 'success' ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-gray-900">
                      {isFastMode ? 'Başarıyla Fast attınız!' : 'Başarıyla Polit attınız!'}
                    </div>
                    <div className="text-sm text-gray-700 mt-2">
                      {isFastMode
                        ? 'İsterseniz bu Fast’i Polit olarak da yayınlayabilirsiniz!'
                        : 'İsterseniz bu Polit’i Fast olarak da yayınlayabilirsiniz!'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={offerBusy}
                      onClick={() => {
                        // Requirement: If a Fast media post is being cross-published as Polit,
                        // require a real description before creating the Polit.
                        if (isFastMode && contentType !== 'text') {
                          setDescTarget('cross');
                          setStep('desc');
                          return;
                        }
                        finishYes();
                      }}
                      className={['rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 text-white font-black', theme.btnClass].join(' ')}
                    >
                      <div className="text-2xl">EVET</div>
                      <div className="text-sm font-black">{isFastMode ? 'Polit At' : 'Fast At'}</div>
                    </button>
                    <button
                      type="button"
                      disabled={offerBusy}
                      onClick={finishNo}
                      className="rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                    >
                      <div className="text-2xl">HAYIR</div>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
