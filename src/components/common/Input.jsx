import { clsx } from 'clsx';

export const Input = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-4 py-2 border border-gray-300 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
