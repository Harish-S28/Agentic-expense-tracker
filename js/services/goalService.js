/**
 * Goal Service
 * Manages savings objectives and deposits
 */

import { appState } from '../state.js';

export const goalService = {
  async getGoals() {
    return [...appState.getState().goals];
  },

  async createGoal(goalData) {
    const state = appState.getState();
    const newGoal = {
      id: `g-${Date.now()}`,
      title: goalData.title,
      targetAmount: Number(goalData.targetAmount),
      currentAmount: Number(goalData.currentAmount || 0),
      targetDate: goalData.targetDate || '2026-12-31',
      category: goalData.category || 'Savings',
      color: goalData.color || '#06b6d4'
    };

    const updated = [...state.goals, newGoal];
    appState.setState({ goals: updated });
    return newGoal;
  },

  async updateGoal(id, updatedData) {
    const state = appState.getState();
    const updated = state.goals.map(g => {
      if (g.id === id) {
        return {
          ...g,
          ...updatedData,
          targetAmount: Number(updatedData.targetAmount ?? g.targetAmount),
          currentAmount: Number(updatedData.currentAmount ?? g.currentAmount)
        };
      }
      return g;
    });

    appState.setState({ goals: updated });
    return updated.find(g => g.id === id);
  },

  async depositToGoal(id, amount) {
    const state = appState.getState();
    const updated = state.goals.map(g => {
      if (g.id === id) {
        return {
          ...g,
          currentAmount: g.currentAmount + Number(amount)
        };
      }
      return g;
    });

    appState.setState({ goals: updated });
    return updated.find(g => g.id === id);
  },

  async deleteGoal(id) {
    const state = appState.getState();
    const remaining = state.goals.filter(g => g.id !== id);
    appState.setState({ goals: remaining });
    return true;
  }
};
