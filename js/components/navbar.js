/**
 * Top Navbar Component
 */

import { icons } from '../utils/icons.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { modal } from './modal.js';
import { toast } from './toast.js';
import logoImg from '/src/assets/images/spendlog_ai_logo_1786685940362.jpg';

export function renderNavbar(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const userName = state.user?.name ? ` ${state.user.name}` : '';

  // Dynamic time-of-day greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17 || hour < 5) {
    timeGreeting = 'Good evening';
  }

  containerEl.innerHTML = `
    <div class="topbar-left-wrapper">
      <!-- Top-left Brand Logo -->
      <div class="topbar-brand" id="topbar-brand-btn" title="SpendLog AI Dashboard">
        <div class="topbar-logo-box">
          <img src="${logoImg}" alt="SpendLog AI" class="topbar-logo-img" />
        </div>
        <div class="topbar-brand-text">
          <span class="topbar-brand-title">SpendLog <span class="topbar-ai-pill">AI</span></span>
        </div>
      </div>

      <div class="topbar-divider-v"></div>

      <!-- Topbar User Greeting -->
      <div class="topbar-greeting">
        <div class="greeting-title" id="topbar-greeting-user">
          ${timeGreeting}${userName} 👋
        </div>
        <div class="greeting-subtitle">
          ${state.csvLoaded ? `Dataset: ${state.csvFileName} (${state.expenses.length} records)` : 'Financial Intelligence Command Center'}
        </div>
      </div>
    </div>

    <div class="topbar-actions">
      <!-- Search Box -->
      <div class="search-box">
        <span class="search-icon">${icons.search(16)}</span>
        <input type="text" id="topbar-search-input" placeholder="Search transactions, tags..." value="${state.searchQuery || ''}" />
      </div>

      <!-- Import CSV Button -->
      <button class="btn ${state.csvLoaded ? 'btn-secondary' : 'btn-primary'} btn-pill" id="topbar-import-csv-btn">
        ${icons.upload(16)}
        <span>${state.csvLoaded ? 'Dataset' : 'Import CSV'}</span>
      </button>

      <!-- Quick Add Button -->
      <button class="btn btn-secondary btn-pill" id="topbar-add-expense-btn">
        ${icons.plus(16)}
        <span>Add Expense</span>
      </button>

      <!-- Switch User / Login Link -->
      <button class="btn-icon" id="topbar-switch-user-btn" title="Switch User / Login Portal" style="font-size:0.8rem; font-weight:600; width:auto; padding:0 10px; gap:6px; border-radius:var(--radius-full); background:rgba(255,255,255,0.04); border:1px solid var(--border);">
        <span style="font-size:0.95rem;">👤</span>
        <span style="color:var(--text-secondary); font-size:0.75rem;">${state.user.name ? state.user.name : 'Account'}</span>
      </button>

      <!-- Notifications -->
      <button class="btn-icon" id="topbar-notif-btn" title="Notifications">
        ${icons.bell(16)}
      </button>

      <!-- AI Agent Status Pill -->
      <div class="ai-status-badge" id="topbar-agent-badge" title="Click to open AI Agent">
        <span class="status-dot"></span>
        <span>AI Agent ${state.csvLoaded ? 'Ready' : 'Online'}</span>
      </div>
    </div>
  `;

  // Event handlers
  const topbarBrandBtn = containerEl.querySelector('#topbar-brand-btn');
  if (topbarBrandBtn) {
    topbarBrandBtn.onclick = () => {
      const sidebar = document.getElementById('app-sidebar');
      if (window.innerWidth <= 1024 && sidebar) {
        sidebar.classList.toggle('mobile-open');
      } else {
        router.navigate('dashboard');
      }
    };
  }

  const importCsvBtn = containerEl.querySelector('#topbar-import-csv-btn');
  if (importCsvBtn) {
    importCsvBtn.onclick = () => modal.openCsvUploadModal();
  }

  const addBtn = containerEl.querySelector('#topbar-add-expense-btn');
  if (addBtn) {
    addBtn.onclick = () => modal.openAddExpense();
  }

  const switchUserBtn = containerEl.querySelector('#topbar-switch-user-btn');
  if (switchUserBtn) {
    switchUserBtn.onclick = () => router.navigate('login');
  }

  const agentBadge = containerEl.querySelector('#topbar-agent-badge');
  if (agentBadge) {
    agentBadge.onclick = () => router.navigate('agent');
  }

  const notifBtn = containerEl.querySelector('#topbar-notif-btn');
  if (notifBtn) {
    notifBtn.onclick = () => {
      if (state.csvLoaded) {
        toast.info(`Active dataset contains ${state.expenses.length} ledger records.`);
      } else {
        toast.info('No dataset loaded. Import a CSV statement to unlock analytics.');
      }
    };
  }

  const searchInput = containerEl.querySelector('#topbar-search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const val = e.target.value;
      appState.setState({ searchQuery: val });
      if (state.currentView !== 'transactions' && val.trim().length > 1) {
        router.navigate('transactions');
      }
    };
  }
}
