import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Image as ImageIcon, Mic, FileText, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { posts as postsApi } from '../utils/api';

const CONTENT_TABS = [
  { key: 'text', label: 'Metin', icon: FileText },
  { key: 'image', label: 'Resim', icon: ImageIcon },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'audio', label: 'Ses', icon: Mic },
];

export const CreatePolitPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [contentType, setContentType] = useState('text');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('gundem');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const accept = useMemo(() => {
    if (contentType === 'image') return 'image/*';
    if (contentType === 'video') return 'video/*';
    if (contentType === 'audio') return 'audio/*';
    return undefined;
  }, [contentType]);

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
                const Icon = t.icon;
                const active = t.key === contentType;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setContentType(t.key);
                      setFiles([]);
                    }}
                    className={
                      active
                        ? 'px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-primary-blue font-bold'
                        : 'px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50'
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{t.label}</span>
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

              {(contentType === 'image' || contentType === 'video' || contentType === 'audio') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dosya(lar)</label>
                  <label className="block p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-blue hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <UploadCloud className="w-6 h-6 text-gray-500" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">Dosya seç</div>
                        <div className="text-xs text-gray-500">En fazla 5 dosya</div>
                      </div>
                      <div className="text-xs text-gray-500">{files.length}/5</div>
                    </div>
                    <input
                      type="file"
                      accept={accept}
                      multiple
                      className="hidden"
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {files.slice(0, 5).map((f) => f.name).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">İçerik</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Ne düşünüyorsun?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none resize-none"
                />
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
