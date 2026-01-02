"""
Projects endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import random
import string
from pydantic import BaseModel, field_validator

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.project import Project, ProjectMember, ProjectDisciplineDocumentType, ProjectSupportFile, ProjectStatusEnum
from app.models.project_participant import ProjectParticipant
from app.models.discipline import Discipline, DocumentType
from app.models.area import Area
from app.models.document import Document, DocumentRevision
from app.models.references import WorkflowStatus
from sqlalchemy import func, and_
from app.services.auth import get_current_active_user
from app.services.minio_service import minio_service
from fastapi.responses import FileResponse
from app.services.audit_service import log_action

router = APIRouter()

def _calculate_project_completion_progress(project_id: int, db: Session) -> float:
    """Расчет прогресса завершения проекта в процентах"""
    # Получаем все документы проекта
    project_documents = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_deleted == 0
    ).all()
    
    total_documents = len(project_documents)
    if total_documents == 0:
        return 0.0
    
    # Получаем ID утвержденных статусов (как в дашборде)
    approved_status_names = ["Approved", "Approved with Comments", "Not Reviewed"]
    approved_statuses = db.query(WorkflowStatus).filter(
        WorkflowStatus.name.in_(approved_status_names)
    ).all()
    approved_status_ids = {s.id for s in approved_statuses}
    
    approved_documents = 0
    
    # Для каждого документа проверяем последнюю ревизию
    for doc in project_documents:
        latest_revision = db.query(DocumentRevision).filter(
            DocumentRevision.document_id == doc.id,
            DocumentRevision.is_deleted == 0
        ).order_by(DocumentRevision.created_at.desc()).first()
        
        if latest_revision and latest_revision.workflow_status_id in approved_status_ids:
            approved_documents += 1
    
    return round((approved_documents / total_documents * 100), 1)

class ProjectParticipantData(BaseModel):
    company_id: int
    contact_id: int | None = None
    company_role_id: int | None = None
    is_primary: bool = False
    notes: str | None = None

class ProjectMemberData(BaseModel):
    user_id: int
    project_role_id: int | None = None

class ProjectCreate(BaseModel):
    name: str
    description: str = None
    project_code: str | None = None
    status: str = "planning"
    start_date: str = None
    end_date: str = None
    budget: float = None
    selected_disciplines: List[int] = []  # Список ID выбранных дисциплин
    discipline_document_types: dict = {}  # {discipline_id: [document_type_ids] or [{documentTypeId, drs}]}
    selected_revision_descriptions: List[int] = []  # Список ID выбранных описаний ревизий
    selected_revision_steps: List[int] = []  # Список ID выбранных шагов ревизий
    workflow_preset_id: int = None  # ID выбранного workflow пресета
    members: List[ProjectMemberData] = []  # Список участников-пользователей
    participants: List[ProjectParticipantData] = []  # Список участников-компаний
    area_ids: List[int] = []  # Список ID участков тех. процесса из справочника

class ProjectUpdate(BaseModel):
    name: str = None
    description: str = None
    project_code: str = None
    status: str = None
    start_date: str = None
    end_date: str = None
    budget: float = None
    members: List[ProjectMemberData] | None = None  # Список участников-пользователей
    participants: List[ProjectParticipantData] | None = None  # Список участников-компаний
    selected_disciplines: List[int] | None = None
    discipline_document_types: dict | None = None
    selected_revision_descriptions: List[int] | None = None
    selected_revision_steps: List[int] | None = None
    workflow_preset_id: int | None = None
    area_ids: List[int] | None = None  # Список ID участков тех. процесса из справочника


class ProjectSupportFileResponse(BaseModel):
    """Схема ответа для файла support pack."""
    id: int
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: Optional[str] = None


@router.get("/{project_id}/support-files", response_model=List[ProjectSupportFileResponse])
async def get_project_support_files(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Получение списка файлов support pack для проекта."""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    files = (
        db.query(ProjectSupportFile)
        .filter(ProjectSupportFile.project_id == project_id, ProjectSupportFile.is_deleted == 0)
        .order_by(ProjectSupportFile.created_at.desc())
        .all()
    )

    return [
        ProjectSupportFileResponse(
            id=f.id,
            file_name=f.file_name,
            file_size=f.file_size,
            file_type=f.file_type,
            uploaded_by=f.uploaded_by,
            created_at=f.created_at.isoformat() if f.created_at else None,
        )
        for f in files
    ]


