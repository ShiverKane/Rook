from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Listing, Book
from ..schemas import ListingCreate, ListingOut
from ..deps import get_current_user
from typing import List

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("", response_model=List[ListingOut])
def list_listings(db: Session = Depends(get_db)):
    return db.query(Listing).filter(Listing.is_active == True).order_by(Listing.id.desc()).all()

@router.post("", response_model=ListingOut, status_code=201)
def create_listing(payload: ListingCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == payload.book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    listing = Listing(book_id=payload.book_id, seller_id=user.id, price=payload.price, condition=payload.condition, is_active=payload.is_active)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

@router.delete("/{listing_id}", status_code=204)
def deactivate_listing(listing_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.seller_id == user.id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    listing.is_active = False
    db.add(listing)
    db.commit()
    return
