/**
 * AI Financial Agent Service
 * Generates dynamic context-aware telemetry, advisory, and diagnostics
 * based on the active dataset in state.
 */

import { appState } from '../state.js';
import { formatCurrency } from '../utils/formatCurrency.js';

export const agentService = {
  /**
   * Send a query to the AI Financial Agent
   * @param {string} userQuery 
   * @returns {Promise<{ id: string, sender: string, text: string, time: string, actions?: Array }>}
   */
  async askAgent(userQuery) {
    const state = appState.getState();
    const expenses = state.expenses;
    const currency = state.user.currency;
    const q = (userQuery || '').toLowerCase();

    // Check if dataset is loaded
    if (!expenses || expenses.length === 0) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: `No financial data available.\n\nImport a CSV dataset to enable financial analysis.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: ['Import CSV File', 'How do I format my CSV?']
      };
    }

    // Dynamic metrics calculation
    const summary = appState.getFinancialSummary();
    const categories = appState.getCategoryBreakdown();
    const expenseRows = expenses.filter(t => t.type === 'expense');
    const incomeRows = expenses.filter(t => t.type === 'income');

    const topCategory = categories[0] || { category: 'None', amount: 0, percentage: 0 };
    const largestExpense = [...expenseRows].sort((a, b) => b.amount - a.amount)[0] || { title: 'None', amount: 0 };

    // Small delay to simulate agent reasoning
    await new Promise(r => setTimeout(r, 450));

    // Pattern matching on user prompt
    if (q.includes('overspend') || q.includes('highest') || q.includes('top category') || q.includes('spending on')) {
      const topPct = topCategory.percentage;
      return {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: `Based on your imported ledger (${expenses.length} records):\n\n• **Top Spending Driver**: **${topCategory.category}** accounting for **${topPct}%** of all expenses (${formatCurrency(topCategory.amount, currency)}).\n• **Largest Single Outflow**: **${largestExpense.title}** (${formatCurrency(largestExpense.amount, currency)}).\n\n💡 **Agent Recommendation**: Consider setting a budget ceiling for ${topCategory.category} to optimize cash flow reserves.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [`Create ${topCategory.category} Budget`, 'Show unusual transactions', 'Monthly savings summary']
      };
    }

    if (q.includes('subscription') || q.includes('recurring')) {
      // Find recurring merchant names
      const merchantCounts = {};
      expenseRows.forEach(e => {
        const m = (e.merchant || e.title).trim();
        merchantCounts[m] = (merchantCounts[m] || 0) + 1;
      });
      const recurring = Object.entries(merchantCounts).filter(([_, count]) => count > 1);

      if (recurring.length > 0) {
        const listStr = recurring.map(([m, count]) => `• **${m}**: ${count} billing occurrences`).join('\n');
        return {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: `🔍 **Subscription & Recurring Audit**:\n\nIdentified **${recurring.length} recurring vendors** in your statement:\n${listStr}\n\nReviewing these can help eliminate redundant recurring outflows.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: ['Where am I overspending?', 'Formulate 50/30/20 Budget']
        };
      } else {
        return {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: `🔍 **Subscription Audit**: No recurring vendor patterns detected across your ${expenseRows.length} expense records.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
    }

    if (q.includes('unusual') || q.includes('anomaly') || q.includes('spike')) {
      const top3 = [...expenseRows].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const top3Str = top3.map((t, idx) => `${idx + 1}. **${t.title}** (${t.category}) — ${formatCurrency(t.amount, currency)} on ${t.date}`).join('\n');

      return {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: `⚠️ **AI Anomaly & Outlier Telemetry**:\n\nTop 3 largest transaction spikes detected in your ledger:\n${top3Str}\n\nThese 3 items represent a significant share of your total outflow.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: ['Can I save more this month?', 'Top spending category']
      };
    }

    if (q.includes('save') || q.includes('savings') || q.includes('budget') || q.includes('50/30/20')) {
      const inc = summary.monthlyIncome || summary.totalIncome || (summary.monthlySpending * 1.5);
      const spd = summary.monthlySpending || 0;
      const sav = Math.max(0, inc - spd);
      const rate = inc > 0 ? Math.round((sav / inc) * 100) : 0;

      return {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: `📊 **Monthly Cash Flow & 50/30/20 Target**:\n\n• **Total Inflow**: ${formatCurrency(inc, currency)}\n• **Total Outflow**: ${formatCurrency(spd, currency)}\n• **Estimated Savings**: ${formatCurrency(sav, currency)} (${rate}% savings rate)\n\nUnder a **50/30/20 Rule**:\n- **Needs (50%)**: ${formatCurrency(inc * 0.5, currency)}\n- **Wants (30%)**: ${formatCurrency(inc * 0.3, currency)}\n- **Savings (20%)**: ${formatCurrency(inc * 0.2, currency)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: ['Where am I overspending?', 'Analyze my subscriptions']
      };
    }

    // Default intelligent response from data
    return {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: `🤖 **Ledger Context Summary**:\n\n• **Records Analyzed**: ${expenses.length} transactions across ${categories.length} categories\n• **Net Balance**: ${formatCurrency(summary.totalBalance, currency)}\n• **Top Category**: ${topCategory.category} (${topCategory.percentage}%)\n• **Largest Expense**: ${largestExpense.title} (${formatCurrency(largestExpense.amount, currency)})\n\nAsk me specific questions like *"Where am I overspending?"*, *"Analyze subscriptions"*, or *"How much did I spend on ${topCategory.category}?"*`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: ['Where am I overspending?', 'Show unusual transactions', 'Analyze my subscriptions']
    };
  }
};
