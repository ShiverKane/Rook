import os
import psycopg2
from psycopg2 import sql

DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "books"
DB_USER = "postgres"
DB_PASSWORD = "postgres"

def connect():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Could not connect to database: {e}")
        return None

def run_sql_file(conn, filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    with conn.cursor() as cur:
        cur.execute(sql_content)
    conn.commit()
    print(f"Executed {filepath}")

def main():
    conn = connect()
    if not conn:
        print("Please ensure Docker is running and Postgres container is up.")
        return

    try:
        with conn.cursor() as cur:
            # Check if users table exists
            cur.execute("SELECT to_regclass('public.users');")
            result = cur.fetchone()[0]
            
            if not result:
                print("Users table does not exist. Running schema.sql...")
                run_sql_file(conn, "../database/schema.sql")
            else:
                print("Users table exists.")

            # Check if user 'jack' exists
            cur.execute("SELECT count(*) FROM users WHERE email = 'jack@example.com';")
            count = cur.fetchone()[0]
            
            if count == 0:
                print("User 'jack' not found. Running auth_setup.sql...")
                run_sql_file(conn, "../database/auth_setup.sql")
            else:
                print("User 'jack' found. Database seems seeded.")
                
    except Exception as e:
        print(f"Error checking/seeding database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
