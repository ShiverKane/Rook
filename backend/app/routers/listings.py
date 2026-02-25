from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Listing, Book
from ..schemas import ListingCreate, ListingOut, ListingUpdate
from ..deps import get_current_user
from typing import List

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("", response_model=List[ListingOut])
def list_listings(db: Session = Depends(get_db)):
    return db.query(Listing).filter(Listing.is_active == True).order_by(Listing.id.desc()).all()

@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing

@router.post("", response_model=ListingOut, status_code=201)
def create_listing(payload: ListingCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == payload.book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    listing = Listing(
        book_id=payload.book_id,
        seller_id=user.id,
        price=payload.price,
        condition=payload.condition,
        is_active=payload.is_active,
        status=payload.status
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

@router.delete("/{listing_id}", status_code=204)
def delete_listing(listing_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # User can delete their own listing, admin deletion is handled in /admin/posts/{id}
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.seller_id == user.id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    # Soft delete (deactivate) or hard delete? Requirement says "Delete listing".
    # Previous implementation was deactivating. Let's keep it consistent or follow "delete" literally.
    # If the user wants to delete, let's hard delete or soft delete.
    # The image says "Xóa bài đăng".
    # Let's assume hard delete for now if the user owns it, but given previous implementation was soft delete, maybe check.
    # The previous code: listing.is_active = False.
    # I will stick to soft delete for safety unless specified otherwise, but update the function name.
    # Actually, the trigger "decrement_user_listing_count" runs on AFTER DELETE.
    # So if we only set is_active=False, the count won't decrement!
    # We should perform a real DELETE for the count trigger to work, OR update the trigger to handle updates.
    # The user asked for "Giảm số bài khi xóa bài" and we implemented a trigger "AFTER DELETE".
    # So we MUST perform a real DELETE here.
    db.delete(listing)
    db.commit()
    return

@router.put("/{listing_id}", response_model=ListingOut)
def update_listing_full(listing_id: int, payload: ListingCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.seller_id == user.id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    
    listing.price = payload.price
    listing.condition = payload.condition
    listing.is_active = payload.is_active
    listing.status = payload.status
    listing.book_id = payload.book_id # Allow changing book?
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

@router.patch("/{listing_id}/sold", response_model=ListingOut)
def mark_listing_sold(listing_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.seller_id == user.id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    
    listing.status = 'sold'
    # Trigger track_listing_sold_time handles sold_at
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

@router.patch("/{listing_id}", response_model=ListingOut)
def update_listing_partial(listing_id: int, payload: ListingUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.seller_id == user.id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(listing, key, value)
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing
