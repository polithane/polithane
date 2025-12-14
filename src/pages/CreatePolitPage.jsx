import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Square, Circle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { posts as postsApi } from '../utils/api';

const IKON_BASE = 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/ikons';

const CONTENT_TABS = [
  { key: 'video', iconSrc: `${IKON_BASE}/videoikon.png`, alt: 'Video' },
  { key: 'image', iconSrc: `${IKON_BASE}/resimikon.png`, alt: 'Resim' },
  { key: 'audio', iconSrc: `${IKON_BASE}/sesikon.png`, alt: 'Ses' },
  { key: 'text', iconSrc: `${IKON_BASE}/yaziikon.png`, alt: 'Yazı' },
];

export const CreatePolitPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [contentType, setContentType] = useState('video');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('gundem');
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

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('category', category);

      // Backend upload alanı: media (max 5)
      files.slice(0, 5).forEach((f) => formData.append('media', f));

      const result = await postsApi.create(formData);
      if (result?.success && result?.data?.id) {
        toast.success('Polit başarıyla oluşturuldu.');
        navigate(`/post/${result.data.id}`);
        return;
      }

      toast.success('Polit oluşturuldu.');
      navigate('/');
    } catch (err) {
      toast.error(err?.message || 'Polit oluşturulurken hata oluştu.');
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
            <div className="grid grid-cols-4 gap-2 mb-4">
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
                    className={
                      active
                        ? 'px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-primary-blue'
                        : 'px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }
                  >
                    <div className="flex items-center justify-center">
                      <img
                        src={t.iconSrc}
                        alt={t.alt}
                        className="w-6 h-6 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          // Hide broken icon (keeps tab functional)
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
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
                  <option value="gundem">Gündem</option>
                  <option value="general">Genel</option>
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
                    onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                  />
                  <input
                    ref={imageCaptureRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                  />

                  {files.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {files.slice(0, 5).map((f) => f.name).join(', ')}
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
