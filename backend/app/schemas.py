from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    # Password update could be separate, but simple profile update here

class UserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: EmailStr
    role: str
    status: str
    listing_count: int = 0
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class BookBase(BaseModel):
    title: str
    author: str
    language: Optional[str] = None
    isbn: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    language: Optional[str] = None
    isbn: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None

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
    status: str = 'available'

class ListingCreate(ListingBase):
    images: Optional[List[str]] = None

class ListingUpdate(BaseModel):
    price: Optional[float] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    images: Optional[List[str]] = None

class ListingImageOut(BaseModel):
    id: int
    url: str
    class Config:
        from_attributes = True

class ListingOut(ListingBase):
    id: int
    seller_id: int
    sold_at: Optional[datetime] = None
    created_at: datetime
    book: Optional[BookOut] = None
    images: List[ListingImageOut] = []
    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    listing_id: int
    receiver_id: int
    body: str

class MessageCreate(MessageBase):
    pass

class MessageOut(MessageBase):
    id: int
    sender_id: int
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True
