import { clsx } from 'clsx';

export const Card = ({ 
  children, 
  hover = false,
  onClick,
  className = ''
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-200',
        hover && 'hover:shadow-md transition-shadow duration-200 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
