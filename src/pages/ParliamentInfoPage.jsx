import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { currentParliamentDistribution, totalSeats } from '../data/parliamentDistribution';
import { apiCall } from '../utils/api';

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

export const ParliamentInfoPage = () => {
  const navigate = useNavigate();
  const [distribution, setDistribution] = useState(currentParliamentDistribution);
  const [info, setInfo] = useState({
    legislatureName: '',
    legislatureYear: '',
    termStart: '',
    termEnd: '',
    speakerName: '',
    speakerProfileId: '',
    description: '',
    officials: [],
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await apiCall('/api/public/parliament', { method: 'GET' }).catch(() => null);
      const dist = r?.data?.distribution;
      const inf = r?.data?.info;
      if (!mounted) return;
      if (Array.isArray(dist) && dist.length > 0) setDistribution(dist);
      if (inf && typeof inf === 'object') {
        setInfo((prev) => ({
          ...prev,
          ...inf,
          officials: Array.isArray(inf.officials) ? inf.officials : prev.officials,
        }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    const list = Array.isArray(distribution) ? distribution : [];
    return list
      .slice()
      .sort((a, b) => (Number(b?.seats || 0) || 0) - (Number(a?.seats || 0) || 0))
      .map((p) => {
        const seats = Number(p?.seats || 0) || 0;
        const pct = totalSeats ? (seats / totalSeats) * 100 : 0;
        const slug = String(p?.slug || '').trim() || shortNameToPartySlug(p?.shortName) || '';
        return { ...p, seats, pct, slug };
      });
  }, [distribution]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0B3D91] text-white">
                  <Landmark className="w-7 h-7" />
                </span>
                <div className="min-w-0">
                  <div className="text-2xl md:text-3xl font-black text-gray-900">Meclis Dağılımı</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {(info?.legislatureName || 'TBMM')}{info?.legislatureYear ? ` • ${info.legislatureYear}` : ''} (toplam {totalSeats} sandalye).
                  </div>
                </div>
              </div>
              {(info?.termStart || info?.termEnd || info?.speakerName) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {info?.termStart || info?.termEnd ? (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-bold">
                      Dönem: {info?.termStart || '—'} – {info?.termEnd || '—'}
                    </span>
                  ) : null}
                  {info?.speakerName ? (
                    info?.speakerProfileId ? (
                      <button
                        type="button"
                        className="px-3 py-1 rounded-full bg-blue-50 text-primary-blue font-black hover:bg-blue-100"
                        onClick={() => navigate(`/profile/${encodeURIComponent(info.speakerProfileId)}`)}
                      >
                        Başkan: {info.speakerName}
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-primary-blue font-black">
                        Başkan: {info.speakerName}
                      </span>
                    )
                  ) : null}
                </div>
              )}
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black"
              onClick={() => navigate('/')}
            >
              Ana Sayfa
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((p) => {
              return (
                <button
                  key={p.shortName}
                  type="button"
                  className="w-full text-left p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (!p.slug) return;
                    navigate(`/party/${p.slug}`);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-black text-gray-900 truncate">{p.shortName}</div>
                      <div className="text-sm text-gray-600 truncate">{p.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-black text-primary-blue">{p.seats}</div>
                      <div className="text-xs font-bold text-gray-600">{p.pct.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.pct)}%`, backgroundColor: p.color }} />
                  </div>
                </button>
              );
            })}
          </div>

          {Array.isArray(info?.officials) && info.officials.length > 0 ? (
            <div className="mt-10">
              <div className="text-lg font-black text-gray-900">Meclis Yönetimi</div>
              <div className="text-sm text-gray-600 mt-1">Diğer görevliler</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {info.officials.map((o, idx) => {
                  const role = String(o?.role || '').trim();
                  const name = String(o?.name || '').trim();
                  const pid = String(o?.profileId || '').trim();
                  if (!role || !name) return null;
                  return (
                    <div key={`${role}-${idx}`} className="p-4 rounded-2xl border border-gray-200 bg-white">
                      <div className="text-xs font-black text-gray-500 uppercase">{role}</div>
                      {pid ? (
                        <button
                          type="button"
                          className="mt-1 text-base font-black text-primary-blue hover:underline text-left"
                          onClick={() => navigate(`/profile/${encodeURIComponent(pid)}`)}
                        >
                          {name}
                        </button>
                      ) : (
                        <div className="mt-1 text-base font-black text-gray-900">{name}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-8 text-xs text-gray-500">
            {info?.description ? (
              <span>{String(info.description)}</span>
            ) : (
              <span>
                Not: Meclis yönetimi/başkanlık bilgileri admin panelinden yönetilebilir.
                {info?.legislatureYear ? ` Yasama yılı: ${info.legislatureYear}` : ''}
                {info?.termStart ? ` • Başlangıç: ${info.termStart}` : ''}
                {info?.termEnd ? ` • Bitiş: ${info.termEnd}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

