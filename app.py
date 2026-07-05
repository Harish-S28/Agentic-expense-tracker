from flask import Flask, request, jsonify, render_template
import sqlite3
import os
from datetime import datetime, timedelta, date
import calendar
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'expenses.db')

# ── AI Agent ────────────────────────────────────────────
try:
    from ai_agent import AIAgent
    ai = AIAgent(api_key=os.getenv('GEMINI_API_KEY'))
    print(f"  AI Agent: {'Gemini AI' if ai.has_gemini else 'Rule-based fallback'}")
except Exception as e:
    ai = None
    print(f"  AI Agent: Disabled ({e})")


# ── Database ─────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        # Original expenses table (unchanged)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                note TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        ''')
        # User profile (single row)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL DEFAULT 'User',
                profession TEXT NOT NULL DEFAULT 'Other',
                income REAL DEFAULT 0,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        ''')
        # Budget settings per month (YYYY-MM unique)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS budget_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                month TEXT NOT NULL UNIQUE,
                monthly_budget REAL NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        ''')
        conn.commit()


def _get_carry_over(conn, today: date, base_daily: float) -> float:
    """Calculate cumulative carry-over from day 1 of month to yesterday."""
    first_day = today.replace(day=1)
    carry = 0.0
    cur = first_day
    while cur < today:
        day_str = cur.strftime('%Y-%m-%d')
        spent = conn.execute(
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date=?',
            (day_str,)
        ).fetchone()['t']
        carry += (base_daily - spent)
        cur += timedelta(days=1)
    return carry


# ── Pages ────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


# ═══════════════════════════════════════════════════════
# ORIGINAL ROUTES (unchanged functionality)
# ═══════════════════════════════════════════════════════

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.json
    if not data or not data.get('amount') or not data.get('category') or not data.get('date'):
        return jsonify({'error': 'amount, category and date are required'}), 400
    with get_db() as conn:
        cur = conn.execute(
            'INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)',
            (data['date'], float(data['amount']), data['category'], data.get('note', ''))
        )
        conn.commit()
        expense_id = cur.lastrowid
    return jsonify({'id': expense_id, 'message': 'Expense added'}), 201


@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    category = request.args.get('category')
    month    = request.args.get('month')
    search   = request.args.get('search')
    exp_date = request.args.get('date')     # NEW: filter by exact date

    query  = 'SELECT * FROM expenses WHERE 1=1'
    params = []

    if category:
        query += ' AND category = ?'
        params.append(category)
    if month:
        query += " AND strftime('%Y-%m', date) = ?"
        params.append(month)
    if search:
        query += ' AND (note LIKE ? OR category LIKE ?)'
        params += [f'%{search}%', f'%{search}%']
    if exp_date:
        query += ' AND date = ?'
        params.append(exp_date)

    query += ' ORDER BY date DESC, id DESC'

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    with get_db() as conn:
        conn.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
        conn.commit()
    return jsonify({'message': 'Deleted'})


@app.route('/api/analytics', methods=['GET'])
def analytics():
    month = request.args.get('month')

    filter_sql = ''
    params     = []
    if month:
        filter_sql = " WHERE strftime('%Y-%m', date) = ?"
        params.append(month)

    with get_db() as conn:
        total = conn.execute(
            f'SELECT COALESCE(SUM(amount),0) as total FROM expenses{filter_sql}', params
        ).fetchone()['total']

        by_cat = conn.execute(
            f'SELECT category, SUM(amount) as total FROM expenses{filter_sql} '
            f'GROUP BY category ORDER BY total DESC', params
        ).fetchall()

        by_date = conn.execute(
            f'SELECT date, SUM(amount) as total FROM expenses{filter_sql} '
            f'GROUP BY date ORDER BY total DESC LIMIT 10', params
        ).fetchall()

        trend = conn.execute(
            "SELECT strftime('%Y-%m', date) as month, SUM(amount) as total "
            "FROM expenses GROUP BY month ORDER BY month DESC LIMIT 6"
        ).fetchall()

        count = conn.execute(
            f'SELECT COUNT(*) as cnt FROM expenses{filter_sql}', params
        ).fetchone()['cnt']

    return jsonify({
        'total':       round(total, 2),
        'count':       count,
        'by_category': [dict(r) for r in by_cat],
        'by_date':     [dict(r) for r in by_date],
        'trend':       [dict(r) for r in reversed(trend)]
    })


@app.route('/api/categories', methods=['GET'])
def categories():
    with get_db() as conn:
        rows = conn.execute('SELECT DISTINCT category FROM expenses ORDER BY category').fetchall()
    return jsonify([r['category'] for r in rows])


# ═══════════════════════════════════════════════════════
# NEW ROUTES — User Profile
# ═══════════════════════════════════════════════════════

