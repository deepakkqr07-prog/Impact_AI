from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Department, AuditLog, UserRole
from backend.schemas import UserOut, UserUpdateRole
from backend.auth import get_current_user, require_roles, get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["User Management"])

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    department_id: Optional[int] = None

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    return db.query(User).order_by(User.id.asc()).all()

@router.put("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    update: UserUpdateRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if update.role not in UserRole.ALL:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {UserRole.ALL}")

    target_user.role = update.role
    if update.is_active is not None:
        target_user.is_active = update.is_active

    db.commit()
    db.refresh(target_user)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER_ROLE",
        entity_type="User",
        entity_id=str(user_id),
        details=f"User {target_user.username} role updated to {target_user.role} (active={target_user.is_active}) by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return target_user

@router.put("/profile/update", response_model=UserOut)
def update_profile(
    update: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if update.full_name:
        current_user.full_name = update.full_name
    if update.email:
        # Check duplicate email
        existing = db.query(User).filter(User.email == update.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already used by another account")
        current_user.email = update.email
    if update.department_id is not None:
        current_user.department_id = update.department_id

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/profile/change-password")
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_CHANGE",
        entity_type="User",
        entity_id=str(current_user.id),
        details=f"User {current_user.username} changed their password."
    )
    db.add(audit)
    db.commit()

    return {"message": "Password updated successfully"}

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.GOV_OFFICER]))
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "username": l.user.username if l.user else "System",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "timestamp": l.timestamp
        })
    return results
