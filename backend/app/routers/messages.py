from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Message, Listing, User
from ..schemas import MessageCreate, MessageOut
from ..deps import get_current_user
from typing import List

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("", response_model=MessageOut, status_code=201)
def send_message(payload: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify listing exists
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    
    # Verify receiver exists
    receiver = db.query(User).filter(User.id == payload.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    # Trigger block_self_messages handles self-messaging check
    
    message = Message(
        listing_id=payload.listing_id,
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        body=payload.body
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

# Optional: Get messages for current user (not explicitly in image but useful)
@router.get("/me", response_model=List[MessageOut])
def get_my_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get messages where user is sender or receiver
    return db.query(Message).filter(
        (Message.sender_id == current_user.id) | (Message.receiver_id == current_user.id)
    ).order_by(Message.created_at.desc()).all()