@app.route('/api/profile', methods=['GET'])
def get_profile():
    with get_db() as conn:
        row = conn.execute('SELECT * FROM user_profile WHERE id=1').fetchone()
    return jsonify(dict(row) if row else None)


@app.route('/api/profile', methods=['POST'])
def save_profile():
    data = request.json
    if not data or not data.get('name') or not data.get('profession'):
        return jsonify({'error': 'name and profession required'}), 400

    with get_db() as conn:
        existing = conn.execute('SELECT id FROM user_profile WHERE id=1').fetchone()
        if existing:
            conn.execute(
                "UPDATE user_profile SET name=?, profession=?, income=?, updated_at=datetime('now') WHERE id=1",
                (data['name'], data['profession'], float(data.get('income', 0)))
            )
        else:
            conn.execute(
                'INSERT INTO user_profile (id, name, profession, income) VALUES (1, ?, ?, ?)',
                (data['name'], data['profession'], float(data.get('income', 0)))
            )
        conn.commit()
    return jsonify({'message': 'Profile saved'})


# ═══════════════════════════════════════════════════════
# NEW ROUTES — Budget
# ═══════════════════════════════════════════════════════

@app.route('/api/budget', methods=['POST'])
def save_budget():
    data = request.json
    if not data or not data.get('monthly_budget'):
        return jsonify({'error': 'monthly_budget required'}), 400

    month_str = request.json.get('month', datetime.now().strftime('%Y-%m'))
    with get_db() as conn:
        existing = conn.execute('SELECT id FROM budget_settings WHERE month=?', (month_str,)).fetchone()
        if existing:
            conn.execute(
                "UPDATE budget_settings SET monthly_budget=?, updated_at=datetime('now') WHERE month=?",
                (float(data['monthly_budget']), month_str)
            )
        else:
            conn.execute(
                'INSERT INTO budget_settings (month, monthly_budget) VALUES (?, ?)',
                (month_str, float(data['monthly_budget']))
            )
        conn.commit()
    return jsonify({'message': 'Budget saved', 'month': month_str})


@app.route('/api/budget/status', methods=['GET'])
def budget_status():
    today     = date.today()
    month_str = today.strftime('%Y-%m')

    with get_db() as conn:
        budget_row = conn.execute(
            'SELECT monthly_budget FROM budget_settings WHERE month=?', (month_str,)
        ).fetchone()

        if not budget_row:
            return jsonify({'has_budget': False})

        monthly_budget  = budget_row['monthly_budget']
        days_in_month   = calendar.monthrange(today.year, today.month)[1]
        base_daily      = monthly_budget / days_in_month
        cumulative_carry = _get_carry_over(conn, today, base_daily)
        effective_limit = base_daily + cumulative_carry

        today_str = today.strftime('%Y-%m-%d')
        today_spent = conn.execute(
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date=?', (today_str,)
        ).fetchone()['t']

        monthly_total = conn.execute(
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?",
            (month_str,)
        ).fetchone()['t']

        remaining = effective_limit - today_spent
        safe_lim  = max(effective_limit, 0.01)
        pct       = min((today_spent / safe_lim) * 100, 100)
        over      = today_spent > effective_limit

        # Profile for AI tip
        profile_row = conn.execute('SELECT * FROM user_profile WHERE id=1').fetchone()
        profile = dict(profile_row) if profile_row else {'name': 'User', 'profession': 'Other'}

    budget_data = {
        'effective_limit': round(effective_limit, 2),
        'today_spent':     round(today_spent, 2),
        'cumulative_carry': round(cumulative_carry, 2),
        'base_daily':      round(base_daily, 2),
        'over':            over
    }
    tip = ai.get_budget_tip(budget_data, profile) if ai else _default_budget_tip(budget_data)

    return jsonify({
        'has_budget':          True,
        'monthly_budget':      round(monthly_budget, 2),
        'base_daily_limit':    round(base_daily, 2),
        'cumulative_carry_over': round(cumulative_carry, 2),
        'effective_limit':     round(effective_limit, 2),
        'today_spent':         round(today_spent, 2),
        'remaining':           round(remaining, 2),
        'percentage_used':     round(pct, 1),
        'monthly_total':       round(monthly_total, 2),
        'days_in_month':       days_in_month,
        'day_of_month':        today.day,
        'over_budget':         over,
        'carry_over_status':   'bonus' if cumulative_carry >= 0 else 'penalty',
        'carry_over_amount':   round(abs(cumulative_carry), 2),
        'ai_tip':              tip
    })


