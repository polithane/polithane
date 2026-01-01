import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Video, File, Trash2, Download, Eye, Search, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { formatFileSize } from '../../utils/formatters';

export const MediaManagement = () => {
  // IMPORTANT: Do not auto-load media binaries on this page. Only show URLs + metadata.
  const [bucket, setBucket] = useState('uploads');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [folder, setFolder] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const replaceInputRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.storageList({ bucket, prefix: folder, limit: 200, offset: 0 }).catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Storage listesi alınamadı.');
      setItems(Array.isArray(r.data) ? r.data : []);
      const resolvedBucket = String(r?.meta?.bucket || '').trim();
      if (resolvedBucket && resolvedBucket !== bucket) setBucket(resolvedBucket);
    } catch (e) {
      setError(String(e?.message || 'Storage listesi alınamadı.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const mediaItems = useMemo(() => {
    return items.map((it) => {
      const mimetype = String(it?.mimetype || '').toLowerCase();
      const type = mimetype.startsWith('image/')
        ? 'image'
        : mimetype.startsWith('video/')
          ? 'video'
          : 'document';
      return {
        id: it.path,
        filename: it.name,
        path: it.path,
        bucket: it.bucket,
        url: it.public_url,
        type,
        sizeBytes: Number(it.size || 0) || 0,
        uploaded_at: it.created_at || it.updated_at || null,
        usage_count: '—',
      };
    });
  }, [items]);

  const filteredMedia = useMemo(() => {
    const q = String(searchQuery || '').trim().toLocaleLowerCase('tr-TR');
    return mediaItems.filter((media) => {
      const matchesType = filterType === 'all' || media.type === filterType;
      const matchesSearch = !q || String(media.filename || '').toLocaleLowerCase('tr-TR').includes(q);
      return matchesType && matchesSearch;
    });
  }, [mediaItems, filterType, searchQuery]);

  const getMediaIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-6 h-6 text-blue-500" />;
      case 'video': return <Video className="w-6 h-6 text-purple-500" />;
      case 'document': return <File className="w-6 h-6 text-gray-500" />;
      default: return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  const deleteOne = async (media) => {
    const path = String(media?.path || '').trim();
    if (!path) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Silinsin mi?\n${path}`)) return;
    const b = String(media?.bucket || bucket || 'uploads').trim() || 'uploads';
    const r = await adminApi.storageDelete({ bucket: b, paths: [path] }).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  const copyUrl = async (url) => {
    const u = String(url || '').trim();
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
    } catch {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = u;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // ignore
      }
    }
  };

  const onPickReplace = (media) => {
    setReplaceTarget(media);
    try {
      replaceInputRef.current?.click?.();
    } catch {
      // ignore
    }
  };

  const onReplaceChosen = async (e) => {
    const file = e?.target?.files?.[0] || null;
    if (!file || !replaceTarget?.path) return;
    setError('');
    setLoading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('Dosya okunamadı.'));
        r.readAsDataURL(file);
      });
      const r = await adminApi
        .storageReplace({
          bucket: String(replaceTarget?.bucket || bucket || 'uploads').trim() || 'uploads',
          path: replaceTarget.path,
          dataUrl,
          contentType: String(file.type || '').trim(),
        })
        .catch(() => null);
      if (!r?.success) throw new Error(r?.error || 'Dosya güncellenemedi.');
      await load();
    } catch (err) {
      setError(String(err?.message || 'Dosya güncellenemedi.'));
    } finally {
      setLoading(false);
      setReplaceTarget(null);
      try {
        if (replaceInputRef.current) replaceInputRef.current.value = '';
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <input ref={replaceInputRef} type="file" className="hidden" onChange={onReplaceChosen} />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Medya Yönetimi</h1>
          <p className="text-gray-600">URL ve metadata üzerinden yönetim (dosyalar otomatik yüklenmez)</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-black"
        >
          <RefreshCw className="w-5 h-5" />
          Yenile
        </button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      <div className="mb-4 text-xs text-gray-500">
        Bucket: <span className="font-mono text-gray-700">{bucket}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Toplam Resim</div>
          <div className="text-2xl font-black text-blue-700">{mediaItems.filter((m) => m.type === 'image').length}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Toplam Video</div>
          <div className="text-2xl font-black text-purple-700">{mediaItems.filter((m) => m.type === 'video').length}</div>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Toplam Doküman</div>
          <div className="text-2xl font-black text-gray-700">{mediaItems.filter((m) => m.type === 'document').length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Toplam Boyut</div>
          <div className="text-2xl font-black text-green-700">
            {formatFileSize(mediaItems.reduce((acc, m) => acc + (Number(m.sizeBytes || 0) || 0), 0))}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Dosya ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
          >
            <option value="all">Tüm Dosyalar</option>
            <option value="image">Resimler</option>
            <option value="video">Videolar</option>
            <option value="document">Dokümanlar</option>
          </select>

          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
            title="Klasör"
          >
            <option value="">(kök)</option>
            <option value="messages">messages</option>
            <option value="documents">documents</option>
            <option value="posts">posts</option>
            <option value="fast">fast</option>
            <option value="avatars">avatars</option>
          </select>
        </div>
      </div>

      {/* Media List (no thumbnails) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredMedia.map((media) => (
            <div key={media.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getMediaIcon(media.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 truncate">{media.filename}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {formatFileSize(media.sizeBytes)} • {media.path}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => copyUrl(media.url)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                        title="URL kopyala"
                      >
                        <LinkIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(media.url, '_blank')}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                        title="URL aç"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(media.url, '_blank')}
                        className="p-2 rounded-lg hover:bg-blue-50 text-primary-blue"
                        title="İndir"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onPickReplace(media)}
                        className="p-2 rounded-lg hover:bg-amber-50 text-amber-700"
                        title="Değiştir (dosya seç)"
                      >
                        <Upload className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOne(media)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-700"
                        title="Sil"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => copyUrl(media.url)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 font-mono text-[11px] text-gray-700 truncate"
                      title="Tıklayınca URL kopyalanır"
                    >
                      {media.url}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredMedia.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-600">Henüz dosya yok.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
