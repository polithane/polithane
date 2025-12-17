import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Square, Circle, Trash2, X, Sparkles, Video, Image as ImageIcon, Music, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, posts as postsApi } from '../utils/api';
import { Avatar } from '../components/common/Avatar';

const getIconBaseUrl = () => {
  const explicit = String(import.meta.env.VITE_ICON_BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!supabaseUrl) return '';
  // Default: icons placed under uploads/ikons in Supabase Storage (public)
  return `${supabaseUrl}/storage/v1/object/public/uploads/ikons`;
};

const IKON_BASE = getIconBaseUrl();

const CONTENT_TABS = [
  { key: 'video', iconSrc: `${IKON_BASE}/videoikon.png`, fallbackIcon: Video, alt: 'Video' },
  { key: 'image', iconSrc: `${IKON_BASE}/resimikon.png`, fallbackIcon: ImageIcon, alt: 'Resim' },
  { key: 'audio', iconSrc: `${IKON_BASE}/sesikon.png`, fallbackIcon: Music, alt: 'Ses' },
  { key: 'text', iconSrc: `${IKON_BASE}/yaziikon.png`, fallbackIcon: PenTool, alt: 'Yazı' },
];

export const CreatePolitPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [contentType, setContentType] = useState('video');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [agendaTag, setAgendaTag] = useState(''); // '' => Gündem dışı
  const [agendas, setAgendas] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [brokenIcons, setBrokenIcons] = useState({});

  // Text constraints
  const TEXT_LIMIT = 350;

  // Hidden inputs for image upload/capture
  const imageUploadRef = useRef(null);
  const imageCaptureRef = useRef(null);

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

      const result = await postsApi.create({
        content: content,
        content_type: contentType,
        content_text: content,
        category,
        agenda_tag: agendaTag || null,
        media_urls,
      });
      if (result?.success && result?.data?.id) {
        toast.success('Polit başarıyla oluşturuldu.');
        navigate(`/post/${result.data.id}`);
        return;
      }

      toast.success('Polit oluşturuldu.');
      navigate('/');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="container-main py-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
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
                <div className="text-lg font-black text-gray-900">Polit At</div>
                <div className="text-[11px] text-gray-500">Sosyal medya gibi hızlı paylaş</div>
              </div>
              <div className="w-10" />
            </div>

            <div className="p-5">
              {/* Identity row */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={user?.avatar_url}
                    size="44px"
                    verified={user?.is_verified}
                    className="border border-gray-200 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">{user?.full_name || 'Misafir'}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {isAuthenticated ? 'Paylaşım yapıyorsun' : 'Polit atmak için giriş yap'}
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black">
                  <Sparkles className="w-4 h-4" />
                  {contentType === 'video'
                    ? 'Video'
                    : contentType === 'image'
                      ? 'Resim'
                      : contentType === 'audio'
                        ? 'Ses'
                        : 'Yazı'}
                </div>
              </div>

            {/* Content type tabs */}
            <div className="flex items-center justify-center gap-5 mb-5">
              {CONTENT_TABS.map((t) => {
                const active = t.key === contentType;
                const FallbackIcon = t.fallbackIcon;
                const showImage = !!IKON_BASE && !brokenIcons[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setContentType(t.key);
                      resetMedia();
                    }}
                    className="p-0 bg-transparent border-0 outline-none"
                    title={t.alt}
                  >
                    {showImage ? (
                      <img
                        src={t.iconSrc}
                        alt={t.alt}
                        className={`object-contain transition-transform ${active ? 'scale-110' : 'opacity-90 hover:opacity-100'}`}
                        style={{ width: 56, height: 56 }}
                        loading="lazy"
                        onError={() => setBrokenIcons((p) => ({ ...p, [t.key]: true }))}
                      />
                    ) : (
                      <FallbackIcon
                        className={`transition-transform ${active ? 'scale-110 text-primary-blue' : 'text-gray-700 hover:text-gray-900'}`}
                        style={{ width: 44, height: 44 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Preview area */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
                          <img
                            key={u}
                            src={u}
                            alt=""
                            className="w-24 h-24 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                            title={`Resim ${idx + 1}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Resim ekleyince burada gözükecek.</div>
                    )}
                  </>
                )}

                {contentType === 'text' && (
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Yazı</span> politin anında yayınlanır. Net ve kısa yaz.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gündem</label>
                  <select
                    value={agendaTag}
                    onChange={(e) => setAgendaTag(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                  >
                    <option value="">Gündem dışı</option>
                    {agendas
                      .filter((a) => a?.is_active !== false)
                      .map((a) => (
                        <option key={a.id || a.slug || a.title} value={a.title || ''}>
                          {a.title}
                        </option>
                      ))}
                  </select>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Gündem listesi admin panelindeki gündemlerden gelir. Bulamazsanız “Gündem dışı” seçebilirsiniz.
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
                  >
                    <option value="general">Genel</option>
                    <option value="mps">Vekiller</option>
                    <option value="organization">Teşkilat</option>
                    <option value="citizens">Vatandaş</option>
                    <option value="media">Medya</option>
                  </select>
                </div>
              </div>

              {/* VIDEO: Kayda Başla */}
              {contentType === 'video' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Video</label>
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex-1 py-3 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Circle className="w-4 h-4" />
                          Kayda Başla
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Square className="w-4 h-4" />
                          Kaydı Durdur
                        </div>
                      </button>
                    )}

                    {(files.length > 0 || recordedUrl) && (
                      <button
                        type="button"
                        onClick={resetMedia}
                        className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                        title="Temizle"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* IMAGE: Resim Yükle / Resim Çek */}
              {contentType === 'image' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Resim</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => imageUploadRef.current?.click()}
                      className="py-3 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-black"
                    >
                      Resim Yükle
                    </button>
                    <button
                      type="button"
                      onClick={() => imageCaptureRef.current?.click()}
                      className="py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-black"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Camera className="w-4 h-4" />
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

              {/* AUDIO: Kayda Başla */}
              {contentType === 'audio' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ses</label>
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex-1 py-3 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Circle className="w-4 h-4" />
                          Kayda Başla
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Square className="w-4 h-4" />
                          Kaydı Durdur
                        </div>
                      </button>
                    )}

                    {(files.length > 0 || recordedUrl) && (
                      <button
                        type="button"
                        onClick={resetMedia}
                        className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                        title="Temizle"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                  placeholder={contentType === 'text' ? 'Ne düşünüyorsun? (Maks. 350 karakter)' : 'Açıklama ekleyin (önerilir)'}
                  maxLength={contentType === 'text' ? TEXT_LIMIT : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none resize-none"
                />
                {contentType === 'text' && (
                  <div className="mt-2 text-[11px] text-gray-500">
                    Metin politleri için maksimum <span className="font-semibold">350 karakter</span> sınırı uygulanır.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-black disabled:opacity-60"
              >
                {loading ? 'Paylaşılıyor…' : 'Polit At!'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
