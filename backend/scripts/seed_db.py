import sys
import os

# Ensure the parent directory is in the path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import User
from app.security import get_password_hash

def seed_db():
    db: Session = SessionLocal()
    try:
        users = [
            {"name": "Jack", "email": "jack@example.com", "password": "jack789", "role": "user"},
            {"name": "Jane", "email": "jane@example.com", "password": "jaiden23", "role": "user"},
            {"name": "Admin", "email": "admin@example.com", "password": "admin123", "role": "admin"}
        ]
        
        for u_data in users:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                print(f"Creating user: {u_data['email']}")
                hashed_pw = get_password_hash(u_data["password"])
                user = User(
                    name=u_data["name"],
                    email=u_data["email"],
                    hashed_password=hashed_pw,
                    role=u_data["role"]
                )
                db.add(user)
            else:
                print(f"User already exists: {u_data['email']}")
        
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
