/**
 * Formatting Utilities
 */

/**
 * Format currency with internationalization
 * @param {number|null|undefined} amount 
 * @param {string} currency 
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const sign = isNegative ? '-' : '';

  switch (currency) {
    case 'INR':
      return sign + '₹' + absNum.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    case 'USD':
      return sign + '$' + absNum.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'EUR':
      return sign + '€' + absNum.toLocaleString('de-DE', { maximumFractionDigits: 0 });
    case 'GBP':
      return sign + '£' + absNum.toLocaleString('en-GB', { maximumFractionDigits: 0 });
    default:
      return sign + '₹' + absNum.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}

/**
 * Format date to human-readable string
 * @param {string|Date} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Format percentage safely (prevents NaN / Infinity)
 * @param {number|null|undefined} value 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '—%';
  }
  return `${Number(value).toFixed(decimals)}%`;
}
