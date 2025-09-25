"""
Projects endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, field_validator

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.services.auth import get_current_active_user

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    description: str = None
    status: str = "planning"
    start_date: str = None
    end_date: str = None
    budget: float = None
    client: str = None
    manager_id: int = None

class ProjectUpdate(BaseModel):
    name: str = None
    description: str = None
    status: str = None
    start_date: str = None
    end_date: str = None
    budget: float = None
    client: str = None
    manager_id: int = None

@router.get("/", response_model=List[dict])
async def get_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка проектов"""
    # Суперадмин видит все проекты, остальные только свои
    if current_user.role == 'superadmin':
        projects_query = db.query(Project).offset(skip).limit(limit)
    else:
        # Получаем проекты, где пользователь является участником
        projects_query = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == current_user.id
        ).offset(skip).limit(limit)
    
    projects = projects_query.all()
    return [
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
            "client": project.client,
            "manager_id": project.manager_id,
            "owner_id": project.created_by,
            "owner_name": (db.query(User).filter(User.id == project.created_by).first().full_name if project.created_by else None),
            "user_role": 'superadmin' if current_user.role == 'superadmin' else (db.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id).first().role if db.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id).first() else None),  # Роль текущего пользователя в проекте
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None
        }
        for project in projects
    ]

@router.post("/", response_model=dict)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание нового проекта"""
    
    # Проверяем, существует ли проект с таким именем
    existing_project = db.query(Project).filter(Project.name == project_data.name).first()
    if existing_project:
        raise HTTPException(status_code=400, detail="Проект с таким именем уже существует")
    
    db_project = Project(
        name=project_data.name,
        description=project_data.description,
        status=project_data.status,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        budget=project_data.budget,
        client=project_data.client,
        manager_id=project_data.manager_id or current_user.id,
        created_by=current_user.id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Добавляем создателя как участника проекта с ролью "admin"
    project_member = ProjectMember(
        project_id=db_project.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(project_member)
    db.commit()
    
    return {
        "id": db_project.id,
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status,
        "start_date": db_project.start_date.isoformat() if db_project.start_date else None,
        "end_date": db_project.end_date.isoformat() if db_project.end_date else None,
        "budget": db_project.budget,
        "client": db_project.client,
        "manager_id": db_project.manager_id,
        "owner_id": db_project.created_by,
        "owner_name": (db.query(User).filter(User.id == db_project.created_by).first().full_name if db_project.created_by else None),
        "created_at": db_project.created_at.isoformat() if db_project.created_at else None
    }

@router.get("/{project_id}", response_model=dict)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение проекта по ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget": project.budget,
        "client": project.client,
        "manager_id": project.manager_id,
        "owner_id": project.created_by,
        "owner_name": (db.query(User).filter(User.id == project.created_by).first().full_name if project.created_by else None),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }

# Эндпоинты для управления участниками проекта

def check_project_access(project: Project, current_user: User, db: Session, require_creator_or_admin: bool = False):
    """Проверяет права доступа к проекту"""
    if require_creator_or_admin:
        # Для управления участниками: superadmin или участники с ролью "admin" в проекте
        if current_user.role == 'superadmin':
            return  # Суперадмин может все
        
        # Проверяем, является ли пользователь админом проекта
        admin_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == 'admin'
        ).first()
        
        if not admin_member:
            raise HTTPException(status_code=403, detail="Только администраторы проекта или суперадмин могут управлять участниками")
    else:
        # Для просмотра: любой участник проекта
        current_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        ).first()
        
        if not current_member:
            raise HTTPException(status_code=403, detail="У вас нет доступа к этому проекту")

class ProjectMemberCreate(BaseModel):
    user_id: int
    role: str = "viewer"  # По умолчанию viewer
    
    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        allowed_roles = ['admin', 'operator', 'viewer']
        if v not in allowed_roles:
            raise ValueError(f'Роль должна быть одной из: {", ".join(allowed_roles)}')
        return v

@router.post("/{project_id}/members/", response_model=dict)
async def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавление участника к проекту"""
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем права доступа: только создатель проекта или админ может добавлять участников
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    # Проверяем, что пользователь еще не является участником
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_data.user_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Пользователь уже является участником проекта")
    
    # Добавляем участника
    project_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role
    )
    
    db.add(project_member)
    db.commit()
    db.refresh(project_member)
    
    return {
        "id": project_member.id,
        "project_id": project_member.project_id,
        "user_id": project_member.user_id,
        "role": project_member.role,
        "joined_at": project_member.joined_at.isoformat() if project_member.joined_at else None
    }

@router.get("/{project_id}/members/", response_model=List[dict])
async def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка участников проекта"""
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем права доступа: любой участник проекта может просматривать участников
    check_project_access(project, current_user, db, require_creator_or_admin=False)
    
    # Получаем всех участников проекта
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    
    return [
        {
            "id": member.id,
            "project_id": member.project_id,
            "user_id": member.user_id,
            "role": member.role,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None
        }
        for member in members
    ]

@router.put("/{project_id}/members/{user_id}", response_model=dict)
async def update_project_member_role(
    project_id: int,
    user_id: int,
    member_data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление роли участника проекта"""
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем права доступа: только менеджеры проекта или админ могут обновлять роли
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    # Находим участника для обновления
    member_to_update = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member_to_update:
        raise HTTPException(status_code=404, detail="Участник не найден")
    
    # Запрещаем понижать роль владельцу проекта
    if member_to_update.user_id == project.created_by and member_data.role != 'admin':
        raise HTTPException(status_code=400, detail="Нельзя изменять роль владельца проекта")

    # Запрещаем оставлять проект без админов
    if member_to_update.role == 'admin' and member_data.role != 'admin':
        admin_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.role == 'admin'
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Нельзя понизить роль последнего администратора проекта")

    # Обновляем роль участника
    member_to_update.role = member_data.role
    db.commit()
    db.refresh(member_to_update)
    
    return {
        "id": member_to_update.id,
        "project_id": member_to_update.project_id,
        "user_id": member_to_update.user_id,
        "role": member_to_update.role,
        "joined_at": member_to_update.joined_at.isoformat() if member_to_update.joined_at else None
    }

@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление участника из проекта"""
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем права доступа: только создатель проекта или админ может удалять участников
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    # Находим участника для удаления
    member_to_remove = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="Участник не найден")
    
    # Запрет на удаление себя
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя из проекта")

    # Запрет на удаление владельца проекта
    if member_to_remove.user_id == project.created_by:
        raise HTTPException(status_code=400, detail="Нельзя удалить владельца проекта")

    # Запрет на удаление последнего администратора проекта
    if member_to_remove.role == 'admin':
        admin_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.role == 'admin'
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Нельзя удалить последнего администратора проекта")

    db.delete(member_to_remove)
    db.commit()
    
    return {"message": "Участник удален из проекта"}
