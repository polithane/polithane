import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Trash2, Video, Image as ImageIcon, Music, PenTool, UploadCloud, Mic, StopCircle, Smartphone, RotateCcw, SwitchCamera } from 'lucide-react';
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
  const [descTarget, setDescTarget] = useState('primary'); // primary | cross
  const isFastUi = useMemo(() => (step === 'success' || descTarget === 'cross' ? !isFastMode : isFastMode), [descTarget, isFastMode, step]);

  const [contentType, setContentType] = useState(''); // video | image | audio | text
  const [agendaTag, setAgendaTag] = useState(''); // '' => gündem dışı
  const [agendas, setAgendas] = useState([]);
  const [agendaVisibleCount, setAgendaVisibleCount] = useState(10);

  // Use user-provided icon images from Storage (ikons folder/bucket), fallback to local /icons.
  const iconBaseUrls = useMemo(() => {
    try {
      const explicit = String(import.meta.env?.VITE_ICON_BASE_URL || '').trim();
      const supabaseUrl = String(import.meta.env?.VITE_SUPABASE_URL || '').trim().replace(/\/+$/g, '');      const bases = [];
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
      primary: 'var(--primary-color)',
      borderClass: 'border-primary-blue',
      btnClass: 'bg-primary-blue hover:opacity-90',
      btnAltClass: 'border-primary-blue text-primary-blue',
      ringClass: 'ring-primary-blue/20',
    }),
    []
  );
  const baseTheme = useMemo(() => (isFastMode ? themeFast : themePolit), [isFastMode, themeFast, themePolit]);
  // On the cross-post offer screen, use the TARGET's theme:
  // - Polit → offer Fast => Fast (red)
  // - Fast → offer Polit => Polit (blue)
  const offerTheme = useMemo(() => (isFastMode ? themePolit : themeFast), [isFastMode, themeFast, themePolit]);
  const theme = useMemo(
    () => ((step === 'success' || descTarget === 'cross') ? offerTheme : baseTheme),
    [baseTheme, descTarget, offerTheme, step]
  );

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
  const recordCanvasRef = useRef(null);
  const recordCanvasRafRef = useRef(null);
  const recordOutStreamRef = useRef(null);
  const recordAutoRotateRef = useRef(null); // null | boolean (decided per recording session)
  const activeVideoDeviceIdRef = useRef('');
  const [recordPreviewFit, setRecordPreviewFit] = useState('contain'); // contain | cover
  const [recordStreamNote, setRecordStreamNote] = useState('');
  const recordTimeoutRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const recordStartTsRef = useRef(0);
  const recordStopFiredRef = useRef(false);
  const recordDiscardOnStopRef = useRef(false);
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
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioAnimationRef = useRef(null);
  const audioCanvasRef = useRef(null);

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
  // Worker-based pipeline: cover thumbnails are generated server-side after upload.
  // Client-side thumbnail capture is slow and often has rotation quirks on mobile browsers.
  const isCoverPreparing = useMemo(() => false, []);
  const canShowSubmitInMediaStep = useMemo(() => {
    // Hide submit button during picking/recording; show only when we have a preview-ready media.
    if (step !== 'media') return false;
    if (isRecording) return false;
    if (preparingMedia) return false;
    return hasMedia;
  }, [hasMedia, isRecording, preparingMedia, step]);

  // While cover thumbnails are being prepared, don't let the recorded preview play.
  useEffect(() => {
    if (contentType !== 'video') return;
    if (!recordedUrl) return;
    if (isRecording) return;
    if (!isCoverPreparing) return;
    const el = previewRef.current;
    if (!el) return;
    try {
      el.pause?.();
      el.currentTime = 0;
    } catch {
      // ignore
    }
  }, [contentType, recordedUrl, isCoverPreparing, isRecording]);

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
    // Stop audio visualization
    if (audioAnimationRef.current) {
      try {
        cancelAnimationFrame(audioAnimationRef.current);
      } catch {
        // ignore
      }
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    audioAnalyserRef.current = null;
    // Stop canvas capture loop + stream (if used)
    try {
      if (recordCanvasRafRef.current) cancelAnimationFrame(recordCanvasRafRef.current);
      recordCanvasRafRef.current = null;
    } catch {
      // ignore
    }
    try {
      const out = recordOutStreamRef.current;
      out?.stop?.();
      const cs = out?.canvasStream;
      cs?.getTracks?.()?.forEach?.((t) => t.stop());
      const src = out?.sourceEl;
      try {
        src?.pause?.();
        if (src) src.srcObject = null;
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
    recordOutStreamRef.current = null;
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

    // Disabled: we rely on the FFmpeg worker to generate thumbnail_url.
    if (true) {
      cancelled = true;
      return undefined;
    }

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
        // Fallback: allow decoder/render pipeline to catch up (esp. desktop Firefox)
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
              // Some desktop browsers won't decode frames for off-DOM video elements
              // unless we force a brief play/pause (muted autoplay should be allowed).
              try {
                // eslint-disable-next-line no-await-in-loop
                await videoEl.play?.();
                videoEl.pause?.();
              } catch {
                // ignore
              }
              // Ensure enough data is buffered/decoded for canvas draw
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
        // Attach offscreen to help desktop browsers decode frames reliably
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
          // Warm up decode pipeline for desktop as well
          await videoEl.play?.();
          videoEl.pause?.();
        } catch {
          // ignore
        }
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
        // Apply small deterministic jitter so "Yenile" generates different frames.
        const maxT = Math.max(0.05, d - 0.12);
        const jitter = (Number(videoThumbGenSeed || 0) % 7) * 0.07; // 0..0.42s
        const rawTimes = [Math.min(0.12 + jitter, maxT), d * 0.45 + jitter, d * 0.82 + jitter].map((t) => clamp(t, 0.05, maxT));
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
        // Try more candidate times if seeking fails (mobile/webm combos).
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
          // eslint-disable-next-line no-await-in-loop
          const one = await captureAt(videoEl, t, d);
          if (one) captured.push(one);
          if (captured.length >= 3) break;
        }
        // IMPORTANT: Do NOT duplicate the same frame; if seeking fails, show fewer thumbs.
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

  // IMPORTANT: During recording, attach the stream after the <video> is mounted.
  // Otherwise the preview can stay black on mobile browsers.
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

  const startRecording = async (opts = {}) => {
    if (isRecording) return;
    try {
      if (!opts?.skipReset) resetMedia();
      // Always start a new session clean to avoid accidental sideways output.
      setVideoRotate(false);
      recordAutoRotateRef.current = null;
      const facingMode = String(opts?.facingMode || videoFacingMode || 'user');
      const constraints = {
        video: contentType === 'video' ? {
          facingMode: { ideal: facingMode },
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9/16 }
        } : false,
        audio: true,
      };
      const stream = opts?.stream || (await navigator.mediaDevices.getUserMedia(constraints));
      streamRef.current = stream;

      try {
        const vt = stream.getVideoTracks?.()?.[0] || null;
        const s = vt?.getSettings?.() || {};
        const devId = String(s?.deviceId || '');
        if (devId) activeVideoDeviceIdRef.current = devId;
        const fm = String(s?.facingMode || '');
        // If caller asked for a specific facing mode, do not override UI state with what the browser reports
        // (some browsers report incorrectly or omit it, which looks like the UI "flips back").
        if (!opts?.facingMode && (fm === 'user' || fm === 'environment')) setVideoFacingMode(fm);
      } catch {
        // ignore
      }

      // Setup audio visualization for audio recording
      if (contentType === 'audio') {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          audioContextRef.current = audioContext;
          audioAnalyserRef.current = analyser;
          
          // Start animation
          const canvas = audioCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const draw = () => {
              if (!audioAnalyserRef.current) return;
              audioAnimationRef.current = requestAnimationFrame(draw);
              
              analyser.getByteFrequencyData(dataArray);
              
              ctx.fillStyle = 'rgb(17, 24, 39)';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              const barWidth = (canvas.width / bufferLength) * 2.5;
              let barHeight;
              let x = 0;
              
              // Create gradient once per draw call for proper vertical positioning
              const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
              gradient.addColorStop(0, '#3b82f6');
              gradient.addColorStop(0.5, '#8b5cf6');
              gradient.addColorStop(1, '#ec4899');
              ctx.fillStyle = gradient;
              
              for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
              }
            };
            
            draw();
          }
        } catch (err) {
          console.error('Audio visualization setup failed:', err);
        }
      }

      // Helper function to get the best supported MIME type
      const getRecorderMimeType = (type) => {
        if (type === 'audio') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
          if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
          return 'audio/wav';
        }
        // video
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
        return 'video/webm';
      };

      const mimeType = getRecorderMimeType(contentType);

      // --------------------------------------------
      // Kalıcı çözüm: Video kaydını "gerçek dikey" üret
      // --------------------------------------------
      // Bazı cihazlarda/tarayıcılarda telefon dik olsa bile MediaRecorder çıktısı yatay frame gelebiliyor.
      // Bu yüzden video kaydında kamerayı bir canvas'a çizip (9:16), canvas.captureStream ile kaydediyoruz.
      // Böylece çıkan dosyanın width/height'i gerçekten dikey olur (rotation metadata'ya güvenmeyiz).
      const buildPortraitRecordingStream = async (sourceStream) => {
        // Use the hidden DOM canvas so preview & recorder are stable across renders.
        const canvas = recordCanvasRef.current || document.createElement('canvas');
        // Target: Polithane "Polit stage" portrait frame (shared aspect across Polit/Fast)
        // Keep it deterministic so playback and thumbnails are consistent.
        const targetW = 720;
        const targetH = 1280;
        canvas.width = targetW;
        canvas.height = targetH;
        if (!recordCanvasRef.current) recordCanvasRef.current = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { outStream: sourceStream };

        // Use the SAME preview <video> element as the draw source.
        // This avoids "sideways head" issues caused by orientation metadata differences
        // between off-DOM decoding and on-screen preview decoding.
        const srcVideo = previewRef.current || document.createElement('video');
        if (!previewRef.current) {
          srcVideo.muted = true;
          srcVideo.playsInline = true;
          try {
            srcVideo.setAttribute('playsinline', 'true');
            srcVideo.setAttribute('webkit-playsinline', 'true');
          } catch {
            // ignore
          }
          srcVideo.srcObject = sourceStream;
          try {
            await srcVideo.play();
          } catch {
            // ignore
          }
        }

        // Compose output stream: canvas video + original audio (if any)
        const fps = 30;
        const canvasStream = canvas.captureStream?.(fps);
        const out = new MediaStream();
        try {
          const vTrack = canvasStream?.getVideoTracks?.()?.[0];
          if (vTrack) out.addTrack(vTrack);
        } catch {
          // ignore
        }
        try {
          const aTrack = sourceStream?.getAudioTracks?.()?.[0];
          if (aTrack) out.addTrack(aTrack);
        } catch {
          // ignore
        }

        // Draw loop:
        // - Always "cover" the 9:16 frame to fill the background (user request).
        // - Disable auto-rotate logic because modern mobile browsers handle orientation correctly,
        //   and faulty auto-rotate logic was causing sideways videos.
        const fitMode = 'cover';
        const draw = () => {
          try {
            // Background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetW, targetH);

            const vw = Number(srcVideo.videoWidth || 0) || 0;
            const vh = Number(srcVideo.videoHeight || 0) || 0;
            if (!vw || !vh) {
              recordCanvasRafRef.current = requestAnimationFrame(draw);
              return;
            }

            // Forced disable auto-rotate. Let the user manually rotate if needed.
            if (recordAutoRotateRef.current === null) {
              recordAutoRotateRef.current = false;
            }
            const rotate = !!videoRotate || !!recordAutoRotateRef.current;

            if (rotate) {
              ctx.save();
              ctx.translate(targetW / 2, targetH / 2);
              ctx.rotate(Math.PI / 2);
              const rw = targetH;
              const rh = targetW;
              const s = fitMode === 'contain' ? Math.min(rw / vw, rh / vh) : Math.max(rw / vw, rh / vh);
              const dw = vw * s;
              const dh = vh * s;
              ctx.drawImage(srcVideo, -dw / 2, -dh / 2, dw, dh);
              ctx.restore();
            } else {
              const s = fitMode === 'contain' ? Math.min(targetW / vw, targetH / vh) : Math.max(targetW / vw, targetH / vh);
              const dw = vw * s;
              const dh = vh * s;
              const dx = (targetW - dw) / 2;
              const dy = (targetH - dh) / 2;
              ctx.drawImage(srcVideo, dx, dy, dw, dh);
            }
          } catch {
            // ignore draw errors; keep loop alive
          }
          recordCanvasRafRef.current = requestAnimationFrame(draw);
        };
        if (recordCanvasRafRef.current) {
          try { cancelAnimationFrame(recordCanvasRafRef.current); } catch { /* ignore */ }
        }
        recordCanvasRafRef.current = requestAnimationFrame(draw);

        // Keep refs for cleanup
        recordOutStreamRef.current = {
          canvasStream,
          sourceEl: srcVideo,
          stop: () => {
            try {
              if (recordCanvasRafRef.current) cancelAnimationFrame(recordCanvasRafRef.current);
            } catch {
              // ignore
            }
            recordCanvasRafRef.current = null;
            try {
              canvasStream?.getTracks?.()?.forEach?.((t) => t.stop());
            } catch {
              // ignore
            }
            try {
              srcVideo.pause?.();
              srcVideo.srcObject = null;
            } catch {
              // ignore
            }
          },
        };

        return { outStream: out };
      };

      const recorderStream =
        contentType === 'video' ? (await buildPortraitRecordingStream(stream)).outStream : stream;

      const recorder = new MediaRecorder(recorderStream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        if (recordDiscardOnStopRef.current) {
          recordDiscardOnStopRef.current = false;
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        // Generate file name with correct extension based on MIME type
        const getExtension = (mime, type) => {
          if (mime.includes('webm')) return 'webm';
          if (mime.includes('mp4')) return 'mp4';
          if (mime.includes('wav')) return 'wav';
          // Fallback based on content type
          return type === 'audio' ? 'mp3' : 'mp4';
        };
        const ext = getExtension(recorder.mimeType, contentType);
        const fileName = contentType === 'audio' ? `polit-audio.${ext}` : `polit-video.${ext}`;
        setFiles([new File([blob], fileName, { type: blob.type })]);
      };

      recorder.start();
      // Reset rotate toggle for each new recording session (prevents accidental sideways output).
      setVideoRotate(false);
      setIsRecording(true);
      recordStartTsRef.current = Date.now();
      setRecordSecLeft(MAX_RECORD_SEC);
      
      recordIntervalRef.current = setInterval(() => {
        const left = MAX_RECORD_SEC - Math.floor((Date.now() - recordStartTsRef.current) / 1000);
        setRecordSecLeft(Math.max(0, left));
        if (left <= 0) stopRecording();
      }, 200);
    } catch { toast.error(contentType === 'audio' ? 'Mikrofon izni alınamadı.' : 'Kamera izni alınamadı.'); }
  };

  const stopRecording = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    recordIntervalRef.current = null;
    
    // Stop audio visualization
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    audioAnalyserRef.current = null;
    
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    // Stop portrait recorder helpers (canvas stream + draw loop) if used
    try {
      recordOutStreamRef.current?.stop?.();
    } catch {
      // ignore
    }
    recordOutStreamRef.current = null;
    try {
      if (recordCanvasRafRef.current) cancelAnimationFrame(recordCanvasRafRef.current);
    } catch {
      // ignore
    }
    recordCanvasRafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleVideoOrientation = () => {
    setVideoRotate((p) => !p);
  };

  const toggleVideoCamera = async () => {
    const prevFacing = videoFacingMode;
    const next = prevFacing === 'user' ? 'environment' : 'user';

    if (!isRecording) {
      setVideoFacingMode(next);
      return;
    }

    let newStream = null;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 720 }, height: { ideal: 1280 }, aspectRatio: { ideal: 9 / 16 } },
        audio: true,
      });
    } catch {
      toast.error('Kamera değiştirilemedi.');
      return;
    }

    try {
      const vt = newStream.getVideoTracks?.()?.[0] || null;
      const s = vt?.getSettings?.() || {};
      const newDev = String(s?.deviceId || '');
      const oldDev = String(activeVideoDeviceIdRef.current || '');
      const fm = String(s?.facingMode || '');
      const facingOk = fm ? fm === next : true;
      const deviceOk = newDev && oldDev ? newDev !== oldDev : true;

      if (!facingOk || !deviceOk) {
        try { newStream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        toast.error('Bu cihazda diğer kamera kullanılamıyor.');
        return;
      }
    } catch {
      // ignore
    }

    recordDiscardOnStopRef.current = true;
    stopRecording();
    setTimeout(() => {
      try {
        startRecording({ stream: newStream, skipReset: true, facingMode: next });
        setVideoFacingMode(next);
      } catch {
        try { newStream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
    }, 180);
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

      // Final step: create the post row in DB
      setUploadHint(isFastMode ? 'Fast kaydediliyor…' : 'Polit kaydediliyor…');
      setUploadPct((p) => Math.max(Number(p || 0) || 0, 0.92));

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
      setUploadPct(1);
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

  const goToFastStream = async () => {
    // After posting a Fast, jump directly into the same Fast viewer/feed surface
    // that opens when tapping a Fast bubble on the homepage.
    const myId = user?.id || user?.user_id || null;
    const myKey = String(myId || user?.username || '').trim();
    if (!myKey) return navigate('/');
    try {
      const r = await apiCall('/api/fast?limit=24').catch(() => null);
      const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
      const queue = (list || [])
        .map((s) => ({
          key: String(s?.user_id || s?.id || s?.username || '').trim(),
          user_id: s?.user_id ?? s?.id,
          username: s?.username,
          full_name: s?.full_name,
          avatar_url: s?.avatar_url || s?.profile_image,
          profile_image: s?.profile_image || s?.avatar_url,
          story_count: s?.story_count,
          latest_created_at: s?.latest_created_at,
        }))
        .filter((x) => x.key);

      // Ensure my Fast is included as a starting point even if API list doesn't contain it yet.
      const hasMe = queue.some((x) => String(x.key) === String(myId || myKey));
      if (!hasMe) {
        queue.unshift({
          key: String(myId || myKey),
          user_id: myId,
          username: user?.username,
          full_name: user?.full_name,
          avatar_url: user?.avatar_url || user?.profile_image,
          profile_image: user?.profile_image || user?.avatar_url,
          story_count: 1,
          latest_created_at: new Date().toISOString(),
        });
      }

      const startKey = String(myId || myKey);
      const startIndex = Math.max(0, queue.findIndex((x) => String(x.key) === startKey));
      try {
        sessionStorage.setItem('fast_queue_v1', JSON.stringify({ ts: Date.now(), queue, startKey, startIndex }));
      } catch {
        // ignore
      }
      return navigate(`/fast/${encodeURIComponent(startKey)}`, {
        state: { fastQueue: queue, fastStartKey: startKey, fastStartIndex: startIndex },
      });
    } catch {
      // Minimal fallback: open viewer for my key only.
      return navigate(`/fast/${encodeURIComponent(myKey)}`);
    }
  };

  const finishNo = () => {
    if (isFastMode) goToFastStream();
    else navigate(primaryPost?.id ? `/post/${primaryPost.id}` : '/');
  };

  const finishYes = async () => {
    if (offerBusy) return;
    await publishCross();
    if (isFastMode) goToFastStream();
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
        <div className="max-w-md mx-auto scale-[0.85] lg:scale-[0.80] origin-top">
          <div className={['bg-white rounded-2xl border-2 overflow-hidden shadow-sm', theme.borderClass].join(' ')}>
            {/* Fixed top identity + back */}
            <div
              className="px-5 py-4 border-b border-white/15 flex items-center justify-between gap-3"
              style={{ backgroundColor: theme.primary }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={user?.avatar_url || user?.profile_image} size="46px" verified={isUiVerifiedUser(user)} className="border border-white/20 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-black text-white truncate">{user?.full_name || 'Misafir'}</div>
                  <div className="text-xs text-white/80 truncate">@{user?.username || '-'}</div>
                </div>
              </div>
              {step !== 'success' ? (
                <button
                  type="button"
                  onClick={step === 'type' ? () => navigate(-1) : goBack}
                  className="px-4 py-2 rounded-2xl border border-white/30 font-black bg-white/95 hover:bg-white text-gray-900"
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
                      {/* Video Önizleme Alanı - Daha Kompakt */}
                      <div
                        className="relative rounded-xl border border-gray-200 bg-black overflow-hidden flex items-center justify-center mx-auto w-full max-w-[420px]"
                        style={{ aspectRatio: '9 / 16', height: '52dvh', maxHeight: '420px' }}
                      >
                        {isRecording && (
                      <div className="absolute top-2 right-2 z-30 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-600/80 text-white text-[10px] font-bold animate-pulse">
                        KAYITTA
                      </div>
                    )}

                    {/* Preview video:
                        - while recording: live camera stream (so user sees what they're recording)
                        - after recording: playback of recorded file */}
                    <video
                      ref={previewRef}
                      src={!isRecording ? (recordedUrl || undefined) : undefined}
                      className="w-full h-full object-contain bg-black"
                      style={videoRotate ? { transform: 'rotate(90deg)', transformOrigin: 'center center' } : undefined}
                      playsInline
                      muted={isRecording}
                      autoPlay={!isRecording && !!recordedUrl && !isCoverPreparing}
                      controls={!isRecording && !!recordedUrl && !isCoverPreparing}
                    />

                    {isRecording && (
                      <div className="absolute bottom-4 left-0 right-0 z-40 px-4">
                        <div className="flex items-end justify-between">
                          <button
                            type="button"
                            onClick={toggleVideoOrientation}
                            className="w-14 h-14 rounded-full bg-black/55 border-4 border-white/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/65 active:scale-95 transition-all"
                            aria-label="Yatay/Dikey"
                          >
                            <Smartphone className={['w-7 h-7 transition-transform', videoRotate ? 'rotate-90' : 'rotate-0'].join(' ')} />
                          </button>

                          <div className="flex flex-col items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-black/60 text-sky-300 font-black text-sm tabular-nums backdrop-blur-md">
                              00:{String(recordSecLeft).padStart(2, '0')}
                            </div>
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="w-14 h-14 rounded-full bg-red-600 border-4 border-white/30 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                            >
                              <div className="w-6 h-6 bg-white rounded-sm" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={toggleVideoCamera}
                            className="w-14 h-14 rounded-full bg-black/55 border-4 border-white/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/65 active:scale-95 transition-all"
                            aria-label="Ön/Arka Kamera"
                          >
                            <SwitchCamera className="w-7 h-7" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Butonlar - Boyutlar %40 Küçültüldü */}
                  {!isRecording && !recordedUrl && (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={startRecording} className={['rounded-2xl py-3 flex flex-col items-center justify-center gap-1 text-white font-black text-[10px] active:scale-95', theme.btnClass].join(' ')}>
                        <Video className="w-6 h-6" /> Başla
                      </button>
                      <button type="button" onClick={() => videoUploadRef.current?.click()} className="rounded-2xl py-3 flex flex-col items-center justify-center gap-1 border-2 border-gray-300 bg-white font-black text-[10px] text-gray-700 active:scale-95">
                        <UploadCloud className="w-6 h-6" style={{ color: theme.primary }} /> Yükle
                      </button>
                    </div>
                  )}

                  {/* Önizleme Resimleri Seçeceği */}
                  {recordedUrl && !isRecording && (
                    isCoverPreparing ? (
                      <div className="py-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3">
                        <div className="text-xs font-black text-gray-600">Kapak resimleri hazırlanıyor, lütfen bekleyin!</div>
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Kapak Seç</span>
                          {videoThumbs.length > 0 && (
                             <button type="button" onClick={() => setVideoThumbGenSeed(s => s+1)} className="text-primary-blue text-[9px] font-bold flex items-center gap-1"><RotateCcw className="w-3 h-3"/> Yenile</button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {videoThumbs.map((t, i) => (
                            <button key={i} type="button" onClick={() => setSelectedVideoThumbIdx(i)} className={['rounded-lg overflow-hidden border-2 transition-all', selectedVideoThumbIdx === i ? theme.borderClass : 'border-transparent opacity-40'].join(' ')}>
                              <img src={t.previewUrl} className="w-full aspect-video object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  
                  {/* Dinamik Gönder Butonu */}
                  {canShowSubmitInMediaStep && (
                    <div className="pt-2">
                      <button onClick={() => isFastMode ? publishPrimary() : setStep('desc')} className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md active:scale-[0.98] transition-all uppercase tracking-tight">
                        {loading ? `YÜKLENİYOR %${Math.round(uploadPct * 100)}` : 'GÖNDER'}
                      </button>
                    </div>
                  )}
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
                  ) : contentType === 'audio' ? (
                    <div className="space-y-3">
                      {/* Audio Preview Area */}
                      <div
                        className="relative rounded-xl border border-gray-200 bg-gray-900 overflow-hidden flex items-center justify-center"
                        style={{ height: '360px' }}
                      >
                        {isRecording && (
                          <div className="absolute top-2 right-2 z-30 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-red-600/80 text-white text-[10px] font-bold animate-pulse">
                            KAYITTA
                          </div>
                        )}
                        
                        {/* Audio Wave Visualization Canvas */}
                        <canvas
                          ref={audioCanvasRef}
                          width={400}
                          height={360}
                          className="w-full h-full"
                          style={{ display: isRecording ? 'block' : 'none' }}
                        />
                        
                        {/* Audio Player for Recorded Audio */}
                        {!isRecording && recordedUrl && (
                          <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="w-full space-y-4">
                              <div className="flex items-center justify-center">
                                <Music className="w-24 h-24 text-blue-400" />
                              </div>
                              <audio
                                src={recordedUrl}
                                controls
                                className="w-full"
                                style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                              />
                              <div className="text-center text-gray-300 text-sm">
                                Ses kaydı hazır
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Initial State */}
                        {!isRecording && !recordedUrl && (
                          <div className="text-gray-500 text-center p-8">
                            <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Ses kaydetmek için başlayın</p>
                          </div>
                        )}

                        {/* Recording Controls */}
                        {isRecording && (
                          <div className="absolute bottom-4 left-0 right-0 z-40 px-4">
                            <div className="flex items-center justify-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="px-3 py-1 rounded-full bg-black/60 text-sky-300 font-black text-sm tabular-nums backdrop-blur-md">
                                  00:{String(recordSecLeft).padStart(2, '0')}
                                </div>
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="w-14 h-14 rounded-full bg-red-600 border-4 border-white/30 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                                  aria-label="Kaydı Durdur"
                                >
                                  <div className="w-6 h-6 bg-white rounded-sm" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Buttons */}
                      {!isRecording && !recordedUrl && (
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            type="button" 
                            onClick={startRecording} 
                            className={['rounded-2xl py-3 flex flex-col items-center justify-center gap-1 text-white font-black text-[10px] active:scale-95', theme.btnClass].join(' ')}
                          >
                            <Mic className="w-6 h-6" /> Başla
                          </button>
                          <button 
                            type="button" 
                            onClick={() => audioUploadRef.current?.click()} 
                            className="rounded-2xl py-3 flex flex-col items-center justify-center gap-1 border-2 border-gray-300 bg-white font-black text-[10px] text-gray-700 active:scale-95"
                          >
                            <UploadCloud className="w-6 h-6" style={{ color: theme.primary }} /> Yükle
                          </button>
                        </div>
                      )}
                      
                      {/* Clear Button */}
                      {hasMedia && !isRecording && (
                        <button
                          type="button"
                          onClick={resetMedia}
                          className="w-full py-3 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-7 h-7" />
                          Temizle
                        </button>
                      )}
                      
                      {/* Submit Button */}
                      {canShowSubmitInMediaStep && (
                        <div className="pt-2">
                          <button 
                            onClick={() => isFastMode ? publishPrimary() : setStep('desc')} 
                            className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md active:scale-[0.98] transition-all uppercase tracking-tight"
                          >
                            {loading ? `YÜKLENİYOR %${Math.round(uploadPct * 100)}` : 'GÖNDER'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* hidden canvas used to force portrait recording output */}
                  <canvas ref={recordCanvasRef} className="hidden" />

                  {/* Action buttons - only for image, not audio or video */}
                  {!hasMedia && !isRecording && contentType === 'image' ? (
                    <div className="grid grid-cols-2 gap-3">
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

                  {hasMedia && !isCoverPreparing && contentType === 'image' ? (
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
                  {contentType !== 'video' && contentType !== 'audio' && canShowSubmitInMediaStep ? (
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
                      isFastUi ? 'border-rose-200 focus:border-rose-500' : 'border-primary-blue focus:border-primary-blue',
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
                    <div className="text-lg leading-none">
                      {preparingMedia
                        ? 'Hazırlanıyor…'
                        : loading
                          ? `Yükleniyor… %${Math.round(uploadPct * 100)}`
                          : descTarget === 'cross'
                            ? 'Polit At'
                            : isFastMode
                              ? 'Fast At'
                              : 'Polit At'}
                    </div>
                    <div className="text-xs font-semibold opacity-90 mt-1">{uploadHint || (isFastMode ? 'Fast paylaşımı' : 'Polit paylaşımı')}</div>
                    {loading ? (
                      <div className="mt-3 w-full h-2 rounded-full bg-white/20 overflow-hidden">
                        <div className="h-full bg-white/90" style={{ width: `${Math.round(uploadPct * 100)}%` }} />
                      </div>
                    ) : null}
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
