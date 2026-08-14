/**
 * Client-Side Router
 * Lightweight hash-based SPA routing with view transitions
 */

import { appState } from './state.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderTransactionsPage } from './pages/transactions.js';
import { renderAnalyticsPage } from './pages/analytics.js';
import { renderBudgetsPage } from './pages/budgets.js';
import { renderGoalsPage } from './pages/goals.js';
import { renderAgentPage } from './pages/agent.js';
import { renderSettingsPage } from './pages/settings.js';
import { renderAuthView } from './components/authModal.js';
import { renderSidebar } from './components/sidebar.js';
import { renderNavbar } from './components/navbar.js';

class Router {
  constructor() {
    this.routes = {
      dashboard: renderDashboardPage,
      transactions: renderTransactionsPage,
      analytics: renderAnalyticsPage,
      budgets: renderBudgetsPage,
      goals: renderGoalsPage,
      agent: renderAgentPage,
      settings: renderSettingsPage,
      login: renderAuthView
    };

    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  init() {
    const hash = window.location.hash.replace('#', '');
    // If no explicit hash is provided or if hash is 'login', show the username login page first
    if (!hash || hash === 'login') {
      this.navigate('login');
    } else {
      this.handleHashChange();
    }
  }

  navigate(routeName) {
    if (!this.routes[routeName]) {
      routeName = 'dashboard';
    }

    if (window.location.hash === `#${routeName}`) {
      this.handleHashChange();
    } else {
      window.location.hash = routeName;
    }
  }

  handleHashChange() {
    let hash = window.location.hash.replace('#', '') || 'dashboard';
    if (!this.routes[hash]) {
      hash = 'dashboard';
    }

    // Sync currentView in state
    if (appState.state.currentView !== hash) {
      appState.state.currentView = hash;
      appState.persist();
    }

    this.renderCurrentView(hash);
  }

  renderCurrentView(routeName) {
    const viewContainer = document.getElementById('view-content');
    const sidebarContainer = document.getElementById('app-sidebar');
    const topbarContainer = document.getElementById('app-topbar');
    const appShell = document.getElementById('app-shell-container');
    const authShell = document.getElementById('auth-shell-container');
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');

    if (routeName === 'login') {
      if (appShell) appShell.style.display = 'none';
      if (authShell) {
        authShell.style.display = 'block';
        this.routes.login(authShell);
      }
      return;
    }

    // Standard App Shell View
    if (authShell) authShell.style.display = 'none';
    if (appShell) appShell.style.display = 'flex';

    // Re-render Shell Components to reflect active state
    if (sidebarContainer) renderSidebar(sidebarContainer);
    if (topbarContainer) renderNavbar(topbarContainer);
    if (mobileBottomNav) this.renderMobileNav(mobileBottomNav, routeName);

    if (viewContainer) {
      viewContainer.innerHTML = `
        <div class="skeleton" style="height:32px; width:220px; margin-bottom:16px;"></div>
        <div class="skeleton" style="height:120px; width:100%; border-radius:16px;"></div>
      `;

      // Render the targeted page
      const handler = this.routes[routeName];
      if (handler) {
        handler(viewContainer);
      }
    }
  }

  renderMobileNav(container, activeRoute) {
    const items = [
      { id: 'dashboard', label: 'Home', icon: '📊' },
      { id: 'transactions', label: 'Ledger', icon: '💳' },
      { id: 'agent', label: 'Agent', icon: '🤖' },
      { id: 'budgets', label: 'Budgets', icon: '📋' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    container.innerHTML = items.map(item => `
      <div class="mobile-nav-item ${item.id === activeRoute ? 'active' : ''}" data-nav="${item.id}">
        <span style="font-size:1.1rem;">${item.icon}</span>
        <span>${item.label}</span>
      </div>
    `).join('');

    container.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.onclick = () => {
        const target = el.getAttribute('data-nav');
        this.navigate(target);
      };
    });
  }
}

export const router = new Router();
