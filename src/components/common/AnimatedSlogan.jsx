import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const AnimatedSlogan = () => {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);
  // NOTE (per product request):
  // - No full sentence mode
  // - Words should keep rotating forever
  // - No punctuation, all lowercase
  const words = ['özgür', 'açık', 'şeffaf', 'siyaset', 'bağımsız', 'medya'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Word-by-word loop
    setIsVisible(true);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsVisible(true);
      }, 250);
    }, 1400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, words.length]);

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Logo - Tıklanabilir */}
      {!logoFailed && (
        <img
          src="/logo-mark.svg"
          alt="Polithane"
          width={40}
          height={40}
          className="h-10 w-10 object-contain cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
          onError={() => setLogoFailed(true)}
        />
      )}
      <span 
        className={`text-primary-blue font-bold text-xl whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${logoFailed ? '' : 'hidden'}`}
        onClick={() => navigate('/')}
      >
        Polithane
      </span>
      
      {/* Hide rotating slogan on mobile to keep header compact */}
      <span className="hidden sm:flex text-gray-600 text-sm md:text-base min-h-[1.25rem] items-center min-w-0">
        <span
          className={`transition-opacity duration-300 inline-block ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ minWidth: '120px' }}
        >
          <span className="block truncate max-w-[170px] sm:max-w-[260px] md:max-w-[420px]">
            {words[currentIndex] || '\u00A0'}
          </span>
        </span>
      </span>
    </div>
  );
};
