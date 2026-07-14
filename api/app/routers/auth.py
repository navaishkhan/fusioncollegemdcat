from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    safe_decode_token,
    verify_password,
)
from app.database import get_db
from app.models import PasswordResetToken, PasswordResetRequest, User, UserRole
from app.schemas import (
    AdminResetPasswordRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdate,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.parent_id:
        parent = db.get(User, payload.parent_id)
        if not parent or parent.role != UserRole.PARENT:
            raise HTTPException(status_code=400, detail="Invalid parent reference")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        parent_id=payload.parent_id,
        profile_picture_url=payload.profile_picture_url,
        specialization=payload.specialization,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(token: str, db: Session = Depends(get_db)):
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.patch("/me", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    db.commit()
    db.refresh(user)
    return user


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return success to avoid leaking email existence
    if not user:
        return {"ok": True, "message": "If the email exists, a reset link has been sent."}

    # Invalidate old tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used.is_(False),
    ).update({"used": True})
    db.flush()

    token = uuid4().hex + uuid4().hex
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    # Create admin notification row
    db.add(PasswordResetRequest(user_id=user.id, status="pending"))
    db.commit()

    return {"ok": True, "message": "Your request has been sent to the admin. You will be contacted shortly."}



@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    reset = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token == payload.token,
            PasswordResetToken.used.is_(False),
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.get(User, reset.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    reset.used = True
    db.commit()
    return {"ok": True, "message": "Password reset successfully."}
