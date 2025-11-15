import { clsx } from 'clsx';

export const Badge = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  className = ''
}) => {
  const variants = {
    default: 'bg-gray-200 text-gray-800',
    primary: 'bg-primary-blue text-white',
    secondary: 'bg-primary-green text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white'
  };
  
  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base'
  };
  
  return (
    <span className={clsx(
      'rounded-full font-medium inline-flex items-center gap-1',
      variants[variant],
      sizes[size],
      className
    )}>
      {children}
    </span>
  );
};
