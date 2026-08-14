/**
 * Sidebar Component
 */

import { icons } from '../utils/icons.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import logoImg from '/src/assets/images/spendlog_ai_logo_1786685940362.jpg';

export function renderSidebar(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const currentView = state.currentView;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
    { id: 'transactions', label: 'Transactions', icon: icons.exchange },
    { id: 'analytics', label: 'Analytics', icon: icons.analytics },
    { id: 'budgets', label: 'Budgets', icon: icons.budgets },
    { id: 'goals', label: 'Goals', icon: icons.goals },
    { id: 'agent', label: 'AI Agent', icon: icons.sparkles, isAgent: true },
    { id: 'settings', label: 'Settings', icon: icons.settings }
  ];

  const userDisplayName = state.user?.name || 'User Account';
  const userAvatar = state.user?.avatar || (state.user?.name ? state.user.name.charAt(0).toUpperCase() : '👤');

  containerEl.innerHTML = `
    <div class="sidebar-header">
      <div class="brand-logo" id="sidebar-brand-btn" title="SpendLog AI Dashboard">
        <div class="brand-icon-box">
          <img src="${logoImg}" alt="SpendLog AI Logo" class="brand-logo-img" />
        </div>
        <div class="brand-name">
          SpendLog <span>AI</span>
        </div>
      </div>
    </div>

    <div class="sidebar-nav">
      ${navItems.map(item => `
        <div class="nav-item ${item.id === currentView ? 'active' : ''} ${item.isAgent ? 'ai-agent-item' : ''}" data-nav="${item.id}">
          ${item.icon(18)}
          <span>${item.label}</span>
          ${item.isAgent ? `<span class="agent-badge">Live</span>` : ''}
        </div>
      `).join('')}
    </div>

    <div class="sidebar-footer">
      <div class="user-profile-widget" id="sidebar-user-btn">
        <div class="user-avatar">${userAvatar}</div>
        <div class="user-details">
          <span class="user-name">${userDisplayName}</span>
          <span class="user-status">${state.csvLoaded ? 'CSV Active' : 'No Data'}</span>
        </div>
      </div>
      <button class="btn-icon" id="sidebar-settings-btn" title="Settings">
        ${icons.settings(16)}
      </button>
    </div>
  `;

  // Attach event handlers
  containerEl.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => {
      const target = el.getAttribute('data-nav');
      router.navigate(target);
      containerEl.classList.remove('mobile-open');
    };
  });

  const brandBtn = containerEl.querySelector('#sidebar-brand-btn');
  if (brandBtn) brandBtn.onclick = () => router.navigate('dashboard');

  const userBtn = containerEl.querySelector('#sidebar-user-btn');
  if (userBtn) userBtn.onclick = () => router.navigate('settings');

  const settingsBtn = containerEl.querySelector('#sidebar-settings-btn');
  if (settingsBtn) settingsBtn.onclick = () => router.navigate('settings');
}
