/**
 * Goals Page View
 * Savings & Wealth Targets Tracker
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { modal } from '../components/modal.js';
import { goalService } from '../services/goalService.js';
import { toast } from '../components/toast.js';

export function renderGoalsPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const currency = state.user.currency;
  const goals = state.goals || [];
  const hasGoals = goals.length > 0;

  const totalSaved = goals.reduce((acc, g) => acc + Number(g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((acc, g) => acc + Number(g.targetAmount || 0), 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-title-group">
        <h1>Savings & Wealth Goals</h1>
        <p>Track progress, forecast milestones, and allocate capital to long-term objectives</p>
      </div>
      <div class="header-action-buttons">
        <button class="btn btn-primary" id="goal-create-btn">
          ${icons.plus(16)} Create Goal
        </button>
      </div>
    </div>

    <!-- Overview Card -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title">Portfolio Goal Progress</span>
        <span class="badge badge-cyan">${hasGoals ? `${overallPct}% Complete` : 'No Active Goals'}</span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">
        <div>
          <span style="font-size:1.5rem; font-weight:700; color:#fff;">
            ${hasGoals ? formatCurrency(totalSaved, currency) : '—'}
          </span>
          <span style="font-size:0.85rem; color:var(--text-muted);">
            ${hasGoals ? ` total saved of ${formatCurrency(totalTarget, currency)}` : ''}
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          ${hasGoals ? `<strong style="color:#fff;">${formatCurrency(Math.max(0, totalTarget - totalSaved), currency)}</strong> remaining` : ''}
        </div>
      </div>

      <div class="progress-bar-track" style="height:8px;">
        <div class="progress-bar-fill" style="width:${Math.min(100, overallPct)}%; background:linear-gradient(90deg, #0ef, #8b5cf6);"></div>
      </div>
    </div>

    <!-- Goals Grid -->
    <div class="goals-grid" id="goals-cards-grid">
      ${hasGoals ? goals.map(g => {
        const target = Number(g.targetAmount) || 1;
        const current = Number(g.currentAmount) || 0;
        const pct = Math.min(100, Math.round((current / target) * 100));
        const rem = Math.max(0, target - current);

        return `
          <div class="goal-card" data-id="${g.id}">
            <div class="goal-top-section">
              <div class="goal-details">
                <h3>${g.title}</h3>
                <p>Target: ${formatDate(g.targetDate)} • ${g.category || 'Savings'}</p>
              </div>

              <div class="circular-progress-wrap" style="width:68px; height:68px;">
                <svg viewBox="0 0 36 36">
                  <path class="circular-progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="circular-progress-bar" stroke="${g.color || '#0ef'}" stroke-dasharray="${pct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span class="circular-progress-label" style="font-size:0.85rem;">${pct}%</span>
              </div>
            </div>

            <div class="goal-numbers">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Saved</span>
                <div class="goal-current-amount">${formatCurrency(current, currency)}</div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Target</span>
                <div class="goal-target-amount">${formatCurrency(target, currency)}</div>
              </div>
            </div>

            <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
              <span>${formatCurrency(rem, currency)} to go</span>
              <span style="color:var(--cyan);">${pct >= 100 ? '🎉 Goal Achieved!' : 'On Track'}</span>
            </div>

            <div class="goal-card-actions">
              <button class="btn btn-secondary goal-deposit-btn" data-id="${g.id}" style="flex:1;">
                + Add Funds
              </button>
              <button class="btn-icon goal-edit-btn" data-id="${g.id}" title="Edit Goal">
                ${icons.edit(14)}
              </button>
              <button class="btn-icon goal-delete-btn" data-id="${g.id}" title="Delete Goal">
                ${icons.trash(14)}
              </button>
            </div>
          </div>
        `;
      }).join('') : `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state" style="padding:48px 16px;">
            <div class="empty-icon">🎯</div>
            <div class="empty-title">No financial goals yet</div>
            <div class="empty-subtitle">
              Set up a target (e.g. Emergency Fund, Travel, Gadgets) to track your progress and milestones.
            </div>
            <div style="margin-top:16px;">
              <button class="btn btn-primary" id="goal-empty-add-btn">
                ${icons.plus(16)} Create First Goal
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;

  // Attach Listeners
  containerEl.querySelector('#goal-create-btn').onclick = () => modal.openAddGoal();

  const emptyAddBtn = containerEl.querySelector('#goal-empty-add-btn');
  if (emptyAddBtn) emptyAddBtn.onclick = () => modal.openAddGoal();

  containerEl.querySelectorAll('.goal-deposit-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const g = goals.find(x => x.id === id);
      if (g) modal.openDepositGoal(g);
    };
  });

  containerEl.querySelectorAll('.goal-edit-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const g = goals.find(x => x.id === id);
      if (g) modal.openAddGoal(g);
    };
  });

  containerEl.querySelectorAll('.goal-delete-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      const g = goals.find(x => x.id === id);
      if (confirm(`Delete goal "${g?.title}"?`)) {
        await goalService.deleteGoal(id);
        toast.success(`Goal "${g?.title}" deleted`);
      }
    };
  });
}
