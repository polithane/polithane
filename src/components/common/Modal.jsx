import { X } from 'lucide-react';
import { useEffect } from 'react';
import { clsx } from 'clsx';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'medium',
  footer,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-7xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        <div className={clsx(
          'relative bg-white rounded-xl shadow-xl w-full',
          sizes[size],
          className
        )}>
          {title && (
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
          
          <div className="p-6">
            {children}
          </div>
          
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
