# SpendLog AI — Agentic Personal Expense Tracker

SpendLog AI is a next-generation personal expense tracker featuring an agentic financial assistant, daily limits, smart notifications, and automated report generators.

## 🚀 Key Features

1. **Daily reminders (2x/day)**: Automatically queries your transactions and pushes browser + toast alerts at 9:00 AM and 7:00 PM if no expenses have been recorded yet.
2. **AI-driven advice per category**: Learns which food, transport, or health categories you spend most on, then provides diet tips, medical recommendations, and custom alerts.
3. **Onboarding & Personas**: Dynamically personalizes prompts based on whether you are a **Student**, **Doctor**, **Business Person**, **Parent**, or **Employee**.
4. **Dynamic Daily Limit**: Enter your monthly budget (e.g. ₹6000), and track your progress with daily limit calculations, savings bonuses carried over to next-day allowance, or overspending penalties.
5. **AI Financial Analysis**: Deep financial review generator for months and years.
6. **AI Chatbot**: Slide-up drawer chatbot preloaded with your local profiles and 30-day transaction summaries.

---

## 🛠️ Tech Stack
- **Backend**: Python Flask
- **Database**: SQLite3
- **AI Core**: Google Gemini 1.5 Flash (Falls back automatically to rule-based logic if no API key is specified!)
- **Frontend**: HTML5, Vanilla JavaScript, Custom CSS Variables (Premium Dark Mode Layout)

---

## 💻 Local Installation

1. Make sure you have python installed.
2. Navigate to the project directory:
   ```bash
   cd agentic-expense-tracker
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
5. *(Optional but recommended)* Get your free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) and insert it into the `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
6. Launch the server:
   ```bash
   python app.py
   ```
7. Open **http://127.0.0.1:5000** in your browser!

---

## ☁️ Cloud Deployment (e.g. Railway)

1. Create a new GitHub repository and push this folder.
2. Link the repository to your [Railway](https://railway.app/) dashboard.
3. In Railway **Variables**, add your:
   - `GEMINI_API_KEY` (highly recommended for actual AI functionality)
4. Deploy! The custom `Procfile` and `railway.toml` will automatically build the environment using python nixpacks and run it.
