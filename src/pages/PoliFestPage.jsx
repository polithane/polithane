import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoriesBar } from '../components/home/StoriesBar';
import { apiCall } from '../utils/api';

export const PoliFestPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const polifestUsers = await apiCall(
        `/api/users?user_type=mp,party_official,media&limit=80&order=polit_score.desc`
      ).catch(() => []);
      setItems(
        (polifestUsers || []).map((u) => ({
          user_id: u.id,
          username: u.username,
          full_name: u.full_name,
          profile_image: u.avatar_url,
          story_count: Math.max(1, Math.min(6, Math.floor((u.post_count || 1) / 3) || 1)),
        }))
      );
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-black text-gray-900">PoliFest</div>
            <div className="text-sm text-gray-600">Kısa ve hızlı politik içerikler.</div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Geri
          </button>
        </div>

        <div className="card">
          <StoriesBar stories={items} />
        </div>
      </div>
    </div>
  );
};

