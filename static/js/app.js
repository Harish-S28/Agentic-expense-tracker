// ── Navigation & Pages ─────────────────────────────────
const navBtns = document.querySelectorAll('.nav-btn');
const pages   = document.querySelectorAll('.page');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const pageId = btn.dataset.page;
    switchPage(pageId);
  });
});

function switchPage(pageId) {
  navBtns.forEach(b => {
    if (b.dataset.page === pageId) b.classList.add('active');
    else b.classList.remove('active');
  });
  pages.forEach(p => {
    if (p.id === 'page-' + pageId) p.classList.add('active');
    else p.classList.remove('active');
  });

  if (pageId === 'dashboard') loadDashboard();
  if (pageId === 'history')   loadHistory();
  if (pageId === 'add')       loadCategories();
  if (pageId === 'budget')    loadBudgetStatus();
  if (pageId === 'analysis')  initAnalysis();
}

// ── Default Categories ─────────────────────────────────
const DEFAULT_CATS = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Other'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16'];

// ── Helpers ────────────────────────────────────────────
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── TOAST NOTIFICATIONS ────────────────────────────────
function showToast(title, desc, duration = 6000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${desc}</div>
    </div>
    <button class="toast-close">✕</button>
  `;
  container.appendChild(toast);

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 200);
  };
  closeBtn.addEventListener('click', dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

// ── USER PROFILE ONBOARDING ────────────────────────────
let userProfile = null;

async function checkUserProfile() {
  try {
    userProfile = await api('/api/profile');
    if (!userProfile || !userProfile.name || !userProfile.profession) {
      showProfileModal();
    } else {
      updateProfileUI();
    }
  } catch (e) {
    console.error("Failed checking profile", e);
  }
}

function showProfileModal() {
  const modal = document.getElementById('profile-modal');
  modal.style.display = 'grid';

  const nameInput = document.getElementById('p-name');
  const incomeInput = document.getElementById('p-income');
  const profHidden = document.getElementById('p-profession');
  const profButtons = document.querySelectorAll('.prof-btn');

  if (userProfile) {
    nameInput.value = userProfile.name || '';
    incomeInput.value = userProfile.income || '';
    profHidden.value = userProfile.profession || '';
    profButtons.forEach(btn => {
      if (btn.dataset.val === userProfile.profession) btn.classList.add('selected');
      else btn.classList.remove('selected');
    });
  }

  profButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      profButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      profHidden.value = btn.dataset.val;
    });
  });
}

document.getElementById('btn-save-profile').addEventListener('click', async () => {
  const name = document.getElementById('p-name').value.trim();
  const profession = document.getElementById('p-profession').value;
  const income = parseFloat(document.getElementById('p-income').value) || 0;

  if (!name) {
    alert("Please enter your name.");
    return;
  }
  if (!profession) {
    alert("Please select your profession.");
    return;
  }

  try {
    await api('/api/profile', {
      method: 'POST',
      body: JSON.stringify({ name, profession, income })
    });
    document.getElementById('profile-modal').style.display = 'none';
    userProfile = { name, profession, income };
    updateProfileUI();
    showToast("Profile Configured! 🤖", `Welcome ${name}! I will suggest custom tips based on your profession.`);
    loadDashboard();
  } catch (e) {
    alert("Failed saving profile.");
  }
});

document.getElementById('btn-edit-profile').addEventListener('click', () => {
  showProfileModal();
});

function updateProfileUI() {
  if (!userProfile) return;
  const initial = userProfile.name.charAt(0).toUpperCase();
  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-name').textContent = userProfile.name;
  document.getElementById('profile-prof').textContent = userProfile.profession;

  // Personalize Chat Subtitle
  document.getElementById('chat-subtitle').textContent = `${userProfile.profession} Financial Coach`;
}

// ── ADD EXPENSE PAGE ───────────────────────────────────
function loadCategories() {
  const pills = document.getElementById('cat-pills');
  pills.innerHTML = DEFAULT_CATS.map(c =>
    `<button class="cat-pill" data-cat="${c}">${c}</button>`
  ).join('');

  pills.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pills.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      document.getElementById('f-category').value = pill.dataset.cat;
    });
  });

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('f-date').value = today;
  document.getElementById('ai-suggestion-card').style.display = 'none';
}

document.getElementById('btn-add').addEventListener('click', async () => {
  const date     = document.getElementById('f-date').value;
  const amount   = document.getElementById('f-amount').value;
  const category = document.getElementById('f-category').value.trim();
  const note     = document.getElementById('f-note').value.trim();
  const msg      = document.getElementById('add-msg');
  const aiCard   = document.getElementById('ai-suggestion-card');
  const aiText   = document.getElementById('ai-suggestion-text');

  msg.className = 'msg';
  msg.style.display = 'none';
  aiCard.style.display = 'none';

  if (!date || !amount || !category) {
    msg.textContent = 'Please fill in date, amount and category.';
    msg.className = 'msg error';
    msg.style.display = 'block';
    return;
  }

  try {
    const expense = { date, amount: parseFloat(amount), category, note };
    await api('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense)
    });

    msg.textContent = '✓ Expense saved successfully!';
    msg.className = 'msg success';
    msg.style.display = 'block';

    // Fetch AI suggestion card asynchronously
    aiCard.style.display = 'block';
    aiText.textContent = "🧠 AI is analyzing this expense against your monthly budget & profession profile...";

    try {
      const suggestData = await api('/api/ai/suggest', {
        method: 'POST',
        body: JSON.stringify(expense)
      });
      aiText.textContent = suggestData.suggestion;
    } catch (e) {
      aiText.textContent = "AI suggestions temporarily unavailable. Try again later.";
    }

    // Reset inputs except date
    document.getElementById('f-amount').value = '';
    document.getElementById('f-note').value = '';
    document.getElementById('f-category').value = '';
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));

    // Trigger audio vibration or small feedback if supported
    if (navigator.vibrate) navigator.vibrate(50);
  } catch (err) {
    msg.textContent = 'Failed to save expense. Is the server running?';
    msg.className = 'msg error';
    msg.style.display = 'block';
  }
});

// ── HISTORY PAGE ───────────────────────────────────────
async function loadHistory() {
  const search   = document.getElementById('h-search').value;
  const category = document.getElementById('h-category').value;
  const month    = document.getElementById('h-month').value;

  const params = new URLSearchParams();
  if (search)   params.set('search', search);
  if (category) params.set('category', category);
  if (month)    params.set('month', month);

  try {
    const expenses = await api('/api/expenses?' + params);
    const body     = document.getElementById('history-body');
    const table    = document.getElementById('history-table');
    const empty    = document.getElementById('history-empty');

    body.innerHTML = '';
    if (expenses.length === 0) {
      empty.style.display = 'block';
      table.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    table.style.display = 'table';

    expenses.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date}</td>
        <td><span class="cat-badge">${e.category}</span></td>
        <td style="color:var(--text-muted);font-size:13px">${e.note || '—'}</td>
        <td class="amount-cell">${fmt(e.amount)}</td>
        <td><button class="btn-del" data-id="${e.id}" title="Delete">✕</button></td>
      `;
      body.appendChild(tr);
    });

    body.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this expense? This will recalculate carry-overs.')) return;
        await api('/api/expenses/' + btn.dataset.id, { method: 'DELETE' });
        loadHistory();
        showToast("Deleted", "Expense deleted successfully.");
      });
    });

    // Populate category filter
    const cats = await api('/api/categories');
    const sel  = document.getElementById('h-category');
    const cur  = sel.value;
    sel.innerHTML = '<option value="">All categories</option>';
    cats.forEach(c => {
      sel.innerHTML += `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`;
    });
  } catch (e) {
    console.error("Failed to load history", e);
  }
}

