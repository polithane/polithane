import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Trash2, Video, Image as ImageIcon, Music, PenTool, UploadCloud, Mic, StopCircle } from 'lucide-react';
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

  const theme = useMemo(() => {
    const primary = isFastMode ? '#E11D48' : '#0B3D91';
    return {
      primary,
      borderClass: isFastMode ? 'border-rose-600' : 'border-primary-blue',
      btnClass: isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
      btnAltClass: isFastMode ? 'border-rose-300 text-rose-700' : 'border-blue-300 text-primary-blue',
      ringClass: isFastMode ? 'ring-rose-500/20' : 'ring-primary-blue/20',
    };
  }, [isFastMode]);

  const approvalPending = useMemo(() => {
    if (!isAuthenticated) return false;
    if (user?.is_admin) return false;
    const ut = String(user?.user_type || 'citizen');
    return ut !== 'citizen' && !user?.is_verified;
  }, [isAuthenticated, user?.is_admin, user?.user_type, user?.is_verified]);

  const [step, setStep] = useState('type'); // type | agenda | media | desc | success
  const [contentType, setContentType] = useState(''); // video | image | audio | text
  const [agendaTag, setAgendaTag] = useState(''); // '' => gündem dışı
  const [agendas, setAgendas] = useState([]);
  const [agendaVisibleCount, setAgendaVisibleCount] = useState(10);

  const [files, setFiles] = useState([]);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [mediaDurationSec, setMediaDurationSec] = useState(0);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const [primaryPost, setPrimaryPost] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const previewRef = useRef(null);
  const recordTimeoutRef = useRef(null);

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

  const resetMedia = () => {
    setFiles([]);
    if (recordedUrl) {
      try {
        URL.revokeObjectURL(recordedUrl);
      } catch {
        // ignore
      }
    }
    setRecordedUrl('');
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
          el.preload = 'metadata';
          el.onloadedmetadata = () => {
            const d = Number(el.duration);
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
            resolve(Number.isFinite(d) ? d : 0);
          };
          el.onerror = () => {
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
            resolve(0);
          };
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
    new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(file);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          try {
            const d = Number(v.duration);
            URL.revokeObjectURL(url);
            resolve(Number.isFinite(d) ? d : 0);
          } catch (e) {
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
            reject(e);
          }
        };
        v.onerror = () => {
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
          reject(new Error('Video okunamadı.'));
        };
        v.src = url;
      } catch (e) {
        reject(e);
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
                facingMode: 'user',
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
          await previewRef.current.play().catch(() => null);
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
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (contentType === 'audio' ? 'audio/webm' : 'video/webm') });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const filename = contentType === 'audio' ? 'polit-audio.webm' : 'polit-video.webm';
        const file = new File([blob], filename, { type: blob.type });
        setFiles([file]);
      };

      recorder.start();
      setIsRecording(true);

      // Video limit: max 1 minute
      if (contentType === 'video') {
        recordTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, 60_000);
      }
    } catch {
      toast.error('Kayıt başlatılamadı. Tarayıcı izinlerini kontrol edin.');
    }
  };

  const stopRecording = () => {
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
    setIsRecording(false);
  };

  const fileToDataUrl = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Dosya okunamadı.'));
      reader.readAsDataURL(f);
    });

  const uploadOne = async (file) => {
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

    const ct = String(file?.type || '').trim();
    if (!ct) throw new Error('Dosya türü bulunamadı.');

    const sign = await apiCall('/api/storage/sign-upload', {
      method: 'POST',
      body: JSON.stringify({
        bucket: 'uploads',
        folder: 'posts',
        contentType: ct,
      }),
    });
    if (!sign?.success) throw new Error(sign?.error || 'Yükleme hazırlığı başarısız.');
    const { bucket, path, token, publicUrl } = sign?.data || {};
    if (!bucket || !path || !token || !publicUrl) throw new Error('Yükleme anahtarı alınamadı.');

    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: ct });
    if (error) throw new Error(String(error?.message || 'Medya yüklenemedi.'));
    return String(publicUrl);
  };

  const publishPrimary = async () => {
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
    if (contentType === 'video' && files.some((f) => !String(f.type || '').startsWith('video/'))) return toast.error('Sadece video dosyası.');
    if (contentType === 'audio' && files.some((f) => !String(f.type || '').startsWith('audio/'))) return toast.error('Sadece ses dosyası.');
    if (contentType === 'image' && files.some((f) => !String(f.type || '').startsWith('image/'))) return toast.error('Sadece resim dosyası.');

    setLoading(true);
    try {
      let media_urls = [];
      if (files.length > 0) {
        media_urls = await Promise.all(files.slice(0, contentType === 'image' ? 10 : 1).map(uploadOne));
      }

      const payload = {
        content: trimmed,
        content_text: trimmed,
        content_type: contentType,
        category: 'general',
        agenda_tag: agendaTag || null,
        media_urls,
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
    }
  };

  const publishCross = async () => {
    if (!primaryPost) return;
    if (offerBusy) return;
    setOfferBusy(true);
    try {
      const base = {
        content: String(primaryPost?.content_text ?? primaryPost?.content ?? text ?? '').trim(),
        content_text: String(primaryPost?.content_text ?? primaryPost?.content ?? text ?? '').trim(),
        content_type: String(primaryPost?.content_type || contentType || 'text').trim(),
        category: String(primaryPost?.category || 'general'),
        agenda_tag: agendaTag || null,
        media_urls: Array.isArray(primaryPost?.media_urls) ? primaryPost.media_urls : [],
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
    <div className="min-h-screen bg-gray-50">
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
                              className="w-[120px] h-[120px] object-contain"
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
                    <div className="rounded-2xl border border-gray-200 bg-black overflow-hidden">
                      {isRecording ? (
                        <video ref={previewRef} className="w-full aspect-video object-cover" playsInline muted />
                      ) : recordedUrl ? (
                        <video src={recordedUrl} controls className="w-full aspect-video object-contain bg-black" playsInline />
                      ) : (
                        <div className="p-6 text-sm text-white/80">Video önizleme burada görünecek.</div>
                      )}
                    </div>
                  ) : contentType === 'audio' ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      {recordedUrl ? <audio src={recordedUrl} controls className="w-full" /> : <div className="text-sm text-gray-600">Ses önizleme burada.</div>}
                    </div>
                  ) : contentType === 'image' ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      {imagePreviews.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {imagePreviews.map((u) => (
                            <img key={u} src={u} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">Resim önizleme burada.</div>
                      )}
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {contentType === 'video' ? (
                      <>
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={[
                            'rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 text-white font-black',
                            isRecording ? 'bg-red-600 hover:bg-red-700' : theme.btnClass,
                          ].join(' ')}
                        >
                          {isRecording ? <StopCircle className="w-14 h-14" /> : <Video className="w-14 h-14" />}
                          <div>{isRecording ? 'Durdur' : 'Kayda Başla'}</div>
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
                          <div>Video Yükle</div>
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
                          <div>Resim Yükle</div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={[
                            'rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 text-white font-black',
                            isRecording ? 'bg-red-600 hover:bg-red-700' : theme.btnClass,
                          ].join(' ')}
                        >
                          {isRecording ? <StopCircle className="w-14 h-14" /> : <Mic className="w-14 h-14" />}
                          <div>{isRecording ? 'Durdur' : 'Kayda Başla'}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => audioUploadRef.current?.click()}
                          className="rounded-3xl aspect-square flex flex-col items-center justify-center gap-2 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                        >
                          <UploadCloud className="w-14 h-14" style={{ color: theme.primary }} />
                          <div>Ses Yükle</div>
                        </button>
                      </>
                    )}
                  </div>

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
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
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
                    onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))}
                  />
                  <input
                    ref={imageCaptureRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))}
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
                  {!isFastMode ? (
                    <button
                      type="button"
                      disabled={!hasMedia}
                      onClick={() => setStep('desc')}
                      className={['w-full py-4 rounded-2xl text-white font-black disabled:opacity-60', theme.btnClass].join(' ')}
                    >
                      Devam
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!hasMedia || loading}
                      onClick={publishPrimary}
                      className={['w-full py-4 rounded-2xl text-white font-black disabled:opacity-60', theme.btnClass].join(' ')}
                    >
                      {loading ? 'Gönderiliyor…' : 'Fast At'}
                    </button>
                  )}
                </div>
              ) : null}

              {/* STEP: DESC */}
              {step === 'desc' ? (
                <div className="space-y-3">
                  <div className="text-lg font-black text-gray-900">Kısa bir başlık yada açıklama giriniz!</div>
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
                    onClick={publishPrimary}
                    className={['w-full py-4 rounded-2xl text-white font-black disabled:opacity-60', theme.btnClass].join(' ')}
                  >
                    {loading ? 'Gönderiliyor…' : isFastMode ? 'Fast At' : 'Polit At'}
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
                      onClick={finishYes}
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
