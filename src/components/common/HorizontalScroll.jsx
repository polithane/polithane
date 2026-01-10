import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cloneElement } from 'react';

export const HorizontalScroll = ({ 
  children, 
  autoScroll = false, 
  scrollInterval = 5000,
  itemsPerView = { desktop: 5, tablet: 3, mobile: 2 },
  manualScrollItems = null,
  onAdvance = null,
  className = ''
}) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [screenSize, setScreenSize] = useState('desktop');
  const [currentItemsPerView, setCurrentItemsPerView] = useState(itemsPerView.desktop);
  const [calculatedItemWidth, setCalculatedItemWidth] = useState(null);
  const itemRefs = useRef([]);
  const observerRef = useRef(null);

  // Ekran boyutunu tespit et ve kart genişliğini hesapla
  useEffect(() => {
    const calculateWidth = () => {
      if (!containerRef.current) return;
      
      const width = window.innerWidth;
      let items;
      if (width < 768) {
        setScreenSize('mobile');
        items = itemsPerView.mobile;
        setCurrentItemsPerView(items);
      } else if (width < 1024) {
        setScreenSize('tablet');
        items = itemsPerView.tablet;
        setCurrentItemsPerView(items);
      } else {
        setScreenSize('desktop');
        items = itemsPerView.desktop;
        setCurrentItemsPerView(items);
      }
      
      // Container genişliğini al ve kart genişliğini hesapla
      const containerWidth = containerRef.current.clientWidth;
      const gap = 12; // gap-3 = 12px
      const totalGaps = (items - 1) * gap;
      const itemWidth = (containerWidth - totalGaps) / items;
      setCalculatedItemWidth(itemWidth);
    };

    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    
    const resizeObserver = new ResizeObserver(calculateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', calculateWidth);
      resizeObserver.disconnect();
    };
  }, [itemsPerView]);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      return () => scrollElement.removeEventListener('scroll', checkScroll);
    }
  }, [children]);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        try {
          onAdvance?.({ reason: 'auto', direction: 'right', by: 1, screenSize });
        } catch {
          // ignore
        }
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const itemWidth = clientWidth / currentItemsPerView;
        const gap = 12; // gap-3 = 12px
        const scrollAmount = itemWidth + gap;
        const nextScroll = scrollLeft + scrollAmount;

        if (nextScroll >= scrollWidth - clientWidth) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }, scrollInterval);

    return () => clearInterval(interval);
  }, [autoScroll, scrollInterval, currentItemsPerView, onAdvance, screenSize]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;

    // TAM KART genişliğini hesapla
    const containerWidth = scrollRef.current.clientWidth;
    const gap = 12; // gap-3 = 12px
    const totalGapWidth = (currentItemsPerView - 1) * gap;
    const itemWidth = (containerWidth - totalGapWidth) / currentItemsPerView;
    const scrollAmount = itemWidth + gap;
    const stepCount =
      manualScrollItems && typeof manualScrollItems === 'object'
        ? Number(manualScrollItems[screenSize] || 1)
        : 1;
    const by = Number.isFinite(stepCount) && stepCount > 0 ? stepCount : 1;

    try {
      onAdvance?.({ reason: 'manual', direction, by, screenSize });
    } catch {
      // ignore
    }
    
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount * by : scrollAmount * by,
      behavior: 'smooth'
    });
  };

  // Children'a genişlik style'ı ekle
  const childrenWithWidth = calculatedItemWidth 
    ? (Array.isArray(children) 
        ? children.map((child, index) => 
            cloneElement(child, { 
              key: child.key || index,
              style: { 
                ...child.props.style,
                width: `${calculatedItemWidth}px`,
                minWidth: `${calculatedItemWidth}px`,
                maxWidth: `${calculatedItemWidth}px`,
                flexShrink: 0
              }
            })
          )
        : cloneElement(children, {
            style: { 
              ...children.props.style,
              width: `${calculatedItemWidth}px`,
              minWidth: `${calculatedItemWidth}px`,
              maxWidth: `${calculatedItemWidth}px`,
              flexShrink: 0
            }
          }))
    : children;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/25 backdrop-blur-sm border border-white/30 rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
          aria-label="Önceki"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
      )}
      
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
        }}
      >
        {childrenWithWidth}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/25 backdrop-blur-sm border border-white/30 rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
          aria-label="Sonraki"
        >
          <ChevronRight className="w-6 h-6 text-gray-800" />
        </button>
      )}
    </div>
  );
};
