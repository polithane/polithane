import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Newspaper, Globe2, Flame, Landmark } from 'lucide-react';
import { apiCall } from '../../utils/api';

export const IntroSlider = ({ autoplay = true, interval = 6500 }) => {
  const navigate = useNavigate();
  const [parliamentInfo, setParliamentInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await apiCall('/api/public/parliament', { method: 'GET' }).catch(() => null);
      const inf = r?.data?.info;
      if (!mounted) return;
      if (inf && typeof inf === 'object') setParliamentInfo(inf);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const parliamentSubtitle = (() => {
    const inf = parliamentInfo && typeof parliamentInfo === 'object' ? parliamentInfo : null;
    const year = String(inf?.legislatureYear || '').trim();
    const start = String(inf?.termStart || '').trim();
    const end = String(inf?.termEnd || '').trim();
    const speaker = String(inf?.speakerName || '').trim();
    const bits = [];
    if (year) bits.push(year);
    if (start || end) bits.push(`${start || '—'} – ${end || '—'}`);
    if (speaker) bits.push(`Başkan: ${speaker}`);
    return bits.length ? bits.join(' • ') : 'TBMM’deki güncel sandalye dağılımı ve genel bilgiler.';
  })();

  const slides = useMemo(
    () => [
      {
        id: 'parliament',
        title: 'MECLİS DAĞILIMI',
        subtitle: parliamentSubtitle,
        to: '/parliament',
        bg: '#0B3D91',
        Icon: Landmark,
      },
      {
        id: 'parties',
        title: 'SİYASİ PARTİLER',
        subtitle: 'Meclisteki tüm partiler: sandalye gücü, başkan profili ve parti sayfaları tek dizinde.',
        to: '/parties',
        bg: '#6D28D9',
        Icon: Building2,
      },
      {
        id: 'media',
        title: 'MEDYA',
        subtitle: 'Türkiye’nin nabzı burada: bağımsız, hızlı ve doğrulanabilir medya akışı.',
        to: '/category/media',
        bg: '#F59E0B',
        Icon: Newspaper,
      },
      {
        id: 'citizens',
        title: 'VATANDAŞ',
        subtitle: 'Özgür ifade, açık tartışma, gerçek gündem: sesi duyulan bir vatandaş meydanı.',
        to: '/category/citizens',
        bg: '#111827',
        Icon: Globe2,
      },
      {
        id: 'agenda',
        title: 'GÜNDEM',
        subtitle: 'Bugünün konusu burada belirlenir: en sıcak siyasi başlıklar tek akışta.',
        to: '/hit',
        bg: '#009FD6',
        Icon: Flame,
      },
      {
        id: 'mps',
        title: 'VEKİLLER GÜNDEMİ',
        subtitle: 'Milletvekillerinin gündemi: Polit Puan’a göre öne çıkanlar ve son paylaşımlar.',
        to: '/category/mps',
        bg: '#0EA5E9',
        Icon: Users,
      },
      {
        id: 'org',
        title: 'TEŞKİLAT GÜNDEMİ',
        subtitle: 'Teşkilatın gündemi: Polit Puan’a göre öne çıkanlar ve yerel nabız.',
        to: '/category/organization',
        bg: '#84CC16',
        Icon: Users,
      },
    ],
    [parliamentSubtitle]
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, slides.length]);

  const current = slides[currentIndex];
  if (!current) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        className="relative w-full h-[104px] md:h-[120px] rounded-xl overflow-hidden shadow-lg text-left"
        style={{ backgroundColor: current.bg }}
        onClick={() => navigate(current.to)}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" />
        <div className="relative h-full flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 border border-white/20 flex-shrink-0">
              <current.Icon className="w-14 h-14 md:w-16 md:h-16 text-white" />
            </span>
            <div className="min-w-0">
              <div className="text-lg md:text-xl lg:text-2xl font-black text-white drop-shadow leading-tight">
                {current.title}
              </div>
              <div className="text-xs md:text-sm text-white/90 font-semibold mt-1 line-clamp-2">
                {current.subtitle}
              </div>
            </div>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`h-3 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-8' : 'bg-white/50 w-3'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Slayt ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
};

