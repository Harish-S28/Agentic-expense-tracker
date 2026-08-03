from flask import Flask, request, jsonify, render_template, session
from werkzeug.security import generate_password_hash, check_password_hash
import os
from functools import wraps
from datetime import datetime, timedelta, date
import calendar
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'spendlog_secret_fallback_key')

# ── AI Agent ────────────────────────────────────────────
try:
    from ai_agent import AIAgent
    ai = AIAgent(api_key=os.getenv('GEMINI_API_KEY'))
    print(f"  AI Agent: {'Gemini AI' if ai.has_gemini else 'Rule-based fallback'}")
except Exception as e:
    ai = None
    print(f"  AI Agent: Disabled ({e})")

# ── Database & Init ──────────────────────────────────────
from db import get_db, execute_query, fetch_all, fetch_one, insert_and_get_id, init_db
init_db()

# ── Auth Decorator ───────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def _get_carry_over(conn, user_id: int, today: date, base_daily: float) -> float:
    """Calculate cumulative carry-over from day 1 of month to yesterday."""
    first_day = today.replace(day=1)
    carry = 0.0
    cur = first_day
    while cur < today:
        day_str = cur.strftime('%Y-%m-%d')
        row = fetch_one(
            conn,
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id=? AND date=?',
            (user_id, day_str)
        )
        spent = row['t'] if row else 0.0
        carry += (base_daily - spent)
        cur += timedelta(days=1)
    return carry

# ── Pages ────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

