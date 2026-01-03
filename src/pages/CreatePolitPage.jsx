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
  const [step, setStep] = useState('type');
  const [contentType, setContentType] = useState('');
  const [agendaTag, setAgendaTag] = useState('');
  const [agendas, setAgendas] = useState([]);
  const [agendaVisibleCount, setAgendaVisibleCount] = useState(10);

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
  const [videoThumbs, setVideoThumbs] = useState([]);
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
  const [descTarget, setDescTarget] = useState('primary');
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
  const recordTimeoutRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const recordStartTsRef = useRef(0);
  const recordStopFiredRef = useRef(false);
  const MAX_RECORD_SEC = 60;
  const [recordSecLeft, setRecordSecLeft] = useState(60);
  const [videoFacingMode, setVideoFacingMode] = useState('user');
  const [isDevicePortrait, setIsDevicePortrait] = useState(true);

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
    if (step !== 'media') return false;
    if (isRecording) return false;
    if (preparingMedia) return false;
    return hasMedia;
  }, [hasMedia, isRecording, preparingMedia, step]);

  const optimizeImageFile = async (file) => {
    // ... (aynı kaldı, kısaltmadım)
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
      } catch {}
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
        out.push(await optimizeImageFile(f));
      }
      return out;
    } finally {
      setPreparingMedia(false);
      setUploadHint('');
    }
  };

  // getUploadHeaders, xhrPutWithProgress, resetMedia, resetAll, diğer useEffect'ler aynı kaldı (kısaltmıyorum)

  const resetMedia = () => {
    // tam kod (önceki mesajdaki gibi)
    setFiles([]);
    try {
      (videoThumbs || []).forEach((t) => {
        if (t?.previewUrl) URL.revokeObjectURL(t.previewUrl);
      });
    } catch {}
    setVideoThumbs([]);
    setSelectedVideoThumbIdx(0);
    setVideoThumbRefreshCount(0);
    setVideoThumbGenSeed(0);
    if (recordedUrl) {
      try {
        URL.revokeObjectURL(recordedUrl);
      } catch {}
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
    } catch {}
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    }
    if (previewRef.current) {
      try {
        previewRef.current.srcObject = null;
      } catch {}
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
  }, [isFastMode]);

  // diğer useEffect'ler (agendas fetch, imagePreviews, videoThumbs vs.) aynı

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
        try { el.play?.().catch(() => null); } catch {}
      }, 250);
    } catch {}
  }, [isRecording, contentType]);

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
          },
          audio: true,
        });

        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings?.();
        const isPortrait = settings?.height >= settings?.width;
        setIsDevicePortrait(isPortrait);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      if (contentType === 'video' && previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play().catch(() => null);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2800000,
        audioBitsPerSecond: 96000,
      });

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `polit-video.${ext}`, { type: blob.type });
        setFiles([file]);
      };

      recorder.start();
      setIsRecording(true);
      recordStartTsRef.current = Date.now();
      setRecordSecLeft(MAX_RECORD_SEC);

      recordIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartTsRef.current) / 1000);
        const left = Math.max(0, MAX_RECORD_SEC - elapsed);
        setRecordSecLeft(left);
        if (left <= 0 && !recordStopFiredRef.current) {
          recordStopFiredRef.current = true;
          stopRecording();
        }
      }, 200);

      recordTimeoutRef.current = setTimeout(() => {
        if (!recordStopFiredRef.current) {
          recordStopFiredRef.current = true;
          stopRecording();
        }
      }, MAX_RECORD_SEC * 1000 + 50);
    } catch (err) {
      toast.error('Kamera veya mikrofon erişimi reddedildi.');
    }
  };

  const stopRecording = () => {
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setRecordSecLeft(MAX_RECORD_SEC);

    try {
      if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
    } catch {}

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (previewRef.current) previewRef.current.srcObject = null;

    setIsRecording(false);
  };

  // kalan fonksiyonlar (publishPrimary, publishCross vs.) tamamen aynı kalıyor

  const typeButtons = useMemo(() => [
    { key: 'video', label: 'Video', Icon: Video },
    { key: 'image', label: 'Resim', Icon: ImageIcon },
    { key: 'audio', label: 'Ses', Icon: Music },
    { key: 'text', label: 'Yazı', Icon: PenTool },
  ], []);

  const canSubmitText = useMemo(() => {
    const trimmed = String(text || '').trim();
    return trimmed.length >= TEXT_MIN && trimmed.length <= TEXT_MAX;
  }, [text]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <div className="container-main py-6">
        <div className="max-w-xl mx-auto">
          <div className={['bg-white rounded-3xl border-2 overflow-hidden', theme.borderClass].join(' ')}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={user?.avatar_url || user?.profile_image} size="46px" verified={isUiVerifiedUser(user)} className="border border-gray-200 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-black text-gray-900 truncate">{user?.full_name || 'Misafir'}</div>
                  <div className="text-xs text-gray-500 truncate">@{user?.username || '-'}</div>
                </div>
              </div>
              {step !== 'success' ? (
                <button type="button" onClick={step === 'type' ? () => navigate(-1) : () => setStep(step === 'agenda' ? 'type' : step === 'media' ? 'agenda' : 'media')} className={['px-4 py-2 rounded-2xl border-2 font-black bg-white hover:bg-gray-50', theme.btnAltClass].join(' ')}>
                  Geri Dön
                </button>
              ) : null}
            </div>

            <div className="p-5 space-y-4">
              {/* TYPE ve AGENDA step'leri aynı */}

              {step === 'media' && contentType === 'video' && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl border border-gray-200 bg-black overflow-hidden aspect-[9/16]">
                    {isRecording && (
                      <>
                        <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                          <span className="text-xs font-semibold text-white">Kayıt Yapıyor!</span>
                        </div>

                        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-3">
                          <div className="px-3 py-1.5 rounded-xl bg-black/75 text-sky-300 font-black text-lg tabular-nums">
                            {String(recordSecLeft).padStart(2, '0')}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              recordStopFiredRef.current = true;
                              stopRecording();
                            }}
                            className="relative rounded-full bg-red-600 hover:bg-red-700 text-white w-28 h-28 [@media(pointer:coarse)]:w-40 [@media(pointer:coarse)]:h-40 [@media(pointer:fine)]:w-20 [@media(pointer:fine)]:h-20 flex flex-col items-center justify-center shadow-xl"
                          >
                            <span className="absolute inset-0 rounded-full ring-4 ring-red-400/35 animate-pulse" />
                            <span className="px-3 py-1 rounded-lg bg-black/25 backdrop-blur font-black text-lg [@media(pointer:coarse)]:text-2xl [@media(pointer:fine)]:text-base">
                              BİTİR
                            </span>
                            <span className="mt-2 bg-white rounded-md w-6 h-6 [@media(pointer:coarse)]:w-8 [@media(pointer:coarse)]:h-8 [@media(pointer:fine)]:w-5 [@media(pointer:fine)]:h-5" />
                          </button>
                        </div>
                      </>
                    )}

                    {isRecording ? (
                      <video
                        ref={previewRef}
                        className="absolute inset-0 w-full h-full object-contain"
                        playsInline
                        muted
                        autoPlay
                      />
                    ) : recordedUrl ? (
                      <video
                        src={recordedUrl}
                        controls
                        className="absolute inset-0 w-full h-full object-contain"
                        playsInline
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/70">
                        Video önizleme burada görünecek
                      </div>
                    )}
                  </div>

                  {isMobileLike && isRecording && !isDevicePortrait && (
                    <div className="text-center text-sm font-bold text-amber-600 bg-amber-50 rounded-xl py-2 px-4">
                      📱 Daha iyi görünüm için telefonu dik tutun
                    </div>
                  )}

                  {videoThumbs.length > 0 && (
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
                          >
                            <img src={t.previewUrl} alt="" className="w-full aspect-video object-cover" />
                          </button>
                        ))}
                      </div>
                      {videoThumbRefreshCount < 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoThumbRefreshCount(c => c + 1);
                            setVideoThumbGenSeed(s => s + 1);
                          }}
                          className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center justify-center"
                        >
                          <RotateCcw className="w-5 h-5 text-gray-800" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* diğer contentType'lar ve butonlar aynı kalıyor */}

              <canvas ref={recordCanvasRef} className="hidden" />

              {/* geri kalan JSX aynı */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
