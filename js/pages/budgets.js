/**
 * Budgets Page View
 * Monthly Category Budgets & Consumption Thresholds
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { formatCurrency } from '../utils/formatters.js';
import { modal } from '../components/modal.js';
import { budgetService } from '../services/budgetService.js';
import { toast } from '../components/toast.js';

export function renderBudgetsPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const currency = state.user.currency;
  const budgets = state.budgets || [];
  const hasBudgets = budgets.length > 0;

  const totalBudgeted = budgets.reduce((acc, b) => acc + Number(b.limit || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + Number(b.spent || 0), 0);
  const remaining = Math.max(0, totalBudgeted - totalSpent);
  const overallRatio = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-title-group">
        <h1>Monthly Category Budgets</h1>
        <p>Set spending ceilings, monitor consumption thresholds, and prevent overruns</p>
      </div>
      <div class="header-action-buttons">
        <button class="btn btn-secondary" id="budget-ai-suggest-btn">
          ${icons.sparkles(16)} AI Auto-Budget
        </button>
        <button class="btn btn-primary" id="budget-add-new-btn">
          ${icons.plus(16)} Create Budget
        </button>
      </div>
    </div>

    <!-- Overview Bar Card -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title">Overall Budget Allocation</span>
        <span style="font-size:0.85rem; font-weight:700; color:${overallRatio > 90 ? 'var(--danger)' : 'var(--cyan)'};">
          ${hasBudgets ? `${overallRatio}% Utilized` : 'No Budgets Configured'}
        </span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">
        <div>
          <span style="font-size:1.5rem; font-weight:700; color:#fff;">
            ${hasBudgets ? formatCurrency(totalSpent, currency) : '—'}
          </span>
          <span style="font-size:0.85rem; color:var(--text-muted);">
            ${hasBudgets ? ` spent of ${formatCurrency(totalBudgeted, currency)}` : ''}
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          ${hasBudgets ? `<strong style="color:#fff;">${formatCurrency(remaining, currency)}</strong> unallocated` : ''}
        </div>
      </div>

      <div class="progress-bar-track" style="height:8px;">
        <div class="progress-bar-fill" style="width:${Math.min(100, overallRatio)}%; background:linear-gradient(90deg, #06b6d4, #8b5cf6);"></div>
      </div>
    </div>

    <!-- Budgets Grid -->
    <div class="budgets-grid" id="budgets-cards-grid">
      ${hasBudgets ? budgets.map(b => {
        const limitNum = Number(b.limit) || 1;
        const spentNum = Number(b.spent) || 0;
        const pct = Math.round((spentNum / limitNum) * 100);
        const rem = limitNum - spentNum;
        const isOver = pct > 100;
        const isWarn = pct >= 80 && pct <= 100;

        let badgeClass = 'badge-cyan';
        let barColor = '#06b6d4';
        if (isOver) {
          badgeClass = 'badge-danger';
          barColor = '#f43f5e';
        } else if (isWarn) {
          badgeClass = 'badge-warning';
          barColor = '#f59e0b';
        }

        return `
          <div class="budget-card ${isOver ? 'over-budget' : isWarn ? 'warning-budget' : ''}" data-id="${b.id}">
            <div class="budget-card-header">
              <div class="budget-card-title">
                <div class="budget-category-icon">${b.categoryIcon || '💳'}</div>
                <div class="budget-title-info">
                  <h3>${b.category}</h3>
                  <span>Monthly Allowance</span>
                </div>
              </div>
              <span class="badge ${badgeClass}">${isOver ? 'Over-budget' : isWarn ? 'Near Limit' : 'Normal'}</span>
            </div>

            <div class="budget-progress-section">
              <div class="budget-amounts">
                <span class="budget-spent">${formatCurrency(spentNum, currency)}</span>
                <span class="budget-limit">/ ${formatCurrency(limitNum, currency)}</span>
              </div>
              <div class="progress-bar-track" style="height:7px;">
                <div class="progress-bar-fill" style="width:${Math.min(100, pct)}%; background:${barColor};"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
                <span>${pct}% consumed</span>
                <span style="${isOver ? 'color:var(--danger);' : ''}">${isOver ? `${formatCurrency(Math.abs(rem), currency)} over` : `${formatCurrency(rem, currency)} remaining`}</span>
              </div>
            </div>

            <div class="budget-card-footer">
              <span>Updated automatically</span>
              <div style="display:flex; gap:6px;">
                <button class="btn-icon budget-edit-btn" data-id="${b.id}" title="Edit Budget" style="width:28px; height:28px;">
                  ${icons.edit(14)}
                </button>
                <button class="btn-icon budget-delete-btn" data-id="${b.id}" title="Delete Budget" style="width:28px; height:28px;">
                  ${icons.trash(14)}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('') : `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state" style="padding:48px 16px;">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No category budgets yet</div>
            <div class="empty-subtitle">
              Import a CSV dataset to auto-generate budgets from your actual spending categories, or create a custom budget.
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
              <button class="btn btn-primary" id="budget-empty-import-btn">
                ${icons.upload(16)} Import CSV Dataset
              </button>
              <button class="btn btn-secondary" id="budget-empty-add-btn">
                ${icons.plus(16)} Create Budget
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;

  // Attach Listeners
  containerEl.querySelector('#budget-add-new-btn').onclick = () => modal.openAddBudget();

  const emptyImportBtn = containerEl.querySelector('#budget-empty-import-btn');
  if (emptyImportBtn) emptyImportBtn.onclick = () => modal.openCsvUploadModal();

  const emptyAddBtn = containerEl.querySelector('#budget-empty-add-btn');
  if (emptyAddBtn) emptyAddBtn.onclick = () => modal.openAddBudget();

  containerEl.querySelector('#budget-ai-suggest-btn').onclick = () => {
    if (state.expenses.length > 0) {
      modal.openQuickAgentQuery('Analyze my transaction categories and formulate an optimal 50/30/20 monthly budget ceiling for each category.');
    } else {
      modal.openQuickAgentQuery('How should I structure a 50/30/20 budget once I import my financial CSV statement?');
    }
  };

  containerEl.querySelectorAll('.budget-edit-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const b = budgets.find(x => x.id === id);
      if (b) modal.openAddBudget(b);
    };
  });

  containerEl.querySelectorAll('.budget-delete-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const b = budgets.find(x => x.id === id);
      if (confirm(`Delete budget for ${b?.category}?`)) {
        await budgetService.deleteBudget(id);
        toast.success(`Budget for ${b?.category} removed`);
      }
    };
  });
}