['h-category', 'h-month'].forEach(id => {
  document.getElementById(id).addEventListener('change', loadHistory);
});
document.getElementById('h-search').addEventListener('input', loadHistory);

document.getElementById('h-clear').addEventListener('click', () => {
  document.getElementById('h-search').value = '';
  document.getElementById('h-category').value = '';
  document.getElementById('h-month').value = '';
  loadHistory();
});

// ── DASHBOARD PAGE ─────────────────────────────────────
let catChart, trendChart;

async function loadDashboard() {
  const monthInput = document.getElementById('dash-month');
  const month = monthInput.value;
  const params = month ? '?month=' + month : '';

  try {
    const data = await api('/api/analytics' + params);

    // Update Stats
    document.getElementById('stat-total').textContent = fmtInt(data.total);
    document.getElementById('stat-count').textContent = data.count;
    document.getElementById('stat-avg').textContent   = fmtInt(data.count ? data.total / data.count : 0);

    // Setup Category chart
    const catCtx = document.getElementById('chart-cat').getContext('2d');
    if (catChart) catChart.destroy();

    if (data.by_category.length > 0) {
      catChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels:   data.by_category.map(c => c.category),
          datasets: [{
            data: data.by_category.map(c => c.total),
            backgroundColor: COLORS,
            borderWidth: 2,
            borderColor: '#0f131f'
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          cutout: '70%',
          responsive: true,
          maintainAspectRatio: false
        }
      });

      // Legend
      const legend = document.getElementById('cat-legend');
      legend.innerHTML = data.by_category.map((c, i) =>
        `<div class="legend-item">
          <div class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></div>
          ${c.category} · ${fmtInt(c.total)}
        </div>`
      ).join('');
    } else {
      document.getElementById('cat-legend').innerHTML = '<div class="empty-state">No expense details this month</div>';
    }

    // Setup Trend chart
    const trendCtx = document.getElementById('chart-trend').getContext('2d');
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels:   data.trend.map(t => t.month),
        datasets: [{
          label: 'Spent',
          data:  data.trend.map(t => t.total),
          backgroundColor: 'rgba(99, 102, 241, 0.4)',
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { color: '#21283e' } },
          y: { ticks: { color: '#9ca3af', callback: v => '₹' + v }, grid: { color: '#21283e' } }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // Top days table
    const tbody = document.querySelector('#top-days-table tbody');
    if (data.by_date.length > 0) {
      const max = data.by_date[0]?.total || 1;
      tbody.innerHTML = data.by_date.map(d => `
        <tr>
          <td>${d.date}</td>
          <td class="amount-cell">${fmtInt(d.total)}</td>
          <td>
            <div class="bar-wrap">
              <div class="bar-fill" style="width:${(d.total / max * 100).toFixed(1)}%"></div>
            </div>
          </td>
        </tr>`).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No daily data available. Log some expenses!</td></tr>';
    }

    // Load top mini budget tracker banner on dashboard
    loadMiniBudgetBanner();

  } catch (e) {
    console.error("Dashboard load failed", e);
  }
}

