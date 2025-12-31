import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, FileText, Eye, Medal, PieChart } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';
import { formatPolitScore } from '../../utils/formatters';

export const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await adminApi.getAnalytics({ range: dateRange }).catch(() => null);
        if (!r?.success) throw new Error(r?.error || 'Analitik yüklenemedi.');
        if (!cancelled) setData(r.data || null);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || 'Analitik yüklenemedi.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  const cards = useMemo(() => {
    const totals = data?.totals || {};
    const window = data?.window || {};
    const approx = data?.approx || {};
    const views = approx?.totalViews;
    const score = approx?.totalPolitScore;
    return [
      {
        label: 'Toplam Kullanıcı',
        value: Number(totals.totalUsers || 0).toLocaleString('tr-TR'),
        sub: `Bu aralıkta +${Number(window.usersInRange || 0).toLocaleString('tr-TR')}`,
        icon: Users,
        color: 'text-blue-600',
      },
      {
        label: 'Toplam Paylaşım',
        value: Number(totals.totalPosts || 0).toLocaleString('tr-TR'),
        sub: `Bu aralıkta +${Number(window.postsInRange || 0).toLocaleString('tr-TR')}`,
        icon: FileText,
        color: 'text-green-600',
      },
      {
        label: 'Görüntülenme (yaklaşık)',
        value: typeof views === 'number' ? views.toLocaleString('tr-TR') : '—',
        sub: approx?.sampleSize ? `Son ${Number(approx.sampleSize).toLocaleString('tr-TR')} post örneği` : 'Veri yok',
        icon: Eye,
        color: 'text-purple-600',
      },
      {
        label: 'Polit Puan (yaklaşık)',
        value: typeof score === 'number' ? formatPolitScore(score) : '—',
        sub: approx?.sampleSize ? `Son ${Number(approx.sampleSize).toLocaleString('tr-TR')} post örneği` : 'Veri yok',
        icon: TrendingUp,
        color: 'text-orange-600',
      },
    ];
  }, [data]);

  const userTypeCards = useMemo(() => {
    const m = data?.userTypeCounts || {};
    const items = [
      { key: 'normal', label: 'Vatandaş/Üye' },
      { key: 'party_member', label: 'Parti Üyesi' },
      { key: 'media', label: 'Medya' },
      { key: 'politician', label: 'Siyasetçi' },
      { key: 'party_official', label: 'Teşkilat' },
      { key: 'mp', label: 'Milletvekili' },
      { key: 'ex_politician', label: 'Deneyimli' },
      { key: 'citizen', label: 'Citizen (legacy)' },
    ];
    return items.map((it) => ({ ...it, count: Number(m[it.key] || 0) }));
  }, [data]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Analitik & Raporlar</h1>
          <p className="text-gray-600">Gerçek veriler (Supabase) üzerinden özet</p>
        </div>
        
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="today">Bugün</option>
          <option value="7days">Son 7 Gün</option>
          <option value="30days">Son 30 Gün</option>
          <option value="90days">Son 90 Gün</option>
        </select>
      </div>
      
      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {/* Main Metrics (real) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border p-6">
            <c.icon className={`w-8 h-8 ${c.color} mb-2`} />
            <div className="text-3xl font-black text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-600">{c.label}</div>
            <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">En Popüler Gündemler</h3>
          <div className="space-y-3">
            {(Array.isArray(data?.topAgendas) ? data.topAgendas : []).slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-900">{a.title}</span>
                <span className="text-primary-blue font-black">{formatPolitScore(a.total_polit_score || 0)}</span>
              </div>
            ))}
            {!loading && (!data?.topAgendas || data.topAgendas.length === 0) ? (
              <div className="text-sm text-gray-600">Gündem verisi bulunamadı.</div>
            ) : null}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Kullanıcı Dağılımı</h3>
          <div className="space-y-3">
            {userTypeCards.map((t) => (
              <div key={t.key} className="flex items-center justify-between">
                <span className="text-gray-700">{t.label}</span>
                <span className="font-black text-gray-900">{t.count.toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">En Yüksek Polit Puanlı Kullanıcılar</h3>
            <Medal className="w-6 h-6 text-primary-blue" />
          </div>
          <div className="space-y-3">
            {(Array.isArray(data?.topUsers) ? data.topUsers : []).slice(0, 10).map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{u.full_name || '—'}</div>
                  <div className="text-xs text-gray-500 truncate">@{u.username || u.id}</div>
                </div>
                <div className="text-primary-blue font-black">{formatPolitScore(u.polit_score || 0)}</div>
              </div>
            ))}
            {!loading && (!data?.topUsers || data.topUsers.length === 0) ? (
              <div className="text-sm text-gray-600">Kullanıcı verisi bulunamadı.</div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Paylaşım Tipleri</h3>
            <PieChart className="w-6 h-6 text-primary-blue" />
          </div>
          <div className="space-y-3">
            {[
              { k: 'text', label: 'Metin' },
              { k: 'image', label: 'Resim' },
              { k: 'video', label: 'Video' },
              { k: 'audio', label: 'Ses' },
            ].map((it) => (
              <div key={it.k} className="flex items-center justify-between">
                <span className="text-gray-700">{it.label}</span>
                <span className="font-black text-gray-900">{Number(data?.postTypeCounts?.[it.k] || 0).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
