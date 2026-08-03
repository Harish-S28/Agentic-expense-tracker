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
  if (!currentUser) {
    showAuthModal();
    return;
  }
  
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

// ── Default Categories & Emojis ────────────────────────
const DEFAULT_CATS = [
  'Food & Dining',
  'Groceries & Household',
  'Housing & Rent',
  'Utilities & Bills',
  'Transportation & Fuel',
  'Health & Medical',
  'Education & Tuition',
  'Entertainment & Leisure',
  'Shopping & Apparel',
  'Travel & Vacation',
  'EMI, Loans & Debt',
  'Investments & Savings',
  'Gifts & Donations',
  'Personal Care & Wellness',
  'Pets & Animal Care',
  'Maintenance & Repairs',
  'Business & Office',
  'Subscriptions & Streaming',
  'Miscellaneous'
];

const CAT_EMOJIS = {
  'Food & Dining': '🍕',
  'Groceries & Household': '🛒',
  'Housing & Rent': '🏠',
  'Utilities & Bills': '💡',
  'Transportation & Fuel': '🚗',
  'Health & Medical': '🏥',
  'Education & Tuition': '🎓',
  'Entertainment & Leisure': '🎬',
  'Shopping & Apparel': '🛍️',
  'Travel & Vacation': '✈️',
  'EMI, Loans & Debt': '💳',
  'Investments & Savings': '📈',
  'Gifts & Donations': '🎁',
  'Personal Care & Wellness': '🧼',
  'Pets & Animal Care': '🐾',
  'Maintenance & Repairs': '🔧',
  'Business & Office': '💼',
  'Subscriptions & Streaming': '📦',
  'Miscellaneous': '❓'
};

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#06b6d4',
  '#ef4444', '#a855f7', '#ec4899', '#f43f5e', '#e11d48',
  '#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777',
  '#4b5563', '#0d9488', '#4f46e5', '#6b7280'
];

// ── Helpers ────────────────────────────────────────────
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (res.status === 401 && path !== '/api/auth/me') {
    currentUser = null;
    showAuthModal();
    throw new Error('Unauthorized');
  }
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

// ── USER AUTHENTICATION & INITIALIZATION ────────────────
let currentUser = null;
let userProfile = null;

async function checkAuth() {
  try {
    const res = await api('/api/auth/me');
    if (res && res.authenticated) {
      currentUser = res.user;
      userProfile = {
        name: res.user.name,
        profession: res.user.profession,
        income: res.user.income
      };
      document.getElementById('auth-modal').style.display = 'none';
      updateProfileUI();
      loadDashboard();
    } else {
      showAuthModal();
    }
  } catch (e) {
    showAuthModal();
  }
}

function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'grid';
  document.getElementById('tab-btn-login').click();
}

// Auth Tab Switching
const tabBtnLogin = document.getElementById('tab-btn-login');
const tabBtnRegister = document.getElementById('tab-btn-register');
const loginView = document.getElementById('auth-login-view');
const registerView = document.getElementById('auth-register-view');

tabBtnLogin.onclick = (e) => {
  e.preventDefault();
  tabBtnLogin.classList.add('active');
  tabBtnLogin.style.borderBottom = '3px solid #6366f1';
  tabBtnLogin.style.color = '#f3f4f6';
  
  tabBtnRegister.classList.remove('active');
  tabBtnRegister.style.borderBottom = 'none';
  tabBtnRegister.style.color = '#9ca3af';
  
  loginView.style.display = 'block';
  registerView.style.display = 'none';
  document.getElementById('auth-msg').style.display = 'none';
};

tabBtnRegister.onclick = (e) => {
  e.preventDefault();
  tabBtnRegister.classList.add('active');
  tabBtnRegister.style.borderBottom = '3px solid #6366f1';
  tabBtnRegister.style.color = '#f3f4f6';
  
  tabBtnLogin.classList.remove('active');
  tabBtnLogin.style.borderBottom = 'none';
  tabBtnLogin.style.color = '#9ca3af';
  
  loginView.style.display = 'none';
  registerView.style.display = 'block';
  document.getElementById('auth-msg').style.display = 'none';
};

// Register Profession Grid Selection
const regProfButtons = document.querySelectorAll('#register-profession-grid .prof-btn');
const regProfHidden = document.getElementById('r-profession');
regProfButtons.forEach(btn => {
  btn.onclick = (e) => {
    e.preventDefault();
    regProfButtons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    regProfHidden.value = btn.dataset.val;
  };
});

