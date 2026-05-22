import psycopg2
import os

DB_HOST = "127.0.0.1"
DB_PORT = "5432"
DB_NAME = "books"
DB_USER = "postgres"
DB_PASSWORD = "postgres"

def check():
    print(f"Connecting to {DB_HOST}:{DB_PORT} as {DB_USER} with password '{DB_PASSWORD}'")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()
        
        cur.execute("SELECT count(*) FROM users;")
        users = cur.fetchone()[0]
        print(f"Users: {users}")
        
        cur.execute("SELECT count(*) FROM listings;")
        listings = cur.fetchone()[0]
        print(f"Listings: {listings}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
