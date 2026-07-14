"""
Users endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.user import User
from app.services.auth import get_current_active_user, get_password_hash
from app.schemas.auth import UserCreate, UserUpdate
from app.services.audit_service import log_action

router = APIRouter()


def user_to_dict(user: User) -> Dict[str, Any]:
    """Конвертация пользователя в словарь для логов"""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
    }

def _is_global_admin(user: User) -> bool:
    if user.is_admin:
        return True
    return bool(user.user_role and user.user_role.code == "admin")


def _shared_project_user_ids(db: Session, current_user: User) -> set:
    """ID пользователей, с которыми есть общие проекты (включая себя)."""
    from app.models.project import ProjectMember

    my_project_ids = [
        row[0]
        for row in db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    ]
    if not my_project_ids:
        return {current_user.id}

    co_member_ids = {
        row[0]
        for row in db.query(ProjectMember.user_id)
        .filter(ProjectMember.project_id.in_(my_project_ids))
        .distinct()
        .all()
    }
    co_member_ids.add(current_user.id)
    return co_member_ids


@router.get("/", response_model=List[dict])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка пользователей.
    Админ — все; остальные — только участники общих проектов.
    """
    query = db.query(User)
    if not _is_global_admin(current_user):
        allowed_ids = _shared_project_user_ids(db, current_user)
        query = query.filter(User.id.in_(allowed_ids))

    users = query.offset(skip).limit(limit).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at
        }
        for user in users
    ]

@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение пользователя по ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if not _is_global_admin(current_user) and user.id not in _shared_project_user_ids(db, current_user):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "created_at": user.created_at
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание нового пользователя
    
    Только администраторы могут создавать пользователей
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
    
    # Проверка существования пользователя с таким email
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    # Создание пользователя
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role or "user",
        is_active=user_data.is_active if user_data.is_active is not None else True,
        is_admin=False,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Логирование действия
    log_action(
        db=db,
        user_id=current_user.id,
        action="create",
        entity_type="user",
        entity_id=new_user.id,
        old_values=None,
        new_values=user_to_dict(new_user),
        request=request,
    )
    
    return {
        "id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "is_admin": new_user.is_admin,
        "created_at": new_user.created_at
    }


@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление пользователя
    
    Только администраторы могут обновлять пользователей
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Сохраняем старые значения для лога
    old_values = user_to_dict(user)
    
    # Обновление полей
    if user_data.email is not None:
        # Проверка уникальности email
        existing_email = db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        user.email = user_data.email
    
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    
    if user_data.role is not None:
        user.role = user_data.role
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password is not None:
        user.hashed_password = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)
    
    # Логирование действия
    log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="user",
        entity_id=user.id,
        old_values=old_values,
        new_values=user_to_dict(user),
        request=request,
    )
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "created_at": user.created_at
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление пользователя
    
    Только администраторы могут удалять пользователей
    Пользователь не может удалить сам себя
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Сохраняем старые значения для лога
    old_values = user_to_dict(user)
    
    # Удаление пользователя
    db.delete(user)
    db.commit()
    
    # Логирование действия
    log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="user",
        entity_id=user_id,
        old_values=old_values,
        new_values=None,
        request=request,
    )
    
    return None