def _default_budget_tip(bd):
    el  = bd['effective_limit']
    ts  = bd['today_spent']
    cc  = bd['cumulative_carry']
    bdd = bd['base_daily']
    over = bd['over']
    rem = el - ts
    if over:
        return f"You've exceeded today's limit by ₹{abs(rem):.0f}. Try spending ₹{max(0, bdd - abs(rem)):.0f} less tomorrow!"
    elif cc > 0:
        return f"You saved ₹{cc:.0f} from previous days! Today's boosted limit is ₹{el:.0f}."
    elif cc < 0:
        return f"You owe ₹{abs(cc):.0f} from overspending. Today's reduced limit is ₹{el:.0f}."
    return f"Daily limit: ₹{el:.0f}. Spent so far: ₹{ts:.0f}. Remaining: ₹{rem:.0f}."


# ═══════════════════════════════════════════════════════
# NEW ROUTES — Reminder
# ═══════════════════════════════════════════════════════

@app.route('/api/reminders/check', methods=['GET'])
def check_reminder():
    today_str = date.today().isoformat()
    with get_db() as conn:
        count = conn.execute(
            'SELECT COUNT(*) as cnt FROM expenses WHERE date=?', (today_str,)
        ).fetchone()['cnt']
    return jsonify({'has_expenses_today': count > 0, 'date': today_str})


# ═══════════════════════════════════════════════════════
# NEW ROUTES — AI Suggest
# ═══════════════════════════════════════════════════════

@app.route('/api/ai/suggest', methods=['POST'])
def ai_suggest():
    data = request.json or {}
    expense = {
        'amount':   data.get('amount', 0),
        'category': data.get('category', 'Other'),
        'note':     data.get('note', ''),
        'date':     data.get('date', date.today().isoformat())
    }

    with get_db() as conn:
        profile_row = conn.execute('SELECT * FROM user_profile WHERE id=1').fetchone()
        profile = dict(profile_row) if profile_row else {'name': 'User', 'profession': 'Other'}

        month_str = expense['date'][:7]
        monthly_total = conn.execute(
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?",
            (month_str,)
        ).fetchone()['t']
        category_total = conn.execute(
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses "
            "WHERE strftime('%Y-%m',date)=? AND category=?",
            (month_str, expense['category'])
        ).fetchone()['t']
        budget_row = conn.execute(
            'SELECT monthly_budget FROM budget_settings WHERE month=?', (month_str,)
        ).fetchone()

    monthly_context = {
        'monthly_total':  monthly_total,
        'category_total': category_total,
        'monthly_budget': budget_row['monthly_budget'] if budget_row else None
    }

    suggestion = ai.get_suggestion(expense, profile, monthly_context) if ai else (
        f"₹{expense['amount']:.0f} in {expense['category']} saved! "
        f"Add your Gemini API key for personalized AI insights."
    )
    return jsonify({'suggestion': suggestion})


# ═══════════════════════════════════════════════════════
# NEW ROUTES — AI Chat
# ═══════════════════════════════════════════════════════

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    data = request.json or {}
    message = data.get('message', '').strip()
    history = data.get('history', [])

    if not message:
        return jsonify({'response': 'Please type a message.'}), 400

    with get_db() as conn:
        profile_row = conn.execute('SELECT * FROM user_profile WHERE id=1').fetchone()
        profile = dict(profile_row) if profile_row else {'name': 'User', 'profession': 'Other'}

        today_str = date.today().isoformat()
        month_str = datetime.now().strftime('%Y-%m')

        today_spent = conn.execute(
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date=?', (today_str,)
        ).fetchone()['t']

        monthly_total = conn.execute(
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?",
            (month_str,)
        ).fetchone()['t']

        top_rows = conn.execute(
            "SELECT category, SUM(amount) as total FROM expenses "
            "WHERE strftime('%Y-%m',date)=? GROUP BY category ORDER BY total DESC LIMIT 3",
            (month_str,)
        ).fetchall()
        top_cats = ', '.join([f"{r['category']} (₹{r['total']:.0f})" for r in top_rows])

        budget_row = conn.execute(
            'SELECT monthly_budget FROM budget_settings WHERE month=?', (month_str,)
        ).fetchone()
        monthly_budget = budget_row['monthly_budget'] if budget_row else None

        effective_limit = None
        daily_limit     = None
        if monthly_budget:
            today_date    = date.today()
            days_in_month = calendar.monthrange(today_date.year, today_date.month)[1]
            base_daily    = monthly_budget / days_in_month
            daily_limit   = base_daily
            carry         = _get_carry_over(conn, today_date, base_daily)
            effective_limit = base_daily + carry

    ctx = {
        'profile':        profile,
        'today_spent':    today_spent,
        'monthly_total':  monthly_total,
        'monthly_budget': monthly_budget,
        'daily_limit':    daily_limit,
        'effective_limit': effective_limit,
        'top_categories': top_cats
    }

    response = ai.get_chat_response(message, history, ctx) if ai else (
        f"You've spent ₹{today_spent:.0f} today and ₹{monthly_total:.0f} this month. "
        f"Add your Gemini API key for full AI chat."
    )
    return jsonify({'response': response})


