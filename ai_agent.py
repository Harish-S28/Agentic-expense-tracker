"""
ai_agent.py — Agentic AI brain for the Expense Tracker.
Uses Google Gemini 1.5 Flash when an API key is provided.
Falls back to intelligent rule-based responses otherwise.
"""

import random
from datetime import datetime

# Optional Gemini import
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


# ─────────────────────────────────────────────────────────
#  Knowledge Base — Category Tips
# ─────────────────────────────────────────────────────────
CATEGORY_TIPS = {
    'food': {
        'high': [
            "Your food spending is quite high! Try meal prepping on weekends — it cuts costs by 40-50% and saves daily cooking time.",
            "Eating out frequently adds up fast. Follow the 80/20 rule: cook at home 80% of the time, eat out only for special occasions.",
            "High food budget! Look for local tiffin services or mess options — nutritious and 60% cheaper than restaurants.",
            "Consider buying groceries in bulk from wholesale stores — saves 15-20% monthly on your food bill."
        ],
        'normal': [
            "Food expense tracked! Pro tip: planning weekly meals in advance helps avoid impulse food orders.",
            "Good job! Cooking at home is both healthier AND more economical. Keep it balanced.",
            "Balanced food spending! Seasonal vegetables and lentils give maximum nutrition at minimum cost."
        ],
        'diet_tips': [
            "🥗 Diet tip: Lentils, legumes & seasonal veggies are nutritious AND budget-friendly!",
            "🥗 Intermittent fasting saves money on one meal while boosting health benefits.",
            "🥗 Reducing packaged food saves money and improves your nutrition significantly.",
            "🥗 Batch cooking on Sundays saves both time and money through the week!"
        ],
        'question': "Was this a restaurant meal, groceries, or food delivery?"
    },
    'transport': {
        'high': [
            "High transport costs! Monthly bus/metro passes are 25-30% cheaper than daily tickets.",
            "Transport adding up? Carpooling through Quick Ride or similar apps splits costs 50-50.",
            "For distances under 2km, walking or cycling is free AND great for your health!",
            "Consider switching to monthly passes or pooling — significant savings over time."
        ],
        'normal': [
            "Transport logged! Planning routes in advance reduces fuel costs by 10-15%.",
            "Combining multiple errands in one trip saves time and fuel — great habit!",
            "Reasonable transport spend. Monthly passes usually offer 20-30% better value."
        ],
        'question': "Was this for daily commute, outstation travel, or a special trip?"
    },
    'health': {
        'high': [
            "Health expense noted. Do you have health insurance? A good policy covers 80-90% of hospitalization costs.",
            "High medical spending — check government schemes like Ayushman Bharat which covers up to ₹5 lakh/year.",
            "Your health is an investment! That said, preventive care (regular exercise, healthy diet) reduces long-term medical costs."
        ],
        'normal': [
            "Health expense recorded. Prevention is cheaper than cure — regular checkups go a long way!",
            "Annual health checkup packages are often cheaper than individual diagnostic tests.",
            "Smart health spending! Yoga, meditation, and regular walks are free habits that reduce future medical costs."
        ],
        'question': "Was this a medicine purchase, consultation, diagnostic test, or gym/wellness?"
    },
    'bills': {
        'high': [
            "High utility bills! Check for energy vampires — standby devices consume 5-10% electricity. Unplug them!",
            "LED bulbs use 75% less energy than regular bulbs — a one-time investment that saves monthly.",
            "Run heavy appliances during off-peak hours, fix water leaks, and compare service providers annually."
        ],
        'normal': [
            "Bill paid on time — excellent financial habit! Consider auto-pay to never miss due dates.",
            "Bill tracked! Tip: compare utility providers annually — better rates are often available.",
            "Good bill management! Setting up reminders helps avoid costly late payment fees."
        ],
        'question': "Was this electricity, water, internet, mobile, or another utility bill?"
    },
    'shopping': {
        'high': [
            "Shopping spend is high! The 48-hour waiting rule: wait 2 days before any unplanned purchase — avoids 80% of impulse buys.",
            "High shopping! Stick to a monthly shopping list and avoid browsing sale sections without intent.",
            "Shopping adding up? The 'one in, one out' rule: for every new item, donate or sell one existing one."
        ],
        'normal': [
            "Shopping tracked! Sign up for cashback apps and credit card rewards to get money back on purchases.",
            "Reasonable shopping. Remember: a sale is only a deal if you actually needed the item!",
            "Smart tip: buy off-season items at a discount (winter clothes in summer and vice versa)."
        ],
        'question': "Was this clothing, electronics, household items, or personal care products?"
    },
    'entertainment': {
        'high': [
            "High entertainment spend! Parks, community events, and library memberships are free or low-cost alternatives.",
            "Share streaming subscriptions with family/friends — split the cost, keep all the fun!",
            "Look for discount days at cinemas and museums — often 30-50% off on weekdays."
        ],
        'normal': [
            "Entertainment tracked! Healthy spending on recreation keeps you refreshed and productive.",
            "Good balance on fun spending! Just set a monthly cap to avoid drift.",
            "Nice! Enjoying life within budget is the goal — you're doing it right."
        ],
        'question': "Was this movies, dining out, events, sports, or a hobby expense?"
    },
    'education': {
        'high': [
            "Education investment noted! Check free alternatives: YouTube, Coursera free tier, library resources — same knowledge for free.",
            "High education spend? Look for scholarships, employer reimbursements, or government schemes.",
            "Online courses are often 50-80% cheaper than in-person classes with similar quality."
        ],
        'normal': [
            "Education expense logged — investing in yourself always has the best ROI!",
            "Learning pays! Look for group discounts or bundle deals on courses.",
            "Great habit! Many skills can be self-taught free via YouTube and open-source platforms."
        ],
        'question': "Was this a course fee, books, exam fee, or professional certification?"
    },
    'other': {
        'high': [
            "High 'Other' expenses — consider breaking these into specific categories for better tracking.",
            "Miscellaneous spending is hard to control. Try assigning specific categories to each expense.",
            "The more specific your categories, the better your financial insights and control."
        ],
        'normal': [
            "Expense logged! Using specific categories gives you more actionable financial insights.",
            "Good tracking! Try to categorize expenses specifically for better monthly analysis.",
            "Nice! Consistent tracking, even of misc expenses, builds great financial awareness."
        ],
        'question': "Can you add more details in the note so we can track this better?"
    }
}


