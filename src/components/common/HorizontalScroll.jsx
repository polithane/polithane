import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cloneElement } from 'react';

export const HorizontalScroll = ({ 
  children, 
  autoScroll = false, 
  scrollInterval = 5000,
  itemsPerView = { desktop: 5, tablet: 3, mobile: 2 },
  className = ''
}) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [screenSize, setScreenSize] = useState('desktop');
  const [currentItemsPerView, setCurrentItemsPerView] = useState(itemsPerView.desktop);

  // Ekran boyutunu tespit et
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
        setCurrentItemsPerView(itemsPerView.mobile);
      } else if (width < 1024) {
        setScreenSize('tablet');
        setCurrentItemsPerView(itemsPerView.tablet);
      } else {
        setScreenSize('desktop');
        setCurrentItemsPerView(itemsPerView.desktop);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const itemWidth = clientWidth / currentItemsPerView;
        const gap = 16;
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
  }, [autoScroll, scrollInterval, currentItemsPerView]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;

    // TAM KART genişliğini hesapla
    const containerWidth = scrollRef.current.clientWidth;
    const gap = 16;
    const totalGapWidth = (currentItemsPerView - 1) * gap;
    const itemWidth = (containerWidth - totalGapWidth) / currentItemsPerView;
    const scrollAmount = itemWidth + gap;
    
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Children'a itemsPerView prop'unu ekle
  const childrenWithProps = Array.isArray(children) 
    ? children.map((child, index) => 
        cloneElement(child, { 
          key: index, 
          itemsPerView: currentItemsPerView 
        })
      )
    : cloneElement(children, { itemsPerView: currentItemsPerView });

  return (
    <div className={`relative ${className}`}>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Önceki"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
      )}
      
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
        }}
      >
        {childrenWithProps}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Sonraki"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      )}
    </div>
  );
};
