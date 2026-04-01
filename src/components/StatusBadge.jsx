const statusStyles = {
  // Payment statuses
  Paid: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  Due: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  Partial: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  // Delivery statuses
  Delivered: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  Scheduled: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  Pending: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400',
  // User statuses
  Active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  Inactive: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  // Roles
  owner: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  employee: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
};

export default function StatusBadge({ status, className = '' }) {
  const style = statusStyles[status] || 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400';

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${style} ${className}`}>
      {status}
    </span>
  );
}
