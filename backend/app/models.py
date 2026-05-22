from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, Text, func, CheckConstraint
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(32), unique=True)
    avatar_url = Column(Text, nullable=True)
    role = Column(String(16), nullable=False, default="user")
    status = Column(String(16), nullable=False, default="active")
    listing_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    listings = relationship("Listing", back_populates="seller", cascade="all, delete")
    __table_args__ = (
        CheckConstraint("role IN ('admin','user')", name="ck_users_role"),
        CheckConstraint("status IN ('active','inactive','banned')", name="ck_users_status"),
    )

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    books = relationship("Book", back_populates="category")

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    author = Column(String(255), index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    language = Column(String(16), nullable=False, default="und")
    isbn = Column(String(32), unique=True, index=True, nullable=True)
    description = Column(Text, nullable=True)
    category = relationship("Category", back_populates="books")
    listings = relationship("Listing", back_populates="book", cascade="all, delete")

class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    condition = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default='available')
    sold_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    book = relationship("Book", back_populates="listings")
    seller = relationship("User", back_populates="listings")
    images = relationship("ListingImage", back_populates="listing", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("status IN ('available', 'sold')", name="ck_listings_status"),
    )

class ListingImage(Base):
    __tablename__ = "listing_images"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(Text, nullable=False)
    listing = relationship("Listing", back_populates="images")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
