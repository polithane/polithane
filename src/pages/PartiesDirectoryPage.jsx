import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { currentParliamentDistribution, totalSeats } from '../data/parliamentDistribution';
import api from '../utils/api';
import { apiCall } from '../utils/api';
import { ApiNotice } from '../components/common/ApiNotice';

const shortNameToPartySlug = (shortName) => {
  const v = String(shortName || '').trim().toUpperCase('tr-TR');
  if (v === 'AK PARTİ' || v === 'AK PARTI') return 'akp';
  if (v === 'CHP') return 'chp';
  if (v === 'MHP') return 'mhp';
  if (v === 'DEM PARTİ' || v === 'DEM PARTI' || v === 'DEM') return 'dem';
  if (v === 'İYİ PARTİ' || v === 'IYI PARTI' || v === 'IYI PARTİ') return 'iyi';
  if (v === 'YENİ YOL') return 'yeni-yol';
  if (v === 'YRP' || v === 'YENİDEN REFAH') return 'yrp';
  if (v === 'HÜRDAVA' || v === 'HÜDAPAR' || v === 'HUDA PAR' || v === 'HÜDA PAR') return 'hurdava';
  if (v === 'TİP' || v === 'TIP') return 'tip';
  if (v === 'BAĞIMSIZ' || v === 'BAGIMSIZ') return 'bagimsiz';
  if (v === 'DBP') return 'dbp';
  if (v === 'EMEP') return 'emep';
  if (v === 'SAADET' || v === 'SP' || v === 'SAADET PARTİSİ' || v === 'SAADET PARTISI') return 'saadet';
  if (v === 'DSP') return 'dsp';
  if (v === 'DP') return 'dp';
  return null;
};

export const PartiesDirectoryPage = () => {
  const navigate = useNavigate();
  const [dbParties, setDbParties] = useState([]);
  const [parliamentDistribution, setParliamentDistribution] = useState(currentParliamentDistribution);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError('');
      try {
        const rows = await api.parties.getAll();
        if (!mounted) return;
        setDbParties(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Partiler yüklenemedi.');
        setDbParties([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await apiCall('/api/public/parliament', { method: 'GET' }).catch(() => null);
      const dist = r?.data?.distribution;
      if (!mounted) return;
      if (Array.isArray(dist) && dist.length > 0) setParliamentDistribution(dist);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const parties = useMemo(() => {
    const list = Array.isArray(dbParties) && dbParties.length > 0 ? dbParties : [];

    const dist = Array.isArray(parliamentDistribution) ? parliamentDistribution : [];
    const distByKey = new Map(
      dist.map((p) => [String(p?.shortName || '').trim().toUpperCase('tr-TR'), p])
    );

    const normalizeDb = (p) => ({
      id: p?.id,
      name: p?.name,
      shortName: p?.short_name || p?.shortName,
      slug: p?.slug || shortNameToPartySlug(p?.short_name || p?.shortName) || '',
      color: p?.color || null,
      logo_url: p?.logo_url || null,
    });

    const merged = list
      .map(normalizeDb)
      .filter((p) => p && p.shortName)
      .map((p) => {
        const key = String(p.shortName || '').trim().toUpperCase('tr-TR');
        const distRow = distByKey.get(key) || null;
        const seats = Number(distRow?.seats || 0) || 0;
        const pct = totalSeats ? (seats / totalSeats) * 100 : 0;
        return {
          ...p,
          seats,
          pct,
          color: p.color || distRow?.color || '#6B7280',
          longName: distRow?.name || p.name,
        };
      })
      .sort((a, b) => {
        // Meclis sırası önce, sonra isim
        const sd = (Number(b?.seats || 0) || 0) - (Number(a?.seats || 0) || 0);
        if (sd !== 0) return sd;
        return String(a?.shortName || '').localeCompare(String(b?.shortName || ''), 'tr-TR');
      });

    // If DB has no parties yet, fallback to distribution list
    if (merged.length > 0) return merged;
    return dist
      .slice()
      .sort((a, b) => (Number(b?.seats || 0) || 0) - (Number(a?.seats || 0) || 0))
      .map((p) => {
        const seats = Number(p?.seats || 0) || 0;
        const pct = totalSeats ? (seats / totalSeats) * 100 : 0;
        const slug = shortNameToPartySlug(p?.shortName) || '';
        return { ...p, seats, pct, slug, longName: p?.name || '', logo_url: null };
      });
  }, [dbParties, parliamentDistribution]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        {error ? (
          <div className="mb-5">
            <ApiNotice
              title="Veriler yüklenemedi"
              message={error}
              onRetry={() => {
                try {
                  window.location.reload();
                } catch {
                  // ignore
                }
              }}
              compact={true}
            />
          </div>
        ) : null}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#6D28D9] text-white">
                  <Building2 className="w-7 h-7" />
                </span>
                <div className="min-w-0">
                  <div className="text-2xl md:text-3xl font-black text-gray-900">Siyasi Partiler</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Meclis sandalye sıralamasına göre listelenir.
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
              onClick={() => navigate('/')}
            >
              Ana Sayfa
            </button>
          </div>

          <div className="mt-8 space-y-3">
            {parties.map((p) => (
              <button
                key={p.id || p.shortName}
                type="button"
                className="w-full text-left p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (!p.slug) return;
                  navigate(`/party/${p.slug}`);
                }}
              >
                <div className="flex items-center gap-4">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.shortName}
                      className="w-14 h-14 rounded-2xl object-contain bg-white border border-gray-200 p-2 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="w-3.5 h-14 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-black text-gray-900 truncate">{p.shortName}</div>
                        <div className="text-sm text-gray-600 truncate">{p.longName || p.name}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-primary-blue">{p.seats}</div>
                        <div className="text-xs font-bold text-gray-600">{p.pct.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Parti başkanı:{' '}
                      {p?.party_chair?.id ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 font-black text-primary-blue hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${encodeURIComponent(p.party_chair.id)}`);
                          }}
                          title="Başkan profilini görüntüle"
                        >
                          {p.party_chair.avatar_url ? (
                            <img
                              src={p.party_chair.avatar_url}
                              alt={p.party_chair.full_name || p.party_chair.username || 'Başkan'}
                              className="w-6 h-6 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="truncate">
                            {p.party_chair.full_name || (p.party_chair.username ? `@${p.party_chair.username}` : '—')}
                          </span>
                          {p.party_chair.username ? (
                            <span className="text-[11px] font-black text-gray-500 truncate">@{p.party_chair.username}</span>
                          ) : null}
                        </button>
                      ) : (
                        <span className="font-bold">Atanmamış</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