# ═══════════════════════════════════════════════════════
# NEW ROUTES — AI Analysis
# ═══════════════════════════════════════════════════════

@app.route('/api/ai/analysis', methods=['GET'])
def ai_analysis():
    period = request.args.get('period', 'month')
    month  = request.args.get('month', datetime.now().strftime('%Y-%m'))
    year   = request.args.get('year',  str(datetime.now().year))

    with get_db() as conn:
        profile_row = conn.execute('SELECT * FROM user_profile WHERE id=1').fetchone()
        profile = dict(profile_row) if profile_row else {'name': 'User', 'profession': 'Other'}

        if period == 'month':
            total = conn.execute(
                "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?",
                (month,)
            ).fetchone()['t']
            by_cat = conn.execute(
                "SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses "
                "WHERE strftime('%Y-%m',date)=? GROUP BY category ORDER BY total DESC", (month,)
            ).fetchall()
            top_day = conn.execute(
                "SELECT date, SUM(amount) as total FROM expenses "
                "WHERE strftime('%Y-%m',date)=? GROUP BY date ORDER BY total DESC LIMIT 1", (month,)
            ).fetchone()
            tx_count = conn.execute(
                "SELECT COUNT(*) as cnt FROM expenses WHERE strftime('%Y-%m',date)=?", (month,)
            ).fetchone()['cnt']

            # Previous month
            dt = datetime.strptime(month, '%Y-%m')
            prev_dt = dt.replace(month=dt.month - 1) if dt.month > 1 else dt.replace(year=dt.year - 1, month=12)
            prev_month = prev_dt.strftime('%Y-%m')
            prev_total = conn.execute(
                "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?",
                (prev_month,)
            ).fetchone()['t']
            change_pct = ((total - prev_total) / prev_total * 100) if prev_total > 0 else 0

            budget_row = conn.execute('SELECT monthly_budget FROM budget_settings WHERE month=?', (month,)).fetchone()

            data = {
                'period': 'month', 'month': month,
                'total': round(total, 2), 'count': tx_count,
                'by_category': [dict(r) for r in by_cat],
                'top_day': dict(top_day) if top_day and top_day['date'] else None,
                'prev_month': prev_month, 'prev_total': round(prev_total, 2),
                'change_pct': round(change_pct, 1),
                'monthly_budget': budget_row['monthly_budget'] if budget_row else None
            }
        else:
            total = conn.execute(
                "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y',date)=?", (year,)
            ).fetchone()['t']
            by_month = conn.execute(
                "SELECT strftime('%Y-%m',date) as month, SUM(amount) as total FROM expenses "
                "WHERE strftime('%Y',date)=? GROUP BY month ORDER BY month", (year,)
            ).fetchall()
            by_cat = conn.execute(
                "SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses "
                "WHERE strftime('%Y',date)=? GROUP BY category ORDER BY total DESC", (year,)
            ).fetchall()
            tx_count = conn.execute(
                "SELECT COUNT(*) as cnt FROM expenses WHERE strftime('%Y',date)=?", (year,)
            ).fetchone()['cnt']

            data = {
                'period': 'year', 'year': year,
                'total': round(total, 2), 'count': tx_count,
                'by_month': [dict(r) for r in by_month],
                'by_category': [dict(r) for r in by_cat]
            }

    analysis_text = ai.get_analysis(data, profile) if ai else _default_analysis(data)
    return jsonify({'data': data, 'analysis': analysis_text, 'profile': profile})


def _default_analysis(data):
    period = data.get('period', 'month')
    total  = data.get('total', 0)
    cats   = data.get('by_category', [])
    cats_str = ', '.join([f"{c['category']}: ₹{c['total']:.0f}" for c in cats[:3]])
    if period == 'month':
        cp = data.get('change_pct', 0)
        return (f"📊 {data['month']} Analysis\n\nTotal: ₹{total:.0f} | "
                f"{'▲' if cp > 0 else '▼'} {abs(cp):.1f}% vs last month.\n"
                f"Top categories: {cats_str}\n\n"
                f"💡 Add your Gemini API key in .env for deep AI insights & personalized recommendations!")
    return (f"📅 {data['year']} Annual Report\n\nTotal: ₹{total:.0f} across {data['count']} transactions.\n"
            f"Top categories: {cats_str}\n\n"
            f"💡 Add your Gemini API key in .env for deep AI insights!")


# ═══════════════════════════════════════════════════════
if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    print(f'\n  Agentic Expense Tracker running on http://127.0.0.1:{port}\n')
    app.run(host='0.0.0.0', port=port, debug=False)
