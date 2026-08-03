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
    'food & dining': {
        'high': [
            "Your dining expenses are high! Cooking at home or using a local tiffin service can cut costs by 40-50% compared to restaurants.",
            "Eating out frequently adds up fast. Try the 80/20 rule: cook 80% of the time, and reserve dining out for weekends."
        ],
        'normal': [
            "Dining expense tracked! Pre-planning weekly meals is both healthier and more economical.",
            "Good job keeping your food bills balanced. Cooking at home is a great habit!"
        ],
        'diet_tips': [
            "🥗 Diet tip: Lentils, legumes & seasonal veggies are nutritious AND budget-friendly!",
            "🥗 Batch cooking on Sundays saves both time and money through the week!"
        ],
        'question': "Was this a restaurant meal, food delivery, or cafe visit?"
    },
    'groceries & household': {
        'high': [
            "High grocery bill! Consider buying staples in bulk from wholesale stores — saves 15-20% monthly.",
            "Stick to a weekly shopping list and avoid shopping on an empty stomach to prevent impulse purchases."
        ],
        'normal': [
            "Groceries logged! Keeping staples stocked at home prevents expensive last-minute food orders.",
            "Balanced groceries spend. Buying seasonal produce is a smart way to save."
        ],
        'question': "Did you buy monthly staples, fresh veggies, or household cleaning supplies?"
    },
    'housing & rent': {
        'high': [
            "Housing is a major fixed cost. If rent exceeds 35% of your income, consider roommate sharing or negotiating rent.",
            "High housing expenses! Look for ways to lower utility bills or check for lower-rent options nearby."
        ],
        'normal': [
            "Housing payment logged. Keeping this stable is the foundation of a solid monthly budget.",
            "Rent/housing expense tracked. Fixed expenses are the easiest to budget around once set."
        ],
        'question': "Is this rent, PG fee, maintenance fee, or society charges?"
    },
    'utilities & bills': {
        'high': [
            "High utilities! Check for phantom power draw — unplug devices on standby to save 5-10% electricity.",
            "Compare mobile and internet providers annually. Better promotional rates are often available for the same service."
        ],
        'normal': [
            "Bill paid on time — excellent financial habit! Set up auto-pay to never miss due dates.",
            "Good bill management! Prompt payment avoids expensive late fees."
        ],
        'question': "Was this electricity, water, gas, internet, or mobile recharge?"
    },
    'transportation & fuel': {
        'high': [
            "High transport costs! Monthly transit passes or carpooling can split commute costs in half.",
            "Fuel costs adding up? Combine multiple errands into one trip and maintain proper tire pressure for better mileage."
        ],
        'normal': [
            "Commute expense logged. Public transit is a great way to save money and reduce carbon footprint.",
            "Transport tracked. Errand planning and routes optimization save fuel over time."
        ],
        'question': "Was this fuel, public transit, cab booking, or toll charges?"
    },
    'health & medical': {
        'high': [
            "Medical expense logged. Do you have a health insurance policy? A good cover prevents unexpected financial shocks.",
            "High medical spending — buy generic medicines instead of branded ones, they are 50-80% cheaper and have the same efficacy."
        ],
        'normal': [
            "Health expense tracked. Preventive care, regular exercise, and healthy eating are the best free healthcare investments.",
            "Smart health spend. Regular checkups can catch issues early, saving massive future medical bills."
        ],
        'question': "Was this medicines, doctor consultation, wellness, or tests?"
    },
    'education & tuition': {
        'high': [
            "Self-investment has the best ROI! However, check for free educational materials on YouTube, Coursera, or library books first.",
            "High course fees? Look for group enrollment discounts, scholarships, or employer reimbursement."
        ],
        'normal': [
            "Education tracked! Developing new skills pays off majorly in career growth and earning potential.",
            "Great habit. Keep investing in certifications and books to stay ahead professionally."
        ],
        'question': "Is this school/college fee, certification course, books, or exam fee?"
    },
    'entertainment & leisure': {
        'high': [
            "High leisure spending! Parks, community events, and board games are great free or low-cost alternatives.",
            "Watch out for lifestyle creep. Try setting a strict weekend budget for movies and events."
        ],
        'normal': [
            "Leisure expense logged. Recharging is vital for work-life balance — as long as it's budgeted!",
            "Good balance on fun spending! Enjoying life within your limit is the goal."
        ],
        'question': "Was this movie tickets, concert, event, or hobby costs?"
    },
    'shopping & apparel': {
        'high': [
            "Shopping is high! Try the 48-hour rule: wait 2 days before any impulse purchase to see if you still need it.",
            "High shopping! Stick to a list and avoid sales sections unless you actually planned to buy the item."
        ],
        'normal': [
            "Shopping logged. Buying off-season clothes or using cashback apps is a smart shopping technique.",
            "Nice. A sale is only a discount if you had the item on your list already!"
        ],
        'question': "Was this clothes, shoes, electronics, or home decor?"
    },
    'travel & vacation': {
        'high': [
            "High travel cost! Book flights in advance, travel during off-peak seasons, and set up fare alerts to save.",
            "Vacation expense tracked. Create a separate monthly savings pot for travel so it doesn't hurt your main budget."
        ],
        'normal': [
            "Travel logged. Hope you had a great trip! Budgeting for travel in advance is the smart way to explore.",
            "Safe travels! Allocating a travel fund keeps your regular monthly finances safe."
        ],
        'question': "Is this tickets booking, hotel stay, tour package, or local transport?"
    },
    'emi, loans & debt': {
        'high': [
            "Debt payments are high. Try the debt avalanche method: focus extra payments on the loan with the highest interest rate.",
            "Avoid taking high-interest personal or consumer loans. Focus on clearing credit card balances first."
        ],
        'normal': [
            "EMI payment logged. Paying loans on time is critical to maintaining a healthy credit score.",
            "Debt payment tracked. Staying consistent with repayments keeps interest costs from compounding."
        ],
        'question': "Was this home loan, car loan, student loan, or credit card repayment?"
    },
    'investments & savings': {
        'high': [
            "Incredible! Investing your money is the single best way to achieve financial independence early.",
            "Excellent savings rate! Your future self will thank you for compounding this money."
        ],
        'normal': [
            "Savings logged! Automating your mutual fund SIPs ensures you pay yourself first before spending.",
            "Great job. Consistency beats amount when it comes to investing regularly."
        ],
        'question': "Was this mutual funds, stocks, PPF, gold, or emergency fund?"
    },
    'gifts & donations': {
        'high': [
            "Very generous! Consider setting a yearly gift budget so birthdays and festive seasons don't surprise your wallet.",
            "Donations tracked. Ensure you get 80G tax certificates for eligible donations to claim tax benefits."
        ],
        'normal': [
            "Gifts logged. Celebrating loved ones and helping communities is a wonderful use of money.",
            "Generosity tracked. Sticking to a gift budget keeps your own financial goals on track."
        ],
        'question': "Was this birthday gift, wedding gift, charity, or festive donation?"
    },
    'personal care & wellness': {
        'high': [
            "High wellness spend! Look for gym membership discounts, or buy wellness/skincare products during seasonal sales.",
            "Self-care is important, but watch out for premium salon markups. Look for local quality alternatives."
        ],
        'normal': [
            "Wellness spend tracked. Investing in physical and mental wellness is always a good idea.",
            "Nice. Budgeting for grooming and self-care keeps you feeling your best."
        ],
        'question': "Was this salon visit, cosmetics, spa, or gym subscription?"
    },
    'pets & animal care': {
        'high': [
            "Pet costs can add up! Save on vet bills with regular checkups, and buy pet food in bulk online.",
            "Furry friends are family! Just watch out for expensive pet accessories that they might not actually need."
        ],
        'normal': [
            "Pet care logged. Keeping your pet healthy and happy is a worthy budget item.",
            "Pet supplies tracked. They deserve the best care within a reasonable budget!"
        ],
        'question': "Was this pet food, vet consultation, grooming, or pet toys?"
    },
    'maintenance & repairs': {
        'high': [
            "Repairs logged. Regular servicing of appliances and vehicles prevents massive emergency breakdown costs.",
            "High repair bill! Consider getting AMC (Annual Maintenance Contracts) for critical appliances."
        ],
        'normal': [
            "Maintenance tracked. Keeping your car or house in top shape preserves its value over time.",
            "Smart maintenance. Minor fixes now prevent major replacement costs down the road."
        ],
        'question': "Was this car/bike service, house repair, appliance servicing, or plumbing?"
    },
    'business & office': {
        'high': [
            "Business expense logged. Keep all receipts separate and organized to claim tax deductions at the end of the year.",
            "Evaluate business software tools quarterly. Cancel unused SaaS tools to prevent cost leaks."
        ],
        'normal': [
            "Office expense logged. Investing in tools that increase productivity is a smart move.",
            "Business spend tracked. Keep business and personal finances separate for tax safety."
        ],
        'question': "Was this office rent, software, advertising, or stationery?"
    },
    'subscriptions & streaming': {
        'high': [
            "Subscription creep! Audit your Netflix, Spotify, gym and newsletter subscriptions. Cancel anything unused for 30 days.",
            "High subscription costs! Look for family plans to share with friends and split the monthly bill."
        ],
        'normal': [
            "Subscription tracked. Automating recurring payments avoids service disruptions.",
            "Balanced subscriptions. Only pay for the entertainment and tools you actually use."
        ],
        'question': "Was this video streaming, music, software subscription, or gym?"
    },
    'miscellaneous': {
        'high': [
            "High miscellaneous spend! Try to break these down into specific categories next time for better analysis.",
            "Miscellaneous spending is hard to control. Giving each expense a clear category provides better control."
        ],
        'normal': [
            "Misc expense logged. Sticking to defined categories yields the most actionable dashboard insights.",
            "Logged. Adding comments/notes to misc expenses helps you remember what they were for."
        ],
        'question': "Can you add a detailed note so we know what this expense was for?"
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
