import { useState } from 'react';
import { clsx } from 'clsx';

export const Tooltip = ({ children, content, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
  
  return (
    <div
      className={clsx('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={clsx(
          'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg whitespace-nowrap',
          positions[position]
        )}>
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 rotate-45 left-1/2 -translate-x-1/2 -bottom-1" />
        </div>
      )}
    </div>
  );
};