@router.post("/{project_id}/support-files", response_model=ProjectSupportFileResponse)
async def upload_project_support_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Загрузка файла support pack для проекта.

    Если USE_MINIO=true, файл сохраняется только в MinIO.
    При ошибке MinIO возвращается 500 и файл не создаётся.
    """
    # Проверяем проект
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Читаем содержимое файла
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Файл пустой")

    # Генерируем ключ для MinIO
    # Для MinIO: support-packs/{project_code}/{uuid}_{filename}
    import uuid

    unique_prefix = str(uuid.uuid4())
    safe_filename = file.filename or "file"
    support_dir = f"support-packs/{project.project_code}"
    file_key = f"{support_dir}/{unique_prefix}_{safe_filename}"

    # Сохраняем только в MinIO
    if not settings.USE_MINIO:
        raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
    
    success = await minio_service.upload_file(
        file_content=content,
        file_key=file_key,
        content_type=file.content_type,
    )
    if not success:
        raise HTTPException(status_code=500, detail="Ошибка сохранения файла в хранилище")
    
    file_path = file_key

    # Создаём запись в БД
    support_file = ProjectSupportFile(
        project_id=project_id,
        file_path=file_path,
        file_name=safe_filename,
        file_size=len(content),
        file_type=file.content_type,
        uploaded_by=current_user.id,
    )
    db.add(support_file)
    db.commit()
    db.refresh(support_file)

    return ProjectSupportFileResponse(
        id=support_file.id,
        file_name=support_file.file_name,
        file_size=support_file.file_size,
        file_type=support_file.file_type,
        uploaded_by=support_file.uploaded_by,
        created_at=support_file.created_at.isoformat() if support_file.created_at else None,
    )


@router.delete("/support-files/{file_id}", response_model=dict)
async def delete_project_support_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Мягкое удаление файла support pack проекта."""
    support_file = db.query(ProjectSupportFile).filter(ProjectSupportFile.id == file_id, ProjectSupportFile.is_deleted == 0).first()
    if not support_file:
        raise HTTPException(status_code=404, detail="Файл не найден")

    # Проверяем, что пользователь имеет доступ к проекту (упрощённо: любой участник проекта или админ)
    project = db.query(Project).filter(Project.id == support_file.project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    if not current_user.user_role or current_user.user_role.code != 'admin':
        # Проверяем, что пользователь является участником проекта
        is_member = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id)
            .first()
            is not None
        )
        if not is_member:
            raise HTTPException(status_code=403, detail="Нет доступа к проекту")

    # Мягкое удаление - устанавливаем is_deleted = 1
    support_file.is_deleted = 1
    db.commit()

    return {"status": "ok"}


