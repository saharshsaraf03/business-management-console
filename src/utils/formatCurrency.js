/**
 * Format a number as Indian Rupee currency.
 * Uses en-IN locale with ₹ symbol.
 */
export function formatCurrency(value) {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format a date string to DD/MM/YYYY for display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Get today's date as YYYY-MM-DD for date inputs.
 */
export function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Format a number with commas (en-IN locale).
 */
export function formatNumber(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('en-IN');
}
