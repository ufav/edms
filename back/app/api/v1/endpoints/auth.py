"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserLogin, ProfileSelfUpdate
from app.services.auth import authenticate_user, create_access_token, get_password_hash, verify_password, get_current_user, get_current_active_user
from datetime import timedelta
from app.core.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    
    # Проверяем, существует ли пользователь
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже существует"
        )
    
    # Создаем нового пользователя
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {
        "message": "Пользователь успешно зарегистрирован",
        "user_id": db_user.id,
    }

@router.post("/login", response_model=Token)
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Аутентификация пользователя"""
    
    # OAuth2 использует имя поля "username"; на клиенте в него передаётся email
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    sub = str(user.id)
    access_token = create_access_token(data={"sub": sub}, expires_delta=access_token_expires)

    # создаем refresh-токен (долгоживущий) и кладем в httpOnly cookie
    refresh_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_access_token(data={"sub": sub, "type": "refresh"}, expires_delta=refresh_expires)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=int(refresh_expires.total_seconds())
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/refresh", response_model=Token)
async def refresh(request: Request, db: Session = Depends(get_db)):
    """Обновление access токена по refresh cookie"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Нет refresh токена")

    # Валидация refresh токена как обычного access (мы закодировали type=refresh)
    from app.services.auth import decode_token
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Неверный refresh токен")

    from app.services.auth import user_id_from_token_sub
    uid = user_id_from_token_sub(payload.get("sub"))
    if not uid:
        raise HTTPException(status_code=401, detail="Неверный refresh токен")

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    # Получаем правильную роль пользователя
    user_role_code = current_user.role  # fallback на legacy поле
    if current_user.user_role:
        user_role_code = current_user.user_role.code
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": user_role_code,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin
    }


@router.patch("/me")
async def update_me(
    body: ProfileSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Обновление своего ФИО и email. Смена email (логина) требует текущий пароль."""
    if body.full_name is None and body.email is None:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")

    new_email_norm = None
    if body.email is not None:
        new_email_norm = str(body.email).strip().lower()
    current_email_norm = (current_user.email or "").strip().lower()
    email_changed = new_email_norm is not None and new_email_norm != current_email_norm

    if email_changed:
        if not body.current_password:
            raise HTTPException(
                status_code=400,
                detail="Для смены email укажите текущий пароль",
            )
        if not verify_password(body.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Неверный текущий пароль")
        taken = (
            db.query(User)
            .filter(func.lower(User.email) == new_email_norm, User.id != current_user.id)
            .first()
        )
        if taken:
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        current_user.email = new_email_norm

    if body.full_name is not None:
        fn = body.full_name.strip()
        if not fn:
            raise HTTPException(status_code=400, detail="Полное имя не может быть пустым")
        if len(fn) > 100:
            raise HTTPException(status_code=400, detail="Полное имя слишком длинное")
        current_user.full_name = fn

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    user_role_code = current_user.role
    if current_user.user_role:
        user_role_code = current_user.user_role.code

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": user_role_code,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
    }


@router.post("/change-password", response_model=dict)
async def change_password(
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Смена пароля текущего пользователя"""
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Старый пароль неверен")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Минимальная длина пароля 6 символов")

    current_user.hashed_password = get_password_hash(new_password)
    db.add(current_user)
    db.commit()

    return {"message": "Пароль успешно изменен"}
