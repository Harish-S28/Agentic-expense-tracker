/**
 * Budget Service
 * Manages category spending limits, thresholds, and auto-budget calculations
 */

import { appState } from '../state.js';
import { getCategoryIcon, getCategoryColor } from '../utils/calculations.js';

export const budgetService = {
  async getBudgets() {
    return [...appState.getState().budgets];
  },

  async createBudget(budgetData) {
    const state = appState.getState();
    const newBudget = {
      id: `b-${Date.now()}`,
      category: budgetData.category,
      categoryIcon: getCategoryIcon(budgetData.category),
      color: getCategoryColor(budgetData.category, state.budgets.length),
      limit: Number(budgetData.limit),
      spent: Number(budgetData.spent || 0)
    };

    const updated = [...state.budgets, newBudget];
    appState.setState({ budgets: updated });
    return newBudget;
  },

  async updateBudget(id, updatedData) {
    const state = appState.getState();
    const updated = state.budgets.map(b => {
      if (b.id === id) {
        return {
          ...b,
          ...updatedData,
          limit: Number(updatedData.limit ?? b.limit),
          spent: Number(updatedData.spent ?? b.spent),
          categoryIcon: getCategoryIcon(updatedData.category || b.category)
        };
      }
      return b;
    });

    appState.setState({ budgets: updated });
    return updated.find(b => b.id === id);
  },

  async deleteBudget(id) {
    const state = appState.getState();
    const remaining = state.budgets.filter(b => b.id !== id);
    appState.setState({ budgets: remaining });
    return true;
  }
};