# ─────────────────────────────────────────────────────────
#  Knowledge Base — Profession Context
# ─────────────────────────────────────────────────────────
PROFESSION_CONTEXT = {
    'student': {
        'label': 'Student',
        'priorities': 'avoid debt, build savings habits, invest in education',
        'tips': [
            "Use your student ID for discounts — most apps, cinemas, and services offer student pricing.",
            "Cook in your hostel/PG kitchen instead of eating out — saves ₹2,000-4,000/month easily.",
            "Buy second-hand textbooks or use library copies — save 80% on books.",
            "The GitHub Student Pack gives ₹50,000+ in free developer tools — grab it!",
            "Start a ₹100/day savings habit. In a year, that's ₹36,500 — a solid emergency fund.",
            "Track every rupee — financial discipline built in college lasts a lifetime.",
            "Use UPI cashback offers from Paytm, PhonePe, CRED — free money on payments you'd make anyway."
        ]
    },
    'doctor': {
        'label': 'Doctor',
        'priorities': 'track professional vs personal expenses, invest for retirement, maintain work-life balance',
        'tips': [
            "Track professional expenses separately from personal — many qualify for tax deductions.",
            "Medical equipment and books are deductible — keep all receipts.",
            "Consider term insurance early — premiums are lowest when you're young and healthy.",
            "Automate savings (SIP/auto-debit) since your schedule leaves little time for manual tracking.",
            "Join a professional financial advisor network for doctor-specific tax planning.",
            "Malpractice insurance should be in your monthly budget — don't skip it.",
            "Invest in real estate or index funds early — compound interest works in your favor."
        ]
    },
    'business': {
        'label': 'Business Person',
        'priorities': 'separate business/personal finances, plan taxes, reinvest strategically',
        'tips': [
            "Open a separate current account for business expenses — keeps finances clean for taxes.",
            "Track every business expense: fuel, meals, travel — they're often deductible.",
            "Build a 6-month emergency fund for business downturns — it's a lifeline.",
            "Review subscriptions quarterly — cancel unused SaaS tools (they add up fast!).",
            "Reinvest 20-30% of profits back into business growth before taking personal profit.",
            "Use GST filing to reclaim input tax credits — significant savings for B2B businesses.",
            "Separate personal salary from business revenue — pay yourself a fixed salary first."
        ]
    },
    'parent': {
        'label': 'Parent',
        'priorities': "children's future, family health security, build education corpus",
        'tips': [
            "Start a Sukanya Samriddhi or PPF for your child's future — tax-free and high returns.",
            "Family health insurance is 40% cheaper than individual plans — switch if you haven't.",
            "Plan school fee payments in advance — avoid expensive emergency loans.",
            "Grocery shopping in bulk saves 15-20% monthly — great for large families.",
            "Teach children money management early — it saves future family financial stress.",
            "Child education SIP: ₹2,000/month from birth = ₹11 lakh by age 18 (at 12% returns).",
            "Review your term insurance cover every 2-3 years as family expenses grow."
        ]
    },
    'employee': {
        'label': 'Employee',
        'priorities': 'maximize savings rate, plan for retirement, build emergency fund',
        'tips': [
            "Follow the 50-30-20 rule: 50% needs, 30% wants, 20% savings — simple and effective.",
            "Max out your EPF contribution — it's a guaranteed 8%+ return with tax benefits.",
            "Build a 3-6 month salary emergency fund before investing in the market.",
            "Start a monthly SIP — even ₹500/month grows significantly over 20+ years.",
            "Claim all eligible tax deductions: 80C, 80D, HRA, LTA — save ₹20,000-50,000/year.",
            "Negotiate salary hike annually — even 10% annual increase doubles income in 7 years.",
            "Review your expenses every Sunday — 30 minutes/week saves thousands per year."
        ]
    },
    'other': {
        'label': 'Professional',
        'priorities': 'build savings habit, track expenses, create financial goals',
        'tips': [
            "Track all expenses for 1 month — awareness alone reduces spending by 10-15%.",
            "Automate savings: set up auto-debit on salary day — spend what is LEFT, not save what's left.",
            "Build a 3-month emergency fund before investing — it prevents panic selling.",
            "Review your biggest 3 expense categories — cutting 10% each saves significantly.",
            "Use expense tracking consistently for 90 days — it builds a life-changing habit.",
            "Cancel one unused subscription today — that's immediate savings.",
            "Set a specific financial goal (vacation, gadget, emergency fund) — goals drive savings."
        ]
    }
}


