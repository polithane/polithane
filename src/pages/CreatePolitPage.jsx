import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Camera,
  Trash2,
  X,
  Video,
  Image as ImageIcon,
  Music,
  PenTool,
  UploadCloud,
  Mic,
  StopCircle,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, posts as postsApi } from '../utils/api';
import { Avatar } from '../components/common/Avatar';
import { isUiVerifiedUser } from '../utils/titleHelpers';

export const CreatePolitPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isFastMode = useMemo(() => String(location?.pathname || '') === '/fast-at', [location?.pathname]);

  const approvalPending = useMemo(() => {
    if (!isAuthenticated) return false;
    if (user?.is_admin) return false;
    const ut = String(user?.user_type || 'citizen');
    return ut !== 'citizen' && !user?.is_verified;
  }, [isAuthenticated, user?.is_admin, user?.user_type, user?.is_verified]);

  const iconBaseUrls = useMemo(() => {
    try {
      const explicit = String(import.meta.env?.VITE_ICON_BASE_URL || '').trim();
      const supabaseUrl = String(import.meta.env?.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
      const bases = [];
      if (explicit) bases.push(explicit.replace(/\/+$/, ''));
      if (supabaseUrl) {
        // 1) uploads bucket /ikons folder (our default)
        bases.push(`${supabaseUrl}/storage/v1/object/public/uploads/ikons`);
        // 2) ikons bucket (some setups store icons in a dedicated bucket)
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
      // 1) Same-origin PNG icons (fastest on mobile + cached by Vercel CDN)
      if (k === 'video') list.push('/icons/videoikon.png');
      if (k === 'image') list.push('/icons/resimikon.png');
      if (k === 'audio') list.push('/icons/sesikon.png');
      if (k === 'text') list.push('/icons/yaziikon.png');

      // 2) Your existing icon hosting (Supabase public buckets etc.)
      for (const b of iconBaseUrls || []) {
        for (const n of names[k] || []) list.push(join(b, n));
      }

      // 3) Same-origin SVG fallback (if PNG missing for any reason)
      if (k === 'video') list.push('/icons/videoikon.svg');
      if (k === 'image') list.push('/icons/resimikon.svg');
      if (k === 'audio') list.push('/icons/sesikon.svg');
      if (k === 'text') list.push('/icons/yaziikon.svg');
      out[k] = Array.from(new Set(list));
    });
    return out;
  }, [iconBaseUrls]);

  // Preload icon candidates early so they appear instantly when selecting types
  useEffect(() => {
    try {
      (['video', 'image', 'audio', 'text'] || []).forEach((k) => {
        const list = iconCandidates?.[k] || [];
        // preload a few candidates (local png + first remote)
        list.slice(0, 3).forEach((src) => {
          const img = new Image();
          img.src = src;
        });
      });
    } catch {
      // noop
    }
  }, [iconCandidates]);

  const contentTabs = useMemo(
    () => [
      { key: 'video', fallbackIcon: Video, alt: 'Video' },
      { key: 'image', fallbackIcon: ImageIcon, alt: 'Resim' },
      { key: 'audio', fallbackIcon: Music, alt: 'Ses' },
      { key: 'text', fallbackIcon: PenTool, alt: 'Yazı' },
    ],
    []
  );

  // Start with no selection (user must pick a content type)
  const [contentType, setContentType] = useState('');
  const [content, setContent] = useState('');
  const [agendaTag, setAgendaTag] = useState(''); // '' => Gündem dışı
  const [agendaTouched, setAgendaTouched] = useState(false); // avoids defaulting to "Gündem dışı" without explicit choice
  const [step, setStep] = useState('type'); // type | agenda | media | desc
  const [agendas, setAgendas] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [brokenIcons, setBrokenIcons] = useState({});
  const [iconTryIndex, setIconTryIndex] = useState({});
  const [dragImageIdx, setDragImageIdx] = useState(null);
  const [dragOverImageIdx, setDragOverImageIdx] = useState(null);
  const [alsoPublishOther, setAlsoPublishOther] = useState(false);

  // Text constraints
  const TEXT_LIMIT = 350;

  // Hidden inputs for image upload/capture
  const imageUploadRef = useRef(null);
  const imageCaptureRef = useRef(null);
  const videoUploadRef = useRef(null);
  const audioUploadRef = useRef(null);

  // Recording state (video/audio)
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState('');

  const accept = useMemo(() => {
    if (contentType === 'image') return 'image/*';
    return undefined;
  }, [contentType]);

  const maxFiles = useMemo(() => {
    if (contentType === 'image') return 10;
    if (contentType === 'video' || contentType === 'audio') return 1;
    return 0;
  }, [contentType]);

  useEffect(() => {
    // Generate preview URLs for selected images (and cleanup)
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
          // noop
        }
      });
    };
  }, [contentType, files]);

  const reorderFiles = (from, to) => {
    const f = Number(from);
    const t = Number(to);
    if (!Number.isFinite(f) || !Number.isFinite(t)) return;
    if (f === t) return;
    setFiles((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      if (f < 0 || f >= list.length) return prev;
      const clampedTo = Math.max(0, Math.min(t, list.length - 1));
      const [moved] = list.splice(f, 1);
      list.splice(clampedTo, 0, moved);
      return list;
    });
  };

  useEffect(() => {
    // Load agendas from admin-managed list
    (async () => {
      try {
        const res = await apiCall('/api/agendas?limit=80');
        const list = Array.isArray(res) ? res : res?.data || [];
        setAgendas(Array.isArray(list) ? list : []);
      } catch (e) {
        setAgendas([]);
        // Do not hard-fail the page; user can still post as "Gündem dışı"
      }
    })();
  }, []);

  // Cleanup streams on unmount / tab change
  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        // noop
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetMedia = () => {
    setFiles([]);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl('');
    }
    chunksRef.current = [];
    setIsRecording(false);
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      // noop
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Reset wizard when switching between /polit-at and /fast-at
  useEffect(() => {
    setStep('type');
    setContentType('');
    setAgendaTag('');
    setContent('');
    resetMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFastMode]);

  const goBack = () => {
    if (step === 'agenda') return setStep('type');
    if (step === 'media') return setStep('agenda');
    if (step === 'desc') return setStep(contentType === 'text' ? 'agenda' : 'media');
    return setStep('type');
  };

  const pickType = (nextType) => {
    setContentType(nextType);
    setAgendaTag('');
    setAgendaTouched(false);
    setContent('');
    resetMedia();
    setStep('agenda');
  };

  const pickAgenda = (value) => {
    setAgendaTouched(true);
    setAgendaTag(String(value || ''));
    setStep(contentType === 'text' ? 'desc' : 'media');
  };

  const confirmAgendaAndContinue = () => {
    // keep it explicit; even if default is "" we only allow continuing when user picked something
    if (!agendaTouched) {
      toast.error('Lütfen bir gündem seçin veya “Gündem Dışı” ile onaylayın.');
      return;
    }
    setStep(contentType === 'text' ? 'desc' : 'media');
  };

  const canProceedMedia = () => {
    if (contentType === 'video' || contentType === 'audio') return files.length > 0 || !!recordedUrl;
    if (contentType === 'image') return files.length > 0;
    return true;
  };

  const goNextFromMedia = () => {
    if (!canProceedMedia()) {
      toast.error(
        contentType === 'video'
          ? 'Önce video kaydedin veya yükleyin.'
          : contentType === 'audio'
            ? 'Önce ses kaydı alın veya yükleyin.'
            : 'Önce en az 1 resim seçin.'
      );
      return;
    }
    setStep('desc');
  };

  const startRecording = async () => {
    if (isRecording) return;
    resetMedia();

    try {
      const constraints =
        contentType === 'video'
          ? { video: { facingMode: 'user' }, audio: true }
          : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const options = { mimeType: 'video/webm' };
      const mimeType =
        contentType === 'audio'
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : '';

      const recorder = new MediaRecorder(stream, mimeType ? { ...options, mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (contentType === 'audio' ? 'audio/webm' : 'video/webm') });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        const ext = contentType === 'audio' ? 'webm' : 'webm';
        const filename = contentType === 'audio' ? `polit-audio.${ext}` : `polit-video.${ext}`;
        const file = new File([blob], filename, { type: blob.type });
        setFiles([file]);
      };

      recorder.start();
      setIsRecording(true);
      toast.success('Kayıt başladı.');
    } catch (err) {
      toast.error('Kayıt başlatılamadı. Tarayıcı izinlerini kontrol edin.');
    }
  };

  const stopRecording = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      // noop
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    toast.success('Kayıt durduruldu.');
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Polit atmak için giriş yapmalısınız.');
      navigate('/login-new');
      return;
    }

    if (!contentType) {
      toast.error('Önce bir içerik türü seçin (Video/Resim/Ses/Yazı).');
      return;
    }

    if (approvalPending) {
      toast.error('Üyeliğiniz onay bekliyor. Onay gelene kadar Polit Atamazsınız.');
      return;
    }

    if (!content.trim()) {
      toast.error('İçerik boş olamaz.');
      return;
    }

    // Enforce media requirement for media types
    if ((contentType === 'video' || contentType === 'image' || contentType === 'audio') && files.length === 0) {
      toast.error(
        contentType === 'video'
          ? 'Video polit için önce video kaydedin.'
          : contentType === 'audio'
            ? 'Ses polit için önce ses kaydedin.'
            : 'Resim polit için en az 1 resim seçin.'
      );
      return;
    }

    // Basic file-type safety checks (client-side)
    if (contentType === 'video' && files.some((f) => !String(f.type || '').startsWith('video/'))) {
      toast.error('Video polit için sadece video dosyası kullanılabilir.');
      return;
    }
    if (contentType === 'audio' && files.some((f) => !String(f.type || '').startsWith('audio/'))) {
      toast.error('Ses polit için sadece ses dosyası kullanılabilir.');
      return;
    }
    if (contentType === 'image' && files.some((f) => !String(f.type || '').startsWith('image/'))) {
      toast.error('Resim polit için sadece resim dosyası kullanılabilir.');
      return;
    }
    if (contentType === 'image' && files.length > 10) {
      toast.error('Resim polit için en fazla 10 resim seçebilirsiniz.');
      return;
    }

    setLoading(true);
    try {
      // Upload media via our API (service role) to avoid Storage RLS issues,
      // then create the post via /api/posts (JSON).
      let media_urls = [];

      if (files.length > 0) {
        if (!user?.id) {
          throw new Error('Kullanıcı bilgisi bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.');
        }

        const fileToDataUrl = (f) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Dosya okunamadı.'));
            reader.readAsDataURL(f);
          });

        const uploadOne = async (file) => {
          if (file.size > 12 * 1024 * 1024) {
            throw new Error('Dosya çok büyük. Şimdilik maksimum 12MB medya yükleyebilirsiniz.');
          }
          const dataUrl = await fileToDataUrl(file);
          const r = await apiCall('/api/storage/upload', {
            method: 'POST',
            body: JSON.stringify({
              bucket: 'uploads',
              folder: 'posts',
              dataUrl,
              contentType: file.type || '',
            }),
          });
          if (!r?.success) throw new Error(r?.error || 'Medya yüklenemedi.');
          return r.data.publicUrl;
        };

        media_urls = await Promise.all(files.slice(0, maxFiles || 1).map(uploadOne));
      }

      const primaryPayload = {
        content: content,
        content_type: contentType,
        content_text: content,
        category: 'general',
        agenda_tag: agendaTag || null,
        media_urls,
        ...(isFastMode ? { is_trending: true } : {}),
      };

      const primary = await postsApi.create(primaryPayload);
      const primaryId = primary?.data?.id;
      const primaryOk = !!(primary?.success && primaryId);

      // Optional cross-post
      if (alsoPublishOther) {
        const secondaryPayload = {
          ...primaryPayload,
          ...(isFastMode ? { is_trending: false } : { is_trending: true }),
        };
        // Best-effort (don't block primary success)
        await postsApi.create(secondaryPayload).catch(() => null);
      }

      if (primaryOk) {
        toast.success(isFastMode ? 'Fast başarıyla oluşturuldu.' : 'Polit başarıyla oluşturuldu.');
        if (isFastMode) navigate('/fast');
        else navigate(`/post/${primaryId}`);
        return;
      }

      toast.success(isFastMode ? 'Fast oluşturuldu.' : 'Polit oluşturuldu.');
      navigate(isFastMode ? '/fast' : '/');
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Polit atılamadı: depolama izinleri kısıtlı. Lütfen daha sonra tekrar deneyin.');
      } else {
        toast.error(msg || 'Polit oluşturulurken hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={[
        'min-h-screen bg-gradient-to-br',
        isFastMode ? 'from-rose-50 via-white to-red-50' : 'from-blue-50 via-white to-emerald-50',
      ].join(' ')}
    >
      <div className="container-main py-6">
        <div className="max-w-2xl mx-auto">
          <div
            className={[
              'relative rounded-[28px] p-[2px] shadow-2xl',
              isFastMode
                ? 'bg-gradient-to-br from-red-500/70 via-rose-500/70 to-orange-400/70'
                : 'bg-gradient-to-br from-primary-blue/70 via-indigo-400/70 to-emerald-400/70',
            ].join(' ')}
          >
            <div className="bg-white/90 backdrop-blur rounded-[26px] overflow-hidden">
            {/* Top bar */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:bg-gray-100"
                title="Kapat"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
              <div className="text-center">
                <div className="text-lg font-black text-gray-900">{isFastMode ? 'Fast At' : 'Polit At'}</div>
                <div className="text-[11px] text-gray-500">
                  {isFastMode ? '24 saatlik hızlı paylaş' : 'Sosyal medya gibi hızlı paylaş'}
                </div>
              </div>
              <div className="w-10" />
            </div>

            <div className="p-5">
              {/* Identity row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={user?.avatar_url}
                    size="44px"
                    verified={isUiVerifiedUser(user)}
                    className="border border-gray-200 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">{user?.full_name || 'Misafir'}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {isAuthenticated ? 'Paylaşım yapıyorsun' : 'Polit atmak için giriş yap'}
                    </div>
                  </div>
                </div>
              </div>

              {approvalPending && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <div className="text-sm font-black">Üyeliğiniz onay bekliyor</div>
                  <div className="text-xs mt-1">
                    Admin onayı gelene kadar <span className="font-semibold">Polit Atamazsınız</span>. Bu süreçte uygulamayı
                    gezebilirsiniz.
                  </div>
                </div>
              )}

              {/* Cross-post option */}
              <div
                className={[
                  'mb-4 rounded-2xl border px-4 py-3',
                  isFastMode ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-rose-200 bg-rose-50 text-rose-900',
                ].join(' ')}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 accent-red-600"
                    checked={alsoPublishOther}
                    onChange={(e) => setAlsoPublishOther(e.target.checked)}
                  />
                  <div className="min-w-0">
                    <div className={['text-sm font-black', isFastMode ? 'text-blue-900' : 'text-rose-900'].join(' ')}>
                      {isFastMode ? 'Bu Fast’i Polit olarak da yayınla' : 'Bu Polit’i Fast olarak da yayınla'}
                    </div>
                    <div className="text-xs mt-0.5 opacity-90">
                      {isFastMode
                        ? 'Fast paylaşımın ayrıca normal akışta da görünsün.'
                        : 'Polit paylaşımın ayrıca Fast alanında da 24 saat görünsün.'}
                    </div>
                  </div>
                </label>
              </div>

            {/* Step heading */}
            <div className="mb-4">
              {step === 'type' ? (
                <div className="text-center">
                  <div className="text-xl font-black text-gray-900">Önce bir ikon seç!</div>
                  <div className="text-xs text-gray-600 mt-1">Video, Resim, Ses veya Yazı</div>
                </div>
              ) : step === 'agenda' ? (
                <div className="text-center">
                  <div className="text-xl font-black text-gray-900">
                    {isFastMode ? "Fast'ine gündem ekle!" : "Polit'ine gündem ekle!"}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Gündem seçebilir ya da “Gündem Dışı” ile devam edebilirsin.</div>
                </div>
              ) : step === 'media' ? (
                <div className="text-center">
                  <div className="text-xl font-black text-gray-900">
                    {contentType === 'video'
                      ? 'Videonu ekle'
                      : contentType === 'audio'
                        ? 'Sesini ekle'
                        : contentType === 'image'
                          ? 'Resmini ekle'
                          : 'Devam'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Kaydet / çek / yükle</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl font-black text-gray-900">
                    {contentType === 'text' ? 'Metnini yaz' : 'Başlık / kısa açıklama ekle'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{contentType === 'text' ? 'Net ve kısa yaz.' : 'Bu alan zorunlu.'}</div>
                </div>
              )}
            </div>

            {/* Content type icons */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-5">
              {contentTabs.map((t) => {
                const active = t.key === contentType;
                const FallbackIcon = t.fallbackIcon;
                const candidates = iconCandidates?.[t.key] || [];
                const idx = Number(iconTryIndex?.[t.key] || 0);
                const iconSrc = candidates[idx] || '';
                const showImage = !!iconSrc && !brokenIcons[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      pickType(t.key);
                    }}
                    className="group p-0 bg-transparent border-0 outline-none"
                    title={t.alt}
                  >
                    <div
                      className={[
                        'relative rounded-3xl p-[2px] transition-all',
                        active
                          ? isFastMode
                            ? 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-400 shadow-lg'
                            : 'bg-gradient-to-br from-primary-blue via-indigo-400 to-emerald-400 shadow-lg'
                          : 'bg-transparent',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          // No background behind icon "buttons" (keep only border/shape)
                          'rounded-[22px] bg-transparent border',
                          'w-20 h-20 sm:w-28 sm:h-28 md:w-[140px] md:h-[140px]',
                          'flex items-center justify-center',
                          'transition-transform duration-200',
                          'hover:scale-[1.08]',
                          active ? 'border-white/50' : 'border-gray-200 hover:border-gray-300',
                        ].join(' ')}
                      >
                        {showImage ? (
                          <img
                            src={iconSrc}
                            alt={t.alt}
                            className={[
                              'object-contain',
                              'w-14 h-14 sm:w-20 sm:h-20 md:w-[125px] md:h-[125px]',
                              'transition-transform duration-200',
                              active ? 'scale-[1.03]' : 'opacity-95 group-hover:opacity-100',
                            ].join(' ')}
                            loading="eager"
                            fetchpriority="high"
                            onError={() => {
                              const nextIdx = idx + 1;
                              if (nextIdx < candidates.length) {
                                setIconTryIndex((p) => ({ ...p, [t.key]: nextIdx }));
                              } else {
                                setBrokenIcons((p) => ({ ...p, [t.key]: true }));
                              }
                            }}
                          />
                        ) : (
                          <FallbackIcon
                            className={[
                              'transition-transform duration-200',
                              'w-10 h-10 sm:w-14 sm:h-14 md:w-[86px] md:h-[86px]',
                              active
                                ? isFastMode
                                  ? 'text-rose-600 scale-[1.06]'
                                  : 'text-primary-blue scale-[1.06]'
                                : 'text-gray-700 group-hover:text-gray-900',
                            ].join(' ')}
                          />
                        )}
                      </div>
                      <div className="mt-2 text-center text-[11px] sm:text-xs font-black tracking-tight">
                        <span className={active ? (isFastMode ? 'text-rose-700' : 'text-primary-blue') : 'text-gray-600 group-hover:text-gray-800'}>
                          {t.alt}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* STEP: Agenda */}
              {step === 'agenda' && (
                <div className="space-y-3">
                  <div
                    className={[
                      'w-full rounded-2xl border-2 bg-white px-4 py-4',
                      agendaTouched && agendaTag === '' ? 'border-primary-blue/40' : 'border-gray-200',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => pickAgenda('')}
                        className="flex-1 text-left"
                        title="Gündem dışı seç"
                      >
                        <div className="font-black text-gray-900">Gündem Dışı</div>
                        <div className="text-xs text-gray-600 mt-0.5">Gündem seçmeden devam et</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => pickAgenda('')}
                        className="px-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-black"
                        title="Onayla ve devam et"
                      >
                        Onayla
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-black text-gray-900 mb-2">Gündem Seçin</div>
                    <div
                      className={[
                        'relative rounded-xl p-[2px]',
                        isFastMode
                          ? 'bg-gradient-to-r from-red-500/70 via-rose-500/70 to-orange-400/70'
                          : 'bg-gradient-to-r from-primary-blue/70 via-indigo-400/70 to-emerald-400/70',
                      ].join(' ')}
                    >
                      <select
                        value={agendaTouched ? agendaTag : ''}
                        onChange={(e) => pickAgenda(e.target.value)}
                        className={[
                          'w-full px-4 py-3 pr-11 bg-white/95 border border-transparent rounded-[10px] outline-none',
                          isFastMode
                            ? 'focus:ring-2 focus:ring-rose-500/35 focus:border-rose-500'
                            : 'focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue',
                        ].join(' ')}
                      >
                        <option value="">Gündem seçin…</option>
                        {agendas
                          .filter((a) => a?.is_active !== false)
                          .map((a) => (
                            <option key={a.id || a.slug || a.title} value={a.title || ''}>
                              {a.title}
                            </option>
                          ))}
                      </select>
                      <div
                        className={[
                          'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2',
                          isFastMode ? 'text-rose-600' : 'text-primary-blue',
                        ].join(' ')}
                      >
                        <Flame className="w-7 h-7" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={confirmAgendaAndContinue}
                      className={[
                        'mt-3 w-full py-3 rounded-xl text-white font-black',
                        agendaTouched ? '' : 'opacity-60',
                        isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
                      ].join(' ')}
                      disabled={!agendaTouched}
                      title="Onayla ve devam et"
                    >
                      Onayla ve Devam Et
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={goBack}
                    className="w-full py-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                  >
                    Geri Dön
                  </button>
                </div>
              )}

              {/* STEP: Media preview */}
              {step === 'media' && (
                <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
                  {contentType === 'video' && (
                    <>
                      <div className="text-xs font-black text-gray-700 mb-2">Video Önizleme</div>
                      {recordedUrl ? (
                        <video src={recordedUrl} controls className="w-full rounded-xl bg-black" />
                      ) : (
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">Kayda Başla</span> ile videonu çek ve burada önizle.
                        </div>
                      )}
                    </>
                  )}

                  {contentType === 'audio' && (
                    <>
                      <div className="text-xs font-black text-gray-700 mb-2">Ses Önizleme</div>
                      {recordedUrl ? (
                        <audio src={recordedUrl} controls className="w-full" />
                      ) : (
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">Kayda Başla</span> ile ses kaydı al.
                        </div>
                      )}
                    </>
                  )}

                  {contentType === 'image' && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-black text-gray-700">Resim Önizleme</div>
                        <div className="text-[11px] text-gray-500">
                          {Math.min(files.length, 10)}/{10}
                        </div>
                      </div>
                      {imagePreviews.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {imagePreviews.map((u, idx) => (
                            <div
                              key={u}
                              draggable
                              onDragStart={() => {
                                setDragImageIdx(idx);
                                setDragOverImageIdx(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverImageIdx !== idx) setDragOverImageIdx(idx);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragImageIdx === null || dragImageIdx === undefined) return;
                                reorderFiles(dragImageIdx, idx);
                                setDragImageIdx(null);
                                setDragOverImageIdx(null);
                              }}
                              onDragEnd={() => {
                                setDragImageIdx(null);
                                setDragOverImageIdx(null);
                              }}
                              className={`w-24 h-24 rounded-xl flex-shrink-0 border ${
                                dragOverImageIdx === idx
                                  ? isFastMode
                                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                                    : 'border-primary-blue ring-2 ring-primary-blue/30'
                                  : 'border-gray-200'
                              }`}
                              title="Sürükle-bırak ile sırala"
                            >
                              <img src={u} alt="" className="w-full h-full rounded-xl object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">Resim ekleyince burada gözükecek.</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* VIDEO */}
              {step === 'media' && contentType === 'video' && (
                <div>
                  <div className={isFastMode ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className={[
                          'py-4 rounded-xl text-white font-black',
                          isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Video className="w-8 h-8" />
                          Kayda Başla
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <StopCircle className="w-8 h-8" />
                          Kaydı Durdur
                        </div>
                      </button>
                    )}

                    {!isFastMode ? (
                      <button
                        type="button"
                        onClick={() => videoUploadRef.current?.click()}
                        className="py-4 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <UploadCloud className="w-8 h-8" />
                          Video Yükle
                        </div>
                      </button>
                    ) : null}
                  </div>

                  <input
                    ref={videoUploadRef}
                    type="file"
                    accept="video/*"
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

                  {(files.length > 0 || recordedUrl) && (
                    <button
                      type="button"
                      onClick={resetMedia}
                      className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-black"
                      title="Temizle"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trash2 className="w-7 h-7" />
                        Temizle
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* IMAGE */}
              {step === 'media' && contentType === 'image' && (
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => imageUploadRef.current?.click()}
                      className={[
                        'py-4 rounded-xl text-white font-black',
                        isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <UploadCloud className="w-8 h-8" />
                        Resim Yükle
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => imageCaptureRef.current?.click()}
                      className="py-4 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Camera className="w-8 h-8" />
                        Resim Çek
                      </div>
                    </button>
                  </div>

                  <input
                    ref={imageUploadRef}
                    type="file"
                    accept={accept}
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

                  {files.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-semibold">{Math.min(files.length, 10)}</span> resim seçildi.
                    </div>
                  )}
                </div>
              )}

              {/* AUDIO */}
              {step === 'media' && contentType === 'audio' && (
                <div>
                  <div className={isFastMode ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className={[
                          'py-4 rounded-xl text-white font-black',
                          isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Mic className="w-8 h-8" />
                          Kayda Başla
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <StopCircle className="w-8 h-8" />
                          Kaydı Durdur
                        </div>
                      </button>
                    )}

                    {!isFastMode ? (
                      <button
                        type="button"
                        onClick={() => audioUploadRef.current?.click()}
                        className="py-4 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <UploadCloud className="w-8 h-8" />
                          Ses Yükle
                        </div>
                      </button>
                    ) : null}
                  </div>

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

                  {(files.length > 0 || recordedUrl) && (
                    <button
                      type="button"
                      onClick={resetMedia}
                      className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-black"
                      title="Temizle"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trash2 className="w-7 h-7" />
                        Temizle
                      </div>
                    </button>
                  )}
                </div>
              )}

              {step === 'media' && (
                <>
                  <button
                    type="button"
                    onClick={goNextFromMedia}
                    disabled={loading || approvalPending}
                    className={[
                      'w-full py-3 rounded-xl text-white font-black disabled:opacity-60',
                      isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
                    ].join(' ')}
                  >
                    Devam Et
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    className="w-full py-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                  >
                    Geri Dön
                  </button>
                </>
              )}

              {step === 'desc' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Metin</label>
                    {contentType === 'text' && (
                      <span className="text-xs text-gray-500">
                        {Math.max(0, TEXT_LIMIT - (content?.length || 0))} karakter kaldı
                      </span>
                    )}
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    placeholder={
                      contentType === 'text'
                        ? 'Ne düşünüyorsun? (Maks. 350 karakter)'
                        : 'Gönderinize Başlık veya Kısa Açıklama yazmalısınız.'
                    }
                    maxLength={contentType === 'text' ? TEXT_LIMIT : undefined}
                    className={[
                      'w-full px-4 py-3 border border-gray-300 rounded-xl outline-none resize-none bg-white/95',
                      isFastMode
                        ? 'focus:ring-2 focus:ring-rose-500/35 focus:border-rose-500'
                        : 'focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue',
                    ].join(' ')}
                  />
                  {contentType === 'text' && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      Metin politleri için maksimum <span className="font-semibold">350 karakter</span> sınırı uygulanır.
                    </div>
                  )}
                </div>
              )}

              {step === 'desc' && (
                <>
                  <button
                    type="submit"
                    disabled={loading || approvalPending || !contentType}
                    className={[
                      'w-full py-3 rounded-xl text-white font-black disabled:opacity-60',
                      isFastMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-blue hover:bg-blue-600',
                    ].join(' ')}
                  >
                    {approvalPending
                      ? 'Onay bekleniyor'
                      : loading
                        ? 'Paylaşılıyor…'
                        : isFastMode
                          ? 'Fast At!'
                          : 'Polit At!'}
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    className="w-full py-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black"
                  >
                    Geri Dön
                  </button>
                </>
              )}

            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
};
