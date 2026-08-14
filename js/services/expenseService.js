/**
 * Expense Service
 * Manages CRUD operations for transaction ledger
 */

import { appState } from '../state.js';
import { getCategoryIcon } from '../utils/calculations.js';

export const expenseService = {
  /**
   * Get all transactions from state
   */
  async getExpenses() {
    return [...appState.getState().expenses];
  },

  /**
   * Add a new expense/income transaction
   */
  async createExpense(expenseData) {
    const state = appState.getState();
    const newTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: expenseData.title,
      merchant: expenseData.merchant || expenseData.title,
      amount: Number(expenseData.amount),
      category: expenseData.category,
      categoryIcon: getCategoryIcon(expenseData.category),
      type: expenseData.type || 'expense',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      paymentMethod: expenseData.paymentMethod || 'UPI',
      notes: expenseData.notes || ''
    };

    const updated = [newTx, ...state.expenses];
    appState.setState({ expenses: updated });

    // Also update budget spent if matching category
    if (newTx.type === 'expense') {
      const budgets = state.budgets.map(b => {
        if (b.category.toLowerCase() === newTx.category.toLowerCase()) {
          return { ...b, spent: b.spent + newTx.amount };
        }
        return b;
      });
      appState.setState({ budgets });
    }

    return newTx;
  },

  /**
   * Update existing transaction
   */
  async updateExpense(id, updatedData) {
    const state = appState.getState();
    const prevTx = state.expenses.find(x => x.id === id);
    const updatedExpenses = state.expenses.map(item => {
      if (item.id === id) {
        return {
          ...item,
          ...updatedData,
          amount: Number(updatedData.amount ?? item.amount),
          categoryIcon: getCategoryIcon(updatedData.category || item.category)
        };
      }
      return item;
    });

    appState.setState({ expenses: updatedExpenses });

    // Recalculate budgets
    if (prevTx) {
      this.recalculateBudgets(updatedExpenses);
    }

    return updatedExpenses.find(x => x.id === id);
  },

  /**
   * Delete a transaction
   */
  async deleteExpense(id) {
    const state = appState.getState();
    const remaining = state.expenses.filter(x => x.id !== id);
    appState.setState({ expenses: remaining });
    this.recalculateBudgets(remaining);
    return true;
  },

  /**
   * Recalculate category budget spending amounts
   */
  recalculateBudgets(expenses) {
    const state = appState.getState();
    const categoryTotals = {};
    expenses.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    const updatedBudgets = state.budgets.map(b => ({
      ...b,
      spent: categoryTotals[b.category] || 0
    }));

    appState.setState({ budgets: updatedBudgets });
  }
};
