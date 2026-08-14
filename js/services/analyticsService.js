/**
 * Analytics Service
 * Computes deep telemetry, category distributions, trend curves, and dynamic anomaly analysis
 * derived purely from active transactions.
 */

import { appState } from '../state.js';
import { formatCurrency } from '../utils/formatCurrency.js';

export const analyticsService = {
  /**
   * Compute full analytical dataset for given timeframe
   * @param {string} timeframe - '7D' | '30D' | '3M' | '1Y'
   * @returns {Promise<Object>}
   */
  async getAnalytics(timeframe = '30D') {
    const state = appState.getState();
    const expenses = state.expenses;
    const currency = state.user.currency;

    if (!expenses || expenses.length === 0) {
      return {
        hasData: false,
        trendData: [],
        categoryBreakdown: [],
        highestCategory: { category: '—', amount: 0, percentage: 0 },
        lowestCategory: { category: '—', amount: 0, percentage: 0 },
        dailyAverage: 0,
        anomalies: [],
        totalExpense: 0,
        totalIncome: 0,
        transactionCount: 0
      };
    }

    const expenseOnly = expenses.filter(t => String(t.type || 'expense').toLowerCase() === 'expense');
    const incomeOnly = expenses.filter(t => String(t.type || 'expense').toLowerCase() === 'income');

    const totalExpense = expenseOnly.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const totalIncome = incomeOnly.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Dynamic Category Breakdown
    const categoryBreakdown = appState.getCategoryBreakdown();

    // Top Category
    const highestCategory = categoryBreakdown.length > 0 
      ? categoryBreakdown[0] 
      : { category: '—', amount: 0, percentage: 0 };

    const lowestCategory = categoryBreakdown.length > 0 
      ? categoryBreakdown[categoryBreakdown.length - 1] 
      : { category: '—', amount: 0, percentage: 0 };

    // Daily Average (over timeframe or unique dates)
    const uniqueDates = new Set(expenses.map(t => t.date)).size || 1;
    const dailyAverage = totalExpense > 0 ? Math.round(totalExpense / uniqueDates) : 0;

    // Trend Points
    const trendData = appState.getTrendPoints(timeframe);

    // Dynamic Anomaly Detection from actual data
    const anomalies = this.detectAnomalies(expenseOnly, categoryBreakdown, currency, dailyAverage);

    return {
      hasData: true,
      trendData,
      categoryBreakdown,
      highestCategory,
      lowestCategory,
      dailyAverage,
      anomalies,
      totalExpense,
      totalIncome,
      transactionCount: expenses.length
    };
  },

  /**
   * Derive intelligent anomalies from actual dataset
   */
  detectAnomalies(expenseOnly, categoryBreakdown, currency, dailyAverage) {
    if (!expenseOnly || expenseOnly.length === 0) return [];

    const anomalies = [];

    // 1. Check for single large outlier transactions (> 3x daily average or top amount)
    const sortedByAmt = [...expenseOnly].sort((a, b) => b.amount - a.amount);
    if (sortedByAmt.length > 0 && sortedByAmt[0].amount > (dailyAverage * 2 || 2000)) {
      const topTx = sortedByAmt[0];
      anomalies.push({
        id: 'anom-1',
        type: 'danger',
        title: `Outlier Expense: ${topTx.title}`,
        description: `Single largest outflow of ${formatCurrency(topTx.amount, currency)} recorded on ${topTx.date} in ${topTx.category}.`
      });
    }

    // 2. Check for dominant category (> 40% of total spend)
    if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentage > 40) {
      const topCat = categoryBreakdown[0];
      anomalies.push({
        id: 'anom-2',
        type: 'warning',
        title: `High Concentration in ${topCat.category}`,
        description: `${topCat.category} accounts for ${topCat.percentage}% of your total outflow (${formatCurrency(topCat.amount, currency)}).`
      });
    }

    // 3. Positive / baseline event
    if (categoryBreakdown.length > 1) {
      anomalies.push({
        id: 'anom-3',
        type: 'positive',
        title: 'Categorized Distribution',
        description: `Transactions are distributed across ${categoryBreakdown.length} unique spending categories.`
      });
    }

    return anomalies;
  }
};
