/**
 * Central State Store (SpendLog AI)
 * Fully dynamic architecture. No hardcoded default financial data.
 */

import { storage } from '../utils/storage.js';
import {
  calculateFinancialSummary,
  calculateCategoryBreakdown,
  calculateTrendPoints,
  getCategoryIcon,
  getCategoryColor
} from '../utils/calculations.js';

class StateStore {
  constructor() {
    this.listeners = [];

    // Attempt to load previously persisted state from localStorage
    const saved = storage.loadState();

    if (saved && Array.isArray(saved.expenses) && saved.expenses.length > 0) {
      this.state = {
        expenses: saved.expenses,
        budgets: saved.budgets || [],
        goals: saved.goals || [],
        user: {
          name: saved.user?.name || '',
          email: saved.user?.email || '',
          currency: saved.user?.currency || 'INR',
          monthlyIncome: saved.user?.monthlyIncome || 0,
          avatar: saved.user?.avatar || (saved.user?.name ? saved.user.name.charAt(0).toUpperCase() : '👤')
        },
        agent: {
          isThinking: false,
          messages: saved.agent?.messages || this.getDefaultAgentMessages(saved.user?.name, true)
        },
        currentView: saved.currentView || 'dashboard',
        selectedTimeframe: saved.selectedTimeframe || '30D',
        searchQuery: '',
        csvLoaded: Boolean(saved.csvLoaded),
        csvFileName: saved.csvFileName || null,
        csvImportTime: saved.csvImportTime || null
      };
    } else {
      // Clean initial empty state — ZERO hardcoded numbers
      this.state = {
        expenses: [],
        budgets: [],
        goals: [],
        user: {
          name: '',
          email: '',
          currency: 'INR',
          monthlyIncome: 0,
          avatar: '👤'
        },
        agent: {
          isThinking: false,
          messages: this.getDefaultAgentMessages('', false)
        },
        currentView: 'dashboard',
        selectedTimeframe: '30D',
        searchQuery: '',
        csvLoaded: false,
        csvFileName: null,
        csvImportTime: null
      };
    }
  }

  getDefaultAgentMessages(userName = '', hasData = false) {
    const namePrefix = userName ? `, ${userName}` : '';
    if (!hasData) {
      return [
        {
          id: 'msg-init',
          sender: 'agent',
          text: `Hello${namePrefix}! I am your AI Financial Agent. No financial data is loaded yet. Please import your CSV statement to unlock spending telemetry, category audits, and automated insights.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: ['Import CSV File', 'How do I format my CSV?']
        }
      ];
    }

    return [
      {
        id: 'msg-init',
        sender: 'agent',
        text: `Welcome back${namePrefix}! Your dataset is loaded. Ask me anything about your spending trends, top expense drivers, or budget allocation.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: ['Where am I overspending?', 'Top spending category', 'Can I save more this month?']
      }
    ];
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.persist();
    this.notify();
  }

  /**
   * Load imported CSV dataset into central state
   * @param {Object} payload 
   */
  loadCsvDataset({ transactions, fileName = 'dataset.csv' }) {
    // Generate auto-budgets from unique expense categories if user has no budgets
    const dynamicCategories = [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category))];
    
    // Calculate category totals for automatic budget estimations
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    const newBudgets = dynamicCategories.map((cat, idx) => {
      const spent = categoryTotals[cat] || 0;
      // Sensible default limit: 120% of current spend, rounded to nearest 500
      const limit = Math.max(1000, Math.ceil((spent * 1.25) / 500) * 500);
      return {
        id: `b-${idx + 1}`,
        category: cat,
        limit,
        spent,
        categoryIcon: getCategoryIcon(cat),
        color: getCategoryColor(cat, idx)
      };
    });

    const newGoals = [
      {
        id: 'g-1',
        title: 'Emergency Reserve',
        targetAmount: 100000,
        currentAmount: 0,
        targetDate: '2026-12-31',
        category: 'Savings',
        color: '#06b6d4'
      }
    ];

    this.state = {
      ...this.state,
      expenses: transactions,
      budgets: this.state.budgets.length > 0 ? this.state.budgets : newBudgets,
      goals: this.state.goals.length > 0 ? this.state.goals : newGoals,
      csvLoaded: true,
      csvFileName: fileName,
      csvImportTime: new Date().toISOString(),
      agent: {
        ...this.state.agent,
        messages: this.getDefaultAgentMessages(this.state.user.name, true)
      }
    };

    this.persist();
    this.notify();
  }

  /**
   * Clear dataset and return to empty state
   */
  clearDataset() {
    this.state = {
      ...this.state,
      expenses: [],
      budgets: [],
      goals: [],
      csvLoaded: false,
      csvFileName: null,
      csvImportTime: null,
      agent: {
        ...this.state.agent,
        messages: this.getDefaultAgentMessages(this.state.user.name, false)
      }
    };

    storage.clearState();
    this.persist();
    this.notify();
  }

  persist() {
    storage.saveState({
      expenses: this.state.expenses,
      budgets: this.state.budgets,
      goals: this.state.goals,
      user: this.state.user,
      currentView: this.state.currentView,
      selectedTimeframe: this.state.selectedTimeframe,
      csvLoaded: this.state.csvLoaded,
      csvFileName: this.state.csvFileName,
      csvImportTime: this.state.csvImportTime
    });
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  // --- Analytical Helpers directly linked to state ---

  getFinancialSummary() {
    return calculateFinancialSummary(this.state.expenses, this.state.user.monthlyIncome);
  }

  getCategoryBreakdown() {
    return calculateCategoryBreakdown(this.state.expenses);
  }

  getTrendPoints(timeframe = '30D') {
    return calculateTrendPoints(this.state.expenses, timeframe);
  }
}

export const appState = new StateStore();