async function loadMiniBudgetBanner() {
  const banner = document.getElementById('dash-budget-banner');
  try {
    const status = await api('/api/budget/status');
    if (!status || !status.has_budget) {
      banner.style.display = 'none';
      return;
    }
    banner.style.display = 'flex';
    document.getElementById('banner-limit').textContent = fmtInt(status.effective_limit);
    document.getElementById('banner-spent').textContent = fmtInt(status.today_spent);

    const remaining = status.remaining;
    const remEl = document.getElementById('banner-remaining');
    remEl.textContent = fmtInt(remaining);
    if (remaining >= 0) {
      remEl.className = 'banner-remaining green';
    } else {
      remEl.className = 'banner-remaining red';
    }

    const fillBar = document.getElementById('banner-bar');
    const pct = status.percentage_used;
    fillBar.style.width = pct + '%';
    fillBar.className = 'banner-bar-fill';
    if (status.over_budget) {
      fillBar.classList.add('danger');
    } else if (pct >= 80) {
      fillBar.classList.add('warning');
    }

  } catch (e) {
    banner.style.display = 'none';
  }
}

document.getElementById('dash-month').addEventListener('change', loadDashboard);
document.getElementById('dash-clear').addEventListener('click', () => {
  document.getElementById('dash-month').value = '';
  loadDashboard();
});

// ── BUDGET TRACKER PAGE ────────────────────────────────
document.getElementById('btn-show-budget-form').addEventListener('click', toggleBudgetForm);
document.getElementById('btn-empty-set-budget').addEventListener('click', () => {
  document.getElementById('budget-setup-card').style.display = 'block';
  document.getElementById('budget-amount-input').focus();
});

function toggleBudgetForm() {
  const card = document.getElementById('budget-setup-card');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
}

const bAmountInput = document.getElementById('budget-amount-input');
const bPreview = document.getElementById('budget-preview');
const pDaily = document.getElementById('preview-daily');
const pDays = document.getElementById('preview-days');

bAmountInput.addEventListener('input', () => {
  const val = parseFloat(bAmountInput.value) || 0;
  if (val <= 0) {
    bPreview.style.display = 'none';
    return;
  }
  const dateToday = new Date();
  const daysInMonth = new Date(dateToday.getFullYear(), dateToday.getMonth() + 1, 0).getDate();
  pDays.textContent = daysInMonth;
  pDaily.textContent = fmt(val / daysInMonth);
  bPreview.style.display = 'flex';
});

