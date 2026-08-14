/**
 * Calculation Engine
 * Pure mathematical, aggregation, and statistical functions for financial datasets.
 * Computes all dashboard, chart, and analytical metrics directly from transactions.
 */

// Dynamic palette generator for any arbitrary category
const PALETTE = [
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#a855f7', // Violet
  '#eab308', // Yellow
  '#64748b'  // Slate
];

const CATEGORY_ICONS = {
  food: '🍔',
  dining: '🍽️',
  restaurant: '🍕',
  transport: '🚖',
  travel: '✈️',
  cab: '🚗',
  shopping: '🛍️',
  groceries: '🛒',
  grocery: '🥦',
  entertainment: '🎬',
  movies: '🍿',
  utilities: '⚡',
  bills: '🧾',
  electricity: '💡',
  healthcare: '💊',
  medical: '🏥',
  education: '📚',
  learning: '🎓',
  income: '💰',
  salary: '💵',
  freelance: '💻',
  investment: '📈',
  savings: '🏦',
  rent: '🏠',
  housing: '🏢',
  insurance: '🛡️',
  subscriptions: '📺',
  other: '💳'
};

/**
 * Resolve icon for category dynamically
 * @param {string} category 
 * @returns {string}
 */
export function getCategoryIcon(category) {
  if (!category) return '💳';
  const clean = String(category).toLowerCase().trim();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (clean.includes(key)) return icon;
  }
  return '💳';
}

/**
 * Assign deterministic color for any category
 * @param {string} category 
 * @param {number} index 
 * @returns {string}
 */
export function getCategoryColor(category, index = 0) {
  if (!category) return PALETTE[index % PALETTE.length];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

/**
 * Calculate high-level financial summary from transaction dataset
 * @param {Array} transactions 
 * @param {number} [userMonthlyIncome] 
 * @returns {Object}
 */
export function calculateFinancialSummary(transactions = [], userMonthlyIncome = 0) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      hasData: false,
      totalIncome: null,
      totalExpenses: null,
      totalBalance: null,
      monthlySpending: null,
      monthlyIncome: null,
      monthlySavings: null,
      savingsRate: null,
      totalTransactions: 0,
      spendingTrend: null,
      savingsTrend: null
    };
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  // Track monthly totals to compute latest active month metrics and trends
  const monthlyBuckets = {};

  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    const type = String(t.type || 'expense').toLowerCase();
    const dateStr = t.date ? String(t.date).substring(0, 7) : 'Unknown'; // YYYY-MM

    if (!monthlyBuckets[dateStr]) {
      monthlyBuckets[dateStr] = { income: 0, expense: 0 };
    }

    if (type === 'income') {
      totalIncome += amt;
      monthlyBuckets[dateStr].income += amt;
    } else {
      totalExpenses += amt;
      monthlyBuckets[dateStr].expense += amt;
    }
  });

  // Calculate Net Total Balance
  const totalBalance = totalIncome - totalExpenses;

  // Determine sorted chronological months
  const sortedMonths = Object.keys(monthlyBuckets)
    .filter(m => m !== 'Unknown' && /^\d{4}-\d{2}$/.test(m))
    .sort();

  const latestMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : null;
  const previousMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;

  let monthlySpending = totalExpenses;
  let monthlyIncome = totalIncome;

  if (latestMonth && monthlyBuckets[latestMonth]) {
    monthlySpending = monthlyBuckets[latestMonth].expense;
    monthlyIncome = monthlyBuckets[latestMonth].income || (userMonthlyIncome > 0 ? userMonthlyIncome : totalIncome);
  }

  // If no explicit income rows, fallback to user profile income if provided
  if (monthlyIncome <= 0 && userMonthlyIncome > 0) {
    monthlyIncome = userMonthlyIncome;
  }

  const monthlySavings = monthlyIncome > 0 ? (monthlyIncome - monthlySpending) : null;
  
  let savingsRate = null;
  if (monthlyIncome > 0 && monthlySavings !== null) {
    savingsRate = Math.max(0, Math.min(100, ((monthlySavings / monthlyIncome) * 100)));
  }

  // Dynamic MoM spending and savings trends
  let spendingTrend = null;
  let savingsTrend = null;

  if (latestMonth && previousMonth) {
    const prevExpense = monthlyBuckets[previousMonth].expense;
    const currExpense = monthlyBuckets[latestMonth].expense;
    if (prevExpense > 0) {
      const diffPct = ((currExpense - prevExpense) / prevExpense) * 100;
      spendingTrend = (diffPct > 0 ? '+' : '') + diffPct.toFixed(1) + '%';
    }

    const prevIncome = monthlyBuckets[previousMonth].income || userMonthlyIncome;
    const currIncome = monthlyBuckets[latestMonth].income || userMonthlyIncome;
    const prevSavings = prevIncome - prevExpense;
    const currSavings = currIncome - currExpense;
    if (prevSavings > 0) {
      const savDiffPct = ((currSavings - prevSavings) / prevSavings) * 100;
      savingsTrend = (savDiffPct > 0 ? '+' : '') + savDiffPct.toFixed(1) + '%';
    }
  }

  return {
    hasData: true,
    totalIncome,
    totalExpenses,
    totalBalance,
    monthlySpending,
    monthlyIncome,
    monthlySavings,
    savingsRate: savingsRate !== null ? Number(savingsRate.toFixed(1)) : null,
    totalTransactions: transactions.length,
    spendingTrend,
    savingsTrend
  };
}

