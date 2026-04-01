import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const mainNav = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    )
  }
];

const managementNav = [
  {
    to: '/sales',
    label: 'Sales Orders',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  {
    to: '/purchases',
    label: 'Stock Purchases',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    to: '/customers',
    label: 'Customers',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    to: '/suppliers',
    label: 'Suppliers',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  }
];

const settingsNav = [
  {
    to: '/rates',
    label: 'Manage Rates',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    to: '/users',
    label: 'Manage Users',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  }
];

export default function Sidebar({ isOpen, onClose }) {
  const { isOwner, signOut } = useApp();

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 mx-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
      isActive
        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-l-4 border-green-600 dark:border-green-500 pl-3'
        : 'text-gray-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-green-400'
    }`;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800
          border-r border-gray-200 dark:border-slate-700
          flex flex-col transition-all duration-300 ease-in-out
          shadow-lg dark:shadow-none
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo / Brand */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
          <span className="text-2xl">🥭</span>
          <div>
            <h1 className="text-base font-bold text-green-700 dark:text-green-400 tracking-wide">Mango</h1>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest">BUSINESS</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Dashboard */}
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={navLinkClasses}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* Management section */}
          <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider px-7 py-2 mt-2">Management</p>
          {managementNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={navLinkClasses}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* Expenses — owner only */}
          {isOwner && (
            <NavLink
              to="/expenses"
              onClick={onClose}
              className={navLinkClasses}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              Expenses
            </NavLink>
          )}

          {/* Settings — owner only */}
          {isOwner && (
            <>
              <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider px-7 py-2 mt-2">Settings</p>
              {settingsNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={navLinkClasses}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom: logout */}
        <div className="mt-auto p-3 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 mx-0 mb-1 rounded-xl text-sm font-medium
              text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
