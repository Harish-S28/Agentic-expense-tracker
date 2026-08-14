/**
 * Auth Modal / Login Screen Component
 * Renders the 50-blade rotating glowing portal animation from Uiverse.io snippet (by shadyeljokers)
 * Clean, balanced layout with no prefilled default regex/name, eye password toggle, and centered elements.
 */

import { appState } from '../state.js';
import { toast } from './toast.js';
import { router } from '../router.js';
import logoImg from '/src/assets/images/spendlog_ai_logo_1786685940362.jpg';

export function renderAuthView(containerEl) {
  if (!containerEl) return;

  // Generate 50 blades with explicit .portal-blade class to avoid transforming child spans
  let bladesHtml = '';
  for (let i = 0; i < 50; i++) {
    bladesHtml += `<span class="portal-blade" style="--i:${i};"></span>\n`;
  }

  containerEl.innerHTML = `
    <div class="auth-page-wrapper">
      <div class="auth-ambient-glow"></div>
      
      <!-- Top Branding Pill -->
      <div class="auth-top-header">
        <div class="auth-brand-badge">
          <img src="${logoImg}" alt="SpendLog AI" class="auth-brand-logo-img" />
          <span>SpendLog AI • Smart Financial Workspace</span>
        </div>
      </div>

      <!-- 50-Blade Rotating Glowing Portal (From Uiverse.io by shadyeljokers) -->
      <div class="auth-portal-container">
        <!-- 50 Blades in Background -->
        ${bladesHtml}

        <!-- Foreground Login Box Card -->
        <div class="auth-login-box">
          <h2 id="auth-box-title">Welcome</h2>
          <p class="auth-subtitle">Enter your name or username to start</p>

          <form id="auth-login-form" class="auth-form" autocomplete="off">
            <!-- (1) Username / Name Input Column -->
            <div class="auth-input-box" id="auth-name-group">
              <input type="text" id="auth-input-name" placeholder=" " autocomplete="off" />
              <label for="auth-input-name">Your Name / Username</label>
            </div>

            <!-- (2) Email Column -->
            <div class="auth-input-box" id="auth-email-group">
              <input type="email" id="auth-input-email" placeholder=" " autocomplete="off" />
              <label for="auth-input-email">Email Address</label>
            </div>

            <!-- (3) Password Column with Eye Toggle -->
            <div class="auth-input-box auth-input-with-icon" id="auth-password-group">
              <input type="password" id="auth-input-password" placeholder=" " autocomplete="off" />
              <label for="auth-input-password">Password</label>
              <button type="button" class="auth-eye-btn" id="auth-eye-toggle" title="Toggle password visibility" tabindex="-1">
                <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>

            <!-- (4) Enter Workspace Primary Button -->
            <button class="auth-btn" id="auth-submit-btn" type="submit">
              Enter Workspace
            </button>

            <!-- (5) Instant Quick Access Button -->
            <button class="auth-demo-btn" id="auth-demo-btn" type="button">
              <span class="auth-bolt-icon">⚡</span> Instant Quick Access
            </button>

            <!-- (6) OR Divider -->
            <div class="auth-divider">
              <span class="auth-divider-line"></span>
              <span class="auth-divider-text">OR</span>
              <span class="auth-divider-line"></span>
            </div>

            <!-- (7) Helper note -->
            <div class="auth-helper-note">
              No password verification required
            </div>
          </form>
        </div>
      </div>

      <!-- Bottom Footnote -->
      <div class="auth-footer-note">
        ✨ Your entered username dynamically personalizes your financial agent, reports, and ledger.
      </div>
    </div>
  `;

  const form = containerEl.querySelector('#auth-login-form');
  const nameInput = containerEl.querySelector('#auth-input-name');
  const emailInput = containerEl.querySelector('#auth-input-email');
  const passwordInput = containerEl.querySelector('#auth-input-password');
  const eyeBtn = containerEl.querySelector('#auth-eye-toggle');
  const demoBtn = containerEl.querySelector('#auth-demo-btn');

  // Password visibility toggle
  let isPasswordVisible = false;
  if (eyeBtn && passwordInput) {
    eyeBtn.onclick = (e) => {
      e.preventDefault();
      isPasswordVisible = !isPasswordVisible;
      passwordInput.type = isPasswordVisible ? 'text' : 'password';
      eyeBtn.innerHTML = isPasswordVisible ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9.88 9.88 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>
      ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
    };
  }

  // Focus name input immediately
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 80);

  const handleLoginSuccess = (name, email) => {
    // If no name entered, use clean fallback
    const cleanName = (name && name.trim()) ? name.trim() : 'Guest';
    const cleanEmail = (email && email.trim()) ? email.trim() : `${cleanName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const initial = cleanName.charAt(0).toUpperCase();

    // Update state and persistence
    appState.setState({
      user: {
        ...appState.getState().user,
        name: cleanName,
        email: cleanEmail,
        avatar: initial
      },
      auth: {
        isAuthenticated: true,
        user: { name: cleanName, email: cleanEmail }
      }
    });

    sessionStorage.setItem('spendlog_has_authenticated', 'true');
    toast.success(`Welcome, ${cleanName}! Personalizing your dashboard...`, 'Workspace Ready');
    router.navigate('dashboard');
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    const name = nameInput ? nameInput.value : '';
    const email = emailInput ? emailInput.value : '';
    handleLoginSuccess(name, email);
  };

  if (demoBtn) {
    demoBtn.onclick = () => {
      const currentTyped = nameInput?.value?.trim();
      handleLoginSuccess(currentTyped || 'User', emailInput?.value || '');
    };
  }
}
