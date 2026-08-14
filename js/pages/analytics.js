/**
 * Analytics Page View
 * Telemetry, category breakdowns, and AI anomaly tracking from active dataset.
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { formatCurrency } from '../utils/formatters.js';
import { analyticsService } from '../services/analyticsService.js';
import { renderAreaChart } from '../components/chart.js';
import { modal } from '../components/modal.js';

export async function renderAnalyticsPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const currency = state.user.currency;
  let activeTimeframe = state.selectedTimeframe || '30D';

  const analyticsData = await analyticsService.getAnalytics(activeTimeframe);
  const hasData = analyticsData.hasData;

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-title-group">
        <h1>Spending Analytics & Insights</h1>
        <p>Telemetry, category breakdowns, and AI anomaly tracking</p>
      </div>

      <div class="timeframe-pill-selector" id="analytics-timeframe-group">
        <button class="timeframe-pill ${activeTimeframe === '7D' ? 'active' : ''}" data-tf="7D">7D</button>
        <button class="timeframe-pill ${activeTimeframe === '30D' ? 'active' : ''}" data-tf="30D">30D</button>
        <button class="timeframe-pill ${activeTimeframe === '3M' ? 'active' : ''}" data-tf="3M">3M</button>
        <button class="timeframe-pill ${activeTimeframe === '1Y' ? 'active' : ''}" data-tf="1Y">1Y</button>
      </div>
    </div>

    <!-- Analytics Hero Grid -->
    <div class="analytics-hero-grid">
      <!-- Big Chart Card -->
      <div class="card" style="display:flex; flex-direction:column; min-height:320px;">
        <div class="card-header">
          <span class="card-title">Cash Flow & Outflow Curve</span>
          <div class="card-actions">
            <span class="badge badge-purple">${hasData ? 'AI Curve Smoothing' : 'No Data'}</span>
          </div>
        </div>

        <div class="chart-canvas-container" id="analytics-big-chart" style="height:220px;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px; font-size:0.8rem; color:var(--text-secondary);">
          <span>${hasData ? `Active Timeframe: ${activeTimeframe}` : 'Import a CSV statement to plot velocity curves.'}</span>
          ${hasData ? `
            <button class="btn btn-ghost" id="analytics-explain-curve-btn" style="padding:4px 8px; font-size:0.75rem; color:var(--cyan);">
              ${icons.sparkles(14)} Explain Curve
            </button>
          ` : `
            <button class="btn btn-secondary btn-pill" id="analytics-import-btn" style="padding:4px 10px; font-size:0.75rem;">
              ${icons.upload(14)} Import CSV
            </button>
          `}
        </div>
      </div>

      <!-- Category Breakdown Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Category Breakdown</span>
          <span class="text-xs text-muted">${analyticsData.categoryBreakdown.length} Categories</span>
        </div>

        <div class="category-breakdown-list">
          ${hasData && analyticsData.categoryBreakdown.length > 0 ? analyticsData.categoryBreakdown.map(cat => `
            <div class="category-row">
              <div class="category-row-meta">
                <div class="category-left-info">
                  <span class="category-color-box" style="background:${cat.color};"></span>
                  <span>${cat.category}</span>
                </div>
                <div class="category-row-amount">${formatCurrency(cat.amount, currency)} (${cat.percentage}%)</div>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${cat.percentage}%; background:${cat.color};"></div>
              </div>
            </div>
          `).join('') : `
            <div style="text-align:center; padding:48px 16px; color:var(--text-muted);">
              <div style="font-size:1.8rem; margin-bottom:8px;">📊</div>
              <div style="font-weight:600; color:var(--text-secondary);">No category distribution available</div>
              <div style="font-size:0.8rem; margin-top:2px;">Import a dataset to generate breakdowns.</div>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- 3 Summary Insight Cards -->
    <div class="analytics-cards-grid">
      <!-- Highest Category -->
      <div class="card">
        <span class="card-title">Top Expense Driver</span>
        <div style="margin-top:12px;">
          <div style="font-size:1.5rem; font-weight:700; color:#fff;">
            ${hasData ? analyticsData.highestCategory.category : '—'}
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
            ${hasData ? `${formatCurrency(analyticsData.highestCategory.amount, currency)} (${analyticsData.highestCategory.percentage}% of total spend)` : 'Awaiting dataset'}
          </div>
        </div>
      </div>

      <!-- Daily Average -->
      <div class="card">
        <span class="card-title">Average Daily Outflow</span>
        <div style="margin-top:12px;">
          <div style="font-size:1.5rem; font-weight:700; color:#fff;">
            ${hasData ? `${formatCurrency(analyticsData.dailyAverage, currency)}/day` : '—'}
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
            ${hasData ? `${analyticsData.transactionCount} total records processed` : 'Awaiting dataset'}
          </div>
        </div>
      </div>

      <!-- Anomalies Identified -->
      <div class="card">
        <span class="card-title">AI Anomaly Scanner</span>
        <div style="margin-top:12px;">
          <div style="font-size:1.5rem; font-weight:700; color:${hasData && analyticsData.anomalies.length > 0 ? 'var(--warning)' : '#fff'};">
            ${hasData ? `${analyticsData.anomalies.length} Signals` : '—'}
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
            ${hasData ? 'Active spending pattern analysis' : 'Awaiting dataset'}
          </div>
        </div>
      </div>
    </div>

    <!-- Anomaly Section -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">AI Spending Signals & Audit</span>
      </div>

      <div>
        ${hasData && analyticsData.anomalies.length > 0 ? analyticsData.anomalies.map(anom => `
          <div class="anomaly-item ${anom.type}">
            <div class="anomaly-icon">${anom.type === 'danger' ? '🚨' : anom.type === 'positive' ? '✨' : '⚠️'}</div>
            <div class="anomaly-text" style="flex:1;">
              <h4>${anom.title}</h4>
              <p>${anom.description}</p>
            </div>
            <button class="btn btn-secondary btn-pill anom-audit-btn" data-title="${anom.title}">
              Diagnose
            </button>
          </div>
        `).join('') : `
          <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">🔍</div>
            <div style="font-weight:600; color:var(--text-secondary);">No anomaly signals detected</div>
            <div style="font-size:0.8rem; margin-top:2px;">
              ${hasData ? 'All transaction amounts fall within standard baseline variance.' : 'Import a CSV dataset to scan for outliers and spikes.'}
            </div>
          </div>
        `}
      </div>
    </div>
  `;

  // Render SVG Chart
  const chartBox = containerEl.querySelector('#analytics-big-chart');
  if (chartBox) {
    renderAreaChart(chartBox, analyticsData.trendData);
  }

  // Timeframe pills
  containerEl.querySelectorAll('.timeframe-pill').forEach(btn => {
    btn.onclick = () => {
      const tf = btn.getAttribute('data-tf');
      appState.setState({ selectedTimeframe: tf });
      renderAnalyticsPage(containerEl);
    };
  });

  const importBtn = containerEl.querySelector('#analytics-import-btn');
  if (importBtn) {
    importBtn.onclick = () => modal.openCsvUploadModal();
  }

  // Explain Curve Button
  const explainBtn = containerEl.querySelector('#analytics-explain-curve-btn');
  if (explainBtn) {
    explainBtn.onclick = () => {
      modal.openQuickAgentQuery(`Explain my cashflow trajectory for the ${activeTimeframe} timeframe and advise on optimizing my spend velocity.`);
    };
  }

  // Anomaly diagnose buttons
  containerEl.querySelectorAll('.anom-audit-btn').forEach(btn => {
    btn.onclick = () => {
      const title = btn.getAttribute('data-title');
      modal.openQuickAgentQuery(`Diagnose the spending signal: "${title}" and tell me how to mitigate future budget deviations.`);
    };
  });
}