# ─────────────────────────────────────────────────────────
#  AIAgent Class
# ─────────────────────────────────────────────────────────
class AIAgent:
    def __init__(self, api_key=None):
        self.has_gemini = False
        self.api_key    = api_key

        if api_key and GEMINI_AVAILABLE:
            try:
                genai.configure(api_key=api_key)
                models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest']
                connected = False
                for model_name in models_to_try:
                    try:
                        self.model = genai.GenerativeModel(model_name)
                        # Light test call to verify permissions for this key
                        self.model.generate_content("Ping", generation_config={"max_output_tokens": 1})
                        self.has_gemini = True
                        connected = True
                        print(f"  AI Agent: Connected using model '{model_name}'")
                        break
                    except Exception:
                        continue
                if not connected:
                    raise Exception("No supported models responded successfully. Verify your API key.")
            except Exception as e:
                print(f"  Gemini init failed: {e}")
                self.has_gemini = False

    # ── Public Methods ────────────────────────────────────

    def get_suggestion(self, expense, profile, monthly_context=None):
        """Get personalized suggestion after adding an expense."""
        if self.has_gemini:
            return self._gemini_suggestion(expense, profile, monthly_context)
        return self._rule_suggestion(expense, profile, monthly_context)

    def get_budget_tip(self, budget_data, profile):
        """Get AI tip for current budget status."""
        if self.has_gemini:
            return self._gemini_budget_tip(budget_data, profile)
        return self._rule_budget_tip(budget_data, profile)

    def get_chat_response(self, message, history, context):
        """Get chatbot response with financial context."""
        if self.has_gemini:
            return self._gemini_chat(message, history, context)
        return self._rule_chat(message, context)

    def get_analysis(self, data, profile):
        """Get monthly or yearly financial analysis."""
        if self.has_gemini:
            return self._gemini_analysis(data, profile)
        return self._rule_analysis(data, profile)

    # ── Gemini Methods ────────────────────────────────────

    def _gemini_suggestion(self, expense, profile, monthly_context):
        name       = profile.get('name', 'User')
        profession = profile.get('profession', 'Other')
        category   = expense.get('category', 'Other')
        amount     = expense.get('amount', 0)
        note       = expense.get('note', '')

        ctx_str = ''
        if monthly_context:
            mb = monthly_context.get('monthly_budget')
            mb_str = f"₹{mb:.0f}" if mb else "Not set"
            ctx_str = (
                f"\nMonthly context ({datetime.now().strftime('%B %Y')}):"
                f"\n- Total spent this month: ₹{monthly_context.get('monthly_total', 0):.0f}"
                f"\n- {category} total this month: ₹{monthly_context.get('category_total', 0):.0f}"
                f"\n- Monthly budget: {mb_str}"
            )

        prompt = f"""You are a friendly personal financial AI for {name}, who is a {profession}.

They just logged: {category} expense of ₹{amount}{f' — Note: {note}' if note else ''}.{ctx_str}

Respond in 3-4 sentences MAX:
1. Briefly acknowledge the expense with a warm, specific observation.
2. Ask ONE relevant question about this specific expense (e.g. for Food: "Was this restaurant or groceries?").
3. Give ONE practical money-saving tip for this category, tailored to their profession as a {profession}.
4. If monthly spending in {category} looks high, gently suggest reducing — but be encouraging, not preachy.

Tone: conversational, friendly, specific. Use Indian context (₹, Indian examples). Plain text only — no bullet points, no markdown."""

        try:
            resp = self.model.generate_content(prompt)
            return resp.text.strip()
        except Exception:
            return self._rule_suggestion(expense, profile, monthly_context)

    def _gemini_budget_tip(self, budget_data, profile):
        name       = profile.get('name', 'User')
        profession = profile.get('profession', 'Other')
        el  = budget_data.get('effective_limit', 0)
        ts  = budget_data.get('today_spent', 0)
        cc  = budget_data.get('cumulative_carry', 0)
        bdd = budget_data.get('base_daily', 0)
        over = budget_data.get('over', False)

        carry_desc = (f"₹{cc:.0f} bonus from saving previous days"
                      if cc >= 0 else f"₹{abs(cc):.0f} deficit from previous overspending")

        prompt = f"""Financial AI for {name} ({profession}).

Budget today:
- Base daily limit: ₹{bdd:.0f}
- Carry-over: {carry_desc}
- Today's effective limit: ₹{el:.0f}
- Spent so far today: ₹{ts:.0f}
- Status: {'⚠️ OVER BUDGET' if over else '✅ Within budget'}

Write a 1-2 sentence personalized tip. Be specific, warm, actionable. Use ₹. No markdown."""

        try:
            resp = self.model.generate_content(prompt)
            return resp.text.strip()
        except Exception:
            return self._rule_budget_tip(budget_data, profile)

    def _gemini_chat(self, message, history, context):
        profile   = context.get('profile', {})
        name      = profile.get('name', 'User')
        profession = profile.get('profession', 'Other')

        sys_ctx = f"""You are a personal financial AI assistant for {name}, a {profession}.

Financial snapshot:
- Today's spending: ₹{context.get('today_spent', 0):.0f}
- This month's total: ₹{context.get('monthly_total', 0):.0f}
- Monthly budget: {f"₹{context['monthly_budget']:.0f}" if context.get('monthly_budget') else 'Not set'}
- Today's effective daily limit: {f"₹{context['effective_limit']:.0f}" if context.get('effective_limit') else 'Not set'}
- Top spending categories: {context.get('top_categories', 'No data yet')}

Answer helpfully, concisely (3-5 sentences), with Indian financial context (₹, Indian examples).
Be encouraging but honest about overspending. Make suggestions specific and actionable."""

        # Build Gemini chat history (last 10 messages)
        chat_history = []
        for msg in history[-10:]:
            role = 'user' if msg['role'] == 'user' else 'model'
            chat_history.append({'role': role, 'parts': [msg['content']]})

        try:
            chat = self.model.start_chat(history=chat_history)
            full_msg = f"{sys_ctx}\n\nUser: {message}"
            resp = chat.send_message(full_msg)
            return resp.text.strip()
        except Exception:
            return self._rule_chat(message, context)

    def _gemini_analysis(self, data, profile):
        name       = profile.get('name', 'User')
        profession = profile.get('profession', 'Other')
        period     = data.get('period', 'month')

        if period == 'month':
            month     = data.get('month', '')
            total     = data.get('total', 0)
            by_cat    = data.get('by_category', [])
            prev_total = data.get('prev_total', 0)
            change_pct = data.get('change_pct', 0)
            budget    = data.get('monthly_budget')

            cats_str  = '\n'.join([
                f"- {c['category']}: ₹{c['total']:.0f} ({c['count']} transactions)"
                for c in by_cat
            ])
            budget_str = f"Monthly budget: ₹{budget:.0f}" if budget else "No monthly budget set"

            prompt = f"""Write a detailed monthly financial analysis report for {name} ({profession}).

Month: {month}
Total Spent: ₹{total:.0f}
{budget_str}
Previous Month: ₹{prev_total:.0f} (Change: {'+' if change_pct > 0 else ''}{change_pct:.1f}%)

Category Breakdown:
{cats_str}

Write 200-250 words covering:
1. Overall assessment of spending for a {profession} — high/low/reasonable?
2. Top 2 categories (specific reduction tips for each)
3. Categories where spending can safely increase (if any)
4. Month-over-month comparison insight
5. ONE specific, actionable recommendation for next month

Tone: friendly, encouraging, specific. Indian financial context. Clear paragraphs. No bullet lists in main text."""

        else:
            year   = data.get('year', '')
            total  = data.get('total', 0)
            by_mon = data.get('by_month', [])
            by_cat = data.get('by_category', [])

            mon_str = '\n'.join([f"- {m['month']}: ₹{m['total']:.0f}" for m in by_mon])
            cat_str = '\n'.join([f"- {c['category']}: ₹{c['total']:.0f}" for c in by_cat])

            prompt = f"""Write a comprehensive yearly financial analysis for {name} ({profession}).

Year: {year}
Total Annual Spending: ₹{total:.0f}

Monthly Breakdown:
{mon_str}

Top Categories:
{cat_str}

Write 250-300 words covering:
1. Annual spending overview — reasonable for a {profession}?
2. Best month (lowest) — why it might have been lower
3. Highest month — likely causes and lessons
4. Top 2 categories — how to reduce next year
5. Specific financial goals to set for next year

Tone: encouraging, insightful, actionable. Indian context. Clear paragraphs. No bullet lists."""

        try:
            resp = self.model.generate_content(prompt)
            return resp.text.strip()
        except Exception:
            return self._rule_analysis(data, profile)

    # ── Rule-Based Fallback Methods ───────────────────────

    def _rule_suggestion(self, expense, profile, monthly_context=None):
        category   = expense.get('category', 'Other').lower()
        amount     = float(expense.get('amount', 0))
        profession = profile.get('profession', 'other').lower()
        name       = profile.get('name', 'there')

        # Spending thresholds (₹) to classify as "high"
        thresholds = {
            'food': 300, 'transport': 200, 'health': 500,
            'bills': 1000, 'shopping': 500, 'entertainment': 400,
            'education': 800, 'other': 300
        }
        threshold = thresholds.get(category, 300)
        is_high   = amount > threshold

        cat_key  = category if category in CATEGORY_TIPS else 'other'
        prof_key = profession if profession in PROFESSION_CONTEXT else 'other'
        tips     = CATEGORY_TIPS[cat_key]
        prof     = PROFESSION_CONTEXT[prof_key]

        if is_high:
            tip  = random.choice(tips['high'])
            resp = f"Hey {name}! ₹{amount:.0f} on {expense.get('category')} is on the higher side. {tip}"
        else:
            tip  = random.choice(tips['normal'])
            resp = f"Got it, {name}! {tip}"

        # Ask a category-specific question
        resp += f"\n\n💬 {tips.get('question', 'What was this expense for?')}"

        # Add diet tip for food
        if cat_key == 'food':
            resp += f"\n\n{random.choice(tips['diet_tips'])}"

        # Add profession tip
        prof_tip = random.choice(prof['tips'])
        resp += f"\n\n💼 Tip for {prof['label']}s: {prof_tip}"

        return resp

    def _rule_budget_tip(self, budget_data, profile):
        name = profile.get('name', 'there')
        el   = budget_data.get('effective_limit', 0)
        ts   = budget_data.get('today_spent', 0)
        cc   = budget_data.get('cumulative_carry', 0)
        bdd  = budget_data.get('base_daily', 0)
        over = budget_data.get('over', False)
        rem  = el - ts

        if over:
            owe  = abs(rem)
            tmr  = max(0, bdd - owe)
            return f"⚠️ You've gone ₹{owe:.0f} over your limit today, {name}! Try to spend only ₹{tmr:.0f} tomorrow to get back on track."
        elif cc > bdd:
            return f"🎉 Big savings bonus of ₹{cc:.0f}! Today's limit is ₹{el:.0f} — but stay disciplined even with extra room!"
        elif cc > 0:
            return f"✨ Nice streak, {name}! You saved ₹{cc:.0f} from previous days — today's boosted limit is ₹{el:.0f}. Keep it up!"
        elif cc < 0:
            return f"⚡ You owe ₹{abs(cc):.0f} from previous overspending. Today's reduced limit is ₹{el:.0f} — let's recover it!"
        else:
            return f"🎯 Fresh day, {name}! Daily limit: ₹{el:.0f} | Spent: ₹{ts:.0f} | Remaining: ₹{rem:.0f}. You've got this!"

    def _rule_chat(self, message, context):
        msg        = message.lower()
        profile    = context.get('profile', {})
        name       = profile.get('name', 'there')
        profession = profile.get('profession', 'other').lower()
        ts         = context.get('today_spent', 0)
        mt         = context.get('monthly_total', 0)
        mb         = context.get('monthly_budget', 0)
        el         = context.get('effective_limit', 0)
        top_cats   = context.get('top_categories', '')
        prof_key   = profession if profession in PROFESSION_CONTEXT else 'other'
        prof       = PROFESSION_CONTEXT[prof_key]

        if any(w in msg for w in ['hi', 'hello', 'hey', 'start', 'help']):
            return (f"Hello {name}! 👋 I'm your personal financial AI. I can help you with:"
                    f"\n• Today's or monthly spending summary"
                    f"\n• Budget status and daily limits"
                    f"\n• Saving tips as a {prof['label']}"
                    f"\n• Category spending insights\n\nWhat would you like to know?")

        elif any(w in msg for w in ['today', 'spent today', 'today spend', 'how much today']):
            status = '✅ Within your daily limit!' if el and ts <= el else ('⚠️ Over limit!' if el else '')
            return (f"Today you've spent ₹{ts:.0f}, {name}. {status}"
                    + (f" Your effective limit is ₹{el:.0f}, so ₹{max(0,el-ts):.0f} remaining." if el else ''))

        elif any(w in msg for w in ['month', 'this month', 'monthly', 'total']):
            budget_info = f" Monthly budget: ₹{mb:.0f} — ₹{max(0,mb-mt):.0f} remaining." if mb else ''
            return f"This month you've spent ₹{mt:.0f}, {name}.{budget_info}"

        elif any(w in msg for w in ['budget', 'limit', 'how much left', 'remaining']):
            if el:
                rem = el - ts
                status = '🟢 Within limit!' if rem >= 0 else f'🔴 Exceeded by ₹{abs(rem):.0f}!'
                return f"Today's effective limit: ₹{el:.0f} | Spent: ₹{ts:.0f} | {status} Remaining: ₹{max(0,rem):.0f}."
            return "You haven't set a monthly budget yet. Go to the **Budget** page to set one!"

        elif any(w in msg for w in ['category', 'categories', 'most', 'where', 'what', 'spend most', 'highest']):
            if top_cats:
                return f"Your top spending categories this month: {top_cats}. Focus on the highest ones to find your biggest saving opportunities!"
            return "No expense data yet for this month. Start logging expenses to see category insights!"

        elif any(w in msg for w in ['save', 'saving', 'tip', 'advice', 'suggest', 'how to']):
            tip = random.choice(prof['tips'])
            return f"💡 Saving tip for {prof['label']}s, {name}: {tip}"

        elif any(w in msg for w in ['analysis', 'report', 'summary', 'review']):
            return "Go to the **Analysis** page for your full monthly and yearly AI financial report!"

        elif any(w in msg for w in ['on track', 'doing', 'good', 'well', 'status']):
            if mb:
                pct = (mt / mb * 100) if mb else 0
                emoji = '🟢' if pct < 70 else ('🟡' if pct < 90 else '🔴')
                return (f"{emoji} {name}, you've used {pct:.1f}% of your monthly budget "
                        f"(₹{mt:.0f} of ₹{mb:.0f}). "
                        f"{'Looking great!' if pct < 70 else ('Watch out, getting close to limit!' if pct < 90 else 'Over budget — time to cut back!')}")
            return f"You've spent ₹{mt:.0f} this month. Set a budget on the Budget page to track progress!"

        elif any(w in msg for w in ['food', 'transport', 'health', 'bills', 'shopping', 'entertainment', 'education']):
            for cat in CATEGORY_TIPS:
                if cat in msg:
                    tip = random.choice(CATEGORY_TIPS[cat]['normal'])
                    return f"About {cat} expenses: {tip}"

        # Default response
        responses = [
            f"I'm your financial AI, {name}! Ask me: 'How much did I spend today?', 'Am I on budget?', 'Give me saving tips', or 'What's my top expense category?'",
            f"Good question! I can help with spending summaries, budget status, category analysis, and personalized saving tips for {prof['label']}s.",
            f"Try asking me: 'How much this month?', 'What's my daily limit?', 'Where should I cut spending?', or 'Give me a tip'!"
        ]
        return random.choice(responses)

    def _rule_analysis(self, data, profile):
        name       = profile.get('name', 'User')
        profession = profile.get('profession', 'other').lower()
        period     = data.get('period', 'month')
        prof_key   = profession if profession in PROFESSION_CONTEXT else 'other'
        prof       = PROFESSION_CONTEXT[prof_key]

        if period == 'month':
            total      = data.get('total', 0)
            by_cat     = data.get('by_category', [])
            prev_total = data.get('prev_total', 0)
            change_pct = data.get('change_pct', 0)
            month      = data.get('month', '')
            budget     = data.get('monthly_budget')
            count      = data.get('count', 0)
            top_day    = data.get('top_day')

            out = [f"📊 Monthly Analysis — {month}\n"]
            out.append(f"Hey {name}! Here's your financial snapshot for {month}.\n")

            # Overall assessment
            if budget:
                pct = (total / budget * 100) if budget else 0
                status = 'excellent' if pct < 70 else ('reasonable' if pct < 90 else 'over budget')
                out.append(f"You spent ₹{total:.0f} out of your ₹{budget:.0f} budget ({pct:.1f}% used) — {status}.")
            else:
                out.append(f"You spent ₹{total:.0f} across {count} transactions this month.")

            # Month-over-month
            if prev_total > 0:
                arrow = '📈' if change_pct > 0 else '📉'
                out.append(f"{arrow} That's {'+' if change_pct > 0 else ''}{change_pct:.1f}% vs last month (₹{prev_total:.0f}).")

            # Top spending day
            if top_day:
                out.append(f"🔥 Highest spending day: {top_day['date']} with ₹{top_day['total']:.0f}.")

            out.append("")

            # Category breakdown
            if by_cat:
                out.append("🔍 Category Insights:")
                for i, cat in enumerate(by_cat[:3]):
                    cat_name = cat['category']
                    cat_pct  = (cat['total'] / total * 100) if total > 0 else 0
                    cat_key  = cat_name.lower() if cat_name.lower() in CATEGORY_TIPS else 'other'
                    if i == 0:  # Top spender — give reduction tip
                        tip = random.choice(CATEGORY_TIPS[cat_key]['high'])
                        out.append(f"\n• {cat_name}: ₹{cat['total']:.0f} ({cat_pct:.1f}%) ← Top spend")
                        out.append(f"  💡 {tip}")
                    else:
                        out.append(f"\n• {cat_name}: ₹{cat['total']:.0f} ({cat_pct:.1f}%)")

            out.append("")
            out.append(f"👔 As a {prof['label']}, focus on: {prof['priorities']}.")
            out.append(f"\n✅ Action for next month: {random.choice(prof['tips'])}")

            return '\n'.join(out)

        else:  # year
            year   = data.get('year', '')
            total  = data.get('total', 0)
            by_mon = data.get('by_month', [])
            by_cat = data.get('by_category', [])
            count  = data.get('count', 0)

            out = [f"📅 Annual Analysis — {year}\n"]
            out.append(f"Hey {name}! Here's your complete financial review for {year}.\n")
            out.append(f"You spent ₹{total:.0f} across {count} transactions this year.")

            if total > 0:
                avg_monthly = total / 12
                out.append(f"Average monthly spend: ₹{avg_monthly:.0f}.")

            if by_mon:
                best  = min(by_mon, key=lambda m: m['total'])
                worst = max(by_mon, key=lambda m: m['total'])
                out.append(f"\n📉 Best month: {best['month']} (₹{best['total']:.0f}) — disciplined spending!")
                out.append(f"📈 Highest month: {worst['month']} (₹{worst['total']:.0f}) — worth reviewing what drove it.")

            out.append("")
            if by_cat:
                out.append("🔍 Annual Category Breakdown:")
                for cat in by_cat[:4]:
                    pct = (cat['total'] / total * 100) if total > 0 else 0
                    out.append(f"• {cat['category']}: ₹{cat['total']:.0f} ({pct:.1f}%)")

            out.append("")
            out.append(f"👔 As a {prof['label']}, your goal for next year: {prof['priorities']}.")
            out.append(f"\n🚀 Financial resolution: {random.choice(prof['tips'])}")

            # Savings potential
            if total > 0:
                potential = total * 0.15
                out.append(f"\n💰 Saving potential: A 15% reduction in spending would save you ₹{potential:.0f} next year!")

            return '\n'.join(out)
