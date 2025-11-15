import { useState, useEffect } from 'react';

export const AnimatedSlogan = () => {
  const fullSlogan = 'Özgür, açık, şeffaf siyaset, bağımsız medya.';
  const words = fullSlogan.split(' ');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (showFull) {
      // Tüm cümleyi 3 saniye göster
      const fullTimer = setTimeout(() => {
        setShowFull(false);
        setCurrentIndex(0);
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(fullTimer);
    } else {
      // Kelime kelime animasyon
      const wordTimer = setTimeout(() => {
        setIsVisible(false);
        
        // Kelimeyi gizle, sonra yeni kelimeyi göster
        setTimeout(() => {
          if (currentIndex < words.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsVisible(true);
          } else {
            // Son kelime gösterildi, tüm cümleyi göster
            setShowFull(true);
            setIsVisible(true);
          }
        }, 300); // Fade out süresi
      }, 1500); // Her kelime 1.5 saniye gözüksün
      
      return () => clearTimeout(wordTimer);
    }
  }, [currentIndex, showFull, words.length]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-primary-blue font-bold text-xl">Polithane</span>
      <span className="text-gray-600 text-sm md:text-base">
        <span
          className={`transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {showFull ? fullSlogan : words[currentIndex]}
        </span>
      </span>
    </div>
  );
};
