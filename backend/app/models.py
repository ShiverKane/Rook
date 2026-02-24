from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, Text, func, CheckConstraint
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(16), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    listings = relationship("Listing", back_populates="seller", cascade="all, delete")
    __table_args__ = (
        CheckConstraint("role IN ('admin','user')", name="ck_users_role"),
    )

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    author = Column(String(255), index=True, nullable=False)
    language = Column(String(16), nullable=False, default="und")
    isbn = Column(String(32), unique=True, index=True, nullable=True)
    description = Column(Text, nullable=True)
    listings = relationship("Listing", back_populates="book", cascade="all, delete")

class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    condition = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    book = relationship("Book", back_populates="listings")
    seller = relationship("User", back_populates="listings")
