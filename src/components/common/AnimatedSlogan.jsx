import { useState, useEffect, useRef } from 'react';

export const AnimatedSlogan = () => {
  const fullSlogan = 'Özgür, açık, şeffaf siyaset, bağımsız medya.';
  // Virgül ve noktayı koruyarak kelimelere ayır
  const words = ['Özgür,', 'açık,', 'şeffaf', 'siyaset,', 'bağımsız', 'medya.'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Önceki timeout'u temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (showFull) {
      // Tüm cümleyi göster
      setIsVisible(true);
      
      // 3 saniye sonra tekrar kelime kelime başla
      timeoutRef.current = setTimeout(() => {
        setShowFull(false);
        setCurrentIndex(0);
        setIsVisible(false);
        
        // Kısa bir bekleme sonrası ilk kelimeyi göster
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true);
        }, 300);
      }, 3000);
      
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    } else {
      // Kelime kelime animasyon
      if (currentIndex < words.length) {
        // Mevcut kelimeyi göster
        setIsVisible(true);
        
        // Kelimeyi 1.5 saniye göster, sonra fade out
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          
          // Fade out sonrası yeni kelimeye geç
          timeoutRef.current = setTimeout(() => {
            if (currentIndex < words.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              // Son kelime gösterildi, tüm cümleyi göster
              setShowFull(true);
            }
          }, 300); // Fade out süresi
        }, 1500); // Her kelime 1.5 saniye gözüksün
        
        return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
      }
    }
  }, [currentIndex, showFull]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Logo */}
      <img 
        src="/logo.png" 
        alt="Polithane Logo" 
        className="h-10 w-auto object-contain"
        onError={(e) => {
          // Fallback to text if logo not found
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'inline';
        }}
      />
      <span className="text-primary-blue font-bold text-xl whitespace-nowrap hidden">Polithane</span>
      
      <span className="text-gray-600 text-sm md:text-base min-h-[1.25rem] flex items-center">
        <span
          className={`transition-opacity duration-300 inline-block ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ minWidth: showFull ? 'auto' : '120px' }}
        >
          {showFull ? fullSlogan : (words[currentIndex] || '\u00A0')}
        </span>
      </span>
    </div>
  );
};
