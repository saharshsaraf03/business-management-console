export default function StockCard({ size, purchased, sold, remaining, percentSold, lowStock }) {
  const sizeColors = {
    Jumbo: { dot: 'bg-purple-500', bar: 'bg-purple-500' },
    Large: { dot: 'bg-green-500', bar: 'bg-green-500' },
    Medium: { dot: 'bg-amber-500', bar: 'bg-amber-500' },
    Small: { dot: 'bg-blue-500', bar: 'bg-blue-500' }
  };

  const colors = sizeColors[size] || sizeColors.Jumbo;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{size}</h3>
        </div>
        {lowStock && (
          <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
            ⚠ Low Stock
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Purchased</p>
          <p className="font-semibold text-gray-900 dark:text-slate-100">{Number(purchased).toLocaleString('en-IN')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Sold</p>
          <p className="font-semibold text-gray-900 dark:text-slate-100">{Number(sold).toLocaleString('en-IN')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Remaining</p>
          <p className={`font-bold ${remaining < 5 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
            {Number(remaining).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
          <span>Sold</span>
          <span>{percentSold}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${Math.min(percentSold, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
