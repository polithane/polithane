import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const HorizontalScroll = ({ 
  children, 
  autoScroll = false, 
  scrollInterval = 5000,
  itemsPerView = { desktop: 5, tablet: 3, mobile: 2 },
  className = ''
}) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [screenSize, setScreenSize] = useState('desktop');
  const [itemWidth, setItemWidth] = useState(null);

  useEffect(() => {
    const calculateItemWidth = () => {
      if (!containerRef.current) return;
      
      const width = window.innerWidth;
      let targetItems;
      if (width >= 1024) {
        setScreenSize('desktop');
        targetItems = itemsPerView.desktop;
      } else if (width >= 768) {
        setScreenSize('tablet');
        targetItems = itemsPerView.tablet;
      } else {
        setScreenSize('mobile');
        targetItems = itemsPerView.mobile;
      }
      
      // Container'ın görünen genişliğini al
      const containerWidth = containerRef.current.clientWidth;
      const gap = 16; // gap-4 = 16px
      const totalGaps = (targetItems - 1) * gap;
      const calculatedWidth = (containerWidth - totalGaps) / targetItems;
      
      setItemWidth(calculatedWidth);
    };

    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    calculateItemWidth();
    checkScroll();
    
    const resizeObserver = new ResizeObserver(() => {
      calculateItemWidth();
      checkScroll();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', calculateItemWidth);
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
    }
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateItemWidth);
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', checkScroll);
      }
    };
  }, [children, itemsPerView]);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current || !itemWidth) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
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
  }, [autoScroll, scrollInterval, itemWidth]);

  const scroll = (direction) => {
    if (!scrollRef.current || !itemWidth) return;
    const gap = 16;
    const scrollAmount = itemWidth + gap;
    
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
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
        {itemWidth && React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              style: { 
                ...child.props.style,
                width: `${itemWidth}px`,
                minWidth: `${itemWidth}px`,
                maxWidth: `${itemWidth}px`,
                flexShrink: 0
              }
            });
          }
          return child;
        })}
        {!itemWidth && children}
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