document.getElementById('btn-save-budget').addEventListener('click', async () => {
  const budget = parseFloat(bAmountInput.value);
  if (!budget || budget <= 0) {
    alert("Please enter a valid monthly budget limit.");
    return;
  }
  try {
    await api('/api/budget', {
      method: 'POST',
      body: JSON.stringify({ monthly_budget: budget })
    });
    showToast("Budget Configured 🎯", `Monthly budget set to ₹${budget}. We'll monitor your progress daily.`);
    document.getElementById('budget-setup-card').style.display = 'none';
    bAmountInput.value = '';
    bPreview.style.display = 'none';
    loadBudgetStatus();
  } catch (e) {
    alert("Failed to save budget settings.");
  }
});

async function loadBudgetStatus() {
  const setupCard = document.getElementById('budget-setup-card');
  const emptyState = document.getElementById('budget-empty');
  const display = document.getElementById('budget-display');

  try {
    const status = await api('/api/budget/status');
    if (!status || !status.has_budget) {
      emptyState.style.display = 'block';
      display.style.display = 'none';
      return;
    }
    emptyState.style.display = 'none';
    display.style.display = 'block';

    // Update Ring Dashboard
    document.getElementById('ring-spent').textContent = fmtInt(status.today_spent);
    document.getElementById('bud-effective').textContent = fmtInt(status.effective_limit);

    const remVal = status.remaining;
    const remEl = document.getElementById('bud-remaining');
    remEl.textContent = fmtInt(remVal);
    if (remVal >= 0) {
      remEl.className = 'blimit-val green';
    } else {
      remEl.className = 'blimit-val red';
    }

    // Circular progress stroke-dashoffset
    const circle = document.getElementById('budget-ring-fill');
    const radius = 90;
    const circ = 2 * Math.PI * radius; // 565.48
    let pct = status.percentage_used;
    if (pct > 100) pct = 100;
    const offset = circ - (pct / 100 * circ);
    circle.style.strokeDashoffset = offset;

    // Apply colors based on threshold
    if (status.over_budget) {
      circle.style.stroke = 'var(--red)';
    } else if (status.percentage_used >= 80) {
      circle.style.stroke = 'var(--yellow)';
    } else {
      circle.style.stroke = 'var(--accent)';
    }

    // Stats Grid
    document.getElementById('bud-monthly').textContent = fmtInt(status.monthly_budget);
    document.getElementById('bud-base').textContent = fmtInt(status.base_daily_limit);
    document.getElementById('bud-month-spent').textContent = fmtInt(status.monthly_total);
    document.getElementById('bud-day-of-month').textContent = `${status.day_of_month} / ${status.days_in_month}`;

    // Carry over badge
    const badge = document.getElementById('carry-badge');
    const cVal = document.getElementById('carry-amount');
    const cDesc = document.getElementById('carry-desc');
    const cIcon = document.getElementById('carry-icon-wrap');
    const cLbl = document.getElementById('carry-label');

    cVal.textContent = fmtInt(status.carry_over_amount);
    badge.className = 'carry-badge ' + status.carry_over_status;

    if (status.carry_over_status === 'bonus') {
      cLbl.textContent = 'Savings Carry-over';
      cDesc.textContent = 'bonus from saving previous days (budget boosted)';
      cIcon.textContent = '🔋';
    } else {
      cLbl.textContent = 'Debt Carry-over';
      cDesc.textContent = 'penalty due to previous overspending (budget reduced)';
      cIcon.textContent = '🚨';
    }

    // AI Tip
    document.getElementById('budget-tip-body').textContent = status.ai_tip;

    // Direct alerts
    const alertBox = document.getElementById('budget-alert');
    if (status.over_budget) {
      alertBox.style.display = 'flex';
      document.getElementById('alert-msg').textContent = `You've spent ₹${status.today_spent} which exceeds your daily limit of ₹${status.effective_limit}.`;
    } else {
      alertBox.style.display = 'none';
    }

  } catch (e) {
    console.error("Failed budget state load", e);
  }
}

// ── AI ANALYSIS PAGE ───────────────────────────────────
let activeAnalysisTab = 'monthly';

