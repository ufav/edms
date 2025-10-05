"""
API endpoints для работы с ролями
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.references import UserRole
from app.models.project_role import ProjectRole
from app.schemas.roles import (
    UserRoleResponse, UserRoleCreate, UserRoleUpdate,
    ProjectRoleResponse, ProjectRoleCreate, ProjectRoleUpdate
)

router = APIRouter()

# Пользовательские роли (UserRole)
@router.get("/user-roles/", response_model=List[UserRoleResponse])
async def get_user_roles(
    db: Session = Depends(get_db)
):
    """Получить список пользовательских ролей"""
    roles = db.query(UserRole).filter(UserRole.is_active == True).all()
    return roles

@router.get("/user-roles/{role_id}", response_model=UserRoleResponse)
async def get_user_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """Получить пользовательскую роль по ID"""
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Пользовательская роль не найдена")
    return role

@router.post("/user-roles/", response_model=UserRoleResponse)
async def create_user_role(
    role_data: UserRoleCreate,
    db: Session = Depends(get_db)
):
    """Создать новую пользовательскую роль"""
    # Проверяем, что код роли уникален
    existing = db.query(UserRole).filter(UserRole.code == role_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Роль с таким кодом уже существует")
    
    role = UserRole(**role_data.dict())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.put("/user-roles/{role_id}", response_model=UserRoleResponse)
async def update_user_role(
    role_id: int,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db)
):
    """Обновить пользовательскую роль"""
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Пользовательская роль не найдена")
    
    update_data = role_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role)
    return role

@router.delete("/user-roles/{role_id}")
async def delete_user_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """Удалить пользовательскую роль (мягкое удаление)"""
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Пользовательская роль не найдена")
    
    role.is_active = False
    db.commit()
    return {"message": "Пользовательская роль деактивирована"}

# Проектные роли
@router.get("/project-roles/", response_model=List[ProjectRoleResponse])
async def get_project_roles(
    db: Session = Depends(get_db)
):
    """Получить список проектных ролей"""
    roles = db.query(ProjectRole).filter(ProjectRole.is_active == True).all()
    return roles

@router.get("/project-roles/{role_id}", response_model=ProjectRoleResponse)
async def get_project_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """Получить проектную роль по ID"""
    role = db.query(ProjectRole).filter(ProjectRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Проектная роль не найдена")
    return role

@router.post("/project-roles/", response_model=ProjectRoleResponse)
async def create_project_role(
    role_data: ProjectRoleCreate,
    db: Session = Depends(get_db)
):
    """Создать новую проектную роль"""
    # Проверяем, что код роли уникален
    existing = db.query(ProjectRole).filter(ProjectRole.code == role_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Роль с таким кодом уже существует")
    
    role = ProjectRole(**role_data.dict())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.put("/project-roles/{role_id}", response_model=ProjectRoleResponse)
async def update_project_role(
    role_id: int,
    role_data: ProjectRoleUpdate,
    db: Session = Depends(get_db)
):
    """Обновить проектную роль"""
    role = db.query(ProjectRole).filter(ProjectRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Проектная роль не найдена")
    
    update_data = role_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role)
    return role

@router.delete("/project-roles/{role_id}")
async def delete_project_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """Удалить проектную роль (мягкое удаление)"""
    role = db.query(ProjectRole).filter(ProjectRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Проектная роль не найдена")
    
    role.is_active = False
    db.commit()
    return {"message": "Проектная роль деактивирована"}
