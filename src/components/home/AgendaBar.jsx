import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { formatPolitScore } from '../../utils/formatters';
import { apiCall } from '../../utils/api';
import { Modal } from '../common/Modal';

export const AgendaBar = ({ agendas = [] }) => {
  const navigate = useNavigate();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [allOffset, setAllOffset] = useState(0);
  const [allHasMore, setAllHasMore] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState('');
  const allListRef = useRef(null);
  const [ad, setAd] = useState(null);
  const trackedImpressionRef = useRef(new Set());
  
  if (!agendas || agendas.length === 0) return null;

  const getAgendaId = (a) => a?.agenda_id ?? a?.id ?? a?.slug ?? a?.agenda_slug ?? a?.title ?? a?.agenda_title;
  const getAgendaTitle = (a) => a?.agenda_title ?? a?.title ?? '';
  const getAgendaSlug = (a) => a?.agenda_slug ?? a?.slug ?? '';
  const getAgendaScore = (a) => a?.total_polit_score ?? a?.polit_score ?? a?.trending_score ?? 0;

  const inlineAgendas = useMemo(() => {
    const base = Array.isArray(agendas) ? agendas : [];
    const limit = mobileExpanded ? 10 : 3;
    return base.slice(0, Math.min(limit, base.length));
  }, [agendas, mobileExpanded]);
  
  // Birinci satır: 3 gündem + REKLAM + 1 gündem, İkinci satır: 5 gündem + TÜM GÜNDEME BAK butonu
  const trendingAgendas = agendas.slice(0, 10); // 10 gündem
  const firstRow = trendingAgendas.slice(0, 4); // İlk 4 gündem (3. sonrası reklam)
  const secondRow = trendingAgendas.slice(4, 9);
  
  const AgendaButton = ({ agenda, index }) => {
    // İlk 3 gündem için ateş ikonu - FARKLI HIZ ANİMASYONLARI (Flash efekti)
    let fireIcon = null;
    if (index === 0) {
      // 1. en sıcak - büyük ateş - ÇOK HIZLI yanıp sönme (0.3s - çok hızlı flash)
      fireIcon = <Flame className="w-5 h-5 text-red-600" fill="currentColor" style={{animation: 'pulse 0.3s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    } else if (index === 1) {
      // 2. orta sıcak - orta ateş - ORTA HIZLI (0.6s - orta hız flash)
      fireIcon = <Flame className="w-5 h-5 text-orange-500" fill="currentColor" style={{animation: 'pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    } else if (index === 2) {
      // 3. hafif sıcak - küçük ateş - YAVAŞ (1s - yavaş flash)
      fireIcon = <Flame className="w-5 h-5 text-yellow-500" fill="currentColor" style={{animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />;
    }
    
    return (
      <button
        key={getAgendaId(agenda)}
        onClick={() => navigate(`/agenda/${getAgendaSlug(agenda)}`)}
        className="group flex items-center gap-2 px-2.5 py-1 bg-white border-2 border-gray-300 hover:border-primary-blue hover:bg-primary-blue hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-1 min-w-0 h-[28px]"
      >
        {fireIcon && <span className="flex-shrink-0">{fireIcon}</span>}
        <span className="text-[11px] font-semibold truncate text-left flex-1">
          {getAgendaTitle(agenda)}
        </span>
        <span
          className={[
            'text-[9px] px-1.5 py-0.5 rounded-full font-black transition-colors flex-shrink-0',
            // Always high-contrast
            'bg-gray-900 text-white',
            // When hovering the agenda button, invert for contrast on blue
            'group-hover:bg-white group-hover:text-primary-blue',
            // When hovering the score itself, keep contrast regardless
            'hover:bg-black hover:text-white',
          ].join(' ')}
        >
          {formatPolitScore(getAgendaScore(agenda))}
        </span>
      </button>
    );
  };
  
  // REKLAM ALANI - 4. sırada (180px genişlik x 36px yükseklik)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiCall('/api/public/ads?position=agenda_bar&limit=1', { method: 'GET' }).catch(() => null);
        const list = r?.success ? r?.data : null;
        const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
        if (!cancelled) setAd(first || null);
      } catch {
        if (!cancelled) setAd(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = ad?.id != null ? String(ad.id) : '';
    if (!id) return;
    if (trackedImpressionRef.current.has(id)) return;
    trackedImpressionRef.current.add(id);
    apiCall(`/api/public/ads/${encodeURIComponent(id)}/impression`, { method: 'POST' }).catch(() => null);
  }, [ad?.id]);

  const AdSpace = ({ compact = false }) => {
    if (!ad) return null;
    const title = String(ad?.title || '').trim();
    const href = String(ad?.target_url || '').trim();
    if (!title) return null;
    return (
      <button
        type="button"
        onClick={() => {
          if (!href) return;
          const id = ad?.id != null ? String(ad.id) : '';
          if (id) apiCall(`/api/public/ads/${encodeURIComponent(id)}/click`, { method: 'POST' }).catch(() => null);
          window.open(href, '_blank');
        }}
        className={[
          compact
            ? 'flex-shrink-0 px-4 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-full text-[10px] font-bold shadow-md whitespace-nowrap'
            : 'h-[24px] px-3 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center w-full',
          href ? 'cursor-pointer' : 'cursor-default opacity-80',
        ].join(' ')}
        title={href ? title : undefined}
      >
        {compact ? title : <span className="text-[11px] font-bold text-white drop-shadow-md">{title}</span>}
      </button>
    );
  };
  
  // "TÜM GÜNDEME BAK" butonu - Kurumsal mavi renk
  const AllAgendasButton = () => (
    <button
      onClick={() => navigate('/agendas')}
      className="flex items-center justify-center px-4 py-0.5 bg-primary-blue hover:bg-[#0088bb] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 font-bold text-[11px] h-[24px]"
    >
      TÜM GÜNDEME BAK
    </button>
  );

  const loadAllAgendas = async ({ reset = false } = {}) => {
    if (allLoading) return;
    if (!reset && !allHasMore) return;
    setAllLoading(true);
    setAllError('');
    try {
      const PAGE = 10;
      const nextOffset = reset ? 0 : allOffset;
      const r = await apiCall(
        `/api/agendas?limit=${PAGE}&offset=${nextOffset}&order=trending_score.desc&is_active=true`,
        { method: 'GET' }
      ).catch(() => null);
      const list = r?.data || [];
      const rows = Array.isArray(list) ? list : [];
      const sorted = [...rows].sort((a, b) => Number(getAgendaScore(b) || 0) - Number(getAgendaScore(a) || 0));
      if (reset) {
        setAllItems(sorted);
        setAllOffset(sorted.length);
      } else {
        setAllItems((prev) => {
          const existing = new Set((prev || []).map((x) => String(getAgendaId(x) || '')));
          const merged = [...(prev || [])];
          for (const it of sorted) {
            const id = String(getAgendaId(it) || '');
            if (!id || existing.has(id)) continue;
            existing.add(id);
            merged.push(it);
          }
          return merged;
        });
        setAllOffset((p) => p + sorted.length);
      }
      setAllHasMore(sorted.length >= PAGE);
    } catch (e) {
      setAllError(String(e?.message || 'Gündem yüklenemedi.'));
      setAllHasMore(false);
    } finally {
      setAllLoading(false);
    }
  };

  useEffect(() => {
    if (!allOpen) return;
    setAllItems([]);
    setAllOffset(0);
    setAllHasMore(true);
    setAllError('');
    loadAllAgendas({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOpen]);
  
  return (
    <div className="mb-1">
      {/* MOBİL: 3 satır + "diğer gündem maddeleri" + popup */}
      <div className="md:hidden bg-gray-50 pb-1 -mx-4 px-4 pt-1">
        <div className="space-y-2">
          {inlineAgendas.map((agenda, index) => {
            const fireIcon =
              index === 0 ? (
                <Flame className="w-5 h-5 text-red-600" fill="currentColor" />
              ) : index === 1 ? (
                <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
              ) : index === 2 ? (
                <Flame className="w-5 h-5 text-yellow-500" fill="currentColor" />
              ) : null;
            return (
              <button
                key={getAgendaId(agenda)}
                type="button"
                onClick={() => navigate(`/agenda/${getAgendaSlug(agenda)}`)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-primary-blue hover:bg-blue-50 transition-colors"
              >
                {fireIcon ? <span className="flex-shrink-0">{fireIcon}</span> : <span className="w-5 h-5" />}
                <span className="text-[13px] font-semibold text-gray-900 truncate flex-1 text-left">
                  {getAgendaTitle(agenda)}
                </span>
                <span className="text-[11px] bg-gray-900 text-white px-2 py-1 rounded-full font-black flex-shrink-0">
                  {formatPolitScore(getAgendaScore(agenda))}
                </span>
              </button>
            );
          })}

          {!mobileExpanded && agendas.length > 3 ? (
            <button
              type="button"
              onClick={() => setMobileExpanded(true)}
              className="w-full py-2.5 rounded-xl bg-white border-2 border-gray-900 text-gray-900 font-black text-sm"
            >
              + DİĞER GÜNDEM MADDELERİ
            </button>
          ) : null}

          {mobileExpanded ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="flex-1 py-2.5 rounded-xl bg-primary-blue hover:bg-[#0088bb] text-white font-black text-sm"
              >
                TÜMÜNE BAK
              </button>
              <button
                type="button"
                onClick={() => setMobileExpanded(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-black text-sm"
              >
                Kapat
              </button>
            </div>
          ) : null}

          {/* Reklam (mobil) */}
          <div className="pt-1">
            <AdSpace compact />
          </div>
        </div>
      </div>
      
      {/* DESKTOP İÇİN: 2 satır grid */}
      <div className="hidden md:block">
        <div className="space-y-1.5">
          {/* İlk Satır - 3 gündem + REKLAM + 1 gündem */}
          <div className="flex gap-2">
            {firstRow.slice(0, 3).map((agenda, index) => (
              <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index} />
            ))}
            {/* REKLAM ALANI - 4. pozisyon */}
            <div className="flex-1 min-w-[180px] max-w-[220px]">
              <AdSpace />
            </div>
            {firstRow.slice(3, 4).map((agenda, index) => (
              <AgendaButton key={agenda.agenda_id} agenda={agenda} index={3} />
            ))}
          </div>
          
          {/* İkinci Satır - 5 gündem + TÜM GÜNDEME BAK butonu */}
          {secondRow.length > 0 && (
            <div className="flex gap-2">
              {secondRow.map((agenda, index) => (
                <AgendaButton key={agenda.agenda_id} agenda={agenda} index={index + 4} />
              ))}
              <AllAgendasButton />
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={allOpen} onClose={() => setAllOpen(false)} title="Tüm Gündemler" size="small">
        <div
          ref={allListRef}
          className="max-h-[70vh] overflow-y-auto -mx-2 px-2"
          onScroll={(e) => {
            const el = e?.currentTarget;
            if (!el) return;
            const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (remaining < 220) loadAllAgendas();
          }}
        >
          {allError ? <div className="mb-3 text-sm text-red-600 font-semibold">{allError}</div> : null}
          {(allItems || []).map((a) => (
            <button
              key={getAgendaId(a)}
              type="button"
              onClick={() => {
                setAllOpen(false);
                navigate(`/agenda/${getAgendaSlug(a)}`);
              }}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary-blue hover:bg-blue-50 transition-colors mb-2"
            >
              <div className="min-w-0 text-left">
                <div className="font-bold text-gray-900 truncate">{getAgendaTitle(a)}</div>
              </div>
              <div className="flex-shrink-0 text-xs bg-gray-900 text-white px-2 py-1 rounded-full font-black">
                {formatPolitScore(getAgendaScore(a))}
              </div>
            </button>
          ))}

          {allLoading ? <div className="py-2 text-sm text-gray-600">Yükleniyor…</div> : null}
          {!allLoading && !allHasMore ? <div className="py-2 text-xs text-gray-500">Daha fazla gündem yok.</div> : null}
        </div>
      </Modal>
    </div>
  );
};
