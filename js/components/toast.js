/**
 * Toast Notification System
 */

import { icons } from '../utils/icons.js';

class ToastManager {
  constructor() {
    this.container = null;
    this.ensureContainer();
  }

  ensureContainer() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    this.container = el;
  }

  show({ title, message, type = 'info', duration = 3500 }) {
    this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: icons.check(18, 'text-success'),
      warning: icons.sparkles(18, 'text-warning'),
      danger: icons.x(18, 'text-danger'),
      info: icons.agent(18, 'text-cyan')
    };

    toast.innerHTML = `
      <div style="flex-shrink:0;">${iconMap[type] || iconMap.info}</div>
      <div style="flex:1;">
        ${title ? `<div style="font-weight:600; font-size:0.875rem; color:#fff;">${title}</div>` : ''}
        <div style="font-size:0.8rem; color:#cbd5e1;">${message}</div>
      </div>
      <button class="btn-icon" style="width:24px; height:24px; border:none; background:transparent;" aria-label="Close">
        ${icons.x(14)}
      </button>
      <div class="toast-progress"></div>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.onclick = () => this.dismiss(toast);

    this.container.appendChild(toast);

    setTimeout(() => {
      this.dismiss(toast);
    }, duration);
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(0.95)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }

  success(message, title = 'Success') {
    this.show({ title, message, type: 'success' });
  }

  warning(message, title = 'Warning') {
    this.show({ title, message, type: 'warning' });
  }

  danger(message, title = 'Error') {
    this.show({ title, message, type: 'danger' });
  }

  info(message, title = 'SpendLog AI') {
    this.show({ title, message, type: 'info' });
  }
}

export const toast = new ToastManager();
