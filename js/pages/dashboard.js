/**
 * Dashboard Page View
 * SpendLog AI - Dynamic Financial Intelligence Command Center
 * ZERO hardcoded default numbers. Driven purely by CSV / state.
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters.js';
import { renderAreaChart, renderSparkline } from '../components/chart.js';
import { modal } from '../components/modal.js';
import { router } from '../router.js';

export function renderDashboardPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const summary = appState.getFinancialSummary();
  const categories = appState.getCategoryBreakdown();
  const currency = state.user.currency;
  const recentTransactions = state.expenses.slice(0, 5);
  const hasData = state.csvLoaded && state.expenses.length > 0;

  // Compute dynamic top category and largest single expense
  const topCategory = categories.length > 0 ? categories[0] : null;
  const largestExpense = hasData 
    ? [...state.expenses].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0] 
    : null;

  containerEl.innerHTML = `
    <!-- Top CSV Banner if not loaded -->
    ${!hasData ? `
      <div class="card" style="margin-bottom: 24px; border: 1px dashed rgba(6,182,212,0.4); background: linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(139,92,246,0.06) 100%);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:12px; background:rgba(6,182,212,0.15); display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
              📁
            </div>
            <div>
              <div style="font-weight:700; color:#fff; font-size:1.05rem;">No Financial Dataset Loaded</div>
              <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">
                Import your statement (.csv) with <code style="color:var(--cyan);">date, title, category, amount, type</code> to populate your financial intelligence command center.
              </div>
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary" id="dash-banner-import-btn">
              ${icons.upload(16)} Import CSV Dataset
            </button>
            <button class="btn btn-secondary" id="dash-banner-sample-btn">
              ${icons.download(16)} Download Sample CSV
            </button>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 4 KPI Stat Metric Cards -->
    <div class="stats-grid">
      <!-- 1. Total Balance -->
      <div class="card stat-card" id="dash-stat-balance">
        <div class="stat-header">
          <span class="stat-title">Total Balance</span>
          <div class="stat-icon-box cyan">
            ${icons.wallet(18)}
          </div>
        </div>
        <div class="stat-value" id="dash-val-balance">
          ${hasData ? formatCurrency(summary.totalBalance, currency) : '—'}
        </div>
        <div class="stat-footer">
          ${hasData ? `
            <span class="stat-trend ${summary.totalBalance >= 0 ? 'positive' : 'negative'}">
              ${summary.totalBalance >= 0 ? icons.arrowUp(12) : icons.arrowDown(12)} ${summary.totalBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}
            </span>
            <span class="stat-period">${state.expenses.length} records</span>
          ` : `
            <span class="stat-period">Awaiting CSV import</span>
          `}
        </div>
      </div>

      <!-- 2. Monthly Spending -->
      <div class="card stat-card" id="dash-stat-spending">
        <div class="stat-header">
          <span class="stat-title">Monthly Spending</span>
          <div class="stat-icon-box purple">
            ${icons.pieChart(18)}
          </div>
        </div>
        <div class="stat-value" id="dash-val-spending">
          ${hasData ? formatCurrency(summary.monthlySpending, currency) : '—'}
        </div>
        <div class="stat-footer">
          ${hasData ? `
            <span class="stat-trend ${summary.spendingTrend && summary.spendingTrend.startsWith('+') ? 'negative' : 'positive'}">
              ${summary.spendingTrend ? `${summary.spendingTrend.startsWith('+') ? icons.arrowUp(12) : icons.arrowDown(12)} ${summary.spendingTrend} MoM` : `${categories.length} Categories`}
            </span>
            <span class="stat-period">Active Outflow</span>
          ` : `
            <span class="stat-period">Awaiting CSV import</span>
          `}
        </div>
      </div>

      <!-- 3. Monthly Savings -->
      <div class="card stat-card" id="dash-stat-savings">
        <div class="stat-header">
          <span class="stat-title">Monthly Savings</span>
          <div class="stat-icon-box green">
            ${icons.trendUp(18)}
          </div>
        </div>
        <div class="stat-value" id="dash-val-savings">
          ${hasData && summary.monthlySavings !== null ? formatCurrency(summary.monthlySavings, currency) : '—'}
        </div>
        <div class="stat-footer">
          ${hasData && summary.monthlySavings !== null ? `
            <span class="stat-trend ${summary.monthlySavings >= 0 ? 'positive' : 'negative'}">
              ${summary.monthlySavings >= 0 ? icons.arrowUp(12) : icons.arrowDown(12)} ${summary.savingsTrend ? `${summary.savingsTrend} MoM` : formatPercentage(summary.savingsRate || 0)}
            </span>
            <span class="stat-period">Savings Flow</span>
          ` : `
            <span class="stat-period">Awaiting CSV import</span>
          `}
        </div>
      </div>

      <!-- 4. Savings Rate -->
      <div class="card stat-card" id="dash-stat-rate">
        <div class="stat-header">
          <span class="stat-title">Savings Rate</span>
          <div class="stat-icon-box amber">
            ${icons.target(18)}
          </div>
        </div>
        <div class="stat-value" id="dash-val-rate">
          ${hasData && summary.savingsRate !== null ? formatPercentage(summary.savingsRate) : '—%'}
        </div>
        <div class="stat-footer">
          ${hasData ? `
            <span class="stat-trend positive">
              ${icons.sparkles(12)} ${summary.savingsRate >= 20 ? 'Optimal (≥20%)' : 'Adjustable'}
            </span>
            <span class="stat-period">Target: 20%+</span>
          ` : `
            <span class="stat-period">Awaiting CSV import</span>
          `}
        </div>
      </div>
    </div>

    <!-- Main Dashboard Grid (Chart + 3D Holographic AI Agent Orb Card) -->
    <div class="dashboard-main-grid">
      
      <!-- Left: Interactive Cash Flow Trend Chart -->
      <div class="card" style="display: flex; flex-direction: column;">
        <div class="card-header">
          <div>
            <div class="card-title">Spending & Inflow Velocity</div>
            <div class="text-xs text-muted">Cashflow telemetry curve (Income vs Expense)</div>
          </div>
          <div class="timeframe-pill-selector" id="dash-timeframe-selector">
            <button class="timeframe-pill ${state.selectedTimeframe === '7D' ? 'active' : ''}" data-tf="7D">7D</button>
            <button class="timeframe-pill ${state.selectedTimeframe === '30D' ? 'active' : ''}" data-tf="30D">30D</button>
            <button class="timeframe-pill ${state.selectedTimeframe === '3M' ? 'active' : ''}" data-tf="3M">3M</button>
            <button class="timeframe-pill ${state.selectedTimeframe === '1Y' ? 'active' : ''}" data-tf="1Y">1Y</button>
          </div>
        </div>

        <!-- Chart Canvas Container -->
        <div class="chart-canvas-container" id="dash-main-chart" style="height: 180px; min-height: 180px;">
          <!-- SVG area chart injected via renderAreaChart -->
        </div>

        <!-- Chart Legend / Category Quick Chips -->
        <div class="category-pills-row" id="dash-category-chips">
          ${hasData ? categories.slice(0, 4).map(cat => `
            <div class="category-pill-stat">
              <span class="category-dot" style="background:${cat.color};"></span>
              <span style="color:#fff; font-weight:500;">${cat.category}:</span>
              <span style="color:var(--text-secondary);">${formatCurrency(cat.amount, currency)} (${cat.percentage}%)</span>
            </div>
          `).join('') : `
            <div style="font-size:0.8rem; color:var(--text-muted); padding:4px 0;">
              Import a dataset to dynamically map categories and cashflow curves.
            </div>
          `}
        </div>
      </div>

      <!-- Right: AI Agent Diagnostic Holographic Card -->
      <div class="card ai-agent-orb-card">
        <div class="card-header" style="margin-bottom: 0;">
          <div class="ai-status-badge">
            <span class="status-dot"></span>
            <span>AI Spending Intelligence</span>
          </div>
          <button class="btn btn-ghost" id="dash-open-agent-btn" style="padding:4px 8px; font-size:0.75rem; color:var(--cyan);">
            Open Agent →
          </button>
        </div>

        <!-- Holographic 3D Orb Visual Centerpiece -->
        <div class="holographic-orb-stage">
          <div class="orb-ring ring-outer"></div>
          <div class="orb-ring ring-middle"></div>
          <div class="orb-ring ring-inner"></div>
          <div class="orb-core">
            <span style="font-size: 1.6rem;">🤖</span>
          </div>
        </div>

        <div class="ai-insight-content">
          ${hasData ? `
            <div class="ai-insight-title">
              Autonomous Audit Active
            </div>
            <p class="ai-insight-text">
              ${topCategory ? `Top expense driver is <strong style="color:#fff;">${topCategory.category}</strong> (${topCategory.percentage}% of total spend). ` : ''}
              ${largestExpense ? `Largest single transaction: <strong style="color:#fff;">${largestExpense.title}</strong> (${formatCurrency(largestExpense.amount, currency)}).` : ''}
            </p>
            <div class="ai-action-buttons">
              <button class="btn btn-ai" id="dash-ai-query-btn">
                ${icons.sparkles(14)} Ask Agent About Spend
              </button>
              <button class="btn btn-secondary" id="dash-ai-budget-btn">
                Audit Category Limits
              </button>
            </div>
          ` : `
            <div class="ai-insight-title" style="color:var(--text-secondary);">
              No Financial Data Available
            </div>
            <p class="ai-insight-text">
              Import a CSV dataset to enable financial analysis and autonomous insights.
            </p>
            <div class="ai-action-buttons">
              <button class="btn btn-primary" id="dash-ai-import-trigger-btn">
                ${icons.upload(14)} Import CSV Dataset
              </button>
            </div>
          `}
        </div>
      </div>

    </div>

    <!-- Bottom Split: Recent Transactions & Category Allocations -->
    <div class="dashboard-bottom-grid">
      
      <!-- Recent Transactions Table Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <span class="card-title">Recent Transactions</span>
            <div class="text-xs text-muted">Latest records from active ledger</div>
          </div>
          <button class="btn btn-ghost" id="dash-view-all-tx-btn" style="font-size:0.8rem; color:var(--cyan);">
            View All (${state.expenses.length}) →
          </button>
        </div>

        <div class="table-responsive">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Merchant / Item</th>
                <th>Category</th>
                <th>Date</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody id="dash-recent-tx-body">
              ${hasData ? recentTransactions.map(tx => {
                const isExpense = tx.type === 'expense';
                return `
                  <tr data-id="${tx.id}">
                    <td>
                      <div class="tx-table-item">
                        <div class="tx-icon-box" style="width:32px; height:32px; font-size:0.9rem;">
                          ${tx.categoryIcon || '💳'}
                        </div>
                        <div>
                          <div style="font-weight:600; color:#fff; font-size:0.85rem;">${tx.title}</div>
                          <div style="font-size:0.75rem; color:var(--text-muted);">${tx.paymentMethod || 'UPI'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-purple">${tx.category}</span>
                    </td>
                    <td>
                      <span style="font-size:0.8rem; color:var(--text-secondary);">${formatDate(tx.date)}</span>
                    </td>
                    <td style="text-align:right;">
                      <span style="font-weight:700; ${isExpense ? 'color:#fff;' : 'color:var(--success);'}">
                        ${isExpense ? '-' : '+'}${formatCurrency(tx.amount, currency)}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="4">
                    <div class="empty-state" style="padding: 28px 16px;">
                      <div class="empty-icon">💳</div>
                      <div class="empty-title">No transactions yet</div>
                      <div class="empty-subtitle">Import your CSV dataset to start tracking your finances.</div>
                      <button class="btn btn-primary" id="dash-empty-table-import-btn" style="margin-top:12px;">
                        ${icons.upload(16)} Import CSV Dataset
                      </button>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Category Allocation Progress Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <span class="card-title">Category Outflow Allocation</span>
            <div class="text-xs text-muted">Real-time expenditure share</div>
          </div>
          <span class="badge badge-cyan">${categories.length} Categories</span>
        </div>

        <div class="category-breakdown-list">
          ${hasData ? categories.slice(0, 5).map(cat => `
            <div class="category-row">
              <div class="category-row-meta">
                <div class="category-left-info">
                  <span class="category-color-box" style="background:${cat.color};"></span>
                  <span style="font-weight:500;">${cat.category}</span>
                </div>
                <div class="category-row-amount">
                  ${formatCurrency(cat.amount, currency)}
                  <span style="color:var(--text-muted); font-size:0.75rem;">(${cat.percentage}%)</span>
                </div>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${cat.percentage}%; background:${cat.color};"></div>
              </div>
            </div>
          `).join('') : `
            <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
              <div style="font-size:1.8rem; margin-bottom:8px;">📊</div>
              <div style="font-weight:600; color:var(--text-secondary); font-size:0.9rem;">No category data</div>
              <div style="font-size:0.8rem; margin-top:2px;">Category allocations appear once a CSV is uploaded.</div>
            </div>
          `}
        </div>
      </div>

    </div>
  `;

  // Render SVG Chart
  const chartBox = containerEl.querySelector('#dash-main-chart');
  if (chartBox) {
    const trendPoints = appState.getTrendPoints(state.selectedTimeframe || '30D');
    renderAreaChart(chartBox, trendPoints);
  }

  // --- Attach Event Listeners ---

  // Import triggers
  const importTriggers = [
    '#dash-banner-import-btn',
    '#dash-empty-table-import-btn',
    '#dash-ai-import-trigger-btn'
  ];
  importTriggers.forEach(selector => {
    const btn = containerEl.querySelector(selector);
    if (btn) btn.onclick = () => modal.openCsvUploadModal();
  });

  const sampleBtn = containerEl.querySelector('#dash-banner-sample-btn');
  if (sampleBtn) {
    sampleBtn.onclick = () => {
      import('../services/csvService.js').then(m => m.csvService.downloadSampleTemplate());
      import('../components/toast.js').then(m => m.toast.success('Sample CSV template downloaded!'));
    };
  }

  // Timeframe selector
  containerEl.querySelectorAll('.timeframe-pill').forEach(btn => {
    btn.onclick = () => {
      const tf = btn.getAttribute('data-tf');
      appState.setState({ selectedTimeframe: tf });
      renderDashboardPage(containerEl);
    };
  });

  // Open Agent view
  const openAgentBtn = containerEl.querySelector('#dash-open-agent-btn');
  if (openAgentBtn) openAgentBtn.onclick = () => router.navigate('agent');

  // Ask Agent modal
  const askAgentBtn = containerEl.querySelector('#dash-ai-query-btn');
  if (askAgentBtn) {
    askAgentBtn.onclick = () => {
      modal.openQuickAgentQuery('Provide an executive summary of my spending distribution and highlight any potential budget risks.');
    };
  }

  const budgetAuditBtn = containerEl.querySelector('#dash-ai-budget-btn');
  if (budgetAuditBtn) {
    budgetAuditBtn.onclick = () => router.navigate('budgets');
  }

  // View All Transactions
  const viewAllBtn = containerEl.querySelector('#dash-view-all-tx-btn');
  if (viewAllBtn) viewAllBtn.onclick = () => router.navigate('transactions');
}