// Login Handler
document.getElementById('btn-login-submit').onclick = async () => {
  const email = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-password').value;
  const msg = document.getElementById('auth-msg');
  msg.style.display = 'none';

  if (!email || !password) {
    msg.textContent = 'Please enter email and password.';
    msg.className = 'msg error';
    msg.style.display = 'block';
    return;
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    currentUser = res.user;
    userProfile = { name: res.user.name, profession: res.user.profession, income: res.user.income };
    document.getElementById('auth-modal').style.display = 'none';
    
    // Clear forms
    document.getElementById('l-email').value = '';
    document.getElementById('l-password').value = '';
    
    updateProfileUI();
    switchPage('dashboard');
    showToast("Welcome Back! 🔓", `Successfully logged in as ${res.user.name}.`);
  } catch (err) {
    msg.textContent = 'Invalid email or password.';
    msg.className = 'msg error';
    msg.style.display = 'block';
  }
};

// Register Handler
document.getElementById('btn-register-submit').onclick = async () => {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const password = document.getElementById('r-password').value;
  const profession = regProfHidden.value;
  const income = parseFloat(document.getElementById('r-income').value) || 0;
  const msg = document.getElementById('auth-msg');
  msg.style.display = 'none';

  if (!name || !email || !password || !profession) {
    msg.textContent = 'Please fill out all fields and select a profession.';
    msg.className = 'msg error';
    msg.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    msg.textContent = 'Password must be at least 6 characters.';
    msg.className = 'msg error';
    msg.style.display = 'block';
    return;
  }

  try {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, profession, income })
    });
    currentUser = res.user;
    userProfile = { name, profession, income };
    document.getElementById('auth-modal').style.display = 'none';
    
    // Clear forms
    document.getElementById('r-name').value = '';
    document.getElementById('r-email').value = '';
    document.getElementById('r-password').value = '';
    document.getElementById('r-income').value = '';
    regProfButtons.forEach(b => b.classList.remove('selected'));
    regProfHidden.value = '';

    updateProfileUI();
    switchPage('dashboard');
    showToast("Account Created! 🎉", `Welcome to SpendLog AI, ${name}!`);
  } catch (err) {
    msg.textContent = 'Registration failed. Email might be in use.';
    msg.className = 'msg error';
    msg.style.display = 'block';
  }
};

// Logout Handler
document.getElementById('btn-logout').onclick = async () => {
  if (!confirm('Are you sure you want to log out?')) return;
  try {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    userProfile = null;
    
    // Clear cached chat
    localStorage.removeItem(chatSessionKey);
    chatHistory = [];
    document.getElementById('chat-messages').innerHTML = '';
    
    // Reload welcome bubble
    const welcome = "Hello! I'm your AI financial assistant. Ask me questions like:\n• 'Spent today?'\n• 'Give me saving tips'\n• 'Am I within budget?'";
    appendChatBubble('bot', welcome);
    chatHistory.push({ role: 'bot', content: welcome });
    saveChatCache();
    
    showAuthModal();
    showToast("Logged Out 🔒", "Logged out successfully.");
  } catch (e) {
    console.error("Logout failed", e);
  }
};

// Profile Modal Actions
document.getElementById('btn-edit-profile').addEventListener('click', () => {
  showProfileModal();
});

document.getElementById('btn-close-profile').onclick = () => {
  document.getElementById('profile-modal').style.display = 'none';
};

function showProfileModal() {
  const modal = document.getElementById('profile-modal');
  modal.style.display = 'grid';

  const nameInput = document.getElementById('p-name');
  const incomeInput = document.getElementById('p-income');
  const profHidden = document.getElementById('p-profession');
  const profButtons = document.querySelectorAll('#profile-modal .prof-btn');

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
    btn.onclick = (e) => {
      e.preventDefault();
      profButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      profHidden.value = btn.dataset.val;
    };
  });
}

