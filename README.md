# 💰 SpendLog AI – Agentic Personal Expense Tracker

An AI-powered expense tracking application that helps users manage their finances intelligently using **Google Gemini AI**. The application not only records daily expenses but also analyzes spending habits, provides personalized financial insights, recommends budgeting strategies, and answers finance-related questions through an AI chatbot.

---

## 🚀 Features

### 📊 Expense Management

* Add, edit, and delete expenses
* Categorize expenses (Food, Travel, Shopping, Bills, Entertainment, etc.)
* Track daily and monthly spending
* View complete expense history

### 💵 Smart Budget Planner

* Set monthly budget
* Automatic daily budget calculation
* Carry-forward remaining budget to the next day
* Real-time budget tracking

### 🤖 AI Financial Assistant

* Powered by **Google Gemini API**
* Personalized financial advice
* Spending pattern analysis
* Budget improvement suggestions
* Profession-based recommendations
* Interactive AI chatbot for finance-related queries

### 👤 Personalized User Profiles

Supports multiple professions such as:

* Student
* Employee
* Business Person
* Doctor
* Parent
* Freelancer
* Others

The AI customizes recommendations based on the user's profession.

### 📈 Financial Analytics

* Total expenses overview
* Category-wise spending
* Monthly summaries
* Smart financial insights
* Budget utilization analysis

### 🔄 Intelligent Fallback

If the Gemini API is unavailable, the application automatically switches to a built-in rule-based AI system, ensuring uninterrupted functionality.

---

# 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Backend

* Python
* Flask

### Database

* SQLite

### AI Integration

* Google Gemini API
* Rule-Based AI Engine (Fallback)

### Deployment

* Railway
* Gunicorn

---

# 📂 Project Structure

```text
Agentic-expense-tracker/
│
├── static/
│   ├── css/
│   └── js/
│
├── templates/
│   └── index.html
│
├── app.py
├── ai_agent.py
├── requirements.txt
├── Procfile
├── railway.toml
├── README.md
└── database.db
```

---

# ⚙️ Installation

## Clone the Repository

```bash
git clone https://github.com/Harish-S28/Agentic-expense-tracker.git
```

```bash
cd Agentic-expense-tracker
```

---

## Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Configure Gemini API

Create a `.env` file in the project root.

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

If no API key is provided, the application automatically uses its built-in rule-based AI.

---

## Run the Application

```bash
python app.py
```

Open your browser and visit:

```
http://127.0.0.1:5000
```

---

# 📡 Application Workflow

1. User creates a profile.
2. User sets a monthly budget.
3. User records daily expenses.
4. Expenses are stored in SQLite.
5. Dashboard updates analytics instantly.
6. AI analyzes spending behavior.
7. Personalized recommendations are generated.
8. Users can interact with the AI chatbot for financial guidance.

---

# 🧠 AI Capabilities

* Spending habit analysis
* Budget optimization
* Expense categorization
* Personalized financial advice
* Profession-aware recommendations
* Smart budgeting tips
* Financial question answering
* Rule-based fallback intelligence

---

# 🎯 Future Enhancements

* Voice-enabled AI assistant
* Receipt OCR scanning
* Bank account integration
* UPI transaction import
* Email expense summaries
* Multi-user authentication
* Cloud database support
* Mobile application
* Expense prediction using Machine Learning

---

# 📷 Screenshots

Add screenshots of:

* Dashboard
* Expense Tracker
* Budget Planner
* AI Insights
* AI Chatbot
* Analytics Page

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Create a Pull Request

---

# 📄 License

This project is developed for educational and learning purposes.

---

# 👨‍💻 Author

**Harish**

B.Tech – Artificial Intelligence & Data Science

Passionate about AI, Agentic Systems, Machine Learning, Full Stack Development, and Intelligent Automation.

---

## ⭐ If you found this project useful, consider giving it a Star on GitHub!
