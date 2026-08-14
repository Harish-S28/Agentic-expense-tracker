/**
 * Settings Page View
 * Preferences, Profile, and CSV Dataset Management
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { toast } from '../components/toast.js';
import { router } from '../router.js';
import { modal } from '../components/modal.js';
import { csvService } from '../services/csvService.js';
import { formatDate } from '../utils/formatters.js';

export function renderSettingsPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const user = state.user || {};
  const hasData = state.csvLoaded && state.expenses.length > 0;

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-title-group">
        <h1>Preferences & Account Settings</h1>
        <p>Manage your profile, currency formats, notification alerts, and data storage</p>
      </div>
      <div class="header-action-buttons">
        <button class="btn btn-secondary" id="settings-logout-btn">
          Sign Out / Switch Account
        </button>
      </div>
    </div>

    <div class="settings-container">
      
      <!-- CSV Dataset Management Card -->
      <div class="settings-section-card" style="border: 1px solid rgba(6,182,212,0.3); background: linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(139,92,246,0.04) 100%);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <h2>CSV Dataset Management</h2>
            <p>Upload, replace, or clear your local financial statement dataset</p>
          </div>
          <span class="badge ${hasData ? 'badge-cyan' : 'badge-purple'}">
            ${hasData ? '● Dataset Active' : '○ No Dataset'}
          </span>
        </div>

        <div style="margin: 16px 0; padding: 14px; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.4rem;">${hasData ? '📊' : '📁'}</span>
            <div>
              <div style="font-weight:600; color:#fff; font-size:0.9rem;">
                ${hasData ? `${state.csvFileName || 'dataset.csv'} (${state.expenses.length} records)` : 'No CSV Statement Loaded'}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                ${hasData ? `Imported on ${formatDate(state.csvImportTime)} • Client-side memory` : 'Upload your transactions CSV to populate all dashboards and reports.'}
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="settings-upload-csv-btn">
            ${icons.upload(16)} ${hasData ? 'Replace Dataset' : 'Import CSV Dataset'}
          </button>
          <button class="btn btn-secondary" id="settings-sample-csv-btn">
            ${icons.download(16)} Download Sample Template
          </button>
          ${hasData ? `
            <button class="btn btn-danger" id="settings-clear-dataset-btn">
              ${icons.trash(16)} Clear Dataset
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Profile Card -->
      <div class="settings-section-card">
        <h2>Profile Details</h2>
        <p>Personal information displayed across your financial command center</p>

        <form id="settings-profile-form">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div class="form-group">
              <label class="form-label" for="settings-name">Full Name / Username</label>
              <input type="text" id="settings-name" class="form-control" value="${user.name || ''}" placeholder="e.g. Alex" />
            </div>
            <div class="form-group">
              <label class="form-label" for="settings-email">Email Address</label>
              <input type="email" id="settings-email" class="form-control" value="${user.email || ''}" placeholder="e.g. user@example.com" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div class="form-group">
              <label class="form-label" for="settings-income">Estimated Monthly Income (₹)</label>
              <input type="number" id="settings-income" class="form-control" value="${user.monthlyIncome || ''}" placeholder="0" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label" for="settings-currency">Display Currency</label>
              <select id="settings-currency" class="form-control">
                <option value="INR" ${user.currency === 'INR' ? 'selected' : ''}>₹ INR - Indian Rupee (Lakhs format)</option>
                <option value="USD" ${user.currency === 'USD' ? 'selected' : ''}>$ USD - US Dollar</option>
                <option value="EUR" ${user.currency === 'EUR' ? 'selected' : ''}>€ EUR - Euro</option>
                <option value="GBP" ${user.currency === 'GBP' ? 'selected' : ''}>£ GBP - British Pound</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:8px;">
            Save Profile Changes
          </button>
        </form>
      </div>

      <!-- Financial Agent & AI Settings -->
      <div class="settings-section-card">
        <h2>AI Agent Telemetry</h2>
        <p>Configure autonomous monitoring, budget threshold alerts, and anomaly detection</p>

        <div class="settings-row">
          <div class="settings-label-group">
            <h4>Autonomous Anomaly Scanning</h4>
            <p>Allow AI agent to continuously scan transactions for unusual spending spikes</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" checked id="toggle-anom-scan" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-label-group">
            <h4>Smart Budget Recommendations</h4>
            <p>Receive proactive suggestions when category spend exceeds 80%</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" checked id="toggle-budget-alerts" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-label-group">
            <h4>Holographic Visual Effects</h4>
            <p>Enable 3D orb rendering and glow animations on dashboard</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" checked id="toggle-glow-fx" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Data & Privacy -->
      <div class="settings-section-card">
        <h2>Data Management & Backups</h2>
        <p>Export your ledger database or clear local cache</p>

        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-secondary" id="settings-export-json-btn">
            ${icons.download(16)} Export Full JSON Backup
          </button>
          <button class="btn btn-danger" id="settings-reset-empty-btn">
            ${icons.trash(16)} Clear All Local Data
          </button>
        </div>
      </div>

    </div>
  `;

  // CSV Buttons
  containerEl.querySelector('#settings-upload-csv-btn').onclick = () => modal.openCsvUploadModal();
  containerEl.querySelector('#settings-sample-csv-btn').onclick = () => {
    csvService.downloadSampleTemplate();
    toast.success('Sample CSV template downloaded!');
  };

  const clearDatasetBtn = containerEl.querySelector('#settings-clear-dataset-btn');
  if (clearDatasetBtn) {
    clearDatasetBtn.onclick = () => modal.openClearDatasetConfirm();
  }

  // Profile Form submit
  const profileForm = containerEl.querySelector('#settings-profile-form');
  profileForm.onsubmit = (e) => {
    e.preventDefault();
    const name = containerEl.querySelector('#settings-name').value.trim();
    const email = containerEl.querySelector('#settings-email').value.trim();
    const monthlyIncome = Number(containerEl.querySelector('#settings-income').value) || 0;
    const currency = containerEl.querySelector('#settings-currency').value;

    appState.setState({
      user: {
        ...user,
        name,
        email,
        monthlyIncome,
        currency,
        avatar: name ? name.charAt(0).toUpperCase() : '👤'
      }
    });

    toast.success('Profile preferences saved successfully!');
  };

  // Sign out / Auth screen
  containerEl.querySelector('#settings-logout-btn').onclick = () => {
    router.navigate('login');
  };

  // JSON Export
  containerEl.querySelector('#settings-export-json-btn').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.getState(), null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `SpendLog_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    toast.success('JSON state backup downloaded!');
  };

  // Reset to empty
  containerEl.querySelector('#settings-reset-empty-btn').onclick = () => {
    if (confirm('Clear all stored transactions, budgets, goals, and history?')) {
      appState.clearDataset();
      toast.info('All local data cleared. Reset to blank state.');
      renderSettingsPage(containerEl);
    }
  };
}
