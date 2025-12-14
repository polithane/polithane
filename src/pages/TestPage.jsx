import { useEffect, useState } from 'react';
import { Avatar } from '../components/common/Avatar';

const pretty = (v) => JSON.stringify(v, null, 2);

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text().catch(() => '');
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    text,
    json,
  };
}

export const TestPage = () => {
  const [health, setHealth] = useState(null);
  const [parties, setParties] = useState(null);
  const [users, setUsers] = useState(null);
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    (async () => {
      setHealth(await fetchJson('/api/health'));
      setParties(await fetchJson('/api/parties'));
      setUsers(await fetchJson('/api/users?limit=5'));
      setPosts(await fetchJson('/api/posts?limit=5'));
    })();
  }, []);

  const sampleUser = Array.isArray(users?.json) ? users.json[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6">
        <div className="card mb-4">
          <div className="text-lg font-black text-gray-900 mb-1">/test</div>
          <div className="text-xs text-gray-600">
            Bu sayfa, Vercel üzerindeki /api endpoint’leri DB’den veri çekebiliyor mu diye test eder.
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Origin: <span className="font-mono">{typeof window !== 'undefined' ? window.location.origin : '-'}</span>
          </div>
        </div>

        {sampleUser && (
          <div className="card mb-4 flex items-center gap-3">
            <Avatar src={sampleUser.avatar_url} size="56px" verified={sampleUser.is_verified} />
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate">{sampleUser.full_name}</div>
              <div className="text-xs text-gray-600 truncate">@{sampleUser.username}</div>
              <div className="text-xs text-gray-500 truncate">{sampleUser.user_type}</div>
            </div>
            {sampleUser.avatar_url && (
              <a className="text-xs text-primary-blue hover:underline" href={sampleUser.avatar_url} target="_blank" rel="noreferrer">
                avatar link
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="font-bold mb-2">GET /api/health</div>
            <pre className="text-[11px] whitespace-pre-wrap break-words">{pretty(health)}</pre>
          </div>
          <div className="card">
            <div className="font-bold mb-2">GET /api/parties</div>
            <pre className="text-[11px] whitespace-pre-wrap break-words">{pretty(parties)}</pre>
          </div>
          <div className="card">
            <div className="font-bold mb-2">GET /api/users?limit=5</div>
            <pre className="text-[11px] whitespace-pre-wrap break-words">{pretty(users)}</pre>
          </div>
          <div className="card">
            <div className="font-bold mb-2">GET /api/posts?limit=5</div>
            <pre className="text-[11px] whitespace-pre-wrap break-words">{pretty(posts)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

