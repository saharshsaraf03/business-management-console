import { formatCurrency } from '../utils/formatCurrency';

const borderColors = {
  primary: 'border-green-500',
  blue: 'border-blue-500',
  accent: 'border-amber-500',
  red: 'border-red-500'
};

const iconBg = {
  primary: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  accent: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
};

export default function KPICard({ title, value, isCurrency = true, icon, color = 'primary', locked = false, subtitle }) {
  if (locked) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-all duration-300 border-t-4 border-t-gray-300 dark:border-t-slate-600`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">{title}</p>
          <div className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700">
            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-gray-400 dark:text-slate-500 italic">Owner access only</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 border-t-4 ${borderColors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">{title}</p>
        <div className={`p-3 rounded-xl ${iconBg[color]}`}>
          <span className="text-lg">{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 animate-count">
        {isCurrency ? formatCurrency(value) : value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
