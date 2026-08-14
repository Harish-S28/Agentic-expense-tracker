/**
 * Transactions Page View
 * Full ledger management with live search, dynamic category filtering,
 * CSV Import / Export, and Agent transaction audits.
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { modal } from '../components/modal.js';
import { expenseService } from '../services/expenseService.js';
import { toast } from '../components/toast.js';

export function renderTransactionsPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const currency = state.user.currency;
  let allExpenses = [...state.expenses];

  // Dynamic unique categories extracted from active dataset
  const uniqueCategories = [...new Set(allExpenses.map(item => item.category))].filter(Boolean);

  let selectedCategory = 'all';
  let selectedType = 'all';
  let sortOrder = 'newest';
  let searchQuery = state.searchQuery || '';

  const renderList = () => {
    // Filter
    let filtered = allExpenses.filter(item => {
      const matchSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.merchant && item.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchType = selectedType === 'all' || item.type === selectedType;

      return matchSearch && matchCat && matchType;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.date) - new Date(a.date);
      if (sortOrder === 'oldest') return new Date(a.date) - new Date(b.date);
      if (sortOrder === 'amount-high') return b.amount - a.amount;
      if (sortOrder === 'amount-low') return a.amount - b.amount;
      return 0;
    });

    const tableBody = containerEl.querySelector('#tx-table-body');
    const countBadge = containerEl.querySelector('#tx-count-badge');
    if (countBadge) countBadge.innerText = `${filtered.length} records`;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state" style="padding:48px 16px;">
              <div class="empty-icon">💳</div>
              <div class="empty-title">${allExpenses.length === 0 ? 'No transactions yet' : 'No matching records'}</div>
              <div class="empty-subtitle">${allExpenses.length === 0 ? 'Import your CSV statement or add a transaction to start building your ledger.' : 'Try adjusting your search query or category filter.'}</div>
              <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
                <button class="btn btn-primary" id="tx-empty-import-btn">
                  ${icons.upload(16)} Import CSV Dataset
                </button>
                <button class="btn btn-secondary" id="tx-empty-add-btn">
                  ${icons.plus(16)} Add Transaction
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;

      const emptyImport = tableBody.querySelector('#tx-empty-import-btn');
      if (emptyImport) emptyImport.onclick = () => modal.openCsvUploadModal();

      const emptyAdd = tableBody.querySelector('#tx-empty-add-btn');
      if (emptyAdd) emptyAdd.onclick = () => modal.openAddExpense();
      return;
    }

    tableBody.innerHTML = filtered.map(tx => {
      const isExpense = tx.type === 'expense';
      return `
        <tr data-id="${tx.id}">
          <td>
            <div class="tx-table-item">
              <div class="tx-icon-box" style="width:34px; height:34px; font-size:1rem;">
                ${tx.categoryIcon || '💳'}
              </div>
              <div>
                <div style="font-weight:600; color:#fff;">${tx.title}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${tx.merchant || tx.title}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge badge-purple">${tx.category}</span>
          </td>
          <td>
            <span style="font-size:0.85rem; color:var(--text-secondary);">${formatDate(tx.date)}</span>
          </td>
          <td>
            <span style="font-size:0.85rem; color:var(--text-secondary);">${tx.paymentMethod || 'UPI'}</span>
          </td>
          <td style="text-align:right;">
            <span style="font-weight:700; ${isExpense ? 'color:#fff;' : 'color:var(--success);'}">
              ${isExpense ? '-' : '+'}${formatCurrency(tx.amount, currency)}
            </span>
          </td>
          <td>
            <div class="tx-table-actions">
              <button class="tx-action-btn agent" title="Ask Agent about this transaction" data-action="agent" data-id="${tx.id}">
                ${icons.agent(14)}
              </button>
              <button class="tx-action-btn" title="Edit" data-action="edit" data-id="${tx.id}">
                ${icons.edit(14)}
              </button>
              <button class="tx-action-btn delete" title="Delete" data-action="delete" data-id="${tx.id}">
                ${icons.trash(14)}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach actions
    tableBody.querySelectorAll('.tx-action-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const tx = allExpenses.find(x => x.id === id);

        if (action === 'edit' && tx) {
          modal.openAddExpense(tx);
        } else if (action === 'delete') {
          if (confirm(`Delete transaction "${tx?.title}"?`)) {
            await expenseService.deleteExpense(id);
            toast.success('Transaction removed successfully');
          }
        } else if (action === 'agent' && tx) {
          modal.openQuickAgentQuery(`Analyze this transaction: "${tx.title}" (${formatCurrency(tx.amount, currency)}) in ${tx.category}. Is this an outlier relative to my overall spending?`);
        }
      };
    });
  };

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-title-group">
        <h1>Transactions Ledger</h1>
        <p>Manage, categorize, and analyze your full financial activity</p>
      </div>
      <div class="header-action-buttons">
        <button class="btn btn-secondary" id="tx-import-btn">
          ${icons.upload(16)} Import CSV
        </button>
        <button class="btn btn-secondary" id="tx-export-btn" ${allExpenses.length === 0 ? 'disabled' : ''}>
          ${icons.download(16)} Export CSV
        </button>
        <button class="btn btn-primary" id="tx-add-btn">
          ${icons.plus(16)} Add Transaction
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="transactions-filter-bar">
      <div class="filter-left-controls">
        <div class="filter-search-input">
          <span class="icon">${icons.search(16)}</span>
          <input type="text" id="tx-search-input" placeholder="Search title, category, merchant..." value="${searchQuery}" />
        </div>

        <select class="filter-select" id="tx-category-select">
          <option value="all">All Categories (${uniqueCategories.length})</option>
          ${uniqueCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>

        <select class="filter-select" id="tx-type-select">
          <option value="all">All Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
        </select>

        <select class="filter-select" id="tx-sort-select">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount-high">Highest Amount</option>
          <option value="amount-low">Lowest Amount</option>
        </select>
      </div>

      <div>
        <span class="badge badge-purple" id="tx-count-badge">0 records</span>
      </div>
    </div>

    <!-- Transactions Table Card -->
    <div class="transactions-table-card">
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Merchant / Item</th>
            <th>Category</th>
            <th>Date</th>
            <th>Payment</th>
            <th style="text-align:right;">Amount</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody id="tx-table-body">
          <!-- Rows injected via renderList -->
        </tbody>
      </table>
    </div>
  `;

  // Attach Filter Listeners
  const searchInput = containerEl.querySelector('#tx-search-input');
  searchInput.oninput = (e) => {
    searchQuery = e.target.value;
    renderList();
  };

  const catSelect = containerEl.querySelector('#tx-category-select');
  catSelect.onchange = (e) => {
    selectedCategory = e.target.value;
    renderList();
  };

  const typeSelect = containerEl.querySelector('#tx-type-select');
  typeSelect.onchange = (e) => {
    selectedType = e.target.value;
    renderList();
  };

  const sortSelect = containerEl.querySelector('#tx-sort-select');
  sortSelect.onchange = (e) => {
    sortOrder = e.target.value;
    renderList();
  };

  containerEl.querySelector('#tx-import-btn').onclick = () => modal.openCsvUploadModal();
  containerEl.querySelector('#tx-add-btn').onclick = () => modal.openAddExpense();

  const exportBtn = containerEl.querySelector('#tx-export-btn');
  if (exportBtn && allExpenses.length > 0) {
    exportBtn.onclick = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
        + ["date,title,category,amount,type,payment_method,description"]
        .concat(allExpenses.map(e => `"${e.date}","${e.title.replace(/"/g, '""')}","${e.category}",${e.amount},"${e.type}","${e.paymentMethod || ''}","${(e.notes || '').replace(/"/g, '""')}"`))
        .join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SpendLog_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV statement exported successfully!');
    };
  }

  renderList();
}
