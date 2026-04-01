import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const pageTitles = {
  '/': 'Dashboard',
  '/sales': 'Sales Orders',
  '/purchases': 'Stock Purchases',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/expenses': 'Expenses',
  '/rates': 'Manage Rates',
  '/users': 'Manage Users'
};

export default function Topbar({ onMenuClick }) {
  const { profile } = useApp();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'Mango';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between transition-colors duration-300 shadow-sm dark:shadow-none">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{pageTitle}</h1>
      </div>

      {/* Right: theme toggle + user info */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-slate-700"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            /* Sun icon — shown in dark mode */
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            /* Moon icon — shown in light mode */
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {profile && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{profile.full_name}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              profile.role === 'owner'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
            }`}>
              {profile.role}
            </span>
            <div className="w-9 h-9 rounded-full bg-green-600 dark:bg-green-700 text-white text-sm font-semibold flex items-center justify-center">
              {(profile.full_name || '?')[0].toUpperCase()}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
