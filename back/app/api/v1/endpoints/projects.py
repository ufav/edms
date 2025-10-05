"""
Projects endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
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
    
    # Применяем workflow пресет, если выбран
    if project_data.workflow_preset_id:
        from app.models.project import WorkflowPreset, WorkflowPresetSequence, WorkflowPresetRule
        
        # Проверяем, что пресет существует и доступен
        preset = db.query(WorkflowPreset).filter(
            WorkflowPreset.id == project_data.workflow_preset_id,
            (WorkflowPreset.is_global == True) | (WorkflowPreset.created_by == current_user.id)
        ).first()
        
        if preset:
            # Копируем последовательности из пресета
            preset_sequences = db.query(WorkflowPresetSequence).filter(
                WorkflowPresetSequence.preset_id == preset.id
            ).order_by(WorkflowPresetSequence.sequence_order).all()
            
            for seq in preset_sequences:
                from app.models.project import ProjectWorkflowSequence
                workflow_sequence = ProjectWorkflowSequence(
                    project_id=db_project.id,
                    document_type_id=seq.document_type_id,
                    sequence_order=seq.sequence_order,
                    revision_description_id=seq.revision_description_id,
                    revision_step_id=seq.revision_step_id,
                    is_final=seq.is_final
                )
                db.add(workflow_sequence)
            
            # Копируем правила из пресета
            preset_rules = db.query(WorkflowPresetRule).filter(
                WorkflowPresetRule.preset_id == preset.id
            ).all()
            
            for rule in preset_rules:
                from app.models.project import ProjectWorkflowRule
                workflow_rule = ProjectWorkflowRule(
                    project_id=db_project.id,
                    document_type_id=rule.document_type_id,
                    current_revision_description_id=rule.current_revision_description_id,
                    current_revision_step_id=rule.current_revision_step_id,
                    review_code_id=rule.review_code_id,
                    next_revision_description_id=rule.next_revision_description_id,
                    next_revision_step_id=rule.next_revision_step_id,
                    action_on_fail=rule.action_on_fail
                )
                db.add(workflow_rule)
    
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


# Workflow API endpoints

@router.post("/{project_id}/workflow/sequence", response_model=dict)
async def add_workflow_sequence(
    project_id: int,
    sequence_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавление ревизии в последовательность workflow проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    from app.models.project import ProjectWorkflowSequence
    
    # Создаем новую запись последовательности
    workflow_sequence = ProjectWorkflowSequence(
        project_id=project_id,
        document_type_id=sequence_data.get('document_type_id'),
        sequence_order=sequence_data['sequence_order'],
        revision_description_id=sequence_data['revision_description_id'],
        revision_step_id=sequence_data['revision_step_id'],
        is_final=sequence_data.get('is_final', False)
    )
    
    db.add(workflow_sequence)
    db.commit()
    db.refresh(workflow_sequence)
    
    return {
        "id": workflow_sequence.id,
        "project_id": workflow_sequence.project_id,
        "sequence_order": workflow_sequence.sequence_order,
        "revision_description_id": workflow_sequence.revision_description_id,
        "revision_step_id": workflow_sequence.revision_step_id,
        "is_final": workflow_sequence.is_final
    }


@router.get("/{project_id}/workflow/sequence", response_model=List[dict])
async def get_workflow_sequence(
    project_id: int,
    document_type_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение последовательности ревизий workflow проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    from app.models.project import ProjectWorkflowSequence
    from app.models.references import RevisionDescription, RevisionStep
    
    query = db.query(ProjectWorkflowSequence).filter(ProjectWorkflowSequence.project_id == project_id)
    if document_type_id:
        query = query.filter(ProjectWorkflowSequence.document_type_id == document_type_id)
    
    sequences = query.order_by(ProjectWorkflowSequence.sequence_order).all()
    
    result = []
    for seq in sequences:
        rev_desc = db.query(RevisionDescription).filter(RevisionDescription.id == seq.revision_description_id).first()
        rev_step = db.query(RevisionStep).filter(RevisionStep.id == seq.revision_step_id).first()
        
        result.append({
            "id": seq.id,
            "project_id": seq.project_id,
            "document_type_id": seq.document_type_id,
            "sequence_order": seq.sequence_order,
            "revision_description": {
                "id": rev_desc.id,
                "code": rev_desc.code,
                "description": rev_desc.description,
                "description_native": rev_desc.description_native
            } if rev_desc else None,
            "revision_step": {
                "id": rev_step.id,
                "code": rev_step.code,
                "description": rev_step.description,
                "description_native": rev_step.description_native
            } if rev_step else None,
            "is_final": seq.is_final
        })
    
    return result


@router.delete("/{project_id}/workflow/sequence/{sequence_id}")
async def delete_workflow_sequence(
    project_id: int,
    sequence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление ревизии из последовательности workflow проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    from app.models.project import ProjectWorkflowSequence
    
    sequence = db.query(ProjectWorkflowSequence).filter(
        ProjectWorkflowSequence.id == sequence_id,
        ProjectWorkflowSequence.project_id == project_id
    ).first()
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Ревизия в последовательности не найдена")
    
    db.delete(sequence)
    db.commit()
    
    return {"message": "Ревизия удалена из последовательности"}


@router.post("/{project_id}/workflow/rules", response_model=dict)
async def add_workflow_rule(
    project_id: int,
    rule_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавление правила перехода в workflow проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    from app.models.project import ProjectWorkflowRule
    
    # Создаем новое правило
    workflow_rule = ProjectWorkflowRule(
        project_id=project_id,
        document_type_id=rule_data.get('document_type_id'),
        current_revision_description_id=rule_data['current_revision_description_id'],
        current_revision_step_id=rule_data['current_revision_step_id'],
        review_code_id=rule_data['review_code_id'],
        next_revision_description_id=rule_data.get('next_revision_description_id'),
        next_revision_step_id=rule_data.get('next_revision_step_id'),
        action_on_fail=rule_data.get('action_on_fail', 'increment_number')
    )
    
    db.add(workflow_rule)
    db.commit()
    db.refresh(workflow_rule)
    
    return {
        "id": workflow_rule.id,
        "project_id": workflow_rule.project_id,
        "current_revision_description_id": workflow_rule.current_revision_description_id,
        "current_revision_step_id": workflow_rule.current_revision_step_id,
        "review_code_id": workflow_rule.review_code_id,
        "next_revision_description_id": workflow_rule.next_revision_description_id,
        "next_revision_step_id": workflow_rule.next_revision_step_id,
        "action_on_fail": workflow_rule.action_on_fail
    }


@router.get("/{project_id}/workflow/rules", response_model=List[dict])
async def get_workflow_rules(
    project_id: int,
    document_type_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение правил переходов workflow проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    from app.models.project import ProjectWorkflowRule
    from app.models.references import RevisionDescription, RevisionStep, ReviewCode
    
    query = db.query(ProjectWorkflowRule).filter(ProjectWorkflowRule.project_id == project_id)
    if document_type_id:
        query = query.filter(ProjectWorkflowRule.document_type_id == document_type_id)
    
    rules = query.all()
    
    result = []
    for rule in rules:
        current_desc = db.query(RevisionDescription).filter(RevisionDescription.id == rule.current_revision_description_id).first()
        current_step = db.query(RevisionStep).filter(RevisionStep.id == rule.current_revision_step_id).first()
        next_desc = db.query(RevisionDescription).filter(RevisionDescription.id == rule.next_revision_description_id).first() if rule.next_revision_description_id else None
        next_step = db.query(RevisionStep).filter(RevisionStep.id == rule.next_revision_step_id).first() if rule.next_revision_step_id else None
        review_code = db.query(ReviewCode).filter(ReviewCode.id == rule.review_code_id).first()
        
        result.append({
            "id": rule.id,
            "project_id": rule.project_id,
            "document_type_id": rule.document_type_id,
            "current_revision": {
                "description": {
                    "id": current_desc.id,
                    "code": current_desc.code,
                    "description": current_desc.description,
                    "description_native": current_desc.description_native
                } if current_desc else None,
                "step": {
                    "id": current_step.id,
                    "code": current_step.code,
                    "description": current_step.description,
                    "description_native": current_step.description_native
                } if current_step else None
            },
            "review_code": {
                "id": review_code.id,
                "code": review_code.code,
                "description": review_code.description,
                "description_native": review_code.description_native
            } if review_code else None,
            "next_revision": {
                "description": {
                    "id": next_desc.id,
                    "code": next_desc.code,
                    "description": next_desc.description,
                    "description_native": next_desc.description_native
                } if next_desc else None,
                "step": {
                    "id": next_step.id,
                    "code": next_step.code,
                    "description": next_step.description,
                    "description_native": next_step.description_native
                } if next_step else None
            } if rule.next_revision_description_id else None,
            "action_on_fail": rule.action_on_fail
        })
    
    return result


@router.delete("/{project_id}/workflow/rules/{rule_id}")
async def delete_workflow_rule(
    project_id: int,
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление правила перехода из workflow проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db, require_creator_or_admin=True)
    
    from app.models.project import ProjectWorkflowRule
    
    rule = db.query(ProjectWorkflowRule).filter(
        ProjectWorkflowRule.id == rule_id,
        ProjectWorkflowRule.project_id == project_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Правило не найдено")
    
    db.delete(rule)
    db.commit()
    
    return {"message": "Правило удалено из workflow"}