function initAnalysis() {
  // Set default dates
  const today = new Date();
  const yyyymm = today.toISOString().slice(0, 7);
  document.getElementById('analysis-month').value = yyyymm;
  document.getElementById('analysis-year').value = today.getFullYear();

  document.getElementById('analysis-output').style.display = 'none';
  document.getElementById('analysis-empty').style.display = 'none';
  document.getElementById('analysis-loading').style.display = 'none';

  // Attach tab events
  const tabMonthly = document.getElementById('tab-monthly');
  const tabYearly = document.getElementById('tab-yearly');
  const mCtrl = document.getElementById('analysis-monthly-ctrl');
  const yCtrl = document.getElementById('analysis-yearly-ctrl');

  tabMonthly.onclick = () => {
    tabMonthly.classList.add('active');
    tabYearly.classList.remove('active');
    mCtrl.style.display = 'block';
    yCtrl.style.display = 'none';
    activeAnalysisTab = 'monthly';
  };

  tabYearly.onclick = () => {
    tabYearly.classList.add('active');
    tabMonthly.classList.remove('active');
    mCtrl.style.display = 'none';
    yCtrl.style.display = 'block';
    activeAnalysisTab = 'yearly';
  };
}

document.getElementById('btn-gen-monthly').onclick = () => generateReport('month');
document.getElementById('btn-gen-yearly').onclick = () => generateReport('year');
document.getElementById('btn-regen').onclick = () => {
  generateReport(activeAnalysisTab === 'monthly' ? 'month' : 'year');
};

