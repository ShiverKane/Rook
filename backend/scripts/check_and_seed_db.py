import os
import psycopg2
from psycopg2 import sql

# Get DB config from env or default
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "books")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

def connect():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"Could not connect to database: {e}")
        return None

def run_sql_file(conn, filename):
    filepath = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'database', filename)
    print(f"Reading {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        with conn.cursor() as cur:
            cur.execute(sql_content)
        print(f"Successfully executed {filename}")
        return True
    except Exception as e:
        print(f"Error executing {filename}: {e}")
        return False

def main():
    print(f"Connecting to {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}...")
    conn = connect()
    if not conn:
        print("Please ensure Docker is running and Postgres container is up.")
        return

    try:
        with conn.cursor() as cur:
            # 1. Check Schema (Users table)
            cur.execute("SELECT to_regclass('public.users');")
            result = cur.fetchone()[0]
            
            if not result:
                print("Schema missing. Running 01_schema.sql...")
                run_sql_file(conn, "01_schema.sql")
            else:
                print("Schema appears to exist. Applying latest schema updates (triggers/functions)...")
                # We re-run schema to ensure functions/triggers are up to date
                run_sql_file(conn, "01_schema.sql")

            # 2. Check Seed Data (Users)
            cur.execute("SELECT count(*) FROM users WHERE email = 'jack@example.com';")
            count = cur.fetchone()[0]
            
            if count == 0:
                print("Seed users missing. Running 02_auth_setup.sql...")
                run_sql_file(conn, "02_auth_setup.sql")
            else:
                print("Seed users exist.")

            # 3. Check Mock Data (Listings)
            cur.execute("SELECT to_regclass('public.listings');")
            if cur.fetchone()[0]:
                cur.execute("SELECT count(*) FROM listings;")
                listing_count = cur.fetchone()[0]
                
                if listing_count == 0:
                    print("No listings found. Running 03_mockdata.sql...")
                    run_sql_file(conn, "03_mockdata.sql")
                else:
                    print(f"Found {listing_count} listings. Skipping mock data.")
            
    except Exception as e:
        print(f"Error checking/seeding database: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