document.getElementById('btn-save-profile').addEventListener('click', async () => {
  const name = document.getElementById('p-name').value.trim();
  const profession = document.getElementById('p-profession').value;
  const income = parseFloat(document.getElementById('p-income').value) || 0;

  if (!name || !profession) {
    alert("Name and Profession are required.");
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
    `<button class="cat-pill" data-cat="${c}">${CAT_EMOJIS[c] || '✨'} ${c}</button>`
  ).join('');

  pills.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
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

    document.getElementById('f-amount').value = '';
    document.getElementById('f-note').value = '';
    document.getElementById('f-category').value = '';
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));

    if (navigator.vibrate) navigator.vibrate(50);
  } catch (err) {
    msg.textContent = 'Failed to save expense.';
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
    } else {
      empty.style.display = 'none';
      table.style.display = 'table';

      expenses.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${e.date}</td>
          <td><span class="cat-badge">${CAT_EMOJIS[e.category] || '✨'} ${e.category}</span></td>
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
    }

    // Populate category dropdown
    const sel  = document.getElementById('h-category');
    const cur  = sel.value;
    sel.innerHTML = '<option value="">All categories</option>';
    DEFAULT_CATS.forEach(c => {
      sel.innerHTML += `<option value="${c}" ${c === cur ? 'selected' : ''}>${CAT_EMOJIS[c] || '✨'} ${c}</option>`;
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

    document.getElementById('stat-total').textContent = fmtInt(data.total);
    document.getElementById('stat-count').textContent = data.count;
    document.getElementById('stat-avg').textContent   = fmtInt(data.count ? data.total / data.count : 0);

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

      const legend = document.getElementById('cat-legend');
      legend.innerHTML = data.by_category.map((c, i) =>
        `<div class="legend-item">
          <div class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></div>
          ${CAT_EMOJIS[c.category] || '✨'} ${c.category} · ${fmtInt(c.total)}
        </div>`
      ).join('');
    } else {
      document.getElementById('cat-legend').innerHTML = '<div class="empty-state">No expense details this month</div>';
    }

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

    const circle = document.getElementById('budget-ring-fill');
    const radius = 90;
    const circ = 2 * Math.PI * radius;
    let pct = status.percentage_used;
    if (pct > 100) pct = 100;
    const offset = circ - (pct / 100 * circ);
    circle.style.strokeDashoffset = offset;

    if (status.over_budget) {
      circle.style.stroke = 'var(--red)';
    } else if (status.percentage_used >= 80) {
      circle.style.stroke = 'var(--yellow)';
    } else {
      circle.style.stroke = 'var(--accent)';
    }

    document.getElementById('bud-monthly').textContent = fmtInt(status.monthly_budget);
    document.getElementById('bud-base').textContent = fmtInt(status.base_daily_limit);
    document.getElementById('bud-month-spent').textContent = fmtInt(status.monthly_total);
    document.getElementById('bud-day-of-month').textContent = `${status.day_of_month} / ${status.days_in_month}`;

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

    document.getElementById('budget-tip-body').textContent = status.ai_tip;

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
  const today = new Date();
  const yyyymm = today.toISOString().slice(0, 7);
  document.getElementById('analysis-month').value = yyyymm;
  document.getElementById('analysis-year').value = today.getFullYear();

  document.getElementById('analysis-output').style.display = 'none';
  document.getElementById('analysis-empty').style.display = 'none';
  document.getElementById('analysis-loading').style.display = 'none';

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

    document.getElementById('ai-report-body').innerHTML = report.analysis
      .replace(/\n\n/g, '</p><p>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (!document.getElementById('ai-report-body').querySelector('p')) {
      document.getElementById('ai-report-body').innerHTML = `<p>${document.getElementById('ai-report-body').innerHTML}</p>`;
    }

    const tbody = document.getElementById('analysis-cat-body');
    tbody.innerHTML = '';
    const total = report.data.total || 1;
    report.data.by_category.forEach(c => {
      const share = ((c.total / total) * 100).toFixed(1);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="cat-badge">${CAT_EMOJIS[c.category] || '✨'} ${c.category}</span></td>
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

function loadChatCache() {
  const cached = localStorage.getItem(chatSessionKey);
  if (cached) {
    chatHistory = JSON.parse(cached);
    chatHistory.forEach(msg => {
      appendChatBubble(msg.role, msg.content);
    });
  } else {
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
  if (!currentUser) {
    showAuthModal();
    return;
  }
  chatDrawer.classList.add('open');
  chatBackdrop.classList.add('active');
  chatInput.focus();
  badgeEl.style.display = 'none';
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
        history: chatHistory.slice(-10)
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

document.querySelectorAll('.quick-chip').forEach(chip => {
  chip.onclick = () => {
    sendChatMessage(chip.dataset.msg);
  };
});

// ── DAILY TRACKER REMINDERS (9:00 AM & 7:00 PM) ─────────
function setupReminders() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  setInterval(checkReminderTimes, 60000);
  checkReminderTimes();
}

let lastNotificationDate = '';

async function checkReminderTimes() {
  if (!currentUser) return;
  const now = new Date();
  const hrs = now.getHours();
  const mins = now.getMinutes();

  const morning = (hrs === 9 && mins >= 0 && mins < 10);
  const evening = (hrs === 19 && mins >= 0 && mins < 10);

  if (morning || evening) {
    const dateKey = now.toDateString() + (morning ? '-am' : '-pm');
    if (lastNotificationDate === dateKey) return;

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

  showToast(title, desc, 0);

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

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: desc,
      icon: '/static/brand-icon.png'
    });
  }

  badgeEl.style.display = 'grid';
  badgeEl.textContent = '1';
}

// ── ON LAUNCH INITIALIZATION ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadChatCache();
  setupReminders();
});
