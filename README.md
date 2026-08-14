# SpendLog AI — Agentic Expense Tracker Frontend

A production-grade, futuristic AI-powered FinTech expense tracker and financial intelligence dashboard built strictly with **Vanilla JavaScript (ES Modules), HTML5, and Modular CSS3** (No frontend framework dependencies).

---

## 🎨 Architectural Overview

The application is architected around a strict **Two-Layer Separation**:

```
┌─────────────────────────────────────────────────────────────┐
│                          UI LAYER                           │
│  - Pages: Dashboard, Transactions, Analytics, Budgets, etc. │
│  - Components: Modals, Toasts, Charts, Sidebar, Navbar      │
│  - DOM Event Handlers & Local Reactive Renders             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches Actions / Reads State
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CENTRAL STATE STORE                      │
│  - LocalStorage Persistence (`spendlog_state`)              │
│  - Reactive pub/sub subscriptions                           │
│  - Computed Financial Summaries                             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Invokes Async Methods
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA / ACTION SERVICE LAYER                │
│  - expenseService.js                                        │
│  - budgetService.js                                         │
│  - goalService.js                                           │
│  - analyticsService.js                                      │
│  - agentService.js                                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Future Backend API Integration)
                               ▼
                   REST / GraphQL Backend API
```

---

## 🚀 Backend Integration Guide (For Backend Developers)

Every function in `/js/services/` returns a `Promise` and contains explicit `// TODO: CONNECT TO BACKEND API` comments. To connect this frontend to a live REST API, replace the `setTimeout` / `localStorage` blocks with standard `fetch()` calls:

### 1. Expenses API (`/js/services/expenseService.js`)
* `GET /api/expenses`: Retrieve all transactions
* `POST /api/expenses`: Create new transaction `{ title, amount, category, date, paymentMethod, type, notes }`
* `PUT /api/expenses/:id`: Update transaction details
* `DELETE /api/expenses/:id`: Delete transaction

### 2. Budgets API (`/js/services/budgetService.js`)
* `GET /api/budgets`: Retrieve monthly category budget thresholds
* `POST /api/budgets`: Create or configure category budget `{ category, limit, spent }`
* `PUT /api/budgets/:id`: Update budget
* `DELETE /api/budgets/:id`: Delete budget

### 3. Goals API (`/js/services/goalService.js`)
* `GET /api/goals`: Retrieve savings targets and balances
* `POST /api/goals`: Create goal `{ title, targetAmount, currentAmount, targetDate }`
* `POST /api/goals/:id/deposit`: Add funds to goal `{ amount }`

### 4. Financial Agent & Analytics API (`/js/services/agentService.js` & `analyticsService.js`)
* `POST /api/agent/chat`: Send prompt to AI financial agent model `{ message }`
* `GET /api/analytics?timeframe=30D`: Retrieve aggregated category totals and trend data

---

## 📁 File Structure

```
├── index.html                   # Master SPA entry point
├── metadata.json                # Project manifest
├── package.json                 # Build & development config
├── css/
│   ├── variables.css            # Design tokens & dark mode color variables
│   ├── global.css               # Base resets and typography rules
│   ├── layout.css               # Flexbox & Grid shell layouts
│   ├── components.css           # Buttons, badges, cards, inputs, pills
│   ├── auth.css                 # 50-blade glowing circular animation login
│   ├── dashboard.css            # Dashboard grid, stat cards, AI hero card, 3D orb
│   ├── transactions.css         # Ledger table, filter bar, quick action cards
│   ├── analytics.css            # Charts, category breakdown, anomaly scanner
│   ├── budgets.css              # Progress tracks, allowance indicators
│   ├── goals.css                # Circular progress rings, wealth milestones
│   ├── agent.css                # AI Command Center, conversational chat bubble
│   ├── settings.css             # Preferences, currency selector, backups
│   └── responsive.css           # Mobile navigation bar & responsive breakpoints
├── js/
│   ├── app.js                   # Application bootstrapper
│   ├── router.js                # Hash-based SPA router
│   ├── state.js                 # Centralized state management store
│   ├── components/
│   │   ├── toast.js             # Toast notification system
│   │   ├── modal.js             # Modal manager (Add/Edit/Deposit/Agent)
│   │   ├── chart.js             # SVG Area & Sparkline chart renderers
│   │   ├── sidebar.js           # Desktop navigation sidebar
│   │   ├── navbar.js            # Top greeting & quick actions bar
│   │   └── authModal.js         # Uiverse 50-blade rotating portal login
│   ├── services/
│   │   ├── expenseService.js    # Transactions CRUD
│   │   ├── budgetService.js     # Budgets CRUD
│   │   ├── goalService.js       # Savings goals CRUD
│   │   ├── analyticsService.js  # Metric calculations & trend points
│   │   └── agentService.js      # Natural language financial intelligence
│   ├── data/
│   │   └── mockData.js          # Default initial demo dataset
│   └── utils/
│       ├── icons.js             # Pure SVG icon library
│       ├── formatCurrency.js    # Multi-currency & Lakhs formatter (INR/USD/EUR/GBP)
│       ├── formatDate.js        # Relative and localized date formatter
│       └── validation.js        # Input validation helpers
```