@router.get("/support-files/{file_id}/download")
async def download_project_support_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Скачать файл support pack проекта."""
    support_file = db.query(ProjectSupportFile).filter(ProjectSupportFile.id == file_id, ProjectSupportFile.is_deleted == 0).first()
    if not support_file:
        raise HTTPException(status_code=404, detail="Файл не найден")

    project = db.query(Project).filter(Project.id == support_file.project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Проверка доступа (админ или участник проекта)
    if not current_user.user_role or current_user.user_role.code != 'admin':
        is_member = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id)
            .first()
            is not None
        )
        if not is_member:
            raise HTTPException(status_code=403, detail="Нет доступа к проекту")

    if settings.USE_MINIO:
        content = await minio_service.download_file(support_file.file_path)
        if content is None:
            raise HTTPException(status_code=404, detail="Файл не найден")

        return Response(
            content=content,
            media_type=support_file.file_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{support_file.file_name}"'
            },
        )
    else:
        import os

        if not os.path.exists(support_file.file_path):
            raise HTTPException(status_code=404, detail="Файл не найден")

        return FileResponse(
            path=support_file.file_path,
            filename=support_file.file_name,
            media_type=support_file.file_type or "application/octet-stream",
        )


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка проектов"""
    # Админ видит все проекты, остальные только свои
    if current_user.user_role and current_user.user_role.code == 'admin':
        projects_query = db.query(Project).filter(Project.is_deleted == 0).order_by(Project.updated_at.desc())
    else:
        # Получаем проекты, где пользователь является участником
        projects_query = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == current_user.id,
            Project.is_deleted == 0
        ).order_by(Project.updated_at.desc())
    
    projects = projects_query.all()
    result = []
    
    for project in projects:
        # Получаем участников проекта (пользователей)
        members = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).all()
        members_data = [
            {
                "id": member.id,
                "user_id": member.user_id,
                "project_role_id": member.project_role_id,
                "joined_at": member.joined_at.isoformat() if member.joined_at else None
            }
            for member in members
        ]
        
        # Получаем роль текущего пользователя в проекте
        current_user_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id, 
            ProjectMember.user_id == current_user.id
        ).first()
        
        if current_user.user_role and current_user.user_role.code == 'admin':
            user_role = 'admin'
        elif current_user_member and current_user_member.project_role:
            user_role = current_user_member.project_role.name
        else:
            user_role = 'member'
        
        # Получаем участников проекта (компании) с контактами
        # Получаем участников с JOIN'ом для избежания N+1 запросов
        from app.models.references import Company
        participants_query_result = db.query(
            ProjectParticipant,
            Company
        ).outerjoin(
            Company,
            Company.id == ProjectParticipant.company_id
        ).filter(
            ProjectParticipant.project_id == project.id
        ).all()
        
        participants_data = []
        for participant, company in participants_query_result:
            
            
            participants_data.append({
                "id": participant.id,
                "company_id": participant.company_id,
                "company": {
                    "id": company.id if company else participant.company_id,
                    "name": company.name if company else f"Company {participant.company_id}",
                    "name_native": company.name_native if company else None,
                } if company else None,
                "contact_id": participant.contact_id,
                "company_role_id": participant.company_role_id,
                "is_primary": participant.is_primary,
                "notes": participant.notes,
                "created_at": participant.created_at.isoformat() if participant.created_at else None
            })
        
        # Расчет прогресса завершения проекта
        completion_progress = _calculate_project_completion_progress(project.id, db)
        
        result.append({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_code": project.project_code,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
            "owner_id": project.created_by,
            "owner_name": (db.query(User).filter(User.id == project.created_by).first().full_name if project.created_by else None),
            "user_role": user_role,  # Роль текущего пользователя в проекте
            "members": members_data,
            "participants": participants_data,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            "completion_progress": completion_progress
        })
    
    return result

