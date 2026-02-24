from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class BookBase(BaseModel):
    title: str
    author: str
    language: Optional[str] = None
    isbn: Optional[str] = None
    description: Optional[str] = None

class BookCreate(BookBase):
    pass

class BookOut(BookBase):
    id: int
    language: str
    class Config:
        from_attributes = True

class ListingBase(BaseModel):
    book_id: int
    price: float
    condition: str
    is_active: bool = True

class ListingCreate(ListingBase):
    pass

class ListingOut(ListingBase):
    id: int
    seller_id: int
    created_at: datetime
    class Config:
        from_attributes = True
