import unittest
import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

# Ensure we import our local modules
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import db

class TestAuthAndDB(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use a temporary SQLite file for testing
        cls.test_db_path = os.path.join(os.path.dirname(__file__), 'test_expenses.db')
        cls.old_db_path = db.DB_PATH
        cls.old_db_url = db.DATABASE_URL
        
        # Override paths to force test SQLite mode
        db.DB_PATH = cls.test_db_path
        db.DATABASE_URL = None  # Force local SQLite mode for testing
        
    @classmethod
    def tearDownClass(cls):
        db.DB_PATH = cls.old_db_path
        db.DATABASE_URL = cls.old_db_url
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception:
                pass

    def setUp(self):
        # Reset database before each test
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except Exception:
                pass
        db.init_db()

    def test_password_hashing(self):
        password = "secure_password"
        hash_val = generate_password_hash(password)
        self.assertTrue(check_password_hash(hash_val, password))
        self.assertFalse(check_password_hash(hash_val, "wrong_password"))

    def test_user_creation_and_auth(self):
        with db.get_db() as conn:
            email = "user@example.com"
            pw_hash = generate_password_hash("password123")
            user_id = db.insert_and_get_id(conn, "INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, pw_hash))
            self.assertIsNotNone(user_id)
            
            # Fetch user
            user = db.fetch_one(conn, "SELECT * FROM users WHERE email = ?", (email,))
            self.assertIsNotNone(user)
            self.assertEqual(user['id'], user_id)
            self.assertTrue(check_password_hash(user['password_hash'], "password123"))

    def test_data_isolation(self):
        with db.get_db() as conn:
            # Create user 1
            u1_id = db.insert_and_get_id(conn, "INSERT INTO users (email, password_hash) VALUES (?, ?)", ("u1@ex.com", "h1"))
            # Create user 2
            u2_id = db.insert_and_get_id(conn, "INSERT INTO users (email, password_hash) VALUES (?, ?)", ("u2@ex.com", "h2"))
            
            # Insert expenses for user 1
            db.execute_query(conn, "INSERT INTO expenses (user_id, date, amount, category, note) VALUES (?, ?, ?, ?, ?)", 
                             (u1_id, "2026-08-03", 500.0, "Food & Dining", "u1 dinner"))
            
            # Insert expenses for user 2
            db.execute_query(conn, "INSERT INTO expenses (user_id, date, amount, category, note) VALUES (?, ?, ?, ?, ?)", 
                             (u2_id, "2026-08-03", 1200.0, "Housing & Rent", "u2 rent"))
            
            # Query expenses for user 1
            u1_expenses = db.fetch_all(conn, "SELECT * FROM expenses WHERE user_id = ?", (u1_id,))
            self.assertEqual(len(u1_expenses), 1)
            self.assertEqual(u1_expenses[0]['note'], "u1 dinner")
            
            # Query expenses for user 2
            u2_expenses = db.fetch_all(conn, "SELECT * FROM expenses WHERE user_id = ?", (u2_id,))
            self.assertEqual(len(u2_expenses), 1)
            self.assertEqual(u2_expenses[0]['note'], "u2 rent")

    def test_budget_constraints(self):
        with db.get_db() as conn:
            u_id = db.insert_and_get_id(conn, "INSERT INTO users (email, password_hash) VALUES (?, ?)", ("u@ex.com", "h"))
            db.execute_query(conn, "INSERT INTO budget_settings (user_id, month, monthly_budget) VALUES (?, ?, ?)",
                             (u_id, "2026-08", 6000.0))
            
            budget = db.fetch_one(conn, "SELECT * FROM budget_settings WHERE user_id = ? AND month = ?", (u_id, "2026-08"))
            self.assertIsNotNone(budget)
            self.assertEqual(budget['monthly_budget'], 6000.0)

if __name__ == '__main__':
    unittest.main()
