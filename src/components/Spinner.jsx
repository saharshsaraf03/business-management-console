export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-10 w-10 border-4'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-gray-200 dark:border-slate-600 border-t-green-600 dark:border-t-green-400 animate-spin`}
        style={{ borderStyle: 'solid' }}
      />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
