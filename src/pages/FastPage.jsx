import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoriesBar } from '../components/home/StoriesBar';
import { apiCall } from '../utils/api';

export const FastPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await apiCall('/api/fast?limit=80').catch(() => null);
        const list = r?.data || [];
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50">
      <div className="container-main py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-black text-gray-900">Fast</div>
            <div className="text-sm text-gray-600">Takip ettiklerinin 24 saatlik hızlı paylaşımları.</div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Geri
          </button>
        </div>

        <div className="card">
          <StoriesBar stories={items} mode="fast" />
        </div>

        {loading ? <div className="mt-4 text-center text-sm text-gray-600">Yükleniyor…</div> : null}
        {!loading && items.length === 0 ? (
          <div className="mt-6 card text-sm text-gray-700">
            Şu an takip ettiğin kişilerden aktif Fast yok. <button className="text-rose-600 font-black hover:underline" onClick={() => navigate('/fast-at')}>Hemen Fast At</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

