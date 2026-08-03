import os
import sqlite3
from contextlib import contextmanager

# Read database URL, converting standard postgres scheme if needed
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

DB_PATH = os.path.join(os.path.dirname(__file__), 'expenses.db')

def is_postgres():
    return bool(DATABASE_URL)

def get_db_conn():
    if is_postgres():
        import psycopg2
        from psycopg2.extras import RealDictCursor
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

@contextmanager
def get_db():
    conn = get_db_conn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def execute_query(conn, query, params=()):
    if is_postgres():
        query = query.replace('?', '%s')
    cur = conn.cursor()
    cur.execute(query, params)
    return cur

def fetch_all(conn, query, params=()):
    cur = execute_query(conn, query, params)
    rows = cur.fetchall()
    cur.close()
    return [dict(row) for row in rows]

def fetch_one(conn, query, params=()):
    cur = execute_query(conn, query, params)
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None

def insert_and_get_id(conn, query, params=()):
    if is_postgres():
        query = query.replace('?', '%s')
        if 'RETURNING id' not in query.upper():
            query += ' RETURNING id'
        cur = conn.cursor()
        cur.execute(query, params)
        row = cur.fetchone()
        inserted_id = row['id'] if row else None
        cur.close()
        return inserted_id
    else:
        cur = conn.cursor()
        cur.execute(query, params)
        inserted_id = cur.lastrowid
        cur.close()
        return inserted_id

def init_db():
    with get_db() as conn:
        if is_postgres():
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS expenses (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    date VARCHAR(10) NOT NULL,
                    amount DOUBLE PRECISION NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    note TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS user_profile (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL DEFAULT 'User',
                    profession VARCHAR(100) NOT NULL DEFAULT 'Other',
                    income DOUBLE PRECISION DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS budget_settings (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    month VARCHAR(7) NOT NULL,
                    monthly_budget DOUBLE PRECISION NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT unique_user_month UNIQUE (user_id, month)
                )
            ''')
        else:
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            ''')
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT NOT NULL,
                    note TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            ''')
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS user_profile (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL DEFAULT 'User',
                    profession TEXT NOT NULL DEFAULT 'Other',
                    income REAL DEFAULT 0,
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            ''')
            execute_query(conn, '''
                CREATE TABLE IF NOT EXISTS budget_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    month TEXT NOT NULL,
                    monthly_budget REAL NOT NULL,
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(user_id, month)
                )
            ''')
