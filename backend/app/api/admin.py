from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.user import User
from app.api.auth import admin_user
from app.schemas import UserUpdate, UserRead
from typing import List

router = APIRouter()

@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(admin_user)
):
    """Admin-only endpoint to list all users."""
    users = db.query(User).all()
    return [{
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at
    } for user in users]

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(admin_user)
):
    """Admin-only endpoint to update a user's role."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if update_data.role:
        target_user.role = update_data.role
        
    db.commit()
    return {"status": "success", "message": f"User role updated to {update_data.role}"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(admin_user)
):
    """Admin-only endpoint to delete a user."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(target_user)
    db.commit()
    return {"status": "success", "message": "User deleted"}