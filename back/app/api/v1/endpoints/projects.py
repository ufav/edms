"""
Projects endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import random
import string
from pydantic import BaseModel, field_validator

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectMember, ProjectDisciplineDocumentType
from app.models.discipline import Discipline, DocumentType
from app.services.auth import get_current_active_user

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    description: str = None
    project_code: str | None = None
    status: str = "planning"
    start_date: str = None
    end_date: str = None
    budget: float = None
    manager_id: int = None
    selected_disciplines: List[int] = []  # Список ID выбранных дисциплин
    discipline_document_types: dict = {}  # {discipline_id: [document_type_ids] or [{documentTypeId, drs}]}
    selected_revision_descriptions: List[int] = []  # Список ID выбранных описаний ревизий
    selected_revision_steps: List[int] = []  # Список ID выбранных шагов ревизий
    workflow_preset_id: int = None  # ID выбранного workflow пресета

class ProjectUpdate(BaseModel):
    name: str = None
    description: str = None
    status: str = None
    start_date: str = None
    end_date: str = None
    budget: float = None
    manager_id: int = None
    selected_disciplines: List[int] | None = None
    discipline_document_types: dict | None = None

@router.get("/check-code/{project_code}")
async def check_project_code(
    project_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Проверка уникальности кода проекта"""
    
    # Сначала ищем неудаленные проекты с таким кодом
    existing_project = db.query(Project).filter(
        Project.project_code == project_code, 
        Project.is_deleted == 0
    ).first()
    
    if existing_project:
        # Получаем информацию о владельце проекта
        owner = db.query(User).filter(User.id == existing_project.created_by).first()
        owner_name = owner.full_name if owner else "Неизвестный пользователь"
        
        result = {
            "exists": True,
            "message": "project_exists",
            "owner": owner_name,
            "project_name": existing_project.name
        }
        return result
    
    # Если неудаленного проекта нет, проверяем удаленные
    deleted_project = db.query(Project).filter(
        Project.project_code == project_code, 
        Project.is_deleted == 1
    ).first()
    
    if deleted_project:
        # Получаем информацию о владельце удаленного проекта
        owner = db.query(User).filter(User.id == deleted_project.created_by).first()
        owner_name = owner.full_name if owner else "Неизвестный пользователь"
        
        result = {
            "exists": True,
            "message": "project_deleted",
            "owner": owner_name,
            "project_name": deleted_project.name,
            "is_deleted": True
        }
        return result
    
    # Если проекта с таким кодом нет вообще
    result = {
        "exists": False,
        "message": ""
    }
    return result

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
        projects_query = db.query(Project).filter(Project.is_deleted == 0).offset(skip).limit(limit)
    else:
        # Получаем проекты, где пользователь является участником
        projects_query = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == current_user.id,
            Project.is_deleted == 0
        ).offset(skip).limit(limit)
    
    projects = projects_query.all()
    return [
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_code": project.project_code,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
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
    
    # Проверяем, существует ли проект с таким именем (среди не удаленных)
    existing_project = db.query(Project).filter(Project.name == project_data.name, Project.is_deleted == 0).first()
    if existing_project:
        raise HTTPException(status_code=400, detail="Проект с таким именем уже существует")
    
    # Генерируем project_code, если не передан
    def _generate_project_code() -> str:
        base = datetime.utcnow().strftime("%Y%m%d")
        while True:
            suffix = ''.join(random.choices(string.digits, k=4))
            code = f"PRJ-{base}-{suffix}"
            if not db.query(Project).filter(Project.project_code == code, Project.is_deleted == 0).first():
                return code

    db_project = Project(
        name=project_data.name,
        description=project_data.description,
        project_code=project_data.project_code or _generate_project_code(),
        status=project_data.status,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        budget=project_data.budget,
        manager_id=project_data.manager_id or current_user.id,
        created_by=current_user.id,
        workflow_preset_id=project_data.workflow_preset_id
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
    
    # Добавляем типы документов для каждой дисциплины (дисциплины добавляются автоматически)
    for discipline_id, document_type_data in project_data.discipline_document_types.items():
        for item in document_type_data:
            # Поддерживаем как старый формат (массив чисел), так и новый (массив объектов)
            if isinstance(item, dict):
                document_type_id = item.get('documentTypeId')
                drs = item.get('drs')
            else:
                document_type_id = item
                drs = None
                
            project_discipline_document_type = ProjectDisciplineDocumentType(
                project_id=db_project.id,
                discipline_id=discipline_id,
                document_type_id=document_type_id,
                drs=drs
            )
            db.add(project_discipline_document_type)
    
    # Добавляем выбранные описания ревизий
    from app.models.project import ProjectRevisionDescription
    for revision_description_id in project_data.selected_revision_descriptions:
        project_revision_description = ProjectRevisionDescription(
            project_id=db_project.id,
            revision_description_id=revision_description_id
        )
        db.add(project_revision_description)
    
    # Добавляем выбранные шаги ревизий
    from app.models.project import ProjectRevisionStep
    for revision_step_id in project_data.selected_revision_steps:
        project_revision_step = ProjectRevisionStep(
            project_id=db_project.id,
            revision_step_id=revision_step_id
        )
        db.add(project_revision_step)
    
    # Проверяем, что выбранный пресет существует и доступен
    if project_data.workflow_preset_id:
        from app.models.project import WorkflowPreset
        
        preset = db.query(WorkflowPreset).filter(
            WorkflowPreset.id == project_data.workflow_preset_id,
            (WorkflowPreset.is_global == True) | (WorkflowPreset.created_by == current_user.id)
        ).first()
        
        if not preset:
            raise HTTPException(status_code=400, detail="Выбранный пресет workflow не найден или недоступен")
    
    db.commit()
    
    return {
        "id": db_project.id,
        "name": db_project.name,
        "description": db_project.description,
        "project_code": db_project.project_code,
        "status": db_project.status,
        "start_date": db_project.start_date.isoformat() if db_project.start_date else None,
        "end_date": db_project.end_date.isoformat() if db_project.end_date else None,
        "budget": db_project.budget,
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
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "project_code": project.project_code,
        "status": project.status,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget": project.budget,
        "manager_id": project.manager_id,
        "owner_id": project.created_by,
        "owner_name": (db.query(User).filter(User.id == project.created_by).first().full_name if project.created_by else None),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }

@router.put("/{project_id}", response_model=dict)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление проекта и его дисциплин/типов (если переданы)"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    check_project_access(project, current_user, db, require_creator_or_admin=True)

    # Обновляем простые поля
    for field in ["name", "description", "status", "start_date", "end_date", "budget", "manager_id"]:
        value = getattr(project_data, field)
        if value is not None:
            setattr(project, field, value)

    db.add(project)

    # Обновляем дисциплины и типы, если пришли
    # Дисциплины теперь управляются через project_discipline_document_types
    # Нет необходимости в отдельной логике для дисциплин

    if project_data.discipline_document_types is not None:
        # Удаляем старые
        db.query(ProjectDisciplineDocumentType).filter(ProjectDisciplineDocumentType.project_id == project_id).delete()
        # Добавляем новые
        for discipline_id, document_type_data in project_data.discipline_document_types.items():
            for item in document_type_data:
                # Поддерживаем как старый формат (массив чисел), так и новый (массив объектов)
                if isinstance(item, dict):
                    document_type_id = item.get('documentTypeId')
                    drs = item.get('drs')
                else:
                    document_type_id = item
                    drs = None
                    
                db.add(ProjectDisciplineDocumentType(
                    project_id=project_id,
                    discipline_id=int(discipline_id),
                    document_type_id=int(document_type_id),
                    drs=drs
                ))

    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "project_code": project.project_code,
        "status": project.status,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget": project.budget,
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
    role: str = "viewer"  # Legacy field, по умолчанию viewer
    project_role_id: Optional[int] = None  # Новая проектная роль
    
    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        # Убираем валидацию, так как теперь используем project_role_id
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
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
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
        role=member_data.role,  # Legacy field
        project_role_id=member_data.project_role_id
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
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
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
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
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
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
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


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete проекта (устанавливает is_deleted = 1)"""
    # Проверяем, что проект существует и не удален
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем права доступа: только создатель проекта или суперадмин может удалять проект
    if current_user.role != 'superadmin' and project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Только создатель проекта или суперадмин может удалить проект")
    
    # Устанавливаем is_deleted = 1
    project.is_deleted = 1
    db.commit()
    
    return {"message": "Проект удален"}


@router.get("/{project_id}/disciplines", response_model=List[dict])
async def get_project_disciplines(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение дисциплин проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем дисциплины проекта через project_discipline_document_types
    project_discipline_document_types = db.query(ProjectDisciplineDocumentType).filter(
        ProjectDisciplineDocumentType.project_id == project_id
    ).all()
    
    # Получаем уникальные дисциплины
    discipline_ids = list(set([pddt.discipline_id for pddt in project_discipline_document_types]))
    
    disciplines = []
    for discipline_id in discipline_ids:
        discipline = db.query(Discipline).filter(Discipline.id == discipline_id).first()
        if discipline:
            disciplines.append({
                "id": discipline.id,
                "code": discipline.code,
                "name": discipline.name,
                "description": discipline.description
            })
    
    return disciplines


@router.get("/{project_id}/document-types/{discipline_id}", response_model=List[dict])
async def get_project_document_types(
    project_id: int,
    discipline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение типов документов для дисциплины в проекте"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем типы документов для дисциплины в проекте
    project_discipline_document_types = db.query(ProjectDisciplineDocumentType).filter(
        ProjectDisciplineDocumentType.project_id == project_id,
        ProjectDisciplineDocumentType.discipline_id == discipline_id
    ).all()
    
    document_types = []
    for pddt in project_discipline_document_types:
        doc_type = db.query(DocumentType).filter(DocumentType.id == pddt.document_type_id).first()
        if doc_type:
            document_types.append({
                "id": doc_type.id,
                "code": doc_type.code,
                "name": doc_type.name,
                "description": doc_type.description
            })
    
    return document_types


@router.get("/{project_id}/revision-descriptions", response_model=List[dict])
async def get_project_revision_descriptions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение описаний ревизий проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем описания ревизий проекта
    from app.models.project import ProjectRevisionDescription
    from app.models.references import RevisionDescription
    
    project_revision_descriptions = db.query(ProjectRevisionDescription).filter(
        ProjectRevisionDescription.project_id == project_id
    ).all()
    
    revision_descriptions = []
    for prd in project_revision_descriptions:
        rev_desc = db.query(RevisionDescription).filter(RevisionDescription.id == prd.revision_description_id).first()
        if rev_desc:
            revision_descriptions.append({
                "id": rev_desc.id,
                "code": rev_desc.code,
                "description": rev_desc.description,
                "description_native": rev_desc.description_native,
                "phase": rev_desc.phase
            })
    
    return revision_descriptions


@router.get("/{project_id}/revision-steps", response_model=List[dict])
async def get_project_revision_steps(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение шагов ревизий проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем шаги ревизий проекта
    from app.models.project import ProjectRevisionStep
    from app.models.references import RevisionStep
    
    project_revision_steps = db.query(ProjectRevisionStep).filter(
        ProjectRevisionStep.project_id == project_id
    ).all()
    
    revision_steps = []
    for prs in project_revision_steps:
        rev_step = db.query(RevisionStep).filter(RevisionStep.id == prs.revision_step_id).first()
        if rev_step:
            revision_steps.append({
                "id": rev_step.id,
                "code": rev_step.code,
                "description": rev_step.description,
                "description_native": rev_step.description_native
            })
    
    return revision_steps


# Workflow API endpoints - УДАЛЕНЫ
# Теперь workflow управляется через пресеты (workflow_preset_id в проектах)
# Данные берутся из WorkflowPresetSequence и WorkflowPresetRule


@router.get("/{project_id}/revision-descriptions", response_model=List[dict])
async def get_project_revision_descriptions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение выбранных описаний ревизий для проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    from app.models.project import ProjectRevisionDescription
    from app.models.references import RevisionDescription
    
    # Получаем выбранные описания ревизий для проекта
    project_revisions = db.query(ProjectRevisionDescription).filter(
        ProjectRevisionDescription.project_id == project_id
    ).all()
    
    revision_descriptions = []
    for prd in project_revisions:
        revision_desc = db.query(RevisionDescription).filter(
            RevisionDescription.id == prd.revision_description_id
        ).first()
        if revision_desc:
            revision_descriptions.append({
                "id": revision_desc.id,
                "code": revision_desc.code,
                "description": revision_desc.description,
                "description_native": revision_desc.description_native,
                "is_active": revision_desc.is_active
            })
    
    return revision_descriptions


@router.get("/{project_id}/revision-steps", response_model=List[dict])
async def get_project_revision_steps(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение выбранных шагов ревизий для проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    from app.models.project import ProjectRevisionStep
    from app.models.references import RevisionStep
    
    # Получаем выбранные шаги ревизий для проекта
    project_steps = db.query(ProjectRevisionStep).filter(
        ProjectRevisionStep.project_id == project_id
    ).all()
    
    revision_steps = []
    for prs in project_steps:
        revision_step = db.query(RevisionStep).filter(
            RevisionStep.id == prs.revision_step_id
        ).first()
        if revision_step:
            revision_steps.append({
                "id": revision_step.id,
                "code": revision_step.code,
                "description": revision_step.description,
                "description_native": revision_step.description_native,
                "description_long": revision_step.description_long,
                "is_active": revision_step.is_active
            })
    
    return revision_steps


@router.get("/{project_id}/workflow-preset", response_model=dict)
async def get_project_workflow_preset(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение выбранного пресета workflow для проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем пресет workflow проекта
    if project.workflow_preset_id:
        from app.models.project import WorkflowPreset
        workflow_preset = db.query(WorkflowPreset).filter(
            WorkflowPreset.id == project.workflow_preset_id
        ).first()
        
        if workflow_preset:
            return {
                "id": workflow_preset.id,
                "name": workflow_preset.name,
                "description": workflow_preset.description,
                "is_global": workflow_preset.is_global
            }
    
    return {"id": None, "name": None, "description": None}