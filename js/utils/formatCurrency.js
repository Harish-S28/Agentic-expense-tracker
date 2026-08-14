/**
 * Currency Formatter Utility
 * Supports INR (₹), USD ($), EUR (€), GBP (£) with proper locale conventions
 */

export function formatCurrency(amount, currency = 'INR') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
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
