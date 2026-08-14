/**
 * Modal Manager Component
 * Manages modals for adding/editing transactions, budgets, goals, agent queries,
 * and CSV Dataset Import / Clear operations.
 */

import { icons } from '../utils/icons.js';
import { expenseService } from '../services/expenseService.js';
import { budgetService } from '../services/budgetService.js';
import { goalService } from '../services/goalService.js';
import { agentService } from '../services/agentService.js';
import { csvService } from '../services/csvService.js';
import { validateExpense, validateBudget, validateGoal } from '../utils/validation.js';
import { toast } from './toast.js';
import { appState } from '../state.js';
import { formatCurrency } from '../utils/formatCurrency.js';

class ModalManager {
  constructor() {
    this.backdrop = null;
    this.ensureBackdrop();
  }

  ensureBackdrop() {
    let el = document.getElementById('modal-backdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'modal-backdrop';
      el.className = 'modal-backdrop';
      document.body.appendChild(el);
    }
    this.backdrop = el;
  }

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
      this.backdrop.innerHTML = '';
    }
  }

  open({ title, contentHtml, footerHtml = '', onMount = () => {} }) {
    this.ensureBackdrop();
    this.backdrop.innerHTML = `
      <div class="modal-content animate-fade-in" id="active-modal-box">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="btn-icon" id="modal-close-btn" aria-label="Close modal">
            ${icons.x(16)}
          </button>
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    document.getElementById('modal-close-btn').onclick = () => this.close();
    this.backdrop.onclick = (e) => {
      if (e.target === this.backdrop) this.close();
    };

    this.backdrop.classList.add('active');
    onMount(this.backdrop);
  }

  // --- CSV Import Modal ---
  openCsvUploadModal() {
    const isAlreadyLoaded = appState.getState().csvLoaded;
    const title = isAlreadyLoaded ? 'Replace CSV Dataset' : 'Import CSV Dataset';

    const contentHtml = `
      <div class="csv-upload-modal-body">
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:16px; line-height:1.5;">
          Upload your financial transactions statement (.csv). Required columns: 
          <code style="color:var(--cyan); background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px;">date, title, category, amount, type</code>
        </p>

        <!-- Drag & Drop Zone -->
        <div class="csv-dropzone" id="modal-csv-dropzone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius: var(--radius-lg); padding: 32px 20px; text-align: center; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s ease;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">📄</div>
          <div style="font-weight: 600; color: #fff; margin-bottom: 4px;" id="dropzone-title">
            Drag & drop your CSV file here
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
            or browse from your device (Max 10MB)
          </div>
          
          <input type="file" id="modal-csv-file-input" accept=".csv,text/csv" style="display: none;" />
          <button type="button" class="btn btn-secondary btn-pill" id="modal-choose-csv-btn">
            ${icons.upload(16)} Choose CSV File
          </button>
        </div>

        <!-- Selected File Preview -->
        <div id="modal-selected-file-info" style="display:none; margin-top:16px; padding:12px; border-radius:var(--radius-md); background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.2); align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2rem;">📊</span>
            <div>
              <div id="modal-file-name" style="font-weight:600; color:#fff; font-size:0.85rem;">file.csv</div>
              <div id="modal-file-size" style="font-size:0.75rem; color:var(--text-secondary);">0 KB</div>
            </div>
          </div>
          <button type="button" class="btn-icon" id="modal-clear-file-btn" style="width:28px; height:28px;">
            ${icons.x(14)}
          </button>
        </div>

        <!-- Error box -->
        <div id="modal-csv-error-box" style="display:none; margin-top:14px; padding:12px; border-radius:var(--radius-md); background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); font-size:0.8rem; color:var(--danger); line-height:1.4;">
        </div>

        <!-- Download Sample Template Link -->
        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:14px;">
          <span style="font-size:0.8rem; color:var(--text-muted);">Need a test file format?</span>
          <button type="button" class="btn btn-ghost" id="modal-download-sample-btn" style="font-size:0.8rem; color:var(--cyan); padding:4px 8px;">
            ${icons.download(14)} Download Sample Template
          </button>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-csv-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-csv-import-submit-btn" disabled>
        ${icons.upload(16)} Import Dataset
      </button>
    `;

    this.open({
      title,
      contentHtml,
      footerHtml,
      onMount: (container) => {
        const dropzone = container.querySelector('#modal-csv-dropzone');
        const fileInput = container.querySelector('#modal-csv-file-input');
        const chooseBtn = container.querySelector('#modal-choose-csv-btn');
        const submitBtn = container.querySelector('#modal-csv-import-submit-btn');
        const cancelBtn = container.querySelector('#modal-csv-cancel-btn');
        const sampleBtn = container.querySelector('#modal-download-sample-btn');
        const fileInfo = container.querySelector('#modal-selected-file-info');
        const fileNameEl = container.querySelector('#modal-file-name');
        const fileSizeEl = container.querySelector('#modal-file-size');
        const clearFileBtn = container.querySelector('#modal-clear-file-btn');
        const errorBox = container.querySelector('#modal-csv-error-box');

        let selectedFile = null;

        const showError = (msg) => {
          errorBox.style.display = 'block';
          errorBox.innerText = msg;
        };

        const hideError = () => {
          errorBox.style.display = 'none';
          errorBox.innerText = '';
        };

        const handleFileSelect = (file) => {
          hideError();
          if (!file) return;
          if (!file.name.toLowerCase().endsWith('.csv')) {
            showError('Please select a valid .csv file format.');
            return;
          }

          selectedFile = file;
          fileNameEl.innerText = file.name;
          fileSizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB`;
          fileInfo.style.display = 'flex';
          submitBtn.disabled = false;
        };

        chooseBtn.onclick = () => fileInput.click();
        dropzone.onclick = (e) => {
          if (e.target !== chooseBtn && !chooseBtn.contains(e.target)) {
            fileInput.click();
          }
        };

        fileInput.onchange = (e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        };

        // Drag and drop handlers
        ['dragenter', 'dragover'].forEach(eventName => {
          dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'var(--cyan)';
            dropzone.style.background = 'rgba(6,182,212,0.06)';
          });
        });

        ['dragleave', 'drop'].forEach(eventName => {
          dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'rgba(255,255,255,0.15)';
            dropzone.style.background = 'rgba(255,255,255,0.02)';
          });
        });

        dropzone.addEventListener('drop', (e) => {
          const dt = e.dataTransfer;
          const files = dt.files;
          if (files && files[0]) {
            handleFileSelect(files[0]);
          }
        });

        clearFileBtn.onclick = () => {
          selectedFile = null;
          fileInput.value = '';
          fileInfo.style.display = 'none';
          submitBtn.disabled = true;
          hideError();
        };

        cancelBtn.onclick = () => this.close();

        sampleBtn.onclick = () => {
          csvService.downloadSampleTemplate();
          toast.success('Sample CSV template downloaded!');
        };

        submitBtn.onclick = async () => {
          if (!selectedFile) return;

          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span class="status-dot"></span> Parsing...`;

          const result = await csvService.importCsvFile(selectedFile);

          if (result.success) {
            toast.success(`Successfully imported ${result.count} transactions from ${result.fileName}!`);
            this.close();
          } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${icons.upload(16)} Import Dataset`;
            const errorMsg = result.errors && result.errors.length > 0
              ? result.errors.slice(0, 3).join('\n')
              : 'Failed to parse transactions from CSV.';
            showError(errorMsg);
          }
        };
      }
    });
  }

  // --- Clear Dataset Confirmation Modal ---
  openClearDatasetConfirm() {
    const contentHtml = `
      <div>
        <div style="font-size:2rem; margin-bottom:12px;">⚠️</div>
        <p style="font-size:0.95rem; color:#fff; font-weight:600; margin-bottom:8px;">
          Are you sure you want to remove the imported dataset?
        </p>
        <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">
          This will clear all transactions, reset dynamic category breakdowns, and return your dashboard to the empty state.
        </p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="clear-cancel-btn">Cancel</button>
      <button class="btn btn-danger" id="clear-confirm-btn">
        ${icons.trash(16)} Clear Dataset
      </button>
    `;

    this.open({
      title: 'Clear Financial Dataset',
      contentHtml,
      footerHtml,
      onMount: (container) => {
        container.querySelector('#clear-cancel-btn').onclick = () => this.close();
        container.querySelector('#clear-confirm-btn').onclick = () => {
          csvService.clearDataset();
          toast.info('Financial dataset cleared. System returned to initial empty state.');
          this.close();
        };
      }
    });
  }

  // --- Add Expense Modal ---
  openAddExpense(initialData = null) {
    const isEdit = Boolean(initialData);
    const title = isEdit ? 'Edit Transaction' : 'Add New Transaction';
    
    // Dynamic categories list from existing transactions + standard fallback
    const state = appState.getState();
    const existingCats = [...new Set(state.expenses.map(t => t.category))].filter(Boolean);
    const standardCats = ['Food', 'Transport', 'Shopping', 'Groceries', 'Entertainment', 'Utilities', 'Healthcare', 'Education', 'Income', 'Other'];
    const categories = [...new Set([...existingCats, ...standardCats])];
    const paymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Auto Debit'];

    const contentHtml = `
      <form id="expense-modal-form">
        <div class="form-group">
          <label class="form-label">Transaction Type</label>
          <div style="display:flex; gap:10px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:#fff; cursor:pointer;">
              <input type="radio" name="txType" value="expense" ${(!initialData || initialData.type === 'expense') ? 'checked' : ''} /> Expense
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:#fff; cursor:pointer;">
              <input type="radio" name="txType" value="income" ${(initialData && initialData.type === 'income') ? 'checked' : ''} /> Income
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="expense-title">Title / Merchant *</label>
          <input type="text" id="expense-title" class="form-control" placeholder="e.g. Swiggy, Uber, Amazon" value="${initialData?.title || ''}" required />
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label" for="expense-amount">Amount (₹) *</label>
            <input type="number" id="expense-amount" class="form-control" placeholder="0.00" value="${initialData?.amount || ''}" required min="1" step="any" />
          </div>
          <div class="form-group">
            <label class="form-label" for="expense-category">Category *</label>
            <select id="expense-category" class="form-control">
              ${categories.map(c => `<option value="${c}" ${(initialData?.category === c) ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label" for="expense-date">Date *</label>
            <input type="date" id="expense-date" class="form-control" value="${initialData?.date || new Date().toISOString().split('T')[0]}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="expense-payment">Payment Method</label>
            <select id="expense-payment" class="form-control">
              ${paymentMethods.map(p => `<option value="${p}" ${(initialData?.paymentMethod === p) ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="expense-notes">Notes (Optional)</label>
          <textarea id="expense-notes" class="form-control" placeholder="Add additional context or tags">${initialData?.notes || ''}</textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="expense-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="expense-save-btn">
        ${isEdit ? 'Update Transaction' : 'Add Transaction'}
      </button>
    `;

    this.open({
      title,
      contentHtml,
      footerHtml,
      onMount: (container) => {
        const form = container.querySelector('#expense-modal-form');
        const cancelBtn = container.querySelector('#expense-cancel-btn');
        const saveBtn = container.querySelector('#expense-save-btn');

        cancelBtn.onclick = () => this.close();

        saveBtn.onclick = async () => {
          const type = form.querySelector('input[name="txType"]:checked')?.value || 'expense';
          const titleVal = form.querySelector('#expense-title').value;
          const amountVal = form.querySelector('#expense-amount').value;
          const categoryVal = form.querySelector('#expense-category').value;
          const dateVal = form.querySelector('#expense-date').value;
          const paymentVal = form.querySelector('#expense-payment').value;
          const notesVal = form.querySelector('#expense-notes').value;

          const data = {
            title: titleVal,
            amount: amountVal,
            category: categoryVal,
            date: dateVal,
            paymentMethod: paymentVal,
            notes: notesVal,
            type
          };

          const err = validateExpense(data);
          if (err) {
            toast.warning(err, 'Validation Error');
            return;
          }

          if (isEdit) {
            await expenseService.updateExpense(initialData.id, data);
            toast.success(`Transaction "${titleVal}" updated!`);
          } else {
            await expenseService.createExpense(data);
            toast.success(`Transaction of ₹${amountVal} added!`);
          }
          this.close();
        };
      }
    });
  }

  // --- Add/Edit Budget Modal ---
  openAddBudget(initialData = null) {
    const isEdit = Boolean(initialData);
    const state = appState.getState();
    const existingCats = [...new Set(state.expenses.map(t => t.category))].filter(Boolean);
    const standardCats = ['Shopping', 'Food', 'Transport', 'Entertainment', 'Utilities', 'Groceries', 'Healthcare', 'Education', 'Other'];
    const categories = [...new Set([...existingCats, ...standardCats])];

    const contentHtml = `
      <form id="budget-modal-form">
        <div class="form-group">
          <label class="form-label" for="budget-category">Category *</label>
          <select id="budget-category" class="form-control">
            ${categories.map(c => `<option value="${c}" ${initialData?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="budget-limit">Monthly Limit (₹) *</label>
          <input type="number" id="budget-limit" class="form-control" placeholder="e.g. 6000" value="${initialData?.limit || ''}" min="100" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="budget-spent">Current Spent So Far (₹)</label>
          <input type="number" id="budget-spent" class="form-control" placeholder="0" value="${initialData?.spent || 0}" min="0" />
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="budget-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="budget-save-btn">${isEdit ? 'Update Budget' : 'Save Budget'}</button>
    `;

    this.open({
      title: isEdit ? 'Edit Category Budget' : 'Create Category Budget',
      contentHtml,
      footerHtml,
      onMount: (container) => {
        container.querySelector('#budget-cancel-btn').onclick = () => this.close();
        container.querySelector('#budget-save-btn').onclick = async () => {
          const category = container.querySelector('#budget-category').value;
          const limit = container.querySelector('#budget-limit').value;
          const spent = container.querySelector('#budget-spent').value;

          const data = { category, limit, spent };
          const err = validateBudget(data);
          if (err) {
            toast.warning(err);
            return;
          }

          if (isEdit) {
            await budgetService.updateBudget(initialData.id, data);
            toast.success(`Budget for ${category} updated!`);
          } else {
            await budgetService.createBudget(data);
            toast.success(`New budget created for ${category}!`);
          }
          this.close();
        };
      }
    });
  }

  // --- Add/Edit Goal Modal ---
  openAddGoal(initialData = null) {
    const isEdit = Boolean(initialData);
    const contentHtml = `
      <form id="goal-modal-form">
        <div class="form-group">
          <label class="form-label" for="goal-title">Goal Name *</label>
          <input type="text" id="goal-title" class="form-control" placeholder="e.g. Emergency Fund, New Laptop" value="${initialData?.title || ''}" required />
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label" for="goal-target">Target Amount (₹) *</label>
            <input type="number" id="goal-target" class="form-control" placeholder="100000" value="${initialData?.targetAmount || ''}" min="500" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="goal-current">Current Saved (₹)</label>
            <input type="number" id="goal-current" class="form-control" placeholder="0" value="${initialData?.currentAmount || 0}" min="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="goal-date">Target Date</label>
          <input type="date" id="goal-date" class="form-control" value="${initialData?.targetDate || '2026-12-31'}" />
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="goal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="goal-save-btn">${isEdit ? 'Update Goal' : 'Create Goal'}</button>
    `;

    this.open({
      title: isEdit ? 'Edit Financial Goal' : 'Create New Financial Goal',
      contentHtml,
      footerHtml,
      onMount: (container) => {
        container.querySelector('#goal-cancel-btn').onclick = () => this.close();
        container.querySelector('#goal-save-btn').onclick = async () => {
          const title = container.querySelector('#goal-title').value;
          const targetAmount = container.querySelector('#goal-target').value;
          const currentAmount = container.querySelector('#goal-current').value;
          const targetDate = container.querySelector('#goal-date').value;

          const data = { title, targetAmount, currentAmount, targetDate };
          const err = validateGoal(data);
          if (err) {
            toast.warning(err);
            return;
          }

          if (isEdit) {
            await goalService.updateGoal(initialData.id, data);
            toast.success(`Goal "${title}" updated!`);
          } else {
            await goalService.createGoal(data);
            toast.success(`Goal "${title}" created!`);
          }
          this.close();
        };
      }
    });
  }

  // --- Deposit towards Goal Modal ---
  openDepositGoal(goal) {
    const currency = appState.getState().user.currency;
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

    const contentHtml = `
      <div>
        <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
          Add funds to <strong style="color:#fff;">${goal.title}</strong>. Remaining to reach goal: <span style="color:var(--cyan); font-weight:600;">${formatCurrency(remaining, currency)}</span>.
        </p>
        <div class="form-group">
          <label class="form-label" for="deposit-amount">Deposit Amount (₹) *</label>
          <input type="number" id="deposit-amount" class="form-control" placeholder="5000" min="100" max="${remaining}" autofocus />
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="deposit-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="deposit-confirm-btn">Deposit Funds</button>
    `;

    this.open({
      title: `Deposit to ${goal.title}`,
      contentHtml,
      footerHtml,
      onMount: (container) => {
        container.querySelector('#deposit-cancel-btn').onclick = () => this.close();
        container.querySelector('#deposit-confirm-btn').onclick = async () => {
          const amt = Number(container.querySelector('#deposit-amount').value);
          if (!amt || amt <= 0) {
            toast.warning('Please enter a valid deposit amount');
            return;
          }
          await goalService.depositToGoal(goal.id, amt);
          toast.success(`Deposited ${formatCurrency(amt, currency)} to ${goal.title}!`);
          this.close();
        };
      }
    });
  }

  // --- Quick Ask Agent Modal ---
  openQuickAgentQuery(defaultPrompt = '') {
    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="brand-icon-box" style="width:36px; height:36px;">
            ${icons.agent(20, 'text-cyan')}
          </div>
          <div>
            <div style="font-weight:600; color:#fff; font-size:0.95rem;">SpendLog Financial Intelligence</div>
            <div style="font-size:0.75rem; color:var(--success);">● Agent Online & Context-Aware</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="quick-agent-input">Your Question</label>
          <input type="text" id="quick-agent-input" class="form-control" placeholder="e.g. Explain my food spending this month..." value="${defaultPrompt}" autofocus />
        </div>
        <div id="quick-agent-response" style="min-height:80px; max-height:220px; overflow-y:auto; padding:12px; background:rgba(0,0,0,0.25); border:1px solid var(--border); border-radius:var(--radius-md); font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
          Ask anything about your cashflow, anomalies, savings potential, or budget thresholds.
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="quick-agent-close">Close</button>
      <button class="btn btn-ai" id="quick-agent-submit">Ask Agent</button>
    `;

    this.open({
      title: 'AI Financial Query',
      contentHtml,
      footerHtml,
      onMount: (container) => {
        const input = container.querySelector('#quick-agent-input');
        const submitBtn = container.querySelector('#quick-agent-submit');
        const respBox = container.querySelector('#quick-agent-response');
        container.querySelector('#quick-agent-close').onclick = () => this.close();

        const handleAsk = async () => {
          const q = input.value.trim();
          if (!q) return;
          respBox.innerHTML = `<span style="color:var(--cyan);">Thinking & computing financial telemetry...</span>`;
          submitBtn.disabled = true;

          const res = await agentService.askAgent(q);
          respBox.innerHTML = `<div style="color:#fff; font-weight:600; margin-bottom:6px;">Agent Analysis:</div>${res.text.replace(/\n/g, '<br>')}`;
          submitBtn.disabled = false;
        };

        submitBtn.onclick = handleAsk;
        input.onkeydown = (e) => {
          if (e.key === 'Enter') handleAsk();
        };

        if (defaultPrompt) {
          handleAsk();
        }
      }
    });
  }
}

export const modal = new ModalManager();