/**
 * Compute category spending distribution
 * @param {Array} transactions 
 * @returns {Array}
 */
export function calculateCategoryBreakdown(transactions = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const expenses = transactions.filter(t => String(t.type || 'expense').toLowerCase() === 'expense');
  const totals = {};

  let totalExpense = 0;
  expenses.forEach(t => {
    const cat = t.category || 'Other';
    const amt = Number(t.amount) || 0;
    totals[cat] = (totals[cat] || 0) + amt;
    totalExpense += amt;
  });

  const categories = Object.keys(totals);
  return categories.map((cat, idx) => {
    const amt = totals[cat];
    const percentage = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
    return {
      category: cat,
      amount: amt,
      percentage,
      icon: getCategoryIcon(cat),
      color: getCategoryColor(cat, idx)
    };
  }).sort((a, b) => b.amount - a.amount);
}

/**
 * Generate dynamic chart points from actual transactions across timeframes
 * @param {Array} transactions 
 * @param {string} timeframe - '7D' | '30D' | '3M' | '1Y'
 * @returns {Array}
 */
export function calculateTrendPoints(transactions = [], timeframe = '30D') {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  // Sort transactions by date ascending
  const sorted = [...transactions]
    .filter(t => t.date && !isNaN(new Date(t.date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) return [];

  if (timeframe === '7D') {
    // Take transactions from the last 7 distinct transaction dates or 7 days leading to latest date
    const dateMap = {};
    sorted.forEach(t => {
      const dStr = t.date;
      if (!dateMap[dStr]) {
        const dObj = new Date(dStr);
        const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        dateMap[dStr] = { label: dayLabel, income: 0, expense: 0, rawDate: dStr };
      }
      if (t.type === 'income') {
        dateMap[dStr].income += Number(t.amount) || 0;
      } else {
        dateMap[dStr].expense += Number(t.amount) || 0;
      }
    });

    const dates = Object.keys(dateMap).sort();
    const last7 = dates.slice(-7);
    return last7.map(d => dateMap[d]);
  }

  if (timeframe === '30D' || timeframe === '3M') {
    const map = {};
    sorted.forEach(t => {
      const dStr = t.date;
      if (!map[dStr]) {
        const dObj = new Date(dStr);
        const label = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        map[dStr] = { label, income: 0, expense: 0, rawDate: dStr };
      }
      if (t.type === 'income') {
        map[dStr].income += Number(t.amount) || 0;
      } else {
        map[dStr].expense += Number(t.amount) || 0;
      }
    });

    const dates = Object.keys(map).sort();
    const targetDates = timeframe === '30D' ? dates.slice(-30) : dates.slice(-90);
    const pts = targetDates.map(d => map[d]);

    if (pts.length > 8) {
      // Group or subsample to 6-8 evenly spaced intervals
      const step = Math.ceil(pts.length / 7);
      return pts.filter((_, idx) => idx % step === 0 || idx === pts.length - 1);
    }
    return pts;
  }

  // 1Y -> Group by YYYY-MM chronologically
  const monthMap = {};
  sorted.forEach(t => {
    const ym = String(t.date).substring(0, 7); // YYYY-MM
    if (!monthMap[ym]) {
      const dObj = new Date(`${ym}-01`);
      const label = dObj.toLocaleDateString('en-US', { month: 'short' });
      monthMap[ym] = { label, income: 0, expense: 0, rawMonth: ym };
    }
    if (t.type === 'income') {
      monthMap[ym].income += Number(t.amount) || 0;
    } else {
      monthMap[ym].expense += Number(t.amount) || 0;
    }
  });

  const sortedYms = Object.keys(monthMap).sort();
  const last12Yms = sortedYms.slice(-12);
  return last12Yms.map(ym => monthMap[ym]);
}
