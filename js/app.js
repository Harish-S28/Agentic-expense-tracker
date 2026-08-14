/**
 * Main Application Bootstrapper
 * SpendLog AI - Agentic Expense Tracker Frontend
 */

import { appState } from './state.js';
import { router } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
  // Subscribe global re-renders when state changes
  appState.subscribe(() => {
    // When state updates, if user is on dashboard or active page, refresh active view
    const current = appState.getState().currentView;
    if (current !== 'login') {
      router.renderCurrentView(current);
    }
  });

  // Initialize Router
  router.init();
});
