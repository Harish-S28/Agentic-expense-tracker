# 💰 SpendLog AI – Agentic Personal Expense Tracker

SpendLog AI is a next-generation personal expense tracker featuring a smart budget planner, advanced data analytics, and an integrated agentic AI financial advisor powered by **Google Gemini 1.5 Flash** (with fallback to an intelligent rule-based expert system). 

It is designed with dual-database support—**PostgreSQL** for persistent production deployments and **SQLite** for instant local development—and features a secure multi-user authentication system.

---

## 🚀 Key Features

* **🔒 Secure Multi-User Auth**: Register & login securely. All expenses, budgets, and profile details are strictly isolated per user account.
* **🍕 Everyday Society Categories**: 19 pre-configured everyday spending categories complete with matching emoji pills for premium visual feedback.
* **💵 Smart Budget Carry-Over**: Set monthly limits and track daily dynamic limits that automatically carry forward savings or deficits.
* **🤖 Agentic AI Advisor**: Chat with your financial assistant or get instant budget feedback, contextual analysis, and saving tips tailored to your profession.
* **📊 Visual Rich Analytics**: View category doughnut charts, monthly bar charts, and tabular breakdowns of your spending habits in a gorgeous responsive dark mode.
* **☁️ Ephemeral-Proof Cloud DB**: Fully compatible with PostgreSQL on Render or Railway, solving the issue of data being lost on container restart.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla CSS3 (Sleek Glassmorphic Dark UI), JavaScript (ES6+), Chart.js
* **Backend**: Python 3.9+, Flask, Werkzeug (Security & Password Hashing), Gunicorn
* **Database**: PostgreSQL (Production) / SQLite (Development)
* **AI Engine**: Google Gemini API via `google-generativeai` python client

---

## ⚙️ Installation & Local Setup

### 1. Clone the Project
```bash
git clone https://github.com/Harish-S28/Agentic-expense-tracker.git
cd Agentic-expense-tracker
```

### 2. Configure a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup Environment Variables
Create a `.env` file in the root of the project:
```env
# Optional: Gemini API Key for AI Insights
GEMINI_API_KEY=your_gemini_api_key

# Optional: Set this to connect to PostgreSQL (leave empty to use SQLite)
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Flask Session Secret Key
SECRET_KEY=any_random_secure_string
```

### 5. Launch the Application
```bash
python app.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## ☁️ Deployment Guide

### Deploying to Render (Ephemerality-Proof Database)

Render web services use ephemeral disks, which delete local SQLite databases on container reboot. SpendLog AI solves this using a **Render Blueprint** that links your web app to a persistent cloud PostgreSQL database automatically.

1. **Fork this repository** on GitHub.
2. In the **Render Dashboard**, click **New +** and select **Blueprint**.
3. Link your GitHub repository.
4. Render will parse the `render.yaml` configuration and provision:
   * A persistent PostgreSQL database (`spendlog-db`).
   * A Python web service (`spendlog-ai`) running Gunicorn.
5. In the Web Service settings under **Environment**, define your `GEMINI_API_KEY` (if you want AI advisory features).
6. Click **Deploy**. Render will auto-wire the `DATABASE_URL` from the database to your web app!

---

## 📂 Database Schema

```mermaid
erDiagram
    users {
        int id PK
        string email UNIQUE
        string password_hash
        timestamp created_at
    }
    expenses {
        int id PK
        int user_id FK
        string date
        double amount
        string category
        text note
        timestamp created_at
    }
    user_profile {
        int id PK
        int user_id FK
        string name
        string profession
        double income
        timestamp updated_at
    }
    budget_settings {
        int id PK
        int user_id FK
        string month
        double monthly_budget
        timestamp updated_at
    }

    users ||--o{ expenses : "logs"
    users ||--|| user_profile : "has"
    users ||--o{ budget_settings : "sets"
```

---

## 👨‍💻 Author
**Harish**
* B.Tech – Artificial Intelligence & Data Science
* Passionate about AI, Agentic Systems, Full Stack Development, and Intelligent Automation.
