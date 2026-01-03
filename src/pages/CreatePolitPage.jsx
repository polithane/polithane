import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Trash2, Video, Image as ImageIcon, Music, PenTool, UploadCloud, Mic, StopCircle, Smartphone, RotateCcw } from 'lucide-react';
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
  const [videoThumbRefreshCount, setVideoThumbRefreshCount] = useState(0);
  const [videoThumbGenSeed, setVideoThumbGenSeed] = useState(0);

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
  const [isDevicePortrait, setIsDevicePortrait] = useState(true); // Yatay uyarı için

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
    setVideoThumbRefreshCount(0);
    setVideoThumbGenSeed(0);
    if (recordedUrl) {
      try {
        URL.revokeObjectURL(recordedUrl);
      } catch {
        // ignore
      }
    }
    setRecordedUrl('');
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
          if (typeof videoEl?.requestVideoFrameCallback === 'function') {
            return videoEl.requestVideoFrameCallback((_now, _meta) => resolve(true));
          }
        } catch {
          // ignore
        }
        try {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
          return;
        } catch {
          // ignore
        }
        setTimeout(() => resolve(true), 220);
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
              try {
                await videoEl.play?.();
                videoEl.pause?.();
              } catch {
                // ignore
              }
              if (Number(videoEl.readyState || 0) < 2) {
                await new Promise((resolve) => {
                  let settled = false;
                  const done = () => {
                    if (settled) return;
                    settled = true;
                    try {
                      videoEl.removeEventListener('loadeddata', done);
                      videoEl.removeEventListener('canplay', done);
                      videoEl.removeEventListener('timeupdate', done);
                    } catch {
                      // ignore
                    }
                    resolve(true);
                  };
                  try {
                    videoEl.addEventListener('loadeddata', done, { once: true });
                    videoEl.addEventListener('canplay', done, { once: true });
                    videoEl.addEventListener('timeupdate', done, { once: true });
                  } catch {
                    // ignore
                  }
                  setTimeout(done, 380);
                });
              }
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
            if (videoEl.readyState < 2) videoEl.load?.();
          } catch {
            // ignore
          }
          try {
            if (Math.abs(Number(videoEl.currentTime || 0) - t) < 0.02) {
              const bumped = clamp(t + 0.06, 0.05, maxT);
              if (Math.abs(bumped - t) >= 0.02) t = bumped;
            }
          } catch {
            // ignore
          }
          videoEl.currentTime = t;

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
          videoEl.style.position = 'fixed';
          videoEl.style.left = '-9999px';
          videoEl.style.top = '0';
          videoEl.style.width = '1px';
          videoEl.style.height = '1px';
          videoEl.style.opacity = '0';
          document.body.appendChild(videoEl);
        } catch {
          // ignore
        }
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
          await videoEl.play?.();
          videoEl.pause?.();
        } catch {
          // ignore
        }
        try {
          videoEl.currentTime = 0.1;
          await waitForFrame(videoEl);
        } catch {
          // ignore
        }
        const duration = Number(videoEl.duration || 0);
        const d = Number.isFinite(duration) && duration > 0 ? duration : Math.max(1, Number(mediaDurationSec || 0) || 1);

        const maxT = Math.max(0.05, d - 0.12);
        const jitter = (Number(videoThumbGenSeed || 0) % 7) * 0.07;
        const rawTimes = [Math.min(0.12 + jitter, maxT), d * 0.45 + jitter, d * 0.82 + jitter].map((t) => clamp(t, 0.05, maxT));
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
        const candidates = uniqTimes.slice();
        for (const pct of [0.18, 0.28, 0.6, 0.72, 0.9]) {
          candidates.push(clamp(d * pct + jitter, 0.05, maxT));
        }
        const uniqueCandidates = [];
        for (const t of candidates) {
          const tt = Number(Number(t).toFixed(2));
          if (!uniqueCandidates.some((x) => Math.abs(x - tt) < 0.02)) uniqueCandidates.push(tt);
        }
        for (const t of uniqueCandidates) {
          if (cancelled) break;
          const one = await captureAt(videoEl, t, d);
          if (one) captured.push(one);
          if (captured.length >= 3) break;
        }
        if (cancelled) {
          cleanupPrev(captured);
          return;
        }
        setVideoThumbs(captured.slice(0, 3));
        setSelectedVideoThumbIdx(0);
        try {
          videoEl.pause?.();
          videoEl.removeAttribute?.('src');
          videoEl.load?.();
          videoEl.remove?.();
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, recordedUrl, isRecording, videoThumbGenSeed]);

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
      let stream = null;
      if (contentType === 'video') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: videoFacingMode,
            width: { ideal: 720 },
            height: { ideal: 1280 },
            // aspectRatio zorlamıyoruz → doğal yön korunuyor
          },
          audio: true,
        });

        // Cihaz yönünü kontrol et (uyarı için)
        const settings = stream.getVideoTracks()[0]?.getSettings();
        setIsDevicePortrait((settings?.height || 0) >= (settings?.width || 0));
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      if (contentType === 'video' && previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        previewRef.current.playsInline = true;
        previewRef.current.setAttribute('playsinline', 'true');
        previewRef.current.setAttribute('webkit-playsinline', 'true');
        await previewRef.current.play().catch(() => null);
        setTimeout(() => {
          try { previewRef.current?.play?.().catch(() => null); } catch { /* ignore */ }
        }, 250);
      }

      // Doğrudan ham stream ile kaydediyoruz (canvas dönüşü kaldırıldı)
      const mimeType =
        contentType === 'audio'
          ? MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : ''
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : '';
      const recorderOptions =
        contentType === 'video'
          ? {
              ...(mimeType ? { mimeType } : {}),
              videoBitsPerSecond: 2_800_000,
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

  // ... (uploadOne, publishPrimary, publishCross, publishCrossWithText, goToFastStream, finishNo, finishYes, typeButtons, canSubmitText aynı kaldı)

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
                      <div className="relative rounded-2xl border border-gray-200 bg-black overflow-hidden aspect-[9/16]">
                        {isRecording ? (
                          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-xs font-semibold text-white">Kayıt Yapıyor!</span>
                          </div>
                        ) : null}
                        {isRecording ? (
                          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-3">
                            <div
                              className={[
                                'px-2 py-1 md:px-3 md:py-1.5 rounded-xl bg-black/75 border border-white/20 backdrop-blur-sm',
                                'font-black text-sm md:text-lg tabular-nums',
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
                              className={[
                                'relative rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center leading-none overflow-hidden',
                                'shadow-[0_18px_60px_rgba(0,0,0,0.55)]',
                                'w-28 h-28',
                                '[@media(pointer:coarse)]:w-40 [@media(pointer:coarse)]:h-40',
                                '[@media(pointer:fine)]:w-20 [@media(pointer:fine)]:h-20',
                              ].join(' ')}
                              aria-label="Durdur"
                              title="Durdur"
                            >
                              <span className="absolute inset-0 rounded-full ring-4 ring-red-400/35 animate-pulse" />
                              <span
                                className={[
                                  'relative px-3 py-1 rounded-lg bg-black/25 backdrop-blur font-black leading-none drop-shadow',
                                  'text-lg',
                                  '[@media(pointer:coarse)]:text-2xl',
                                  '[@media(pointer:fine)]:text-base',
                                ].join(' ')}
                              >
                                BİTİR
                              </span>
                              <span
                                className={[
                                  'relative mt-2 bg-white rounded-md',
                                  'w-6 h-6',
                                  '[@media(pointer:coarse)]:w-8 [@media(pointer:coarse)]:h-8',
                                  '[@media(pointer:fine)]:w-5 [@media(pointer:fine)]:h-5',
                                ].join(' ')}
                              />
                            </button>
                          </div>
                        ) : null}
                        {isRecording ? (
                          <video
                            ref={previewRef}
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                            playsInline
                            muted
                            autoPlay
                          />
                        ) : recordedUrl ? (
                          <video
                            src={recordedUrl}
                            controls
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                            playsInline
                          />
                        ) : (
                          <div className="p-6 text-sm text-white/80">Video önizleme burada görünecek.</div>
                        )}
                      </div>
                      {isMobileLike && isRecording && !isDevicePortrait ? (
                        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-600">
                          <Smartphone className="w-4 h-4 text-gray-500" />
                          <span>Telefonu dik tutunuz</span>
                        </div>
                      ) : null}
                      {videoThumbs.length > 0 ? (
                        <div className="relative">
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
                          {videoThumbRefreshCount < 3 ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (videoThumbRefreshCount >= 3) return;
                                setVideoThumbRefreshCount((c) => c + 1);
                                setVideoThumbGenSeed((s) => Number(s || 0) + 1);
                              }}
                              className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center justify-center"
                              aria-label="Önizlemeleri yenile"
                              title={`Önizlemeleri yenile (${3 - videoThumbRefreshCount} hak kaldı)`}
                            >
                              <RotateCcw className="w-5 h-5 text-gray-800" />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : /* diğer contentType'lar tamamen orijinal kaldı */}
                  {/* ... (audio ve image preview'ları tamamen aynı) */}
                  <canvas ref={recordCanvasRef} className="hidden" />

                  {/* Action buttons ve input'lar tamamen aynı */}
                  {/* ... */}

                  {canShowSubmitInMediaStep ? (
                    /* ... tamamen aynı */
                  ) : null}
                </div>
              ) : null}
              {/* DESC ve SUCCESS step'leri tamamen aynı */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