async function generateReport(period) {
  const loading = document.getElementById('analysis-loading');
  const output = document.getElementById('analysis-output');
  const empty = document.getElementById('analysis-empty');

  loading.style.display = 'block';
  output.style.display = 'none';
  empty.style.display = 'none';

  const params = new URLSearchParams();
  params.set('period', period);
  if (period === 'month') {
    params.set('month', document.getElementById('analysis-month').value);
  } else {
    params.set('year', document.getElementById('analysis-year').value);
  }

  try {
    const report = await api('/api/ai/analysis?' + params);
    loading.style.display = 'none';

    if (report.data.total === 0) {
      empty.style.display = 'block';
      return;
    }

    output.style.display = 'block';

    // Mini statistics
    const statsGrid = document.getElementById('analysis-stats-grid');
    if (period === 'month') {
      const budgetText = report.data.monthly_budget ? fmtInt(report.data.monthly_budget) : 'Not set';
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Month Total</div>
          <div class="stat-value">${fmtInt(report.data.total)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">vs Last Month</div>
          <div class="stat-value" style="color:${report.data.change_pct > 0 ? 'var(--red)' : 'var(--green)'}">
            ${report.data.change_pct > 0 ? '+' : ''}${report.data.change_pct}%
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Budget Limit</div>
          <div class="stat-value">${budgetText}</div>
        </div>
      `;
      document.getElementById('ai-report-title').textContent = `${report.data.month} AI Financial Report`;
    } else {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Annual Spend</div>
          <div class="stat-value">${fmtInt(report.data.total)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">${report.data.count}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monthly Average</div>
          <div class="stat-value">${fmtInt(report.data.total / 12)}</div>
        </div>
      `;
      document.getElementById('ai-report-title').textContent = `${report.data.year} AI Financial Review`;
    }

    // AI suggestion text output
    document.getElementById('ai-report-body').innerHTML = report.analysis
      .replace(/\n\n/g, '</p><p>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (!document.getElementById('ai-report-body').querySelector('p')) {
      document.getElementById('ai-report-body').innerHTML = `<p>${document.getElementById('ai-report-body').innerHTML}</p>`;
    }

    // Render Table Breakdown
    const tbody = document.getElementById('analysis-cat-body');
    tbody.innerHTML = '';
    const total = report.data.total || 1;
    report.data.by_category.forEach(c => {
      const share = ((c.total / total) * 100).toFixed(1);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="cat-badge">${c.category}</span></td>
        <td class="amount-cell">${fmtInt(c.total)}</td>
        <td>${c.count || 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;font-weight:600;min-width:32px">${share}%</span>
            <div class="bar-wrap" style="flex:1;height:6px">
              <div class="bar-fill" style="width:${share}%"></div>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (e) {
    loading.style.display = 'none';
    alert("Could not generate AI report. Please try again.");
  }
}

// ── AI CHATBOT SYSTEM ──────────────────────────────────
const chatFab = document.getElementById('chat-fab');
const chatDrawer = document.getElementById('chat-drawer');
const chatClose = document.getElementById('chat-close');
const chatBackdrop = document.getElementById('chat-backdrop');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const badgeEl = document.getElementById('chat-fab-badge');

let chatHistory = [];
const chatSessionKey = 'spendlog_chat_history_v1';

// Load cached chat history
function loadChatCache() {
  const cached = localStorage.getItem(chatSessionKey);
  if (cached) {
    chatHistory = JSON.parse(cached);
    chatHistory.forEach(msg => {
      appendChatBubble(msg.role, msg.content);
    });
  } else {
    // Initial bot welcome bubble
    const welcome = "Hello! I'm your AI financial assistant. Ask me questions like:\n• 'Spent today?'\n• 'Give me saving tips'\n• 'Am I within budget?'";
    appendChatBubble('bot', welcome);
    chatHistory.push({ role: 'bot', content: welcome });
    saveChatCache();
  }
}

function saveChatCache() {
  localStorage.setItem(chatSessionKey, JSON.stringify(chatHistory));
}

chatFab.onclick = () => {
  chatDrawer.classList.add('open');
  chatBackdrop.classList.add('active');
  chatInput.focus();
  badgeEl.style.display = 'none'; // Clear notification badge
};

const closeChat = () => {
  chatDrawer.classList.remove('open');
  chatBackdrop.classList.remove('active');
};

chatClose.onclick = closeChat;
chatBackdrop.onclick = closeChat;

function appendChatBubble(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendChatLoading() {
  const loading = document.createElement('div');
  loading.className = 'chat-bubble bot loading';
  loading.id = 'chat-bubble-loading';
  loading.innerHTML = `
    <span class="dot-loading"></span>
    <span class="dot-loading"></span>
    <span class="dot-loading"></span>
  `;
  chatMessages.appendChild(loading);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeChatLoading() {
  const loader = document.getElementById('chat-bubble-loading');
  if (loader) loader.remove();
}

async function sendChatMessage(msgText) {
  if (!msgText) return;
  appendChatBubble('user', msgText);
  chatHistory.push({ role: 'user', content: msgText });
  saveChatCache();
  chatInput.value = '';

  appendChatLoading();

  try {
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: msgText,
        history: chatHistory.slice(-10) // Send last 10 messages for context
      })
    });
    removeChatLoading();
    appendChatBubble('bot', data.response);
    chatHistory.push({ role: 'bot', content: data.response });
    saveChatCache();
  } catch (e) {
    removeChatLoading();
    const fallbackMsg = "Sorry, I'm having trouble connecting right now. Please try again.";
    appendChatBubble('bot', fallbackMsg);
  }
}

chatSend.onclick = () => {
  const text = chatInput.value.trim();
  sendChatMessage(text);
};

chatInput.onkeydown = (e) => {
  if (e.key === 'Enter') {
    const text = chatInput.value.trim();
    sendChatMessage(text);
  }
};

// Handle quick reply chip clicks
document.querySelectorAll('.quick-chip').forEach(chip => {
  chip.onclick = () => {
    sendChatMessage(chip.dataset.msg);
  };
});

// ── DAILY TRACKER REMINDERS (9:00 AM & 7:00 PM) ─────────
function setupReminders() {
  // Request desktop notification permission
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // Check every 60 seconds
  setInterval(checkReminderTimes, 60000);
  // Run once immediately
  checkReminderTimes();
}

let lastNotificationDate = ''; // track to notify once per date window

async function checkReminderTimes() {
  const now = new Date();
  const hrs = now.getHours();
  const mins = now.getMinutes();

  // Define two reminder windows: Morning 9:00-9:10 AM & Evening 7:00-7:10 PM
  const morning = (hrs === 9 && mins >= 0 && mins < 10);
  const evening = (hrs === 19 && mins >= 0 && mins < 10);

  if (morning || evening) {
    const dateKey = now.toDateString() + (morning ? '-am' : '-pm');
    if (lastNotificationDate === dateKey) return; // already sent in this slot

    try {
      const data = await api('/api/reminders/check');
      if (data && !data.has_expenses_today) {
        lastNotificationDate = dateKey;
        triggerNotification();
      }
    } catch (e) {
      console.error("Reminder check failed", e);
    }
  }
}

function triggerNotification() {
  const title = "💸 Log Today's Spendings!";
  const name = userProfile ? userProfile.name : '';
  const desc = `Hey ${name || 'there'}! You haven't added any expenses yet today. Stay on budget by logging them now!`;

  // Show HTML interface Toast
  showToast(title, desc, 0);

  // Sound feedback
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (err) {}

  // Show standard Operating System Browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: desc,
      icon: '/static/brand-icon.png' // fallback icon
    });
  }

  // Increment fab badge
  badgeEl.style.display = 'grid';
  badgeEl.textContent = '1';
}

// ── ON LAUNCH INITIALIZATION ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  checkUserProfile();
  loadDashboard();
  loadChatCache();
  setupReminders();
});
