import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Square, Circle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, posts as postsApi } from '../utils/api';

const IKON_BASE = 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/ikons';

const CONTENT_TABS = [
  { key: 'video', iconSrc: `${IKON_BASE}/videoikon.png`, alt: 'Video' },
  { key: 'image', iconSrc: `${IKON_BASE}/resimikon.png`, alt: 'Resim' },
  { key: 'audio', iconSrc: `${IKON_BASE}/sesikon.png`, alt: 'Ses' },
  { key: 'text', iconSrc: `${IKON_BASE}/yaziikon.png`, alt: 'Yazı' },
];

export const CreatePolitPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [contentType, setContentType] = useState('video');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="mb-4">
              <h1 className="text-2xl font-black text-gray-900">Polit At</h1>
              <p className="text-sm text-gray-600">Video, resim, ses veya metin paylaş.</p>
            </div>

            {/* Content type tabs */}
            <div className="flex items-center justify-center gap-6 mb-4">
              {CONTENT_TABS.map((t) => {
                const active = t.key === contentType;
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
                    <img
                      src={t.iconSrc}
                      alt={t.alt}
                      className={`object-contain transition-transform ${active ? 'scale-110' : 'opacity-80 hover:opacity-100'}`}
                      style={{ width: 32, height: 32 }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gündem/Kategori</label>
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

                  {recordedUrl && (
                    <div className="mt-3">
                      <video src={recordedUrl} controls className="w-full rounded-xl bg-black" />
                    </div>
                  )}
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
                      {files.slice(0, 10).map((f) => f.name).join(', ')}
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

                  {recordedUrl && (
                    <div className="mt-3">
                      <audio src={recordedUrl} controls className="w-full" />
                    </div>
                  )}
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

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Geri
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