# ── Auth Endpoints ───────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.json
    if not data or not data.get('email') or not data.get('password') or not data.get('name') or not data.get('profession'):
        return jsonify({'error': 'Email, password, name, and profession are required'}), 400
    
    email = data['email'].strip().lower()
    password = data['password']
    name = data['name'].strip()
    profession = data['profession'].strip()
    income = float(data.get('income', 0.0))
    
    password_hash = generate_password_hash(password)
    
    with get_db() as conn:
        existing_user = fetch_one(conn, 'SELECT id FROM users WHERE email = ?', (email,))
        if existing_user:
            return jsonify({'error': 'An account with this email already exists'}), 400
        
        try:
            user_id = insert_and_get_id(conn, 'INSERT INTO users (email, password_hash) VALUES (?, ?)', (email, password_hash))
            execute_query(conn, 'INSERT INTO user_profile (user_id, name, profession, income) VALUES (?, ?, ?, ?)', (user_id, name, profession, income))
        except Exception as e:
            return jsonify({'error': f'Failed to create account: {str(e)}'}), 500
            
    session['user_id'] = user_id
    return jsonify({
        'message': 'Registration successful',
        'user': {'id': user_id, 'email': email, 'name': name, 'profession': profession}
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    email = data['email'].strip().lower()
    password = data['password']
    
    with get_db() as conn:
        user = fetch_one(conn, 'SELECT * FROM users WHERE email = ?', (email,))
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        profile = fetch_one(conn, 'SELECT name, profession, income FROM user_profile WHERE user_id = ?', (user['id'],))
        
    session['user_id'] = user['id']
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': profile['name'] if profile else 'User',
            'profession': profile['profession'] if profile else 'Other',
            'income': profile['income'] if profile else 0.0
        }
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
    
    with get_db() as conn:
        user = fetch_one(conn, 'SELECT email FROM users WHERE id = ?', (session['user_id'],))
        if not user:
            session.pop('user_id', None)
            return jsonify({'authenticated': False}), 401
            
        profile = fetch_one(conn, 'SELECT name, profession, income FROM user_profile WHERE user_id = ?', (session['user_id'],))
        
    return jsonify({
        'authenticated': True,
        'user': {
            'id': session['user_id'],
            'email': user['email'],
            'name': profile['name'] if profile else 'User',
            'profession': profile['profession'] if profile else 'Other',
            'income': profile['income'] if profile else 0.0
        }
    }), 200

# ── Expense Endpoints ────────────────────────────────────
@app.route('/api/expenses', methods=['POST'])
@login_required
def add_expense():
    data = request.json
    if not data or not data.get('amount') or not data.get('category') or not data.get('date'):
        return jsonify({'error': 'amount, category and date are required'}), 400
    with get_db() as conn:
        expense_id = insert_and_get_id(
            conn,
            'INSERT INTO expenses (user_id, date, amount, category, note) VALUES (?, ?, ?, ?, ?)',
            (session['user_id'], data['date'], float(data['amount']), data['category'], data.get('note', ''))
        )
    return jsonify({'id': expense_id, 'message': 'Expense added'}), 201

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    category = request.args.get('category')
    month    = request.args.get('month')
    search   = request.args.get('search')
    exp_date = request.args.get('date')

    query  = 'SELECT * FROM expenses WHERE user_id = ?'
    params = [session['user_id']]

    if category:
        query += ' AND category = ?'
        params.append(category)
    if month:
        query += " AND substr(date, 1, 7) = ?"
        params.append(month)
    if search:
        query += ' AND (note LIKE ? OR category LIKE ?)'
        params += [f'%{search}%', f'%{search}%']
    if exp_date:
        query += ' AND date = ?'
        params.append(exp_date)

    query += ' ORDER BY date DESC, id DESC'

    with get_db() as conn:
        rows = fetch_all(conn, query, params)
    return jsonify(rows)

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    with get_db() as conn:
        execute_query(conn, 'DELETE FROM expenses WHERE id = ? AND user_id = ?', (expense_id, session['user_id']))
    return jsonify({'message': 'Deleted'})

@app.route('/api/analytics', methods=['GET'])
@login_required
def analytics():
    month = request.args.get('month')

    filter_sql = ' WHERE user_id = ?'
    params     = [session['user_id']]
    if month:
        filter_sql += " AND substr(date, 1, 7) = ?"
        params.append(month)

    with get_db() as conn:
        total_row = fetch_one(
            conn,
            f'SELECT COALESCE(SUM(amount),0) as total FROM expenses{filter_sql}', params
        )
        total = total_row['total'] if total_row else 0.0

        by_cat = fetch_all(
            conn,
            f'SELECT category, SUM(amount) as total FROM expenses{filter_sql} '
            f'GROUP BY category ORDER BY total DESC', params
        )

        by_date = fetch_all(
            conn,
            f'SELECT date, SUM(amount) as total FROM expenses{filter_sql} '
            f'GROUP BY date ORDER BY total DESC LIMIT 10', params
        )

        trend_filter = ' WHERE user_id = ?'
        trend_params = [session['user_id']]
        trend = fetch_all(
            conn,
            "SELECT substr(date, 1, 7) as month, SUM(amount) as total "
            f"FROM expenses{trend_filter} GROUP BY month ORDER BY month DESC LIMIT 6", trend_params
        )

        count_row = fetch_one(
            conn,
            f'SELECT COUNT(*) as cnt FROM expenses{filter_sql}', params
        )
        count = count_row['cnt'] if count_row else 0

    return jsonify({
        'total':       round(total, 2),
        'count':       count,
        'by_category': by_cat,
        'by_date':     by_date,
        'trend':       list(reversed(trend))
    })

@app.route('/api/categories', methods=['GET'])
@login_required
def categories():
    with get_db() as conn:
        rows = fetch_all(conn, 'SELECT DISTINCT category FROM expenses WHERE user_id = ? ORDER BY category', (session['user_id'],))
    return jsonify([r['category'] for r in rows])

# ── User Profile Endpoints ───────────────────────────────
@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    with get_db() as conn:
        row = fetch_one(conn, 'SELECT * FROM user_profile WHERE user_id = ?', (session['user_id'],))
    return jsonify(row)

@app.route('/api/profile', methods=['POST'])
@login_required
def save_profile():
    data = request.json
    if not data or not data.get('name') or not data.get('profession'):
        return jsonify({'error': 'name and profession required'}), 400

    with get_db() as conn:
        existing = fetch_one(conn, 'SELECT id FROM user_profile WHERE user_id = ?', (session['user_id'],))
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if existing:
            execute_query(
                conn,
                "UPDATE user_profile SET name = ?, profession = ?, income = ?, updated_at = ? WHERE user_id = ?",
                (data['name'], data['profession'], float(data.get('income', 0)), now_str, session['user_id'])
            )
        else:
            execute_query(
                conn,
                'INSERT INTO user_profile (user_id, name, profession, income) VALUES (?, ?, ?, ?)',
                (session['user_id'], data['name'], data['profession'], float(data.get('income', 0)))
            )
    return jsonify({'message': 'Profile saved'})

# ── Budget Endpoints ─────────────────────────────────────
@app.route('/api/budget', methods=['POST'])
@login_required
def save_budget():
    data = request.json
    if not data or not data.get('monthly_budget'):
        return jsonify({'error': 'monthly_budget required'}), 400

    month_str = data.get('month', datetime.now().strftime('%Y-%m'))
    with get_db() as conn:
        existing = fetch_one(conn, 'SELECT id FROM budget_settings WHERE user_id = ? AND month = ?', (session['user_id'], month_str))
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if existing:
            execute_query(
                conn,
                "UPDATE budget_settings SET monthly_budget = ?, updated_at = ? WHERE user_id = ? AND month = ?",
                (float(data['monthly_budget']), now_str, session['user_id'], month_str)
            )
        else:
            execute_query(
                conn,
                'INSERT INTO budget_settings (user_id, month, monthly_budget) VALUES (?, ?, ?)',
                (session['user_id'], month_str, float(data['monthly_budget']))
            )
    return jsonify({'message': 'Budget saved', 'month': month_str})

@app.route('/api/budget/status', methods=['GET'])
@login_required
def budget_status():
    today     = date.today()
    month_str = today.strftime('%Y-%m')
    user_id   = session['user_id']

    with get_db() as conn:
        budget_row = fetch_one(
            conn,
            'SELECT monthly_budget FROM budget_settings WHERE user_id = ? AND month = ?', (user_id, month_str)
        )

        if not budget_row:
            return jsonify({'has_budget': False})

        monthly_budget  = budget_row['monthly_budget']
        days_in_month   = calendar.monthrange(today.year, today.month)[1]
        base_daily      = monthly_budget / days_in_month
        cumulative_carry = _get_carry_over(conn, user_id, today, base_daily)
        effective_limit = base_daily + cumulative_carry

        today_str = today.strftime('%Y-%m-%d')
        today_spent_row = fetch_one(
            conn,
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND date = ?', (user_id, today_str)
        )
        today_spent = today_spent_row['t'] if today_spent_row else 0.0

        monthly_total_row = fetch_one(
            conn,
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?",
            (user_id, month_str)
        )
        monthly_total = monthly_total_row['t'] if monthly_total_row else 0.0

        remaining = effective_limit - today_spent
        safe_lim  = max(effective_limit, 0.01)
        pct       = min((today_spent / safe_lim) * 100, 100)
        over      = today_spent > effective_limit

        # Profile for AI tip
        profile_row = fetch_one(conn, 'SELECT * FROM user_profile WHERE user_id = ?', (user_id,))
        profile = profile_row if profile_row else {'name': 'User', 'profession': 'Other'}

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

# ── Daily Reminders Endpoints ────────────────────────────
@app.route('/api/reminders/check', methods=['GET'])
@login_required
def check_reminder():
    today_str = date.today().isoformat()
    user_id = session['user_id']
    with get_db() as conn:
        count_row = fetch_one(
            conn,
            'SELECT COUNT(*) as cnt FROM expenses WHERE user_id = ? AND date = ?', (user_id, today_str)
        )
        count = count_row['cnt'] if count_row else 0
    return jsonify({'has_expenses_today': count > 0, 'date': today_str})

# ── AI Agent Endpoints ───────────────────────────────────
@app.route('/api/ai/suggest', methods=['POST'])
@login_required
def ai_suggest():
    data = request.json or {}
    user_id = session['user_id']
    expense = {
        'amount':   data.get('amount', 0),
        'category': data.get('category', 'Other'),
        'note':     data.get('note', ''),
        'date':     data.get('date', date.today().isoformat())
    }

    with get_db() as conn:
        profile_row = fetch_one(conn, 'SELECT * FROM user_profile WHERE user_id = ?', (user_id,))
        profile = profile_row if profile_row else {'name': 'User', 'profession': 'Other'}

        month_str = expense['date'][:7]
        monthly_total_row = fetch_one(
            conn,
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?",
            (user_id, month_str)
        )
        monthly_total = monthly_total_row['t'] if monthly_total_row else 0.0

        category_total_row = fetch_one(
            conn,
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses "
            "WHERE user_id = ? AND substr(date, 1, 7) = ? AND category = ?",
            (user_id, month_str, expense['category'])
        )
        category_total = category_total_row['t'] if category_total_row else 0.0

        budget_row = fetch_one(
            conn,
            'SELECT monthly_budget FROM budget_settings WHERE user_id = ? AND month = ?', (user_id, month_str)
        )

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

@app.route('/api/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    data = request.json or {}
    message = data.get('message', '').strip()
    history = data.get('history', [])
    user_id = session['user_id']

    if not message:
        return jsonify({'response': 'Please type a message.'}), 400

    with get_db() as conn:
        profile_row = fetch_one(conn, 'SELECT * FROM user_profile WHERE user_id = ?', (user_id,))
        profile = profile_row if profile_row else {'name': 'User', 'profession': 'Other'}

        today_str = date.today().isoformat()
        month_str = datetime.now().strftime('%Y-%m')

        today_spent_row = fetch_one(
            conn,
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND date = ?', (user_id, today_str)
        )
        today_spent = today_spent_row['t'] if today_spent_row else 0.0

        monthly_total_row = fetch_one(
            conn,
            "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?",
            (user_id, month_str)
        )
        monthly_total = monthly_total_row['t'] if monthly_total_row else 0.0

        top_rows = fetch_all(
            conn,
            "SELECT category, SUM(amount) as total FROM expenses "
            "WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY category ORDER BY total DESC LIMIT 3",
            (user_id, month_str)
        )
        top_cats = ', '.join([f"{r['category']} (₹{r['total']:.0f})" for r in top_rows])

        budget_row = fetch_one(
            conn,
            'SELECT monthly_budget FROM budget_settings WHERE user_id = ? AND month = ?', (user_id, month_str)
        )
        monthly_budget = budget_row['monthly_budget'] if budget_row else None

        effective_limit = None
        daily_limit     = None
        if monthly_budget:
            today_date    = date.today()
            days_in_month = calendar.monthrange(today_date.year, today_date.month)[1]
            base_daily    = monthly_budget / days_in_month
            daily_limit   = base_daily
            carry         = _get_carry_over(conn, user_id, today_date, base_daily)
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

@app.route('/api/ai/analysis', methods=['GET'])
@login_required
def ai_analysis():
    period = request.args.get('period', 'month')
    month  = request.args.get('month', datetime.now().strftime('%Y-%m'))
    year   = request.args.get('year',  str(datetime.now().year))
    user_id = session['user_id']

    with get_db() as conn:
        profile_row = fetch_one(conn, 'SELECT * FROM user_profile WHERE user_id = ?', (user_id,))
        profile = profile_row if profile_row else {'name': 'User', 'profession': 'Other'}

        if period == 'month':
            total_row = fetch_one(
                conn,
                "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?",
                (user_id, month)
            )
            total = total_row['t'] if total_row else 0.0

            by_cat = fetch_all(
                conn,
                "SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses "
                "WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY category ORDER BY total DESC", (user_id, month)
            )

            top_day = fetch_one(
                conn,
                "SELECT date, SUM(amount) as total FROM expenses "
                "WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY date ORDER BY total DESC LIMIT 1", (user_id, month)
            )

            tx_count_row = fetch_one(
                conn,
                "SELECT COUNT(*) as cnt FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?", (user_id, month)
            )
            tx_count = tx_count_row['cnt'] if tx_count_row else 0

            # Previous month
            dt = datetime.strptime(month, '%Y-%m')
            prev_dt = dt.replace(month=dt.month - 1) if dt.month > 1 else dt.replace(year=dt.year - 1, month=12)
            prev_month = prev_dt.strftime('%Y-%m')
            prev_total_row = fetch_one(
                conn,
                "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?",
                (user_id, prev_month)
            )
            prev_total = prev_total_row['t'] if prev_total_row else 0.0
            change_pct = ((total - prev_total) / prev_total * 100) if prev_total > 0 else 0

            budget_row = fetch_one(conn, 'SELECT monthly_budget FROM budget_settings WHERE user_id = ? AND month = ?', (user_id, month))

            data = {
                'period': 'month', 'month': month,
                'total': round(total, 2), 'count': tx_count,
                'by_category': by_cat,
                'top_day': top_day if top_day and top_day['date'] else None,
                'prev_month': prev_month, 'prev_total': round(prev_total, 2),
                'change_pct': round(change_pct, 1),
                'monthly_budget': budget_row['monthly_budget'] if budget_row else None
            }
        else:
            total_row = fetch_one(
                conn,
                "SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id = ? AND substr(date, 1, 4) = ?", (user_id, year)
            )
            total = total_row['t'] if total_row else 0.0

            by_month = fetch_all(
                conn,
                "SELECT substr(date, 1, 7) as month, SUM(amount) as total FROM expenses "
                "WHERE user_id = ? AND substr(date, 1, 4) = ? GROUP BY month ORDER BY month", (user_id, year)
            )

            by_cat = fetch_all(
                conn,
                "SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses "
                "WHERE user_id = ? AND substr(date, 1, 4) = ? GROUP BY category ORDER BY total DESC", (user_id, year)
            )

            tx_count_row = fetch_one(
                conn,
                "SELECT COUNT(*) as cnt FROM expenses WHERE user_id = ? AND substr(date, 1, 4) = ?", (user_id, year)
            )
            tx_count = tx_count_row['cnt'] if tx_count_row else 0

            data = {
                'period': 'year', 'year': year,
                'total': round(total, 2), 'count': tx_count,
                'by_month': by_month,
                'by_category': by_cat
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
    port = int(os.environ.get('PORT', 5000))
    print(f'\n  Agentic Expense Tracker running on http://127.0.0.1:{port}\n')
    app.run(host='0.0.0.0', port=port, debug=False)