@router.post("/", response_model=dict)
async def create_project(
    project_data: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание нового проекта"""
    
    # Проверяем права доступа: только admin и operator могут создавать проекты
    if not current_user.user_role or current_user.user_role.code not in ['admin', 'operator']:
        raise HTTPException(status_code=403, detail="Только администраторы и операторы могут создавать проекты")
    
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
        created_by=current_user.id,
        workflow_preset_id=project_data.workflow_preset_id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Добавляем создателя как участника проекта с ролью "manager"
    from app.models.project_role import ProjectRole
    manager_role = db.query(ProjectRole).filter(ProjectRole.code == 'manager').first()
    if not manager_role:
        # Если нет роли manager, берем первую доступную
        manager_role = db.query(ProjectRole).filter(ProjectRole.is_active == True).first()
    
    project_member = ProjectMember(
        project_id=db_project.id,
        user_id=current_user.id,
        project_role_id=manager_role.id if manager_role else None
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
    
    # Добавляем участников-пользователей, если переданы
    if project_data.members:
        # Получаем все нужные user_id для batch запроса
        user_ids = [member_data.user_id for member_data in project_data.members if member_data.user_id != current_user.id]
        
        # Загружаем всех пользователей одним запросом
        users = {}
        if user_ids:
            for user in db.query(User).filter(User.id.in_(user_ids)).all():
                users[user.id] = user
        
        for member_data in project_data.members:
            # Пропускаем создателя проекта, он уже добавлен
            if member_data.user_id == current_user.id:
                continue
                
            # Проверяем, что пользователь существует
            user = users.get(member_data.user_id)
            if user:
                project_member = ProjectMember(
                    project_id=db_project.id,
                    user_id=member_data.user_id,
                    project_role_id=member_data.project_role_id
                )
                db.add(project_member)
    
    # Добавляем участников-компаний, если переданы
    if project_data.participants:
        # Получаем все нужные company_id для batch запроса
        company_ids = [participant_data.company_id for participant_data in project_data.participants]
        
        # Загружаем все компании одним запросом
        from app.models.references import Company
        companies = {}
        if company_ids:
            for company in db.query(Company).filter(Company.id.in_(company_ids)).all():
                companies[company.id] = company
        
        for participant_data in project_data.participants:
            # Проверяем, что компания существует
            company = companies.get(participant_data.company_id)
            if company:
                project_participant = ProjectParticipant(
                    project_id=db_project.id,
                    company_id=participant_data.company_id,
                    contact_id=participant_data.contact_id,
                    company_role_id=participant_data.company_role_id,
                    is_primary=participant_data.is_primary,
                    notes=participant_data.notes
                )
                db.add(project_participant)
    
    # Добавляем участки тех. процесса (areas) из справочника, если переданы
    if project_data.area_ids:
        # Проверяем, что все areas существуют в справочнике
        areas = db.query(Area).filter(Area.id.in_(project_data.area_ids), Area.is_active == True).all()
        if len(areas) != len(project_data.area_ids):
            raise HTTPException(status_code=400, detail="Один или несколько участков тех процесса не найдены в справочнике")
        
        # Присваиваем areas проекту (SQLAlchemy автоматически обработает промежуточную таблицу)
        db_project.areas = areas
    
    db.commit()
    
    # Логирование действия
    new_values = {
        "id": db_project.id,
        "name": db_project.name,
        "project_code": db_project.project_code,
        "status": db_project.status.value if hasattr(db_project.status, 'value') else str(db_project.status),
        "created_by": db_project.created_by,
        "is_deleted": db_project.is_deleted,
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="create",
        entity_type="project",
        entity_id=db_project.id,
        old_values=None,
        new_values=new_values,
        request=request,
    )
    
    return {
        "id": db_project.id,
        "name": db_project.name,
        "description": db_project.description,
        "project_code": db_project.project_code,
        "status": db_project.status,
        "start_date": db_project.start_date.isoformat() if db_project.start_date else None,
        "end_date": db_project.end_date.isoformat() if db_project.end_date else None,
        "budget": db_project.budget,
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
    
    # Расчет прогресса завершения проекта
    completion_progress = _calculate_project_completion_progress(project.id, db)
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "project_code": project.project_code,
        "status": project.status,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget": project.budget,
        "owner_id": project.created_by,
        "owner_name": (db.query(User).filter(User.id == project.created_by).first().full_name if project.created_by else None),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "completion_progress": completion_progress
    }

@router.put("/{project_id}", response_model=dict)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление проекта и его дисциплин/типов (если переданы)"""
    
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Проверяем права доступа
    if current_user.user_role and current_user.user_role.code == 'admin':
        pass  # Админ может все
    elif project.created_by == current_user.id:
        pass  # Создатель проекта может все
    else:
        raise HTTPException(status_code=403, detail="Только создатель проекта или админ могут редактировать проект")
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": project.id,
        "name": project.name,
        "project_code": project.project_code,
        "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
        "created_by": project.created_by,
        "is_deleted": project.is_deleted,
    }

    # Обновляем простые поля
    for field in ["name", "description", "project_code", "status", "start_date", "end_date", "budget"]:
        value = getattr(project_data, field)
        if value is not None:
            # Проверяем изменение статуса проекта
            if field == "status":
                # Преобразуем значение в строку для сравнения
                status_str = value.value if hasattr(value, 'value') else str(value)
                status_str_upper = status_str.upper()
                
                # Разрешаем изменение на PLANNING в любом случае
                if status_str_upper == "PLANNING":
                    # Можно всегда установить статус на PLANNING
                    pass
                else:
                    # Для других статусов проверяем, есть ли утвержденные документы
                    from app.models.document import Document, DocumentRevision
                    from app.models.references import WorkflowStatus
                    
                    approved_like_statuses = db.query(WorkflowStatus).filter(
                        WorkflowStatus.name.in_(["Approved", "Approved with Comments", "Not Reviewed"])
                    ).all()
                    approved_like_ids = {s.id for s in approved_like_statuses}
                    
                    has_approved_document = False
                    if approved_like_ids:
                        # Проверяем, есть ли в проекте документы с утвержденными ревизиями
                        project_documents = db.query(Document).filter(
                            Document.project_id == project_id,
                            Document.is_deleted == 0
                        ).all()
                        
                        for doc in project_documents:
                            latest_revision = db.query(DocumentRevision).filter(
                                DocumentRevision.document_id == doc.id,
                                DocumentRevision.is_deleted == 0
                            ).order_by(DocumentRevision.created_at.desc()).first()
                            
                            if latest_revision and latest_revision.workflow_status_id in approved_like_ids:
                                has_approved_document = True
                                break
                    
                    # Если пытаются установить статус не PLANNING, но нет утвержденных документов
                    # Разрешаем только PLANNING
                    if not has_approved_document:
                        raise HTTPException(
                            status_code=400, 
                            detail="Статус проекта может быть изменен только после появления первого утвержденного документа"
                        )
            
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

    # Обновляем revision descriptions, если пришли
    if project_data.selected_revision_descriptions is not None:
        # Удаляем старые
        from app.models.project import ProjectRevisionDescription
        db.query(ProjectRevisionDescription).filter(ProjectRevisionDescription.project_id == project_id).delete()
        # Добавляем новые
        for revision_description_id in project_data.selected_revision_descriptions:
            db.add(ProjectRevisionDescription(
                project_id=project_id,
                revision_description_id=revision_description_id
            ))

    # Обновляем revision steps, если пришли
    if project_data.selected_revision_steps is not None:
        # Удаляем старые
        from app.models.project import ProjectRevisionStep
        db.query(ProjectRevisionStep).filter(ProjectRevisionStep.project_id == project_id).delete()
        # Добавляем новые
        for revision_step_id in project_data.selected_revision_steps:
            db.add(ProjectRevisionStep(
                project_id=project_id,
                revision_step_id=revision_step_id
            ))

    # Обновляем workflow preset, если пришел
    if project_data.workflow_preset_id is not None:
        project.workflow_preset_id = project_data.workflow_preset_id

    # Обновляем участников проекта (пользователей), если пришли
    if project_data.members is not None:
        # Удаляем всех текущих участников (кроме создателя проекта)
        db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id != project.created_by
        ).delete()
        
        # Добавляем новых участников
        for member_data in project_data.members:
            # Пропускаем создателя проекта, он уже есть
            if member_data.user_id == project.created_by:
                continue
                
            # Проверяем, что пользователь существует
            user = db.query(User).filter(User.id == member_data.user_id).first()
            if user:
                # Добавляем участника с выбранной ролью
                project_member = ProjectMember(
                    project_id=project_id,
                    user_id=member_data.user_id,
                    project_role_id=member_data.project_role_id
                )
                db.add(project_member)

    # Обновляем участников проекта (компании), если пришли
    if project_data.participants is not None:
        # Удаляем всех текущих участников-компаний
        db.query(ProjectParticipant).filter(
            ProjectParticipant.project_id == project_id
        ).delete()
        
        # Добавляем новых участников-компаний
        for participant_data in project_data.participants:
            # Проверяем, что компания существует
            from app.models.references import Company
            company = db.query(Company).filter(Company.id == participant_data.company_id).first()
            if company:
                # Добавляем участника-компанию с полными данными
                project_participant = ProjectParticipant(
                    project_id=project_id,
                    company_id=participant_data.company_id,
                    contact_id=participant_data.contact_id,
                    company_role_id=participant_data.company_role_id,
                    is_primary=participant_data.is_primary,
                    notes=participant_data.notes
                )
                db.add(project_participant)

    # Обновляем участки тех. процесса (areas), если переданы
    if project_data.area_ids is not None:
        # Проверяем, что все areas существуют в справочнике
        areas = db.query(Area).filter(Area.id.in_(project_data.area_ids), Area.is_active == True).all()
        if len(areas) != len(project_data.area_ids):
            raise HTTPException(status_code=400, detail="Один или несколько участков тех процесса не найдены в справочнике")
        
        # Присваиваем areas проекту (SQLAlchemy автоматически обработает промежуточную таблицу)
        project.areas = areas

    db.commit()
    db.refresh(project)
    
    # Логирование действия
    new_values = {
        "id": project.id,
        "name": project.name,
        "project_code": project.project_code,
        "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
        "created_by": project.created_by,
        "is_deleted": project.is_deleted,
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="project",
        entity_id=project_id,
        old_values=old_values,
        new_values=new_values,
        request=request,
    )

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "project_code": project.project_code,
        "status": project.status,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget": project.budget,
        "owner_id": project.created_by,
        "owner_name": (db.query(User).filter(User.id == project.created_by).first().full_name if project.created_by else None),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }

# Эндпоинты для управления участниками проекта

def check_project_access(project: Project, current_user: User, db: Session, require_creator_or_admin: bool = False):
    """Проверяет права доступа к проекту"""
    # Глобальный администратор всегда имеет доступ
    if current_user.user_role and current_user.user_role.code == 'admin':
        return

    if require_creator_or_admin:
        # Для управления участниками: admin, создатель проекта или участники с ролью "manager" в проекте
        
        # Проверяем, является ли пользователь создателем проекта
        if project.created_by == current_user.id:
            return  # Создатель проекта может все
        
        # Проверяем, является ли пользователь менеджером проекта
        from app.models.project_role import ProjectRole
        manager_role = db.query(ProjectRole).filter(ProjectRole.code == 'manager').first()
        manager_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.project_role_id == manager_role.id if manager_role else None
        ).first()
        
        if not manager_member:
            raise HTTPException(status_code=403, detail="Только создатель проекта, менеджеры проекта или админ могут управлять участниками")
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
    project_role_id: Optional[int] = None  # Проектная роль

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
        raise HTTPException(
            status_code=400, 
            detail=f"Пользователь с ID {member_data.user_id} уже является участником проекта. Один пользователь не может быть добавлен в проект дважды, даже с разными ролями."
        )
    
    # Проверяем, что пользователь существует
    target_user = db.query(User).filter(User.id == member_data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    
    # Добавляем участника
    project_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        project_role_id=member_data.project_role_id
    )
    
    try:
        db.add(project_member)
        db.commit()
        db.refresh(project_member)
    except Exception as e:
        db.rollback()
        # Проверяем, если это ошибка уникального ограничения
        if "uq_project_members_project_user" in str(e) or "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=400, 
                detail=f"Пользователь с ID {member_data.user_id} уже является участником проекта. Один пользователь не может быть добавлен в проект дважды."
            )
        else:
            raise HTTPException(status_code=500, detail="Ошибка при добавлении участника проекта")
    
    return {
        "id": project_member.id,
        "project_id": project_member.project_id,
        "user_id": project_member.user_id,
        "project_role_id": project_member.project_role_id,
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
            "project_role_id": member.project_role_id,
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
    
    # Проверяем ограничения ролей
    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user and target_user.user_role and target_user.user_role.code == 'viewer':
        if member_data.project_role_id:
            target_role = db.query(ProjectRole).filter(ProjectRole.id == member_data.project_role_id).first()
            if target_role and target_role.code != 'viewer':
                raise HTTPException(status_code=400, detail="Пользователю с ролью Viewer можно назначить только роль Viewer в проекте")
    
    # Получаем роли для проверок
    from app.models.project_role import ProjectRole
    manager_role = db.query(ProjectRole).filter(ProjectRole.code == 'manager').first()
    new_role = db.query(ProjectRole).filter(ProjectRole.id == member_data.project_role_id).first()
    
    # Запрещаем понижать роль владельцу проекта
    if member_to_update.user_id == project.created_by and (not new_role or new_role.code != 'manager'):
        raise HTTPException(status_code=400, detail="Нельзя изменять роль владельца проекта")

    # Запрещаем оставлять проект без менеджеров
    if (member_to_update.project_role_id == manager_role.id if manager_role else False) and (not new_role or new_role.code != 'manager'):
        manager_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.project_role_id == manager_role.id if manager_role else None
        ).count()
        if manager_count <= 1:
            raise HTTPException(status_code=400, detail="Нельзя понизить роль последнего менеджера проекта")

    # Обновляем роль участника
    member_to_update.project_role_id = member_data.project_role_id
    db.commit()
    db.refresh(member_to_update)
    
    return {
        "id": member_to_update.id,
        "project_id": member_to_update.project_id,
        "user_id": member_to_update.user_id,
        "project_role_id": member_to_update.project_role_id,
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

    # Запрет на удаление последнего менеджера проекта
    from app.models.project_role import ProjectRole
    manager_role = db.query(ProjectRole).filter(ProjectRole.code == 'manager').first()
    if member_to_remove.project_role_id == (manager_role.id if manager_role else None):
        manager_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.project_role_id == manager_role.id if manager_role else None
        ).count()
        if manager_count <= 1:
            raise HTTPException(status_code=400, detail="Нельзя удалить последнего менеджера проекта")

    db.delete(member_to_remove)
    db.commit()
    
    return {"message": "Участник удален из проекта"}


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete проекта (устанавливает is_deleted = 1)"""
    # Проверяем, что проект существует и не удален
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем права доступа: только создатель проекта или админ может удалять проект
    if not (current_user.user_role and current_user.user_role.code == 'admin') and project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Только создатель проекта или админ может удалить проект")
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": project.id,
        "name": project.name,
        "project_code": project.project_code,
        "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
        "created_by": project.created_by,
        "is_deleted": project.is_deleted,
    }
    
    # Устанавливаем is_deleted = 1
    project.is_deleted = 1
    db.commit()
    
    # Логирование действия
    log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="project",
        entity_id=project_id,
        old_values=old_values,
        new_values={"is_deleted": 1},
        request=request,
    )
    
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
    
    # Получаем уникальные дисциплины через JOIN
    disciplines = db.query(Discipline).join(
        ProjectDisciplineDocumentType,
        Discipline.id == ProjectDisciplineDocumentType.discipline_id
    ).filter(
        ProjectDisciplineDocumentType.project_id == project_id
    ).distinct().all()
    
    return [
        {
            "id": discipline.id,
            "code": discipline.code,
            "name": discipline.name,
            "name_en": discipline.name_en,
            "description": discipline.description
        }
        for discipline in disciplines
    ]


@router.get("/{project_id}/areas", response_model=List[dict])
async def get_project_areas(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение участков тех. процесса проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем areas проекта через промежуточную таблицу project_areas
    from app.models.project import project_areas
    areas = db.query(Area).join(
        project_areas,
        Area.id == project_areas.c.area_id
    ).filter(
        project_areas.c.project_id == project_id,
        Area.is_active == True
    ).all()
    
    return [
        {
            "id": area.id,
            "code": area.code,
            "name": area.name,
            "description": area.description,
            "is_active": area.is_active
        }
        for area in areas
    ]


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
    # Используем JOIN вместо N+1 запросов
    results = db.query(
        DocumentType,
        ProjectDisciplineDocumentType
    ).join(
        ProjectDisciplineDocumentType,
        DocumentType.id == ProjectDisciplineDocumentType.document_type_id
    ).filter(
        ProjectDisciplineDocumentType.project_id == project_id,
        ProjectDisciplineDocumentType.discipline_id == discipline_id
    ).all()
    
    return [
        {
            "id": doc_type.id,
            "code": doc_type.code,
            "name": doc_type.name,
            "name_en": doc_type.name_en,
            "description": doc_type.description,
            "drs": pddt.drs  # Добавляем DRS из project_discipline_document_types
        }
        for doc_type, pddt in results
    ]


@router.get("/{project_id}/document-types", response_model=dict)
async def get_all_project_document_types(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение всех типов документов для проекта, сгруппированных по дисциплинам"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    # Получаем все связи дисциплина-тип документа для проекта
    project_discipline_document_types = db.query(ProjectDisciplineDocumentType).filter(
        ProjectDisciplineDocumentType.project_id == project_id
    ).all()
    
    # Группируем по дисциплинам
    result = {}
    for pddt in project_discipline_document_types:
        doc_type = db.query(DocumentType).filter(DocumentType.id == pddt.document_type_id).first()
        if doc_type:
            discipline_id = pddt.discipline_id
            if discipline_id not in result:
                result[discipline_id] = []
            
            
            result[discipline_id].append({
                "id": doc_type.id,
                "code": doc_type.code,
                "name": doc_type.name,
                "name_en": doc_type.name_en,
                "description": doc_type.description,
                "drs": pddt.drs
            })
    
    return result


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


@router.get("/{project_id}/workflow-preset/sequence", response_model=List[dict])
async def get_workflow_preset_sequence(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение sequence пресета workflow для проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    if not project.workflow_preset_id:
        return []
    
    # Получаем sequence пресета
    from app.models.project import WorkflowPresetSequence
    from app.models.references import RevisionStep, RevisionDescription
    
    sequence = db.query(WorkflowPresetSequence).filter(
        WorkflowPresetSequence.preset_id == project.workflow_preset_id
    ).order_by(WorkflowPresetSequence.sequence_order).all()
    
    result = []
    for seq_item in sequence:
        # Получаем данные шага и описания
        revision_step = db.query(RevisionStep).filter(RevisionStep.id == seq_item.revision_step_id).first()
        revision_description = db.query(RevisionDescription).filter(RevisionDescription.id == seq_item.revision_description_id).first()
        
        result.append({
            "id": seq_item.id,
            "sequence_order": seq_item.sequence_order,
            "revision_description_id": seq_item.revision_description_id,
            "revision_step_id": seq_item.revision_step_id,
            "is_final": seq_item.is_final,
            "requires_transmittal": seq_item.requires_transmittal,
            "due_days": seq_item.due_days,
            "revision_step": {
                "id": revision_step.id if revision_step else None,
                "code": revision_step.code if revision_step else None,
                "description": revision_step.description if revision_step else None,
                "description_native": revision_step.description_native if revision_step else None
            } if revision_step else None,
            "revision_description": {
                "id": revision_description.id if revision_description else None,
                "code": revision_description.code if revision_description else None,
                "description": revision_description.description if revision_description else None,
                "description_native": revision_description.description_native if revision_description else None
            } if revision_description else None
        })
    
    return result


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


@router.get("/{project_id}/revision-steps-stats")
async def get_revision_steps_stats(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение статистики по шагам ревизий для проекта"""
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == 0).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    check_project_access(project, current_user, db)
    
    from app.models.references import RevisionStep
    
    # Получаем все шаги ревизий проекта
    from app.models.project import ProjectRevisionStep
    project_steps = db.query(ProjectRevisionStep).filter(
        ProjectRevisionStep.project_id == project_id
    ).all()
    
    step_ids = [ps.revision_step_id for ps in project_steps]
    if not step_ids:
        return []
    
    # Получаем информацию о шагах
    revision_steps = db.query(RevisionStep).filter(
        RevisionStep.id.in_(step_ids)
    ).all()
    
    step_info_map = {rs.id: rs for rs in revision_steps}
    
    # Получаем все документы проекта
    documents = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_deleted == 0
    ).all()
    
    # Создаем подзапрос для получения последней ревизии каждого документа
    latest_revision_subquery = db.query(
        DocumentRevision.document_id,
        func.max(DocumentRevision.created_at).label('max_created_at')
    ).filter(
        DocumentRevision.is_deleted == 0
    ).group_by(DocumentRevision.document_id).subquery()
    
    # Получаем последние ревизии всех документов
    latest_revisions = db.query(
        DocumentRevision
    ).join(
        latest_revision_subquery,
        and_(
            DocumentRevision.document_id == latest_revision_subquery.c.document_id,
            DocumentRevision.created_at == latest_revision_subquery.c.max_created_at,
            DocumentRevision.is_deleted == 0
        )
    ).filter(
        DocumentRevision.document_id.in_([doc.id for doc in documents])
    ).all()
    
    # Подсчитываем количество документов на каждом шаге
    step_counts = {}
    for revision in latest_revisions:
        if revision.revision_step_id and revision.revision_step_id in step_info_map:
            step_id = revision.revision_step_id
            if step_id not in step_counts:
                step_counts[step_id] = 0
            step_counts[step_id] += 1
    
    # Получаем порядок шагов из workflow preset sequence
    step_order_map = {}
    if project.workflow_preset_id:
        from app.models.project import WorkflowPresetSequence
        sequences = db.query(WorkflowPresetSequence).filter(
            WorkflowPresetSequence.preset_id == project.workflow_preset_id
        ).order_by(WorkflowPresetSequence.sequence_order).all()
        
        # Создаем карту порядка для шагов (берем минимальный sequence_order для каждого шага)
        for seq in sequences:
            if seq.revision_step_id and seq.revision_step_id not in step_order_map:
                step_order_map[seq.revision_step_id] = seq.sequence_order
    
    # Формируем результат
    result = []
    for step_id in step_ids:
        step = step_info_map.get(step_id)
        if step:
            result.append({
                "step_id": step.id,
                "step_code": step.code,
                "step_description": step.description,
                "step_description_native": step.description_native,
                "documents_count": step_counts.get(step.id, 0),
                "sequence_order": step_order_map.get(step.id, 9999)  # Если нет в sequence, ставим в конец
            })
    
    # Сортируем по порядку из workflow preset, затем по коду шага
    result.sort(key=lambda x: (x["sequence_order"], x["step_code"] or ""))
    
    return result