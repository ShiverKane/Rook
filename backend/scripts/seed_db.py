import sys
import os

# Ensure the parent directory is in the path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import User, Category, Book
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
                print(f"Updating user: {u_data['email']}")
                existing.name = u_data["name"]
                existing.hashed_password = get_password_hash(u_data["password"])
                existing.role = u_data["role"]
                existing.status = "active"
        
        db.commit()
        
        if db.query(Category).count() == 0:
            categories = [
                {"name": "Văn học Việt Nam", "description": "Tiểu thuyết, truyện ngắn, tản văn"},
                {"name": "Văn học nước ngoài", "description": "Tác phẩm dịch và nguyên tác"},
                {"name": "Kỹ năng sống", "description": "Phát triển bản thân, kỹ năng mềm"},
                {"name": "Kinh tế - Kinh doanh", "description": "Quản trị, khởi nghiệp, đầu tư"},
            ]
            for c in categories:
                db.add(Category(name=c["name"], description=c["description"]))
            db.commit()

        if db.query(Book).count() == 0:
            cats = {c.name: c.id for c in db.query(Category).all()}
            books = [
                {"title": "Tắt Đèn", "author": "Ngô Tất Tố", "language": "vi", "isbn": "VN-0001", "description": "Tiểu thuyết hiện thực phê phán", "category_id": cats.get("Văn học Việt Nam")},
                {"title": "Nhà Giả Kim", "author": "Paulo Coelho", "language": "vi", "isbn": "WW-0001", "description": "Hành trình theo đuổi ước mơ", "category_id": cats.get("Văn học nước ngoài")},
                {"title": "Đắc Nhân Tâm", "author": "Dale Carnegie", "language": "vi", "isbn": "SK-0001", "description": "Kỹ năng giao tiếp và ứng xử", "category_id": cats.get("Kỹ năng sống")},
            ]
            for b in books:
                db.add(Book(**{k: v for k, v in b.items() if v is not None}, is_approved=True))
            db.commit()

        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
