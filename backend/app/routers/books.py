from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Book
from ..schemas import BookCreate, BookOut
from typing import List

router = APIRouter(prefix="/books", tags=["books"])

@router.get("", response_model=List[BookOut])
def list_books(db: Session = Depends(get_db)):
    return db.query(Book).order_by(Book.id.desc()).all()

@router.post("", response_model=BookOut, status_code=201)
def create_book(payload: BookCreate, db: Session = Depends(get_db)):
    existing = None
    if payload.isbn:
        existing = db.query(Book).filter(Book.isbn == payload.isbn).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ISBN already exists")
    book = Book(**payload.model_dump(exclude_none=True))
    db.add(book)
    db.commit()
    db.refresh(book)
    return book
