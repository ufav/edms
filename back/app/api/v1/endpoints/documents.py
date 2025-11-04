"""
Documents endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from fastapi_pagination import Page, Params, create_page
import os
import shutil
import hashlib
import uuid
from datetime import datetime, date, timedelta
import pandas as pd
import io

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.document import Document, DocumentRevision
from app.models.discipline import Discipline, DocumentType
from app.models.discipline import Discipline, DocumentType
from app.models.references import Language, WorkflowStatus
from app.models.project import Project, ProjectDisciplineDocumentType, ProjectMember
from app.models.document_workflow_history import DocumentWorkflowHistory
from app.services.auth import get_current_active_user
from app.services.minio_service import minio_service
from fastapi import Query
from fastapi_pagination import Page, Params, create_page
from fastapi_pagination.ext.sqlalchemy import paginate as sa_paginate

router = APIRouter()

def generate_minio_key(
    project_code: str,
    document_number: str,
    revision_code: str,
    revision_number: str,
    revision_description_id: int,
    revision_id: int,
    filename: str
) -> str:
    """Generate MinIO key for file storage"""
    return minio_service.generate_file_key(
        project_code,
        document_number,
        revision_code,
        revision_number,
        revision_description_id,
        revision_id,
        filename
    )

class DocumentCreate(BaseModel):
    title: str
    title_native: str = None  # Переименовано из description
    remarks: Optional[str] = None  # Примечания (текстовое поле)
    number: Optional[str] = None
    project_id: int
    discipline_id: Optional[int] = None
    document_type_id: Optional[int] = None
    language_id: Optional[int] = None
    document_code: Optional[str] = None
    language_id: Optional[int] = None
    author: Optional[str] = None
    creation_date: Optional[date] = None
    revision: Optional[str] = None
    sheet_number: Optional[str] = None
    total_sheets: Optional[int] = None
    scale: Optional[str] = None
    format: Optional[str] = None
    confidentiality: str = "internal"
    drs: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: str = None
    title_native: str = None  # Переименовано из description
    remarks: Optional[str] = None  # Примечания (текстовое поле)
    number: Optional[str] = None
    status: str = None
    is_deleted: Optional[int] = None
    drs: Optional[str] = None
    discipline_id: Optional[int] = None
    document_type_id: Optional[int] = None
    language_id: Optional[int] = None
    document_code: Optional[str] = None
    language_id: Optional[int] = None
    author: Optional[str] = None
    creation_date: Optional[date] = None
    revision: Optional[str] = None
    sheet_number: Optional[str] = None
    total_sheets: Optional[int] = None
    scale: Optional[str] = None
    format: Optional[str] = None
    confidentiality: Optional[str] = None

class DocumentMetadata(BaseModel):
    file_name: str
    title: str
    title_native: Optional[str] = None  # Переименовано из description
    remarks: Optional[str] = None  # Примечания (текстовое поле)
    discipline_code: Optional[str] = None

class ReleaseRevisionRequest(BaseModel):
    comment: Optional[str] = None


def _bump_revision_string(current: Optional[str]) -> str:
    """Увеличивает номер ревизии: 01 -> 02, 02 -> 03, и т.д."""
    try:
        # Парсим текущий номер (например, "01", "02")
        current_num = int(current or "01")
        new_num = current_num + 1
        # Возвращаем в формате с ведущим нулем (01, 02, 03, ...)
        return f"{new_num:02d}"
    except Exception:
        # Если не удалось распарсить, возвращаем "02"
        return "02"


def _get_next_revision_from_sequence(
    document_id: int, 
    current_revision_description_id: int, 
    current_revision_step_id: int,
    db: Session
) -> tuple[Optional[int], Optional[int], str]:
    """
    Определяет следующую редакцию в последовательности на основе статуса последней ревизии.
    Возвращает (revision_description_id, revision_step_id, revision_number)
    """
    from app.models.project import Project, WorkflowPresetSequence
    from app.models.references import RevisionDescription, RevisionStep
    from app.models.document_workflow_history import DocumentWorkflowHistory
    from app.models.references import WorkflowStatus
    
    # Получаем документ и его проект
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document or not document.project_id:
        return None, None, "02"  # Fallback к простому увеличению
    
    # Получаем последнюю НЕ отмененную ревизию документа
    from app.models.references import RevisionStatus
    cancelled_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Cancelled").first()
    
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0,
        DocumentRevision.revision_status_id != cancelled_status.id if cancelled_status else True  # Исключаем отмененные ревизии
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_revision:
        return None, None, "01"  # Первая ревизия
    
    # Проверяем статус последней ревизии
    approved_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Approved").first()
    
    print(f"DEBUG: _get_next_revision_from_sequence - latest_revision: {latest_revision.number}, workflow_status_id: {latest_revision.workflow_status_id}, approved_status_id: {approved_status.id if approved_status else None}")
    
    if not approved_status or latest_revision.workflow_status_id != approved_status.id:
        # Если последняя ревизия не утверждена, просто увеличиваем номер
        print(f"DEBUG: Last revision not approved, using same sequence: {current_revision_description_id}, {current_revision_step_id}, {_bump_revision_string(latest_revision.number)}")
        return current_revision_description_id, current_revision_step_id, _bump_revision_string(latest_revision.number)
    
    # Если последняя ревизия утверждена, ищем следующую редакцию в последовательности
    project = db.query(Project).filter(Project.id == document.project_id).first()
    if not project or not project.workflow_preset_id:
        return None, None, _bump_revision_string(latest_revision.number)  # Fallback
    
    # Получаем текущую редакцию (описание + шаг)
    current_description = db.query(RevisionDescription).filter(
        RevisionDescription.id == current_revision_description_id
    ).first()
    current_step = db.query(RevisionStep).filter(
        RevisionStep.id == current_revision_step_id
    ).first()
    
    if not current_description or not current_step:
        return None, None, _bump_revision_string(latest_revision.number)  # Fallback
    
    # Ищем текущую редакцию в последовательности
    current_sequence = db.query(WorkflowPresetSequence).filter(
        WorkflowPresetSequence.preset_id == project.workflow_preset_id,
        WorkflowPresetSequence.revision_description_id == current_revision_description_id,
        WorkflowPresetSequence.revision_step_id == current_revision_step_id
    ).first()
    
    if not current_sequence:
        # Если текущая редакция не найдена в последовательности, просто увеличиваем номер
        return current_revision_description_id, current_revision_step_id, _bump_revision_string(latest_revision.number)
    
    # Ищем следующую редакцию в последовательности
    next_sequence = db.query(WorkflowPresetSequence).filter(
        WorkflowPresetSequence.preset_id == project.workflow_preset_id,
        WorkflowPresetSequence.sequence_order > current_sequence.sequence_order
    ).order_by(WorkflowPresetSequence.sequence_order).first()
    
    if next_sequence:
        # Получаем информацию о следующей редакции
        next_description = db.query(RevisionDescription).filter(
            RevisionDescription.id == next_sequence.revision_description_id
        ).first()
        next_step = db.query(RevisionStep).filter(
            RevisionStep.id == next_sequence.revision_step_id
        ).first()
        
        if next_description and next_step:
            # Генерируем номер ревизии (только номер, без кода описания)
            revision_number = "01"  # Всегда начинаем с 01 для новой редакции
            return next_sequence.revision_description_id, next_sequence.revision_step_id, revision_number
    
    # Если не найдена следующая редакция, просто увеличиваем номер
    return current_revision_description_id, current_revision_step_id, _bump_revision_string(latest_revision.number)


def _compute_md5(file_path: str) -> Optional[str]:
    try:
        md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                md5.update(chunk)
        return md5.hexdigest()
    except Exception:
        return None

@router.get("/", response_model=Page[dict])
async def get_documents(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    discipline_id: Optional[int] = None,
    document_type_id: Optional[int] = None,
    revision_description_id: Optional[int] = None,
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    sort_by: Optional[str] = Query(default="updated_at"),
    sort_dir: Optional[str] = Query(default="desc"),
    params: Params = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка документов"""
    from sqlalchemy import func, and_
    
    # Создаем подзапрос для получения последней ревизии каждого документа
    latest_revision_subquery = db.query(
        DocumentRevision.document_id,
        func.max(DocumentRevision.created_at).label('max_created_at')
    ).group_by(DocumentRevision.document_id).subquery()
    
    # Основной запрос с JOIN'ами для получения всех данных за один раз
    query = db.query(
        Document,
        DocumentRevision,
        Discipline,
        DocumentType,
        ProjectDisciplineDocumentType
    ).outerjoin(
        latest_revision_subquery,
        Document.id == latest_revision_subquery.c.document_id
    ).outerjoin(
        DocumentRevision,
        and_(
            DocumentRevision.document_id == Document.id,
            DocumentRevision.created_at == latest_revision_subquery.c.max_created_at
        )
    ).outerjoin(
        Discipline,
        Discipline.id == Document.discipline_id
    ).outerjoin(
        DocumentType,
        DocumentType.id == Document.document_type_id
    ).outerjoin(
        ProjectDisciplineDocumentType,
        and_(
            ProjectDisciplineDocumentType.project_id == Document.project_id,
            ProjectDisciplineDocumentType.discipline_id == Document.discipline_id,
            ProjectDisciplineDocumentType.document_type_id == Document.document_type_id
        )
    ).filter(Document.is_deleted == 0)
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    # Фильтрация по статусу workflow
    if status and status != 'all':
        from app.models.references import WorkflowStatus
        
        # Получаем ID статуса по названию
        status_mapping = {
            'draft': 'Draft',
            'review': 'In Review', 
            'approved': ['Approved', 'Approved with Comments'],
            'rejected': 'Rejected'
        }
        
        if status in status_mapping:
            target_statuses = status_mapping[status]
            if isinstance(target_statuses, list):
                # Для approved - несколько статусов
                workflow_status_ids = db.query(WorkflowStatus.id).filter(
                    WorkflowStatus.name.in_(target_statuses)
                ).all()
                workflow_status_ids = [s[0] for s in workflow_status_ids]
            else:
                # Для остальных - один статус
                workflow_status = db.query(WorkflowStatus).filter(
                    WorkflowStatus.name == target_statuses
                ).first()
                workflow_status_ids = [workflow_status.id] if workflow_status else []
            
            if workflow_status_ids:
                # Фильтруем по workflow_status_id последней ревизии
                query = query.filter(DocumentRevision.workflow_status_id.in_(workflow_status_ids))
            else:
                # Если статус не найден, возвращаем пустой результат
                return []
    
    # Поисковая строка по номеру/названию/примечаниям
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Document.title.ilike(like)) |
            (Document.title_native.ilike(like)) |
            (Document.number.ilike(like)) |
            (Document.remarks.ilike(like))
        )

    # Фильтры по дисциплине / типу / описанию ревизии
    if discipline_id:
        query = query.filter(Document.discipline_id == discipline_id)
    if document_type_id:
        query = query.filter(Document.document_type_id == document_type_id)
    if revision_description_id:
        query = query.filter(DocumentRevision.revision_description_id == revision_description_id)

    # Фильтр по датам создания документа
    if date_from:
        query = query.filter(Document.created_at >= date_from)
    if date_to:
        # включительно конец дня - добавляем 1 день и используем < вместо <=
        next_day = date_to + timedelta(days=1)
        query = query.filter(Document.created_at < next_day)

    # Сортировка
    sort_field_map = {
        "updated_at": Document.updated_at,
        "created_at": Document.created_at,
        "number": Document.number,
        "title": Document.title,
    }
    sort_field = sort_field_map.get((sort_by or "").lower(), Document.updated_at)
    if (sort_dir or "").lower() == "asc":
        query = query.order_by(sort_field.asc())
    else:
        query = query.order_by(sort_field.desc())

    # Выполняем запрос с пагинацией
    results = query.offset((params.page - 1) * params.size).limit(params.size).all()
    
    # Подсчитываем общее количество записей
    total_count = query.count()
    
    # Формируем результат
    result = []
    for row in results:
        doc, latest_revision, discipline, document_type, project_discipline_doc_type = row
        
        result.append({
            "id": doc.id,
            "title": doc.title,
            "title_native": doc.title_native,  # Нативное название
            "description": doc.title_native,  # Для обратной совместимости
            "remarks": doc.remarks,  # Примечания (текстовое поле)
            "number": doc.number,
            "file_name": latest_revision.file_name if latest_revision else None,
            "file_size": latest_revision.file_size if latest_revision else None,
            "file_type": latest_revision.file_type if latest_revision else None,
            "revision": latest_revision.number if latest_revision else "01",
            "revision_description_id": latest_revision.revision_description_id if latest_revision else None,
            "revision_status_id": latest_revision.revision_status_id if latest_revision else None,
            "workflow_status_id": latest_revision.workflow_status_id if latest_revision else None,
            "is_deleted": doc.is_deleted if doc.is_deleted is not None else 0,
            "drs": project_discipline_doc_type.drs if project_discipline_doc_type else None,
            "project_id": doc.project_id,
            "language_id": doc.language_id,
            "discipline_id": doc.discipline_id,
            "document_type_id": doc.document_type_id,
            "discipline_name": discipline.name if discipline else None,
            "discipline_code": discipline.code if discipline else None,
            "document_type_name": document_type.name if document_type else None,
            "document_type_code": document_type.code if document_type else None,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "created_by": doc.created_by
        })
    
    return create_page(result, total=total_count, params=params)

@router.post("/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    title: str = None,
    title_native: str = None,  # Переименовано из description
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Загрузка документа"""
    
    # Проверяем размер файла
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")
    
    # Проверяем тип файла
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_extension and settings.ALLOWED_FILE_TYPES:
        # settings.ALLOWED_FILE_TYPES хранится строкой с запятыми
        allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
        if file_extension not in allowed:
            raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")
    
    # Получаем информацию о проекте
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Создаем запись в базе данных
    db_document = Document(
        title=title or file.filename,
        title_native=title_native,  # Переименовано из description
        remarks=None,  # Примечания (можно добавить в будущем)
        project_id=project_id,
        created_by=current_user.id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Получаем ID статуса "Draft" из workflow_statuses
    draft_workflow_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Draft").first()
    
    # Генерируем номер документа (если не задан)
    document_number = db_document.number or f"DOC-{db_document.id:04d}"
    
    # Создаем первую ревизию документа
    revision_row = DocumentRevision(
        document_id=db_document.id,
        number="01",  # Первая ревизия
        file_name=file.filename,
        file_size=file.size,
        file_type=file.content_type,
        change_description="First revision - Первая ревизия",
        uploaded_by=current_user.id,
        workflow_status_id=draft_workflow_status.id if draft_workflow_status else None,
    )
    
    db.add(revision_row)
    db.commit()
    db.refresh(revision_row)
    
    # Читаем содержимое файла один раз
    content = await file.read()
    
    # Определяем способ хранения файла
    if settings.USE_MINIO:
        # Используем MinIO для хранения
        try:
            # Генерируем ключ для MinIO
            minio_key = generate_minio_key(
                project_code=project.project_code,
                document_number=document_number,
                revision_code="A",  # По умолчанию
                revision_number="01",
                revision_description_id=1,  # По умолчанию
                revision_id=revision_row.id,
                filename=file.filename
            )
            
            # Загружаем в MinIO
            success = await minio_service.upload_file(
                file_content=content,
                file_key=minio_key,
                content_type=file.content_type
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Ошибка загрузки файла в MinIO")
            
            # Сохраняем ключ MinIO в базе данных
            revision_row.file_path = minio_key
            db.commit()
            
        except Exception as e:
            # Если MinIO недоступен, удаляем созданные записи
            db.delete(revision_row)
            db.delete(db_document)
            db.commit()
            raise HTTPException(status_code=500, detail=f"Ошибка MinIO: {str(e)}")
    else:
        # Используем локальное хранение
        file_uuid = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        new_filename = f"{file_uuid}.{file_extension}"
        
        # Создаем директорию если не существует
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Сохраняем файл локально
        file_path = os.path.join(settings.UPLOAD_DIR, new_filename)
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Сохраняем путь к файлу в базе данных
        revision_row.file_path = file_path
        db.commit()

    return {
        "id": db_document.id,
        "title": db_document.title,
        "file_name": revision_row.file_name,
        "file_size": revision_row.file_size,
        "file_type": revision_row.file_type,
        "revision": revision_row.number,
        "revision_status_id": revision_row.revision_status_id,
        "created_at": db_document.created_at
    }


@router.post("/create-with-revision", response_model=dict)
async def create_document_with_revision(
    file: UploadFile = File(...),
    title: str = Form(...),
    title_native: str = Form(None),
    remarks: str = Form(None),
    number: str = Form(None),
    drs: str = Form(None),
    project_id: int = Form(...),
    discipline_id: int = Form(None),
    document_type_id: int = Form(None),
    language_id: int = Form(1),
    revision_description_id: int = Form(None),
    revision_step_id: int = Form(None),
    change_description: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание документа с первой ревизией"""
    
    # Проверяем размер файла
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")
    
    # Проверяем тип файла
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_extension and settings.ALLOWED_FILE_TYPES:
        allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
        if file_extension not in allowed:
            raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")
    
    # Получаем информацию о проекте
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Читаем содержимое файла один раз
    content = await file.read()
    
    # Создаем запись документа в базе данных
    db_document = Document(
        title=title,
        title_native=title_native,
        remarks=remarks,
        number=number,
        project_id=project_id,
        discipline_id=discipline_id,
        document_type_id=document_type_id,
        language_id=language_id,
        created_by=current_user.id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Получаем ID статуса "Active" для первой ревизии
    from app.models.references import RevisionStatus
    active_status = db.query(RevisionStatus).filter(RevisionStatus.id == 1).first()
    active_status_id = active_status.id if active_status else None
    
    # Получаем ID статуса "Draft" из workflow_statuses
    draft_workflow_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Draft").first()
    
    # Временно сохраняем файл локально для определения пути
    upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(upload_dir, exist_ok=True)
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
    temp_file_path = os.path.join(upload_dir, unique_filename)
    with open(temp_file_path, "wb") as buffer:
        buffer.write(content)
    
    # Создаем первую ревизию документа
    revision_row = DocumentRevision(
        document_id=db_document.id,
        number="01",
        file_path=temp_file_path,  # Временно используем локальный путь
        file_name=file.filename,
        file_size=len(content),
        file_type=file.content_type,
        change_description=change_description or "First revision - Первая ревизия",
        uploaded_by=current_user.id,
        revision_status_id=active_status_id,
        revision_description_id=revision_description_id,
        revision_step_id=revision_step_id,
        workflow_status_id=draft_workflow_status.id if draft_workflow_status else None,
    )
    
    db.add(revision_row)
    db.commit()
    db.refresh(revision_row)
    
    # Определяем способ хранения файла
    if settings.USE_MINIO:
        # Используем MinIO для хранения (как в docste1)
        try:
            # Генерируем ключ для MinIO
            document_number = number or f"DOC-{db_document.id:04d}"
            revision_key_prefix = f"{project.project_code}/{document_number}/{revision_row.number}_{revision_description_id or 1}_{revision_row.id}"
            file_key = f"{revision_key_prefix}/{file.filename}"
            
            # Загружаем файл в MinIO напрямую
            import aiobotocore.session
            session = aiobotocore.session.get_session()
            async with session.create_client(
                's3',
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY
            ) as client:
                await client.put_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key,
                    Body=content
                )
            
            # Обновляем путь к файлу в базе данных
            revision_row.file_path = file_key
            db.commit()
            
            # Удаляем временный локальный файл
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
        except Exception as e:
            # Если MinIO недоступен, оставляем локальный файл
            pass
    else:
        # Используем локальное хранение (файл уже сохранен)
        pass
    
    # Создаем запись в истории workflow для первой ревизии
    if draft_workflow_status:
        workflow_history = DocumentWorkflowHistory(
            revision_id=revision_row.id,
            from_status_id=None,  # Первая ревизия, нет предыдущего статуса
            to_status_id=draft_workflow_status.id,
            user_id=current_user.id,
            action_type="initial_upload",
            comments=change_description or "Первая загрузка документа"
        )
        db.add(workflow_history)
        db.commit()
    
    return {
        "id": db_document.id,
        "title": db_document.title,
        "number": db_document.number,
        "file_name": revision_row.file_name,
        "file_size": revision_row.file_size,
        "revision": revision_row.number,
        "created_at": db_document.created_at
    }

@router.get("/{document_id}", response_model=dict)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение документа по ID"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем последнюю версию документа
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).order_by(DocumentRevision.created_at.desc()).first()

    # Получим связанные названия дисциплины и типа документа (если заданы)
    discipline = None
    doc_type = None
    if document.discipline_id:
        discipline = db.query(Discipline).filter(Discipline.id == document.discipline_id).first()
    if document.document_type_id:
        doc_type = db.query(DocumentType).filter(DocumentType.id == document.document_type_id).first()
    
    # Попытаемся получить DRS из project_discipline_document_types
    drs_value = None
    if document.project_id and document.discipline_id and document.document_type_id:
        pddt = db.query(ProjectDisciplineDocumentType).filter(
            ProjectDisciplineDocumentType.project_id == document.project_id,
            ProjectDisciplineDocumentType.discipline_id == document.discipline_id,
            ProjectDisciplineDocumentType.document_type_id == document.document_type_id,
        ).first()
        if pddt:
            drs_value = pddt.drs
    
    return {
        "id": document.id,
        "title": document.title,
        "title_native": document.title_native,
        "number": document.number,
        "file_name": latest_revision.file_name if latest_revision else None,
        "file_size": latest_revision.file_size if latest_revision else None,
        "file_type": latest_revision.file_type if latest_revision else None,
        "revision": latest_revision.number if latest_revision else "01",
        "revision_status_id": latest_revision.revision_status_id if latest_revision else None,
        "is_deleted": document.is_deleted,
        "drs": drs_value,
        "project_id": document.project_id,
        "discipline_id": document.discipline_id,
        "discipline_code": discipline.code if discipline else None,
        "discipline_name": discipline.name if discipline else None,
        "document_type_id": document.document_type_id,
        "document_type_code": doc_type.code if doc_type else None,
        "document_type_name": doc_type.name if doc_type else None,
        "language_id": document.language_id,
        # fields below may not exist in the current model; keep only existing ones
        "creation_date": document.creation_date,
        "sheet_number": document.sheet_number,
        "total_sheets": document.total_sheets,
        "scale": document.scale,
        "format": document.format,
        "confidentiality": document.confidentiality,
        "created_at": document.created_at,
        "created_by": document.created_by
    }


@router.post("/import-by-paths")
async def import_documents_by_paths(
    metadata_file: UploadFile = File(...),
    project_id: int = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Импорт документов по путям из Excel метаданных с прогрессом в реальном времени."""
    try:
        metadata_content = await metadata_file.read()
        # Пробуем разные движки для чтения Excel файла
        try:
            df = pd.read_excel(io.BytesIO(metadata_content), engine='openpyxl', header=None)
        except Exception as e1:
            try:
                df = pd.read_excel(io.BytesIO(metadata_content), engine='xlrd', header=None)
            except Exception as e2:
                # Пробуем без указания движка
                df = pd.read_excel(io.BytesIO(metadata_content), header=None)
        
        # Ищем строку с заголовками (аналогично клиентскому коду)
        header_row_index = None
        # Алиасы для распознавания колонок (после нормализации: lower, strip, remove '*', replace ' ' with '_')
        # Варианты из пользовательского списка:
        header_aliases = {
            'number': {
                'document_number',  # Document Number, Document Number*, Document_Number
                'documentnumber',   # DocumentNumber*, DocumentNumber
                'documentid',       # DocumentId, DocumentId*
                'document_id'       # DocumentId, DocumentId*
            },
            'title': {
                'title',            # title, title*
                'document_title',  # document_title, document Title*, document Title
                'documenttitle'    # documentTitle, documentTitle*
            },
            'secondary_title': {
                'secondary_title',  # Secondary Title, Secondary_Title
                'secondarytitle'     # SecondaryTitle
            },
            'discipline': {
                'discipline'  # Discipline, Discipline*
            },
            'document_type': {
                'documenttype',    # DocumentType, DocumentType*
                'document_type'    # Document Type, Document Type*, Document_Type
            },
            'content_language': {
                'language',           # Language, Language*
                'content_language',   # content_Language*, content_Language, content Language*, content Language
                'contentlanguage'    # contentLanguage, contentLanguage*
            }
        }
        required_fields = ['number', 'title']
        
        original_header_by_norm = {}
        for row_idx in range(len(df)):
            row_values = df.iloc[row_idx].astype(str).str.strip().str.lower().str.replace('*', '').str.replace(' ', '_').tolist()

            # Исключаем явные поля типа transmittal_number из рассмотрения
            row_values_filtered = [v for v in row_values if v and v != 'nan']

            # Подсчет совпадений по всем известным группам
            matched_groups = {}
            matched_fields_details = {}
            total_matches = 0
            contains_number = False
            contains_title = False
            for group_name, aliases in header_aliases.items():
                matched = any(v in aliases for v in row_values_filtered)
                matched_groups[group_name] = matched
                if matched:
                    # Находим конкретное совпавшее значение
                    matched_value = next((v for v in row_values_filtered if v in aliases), None)
                    matched_fields_details[group_name] = matched_value
                    total_matches += 1
                    if group_name == 'number':
                        contains_number = True
                    if group_name == 'title':
                        contains_title = True

            # Эвристика: шапка — если минимум 3 совпадения среди известных колонок и обязательно найдены number и title
            if contains_number and contains_title and total_matches >= 3:
                header_row_index = row_idx
                # Сохраним исходные заголовки для логирования (до нормализации)
                try:
                    raw_headers = df.iloc[row_idx].astype(str).tolist()
                    norm_headers = [str(v).strip().lower().replace('*', '').replace(' ', '_') for v in raw_headers]
                    original_header_by_norm = {norm: raw for norm, raw in zip(norm_headers, raw_headers)}
                except Exception as e:
                    original_header_by_norm = {}
                break
        
        if header_row_index is None:
            raise HTTPException(
                status_code=400,
                detail="Не найдена строка с заголовками. Требуются 'number' и 'title' или их алиасы."
            )
        
        # Читаем файл заново с правильной строкой заголовков
        try:
            df = pd.read_excel(io.BytesIO(metadata_content), engine='openpyxl', header=header_row_index)
        except Exception as e1:
            try:
                df = pd.read_excel(io.BytesIO(metadata_content), engine='xlrd', header=header_row_index)
            except Exception as e2:
                df = pd.read_excel(io.BytesIO(metadata_content), header=header_row_index)

        # Нормализуем названия колонок (убираем пробелы, звездочки, приводим к нижнему регистру)
        df.columns = df.columns.str.strip().str.replace('*', '').str.lower().str.replace(' ', '_')

        # Переименовываем в канонические имена по алиасам
        column_aliases = {
            'number': header_aliases['number'],
            'title': header_aliases['title'],
            'secondary_title': header_aliases['secondary_title'],
            'discipline': header_aliases['discipline'],
            'document_type': header_aliases['document_type'],
            'content_language': header_aliases['content_language'],
        }
        rename_map = {}
        for col in list(df.columns):
            for canonical, aliases in column_aliases.items():
                if col in aliases and col != canonical:
                    rename_map[col] = canonical
        if rename_map:
            df.rename(columns=rename_map, inplace=True)
        
        # После переименования колонки могли стать каноническими именами (например, 'number')
        # Проверяем сначала наличие 'number' (после переименования), затем исходные алиасы
        available_cols = set(df.columns)
        selected_number_col = None
        
        # Приоритет 1: если есть 'number' (каноническое имя после переименования) - используем его
        if 'number' in available_cols:
            selected_number_col = 'number'
        else:
            # Приоритет 2: ищем исходные алиасы из пользовательского списка
            number_aliases_order = [
                'document_number',   # Document Number, Document Number*, Document_Number
                'documentnumber',    # DocumentNumber*, DocumentNumber
                'documentid',        # DocumentId, DocumentId*
                'document_id'        # DocumentId, DocumentId*
            ]
            excluded_number_like = {'trn_number', 'transmittal_number', 'trn_no'}
            for candidate in number_aliases_order:
                is_excluded = candidate in excluded_number_like or 'trn' in candidate or 'transmittal' in candidate
                is_available = candidate in available_cols
                if is_available and not is_excluded:
                    selected_number_col = candidate
                    break
            
            if not selected_number_col:
                raise HTTPException(
                    status_code=400,
                    detail=f"Не найдена колонка с номером документа. Доступные колонки: {', '.join(df.columns)}. Ожидаются варианты: Document Number, DocumentNumber, DocumentId, Document_Id"
                )
        
        # Проверяем наличие обязательных колонок (без file_path)
        required_columns = ['number', 'title']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Отсутствуют обязательные колонки: {', '.join(missing_columns)}. Доступные колонки: {', '.join(df.columns)}"
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка чтения файла метаданных: {str(e)}")

    # Получаем информацию о проекте
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Получаем только дисциплины и типы документов, прикрепленные к проекту
    project_disciplines = db.query(Discipline).join(ProjectDisciplineDocumentType).filter(
        ProjectDisciplineDocumentType.project_id == project_id
    ).all()
    disciplines = {d.code: d.id for d in project_disciplines}
    
    project_document_types = db.query(DocumentType).join(ProjectDisciplineDocumentType).filter(
        ProjectDisciplineDocumentType.project_id == project_id
    ).all()
    document_types = {dt.code: dt.id for dt in project_document_types}

    imported_documents = []
    errors = []
    total_rows = len(df.index)

    upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(upload_dir, exist_ok=True)

    # Подготавливаем карту присланных файлов по имени (без директорий)
    uploaded_files_map = {}
    
    for idx, f in enumerate(files):
        if f:
            filename = getattr(f, 'filename', None) or str(f)
            if filename:
                uploaded_files_map[os.path.basename(filename).lower()] = f
    
    # Карта по имени без расширения
    uploaded_files_noext = {}
    for base_name, f in uploaded_files_map.items():
        noext = os.path.splitext(base_name)[0].lower()
        uploaded_files_noext[noext] = f

    for idx, row in df.iterrows():
        try:
            original_name = None
            file_extension = None
            file_bytes: bytes | None = None

            # Ищем файл по номеру документа (имя файла без расширения)
            # selected_number_col уже проверен и гарантированно существует в df.columns
            source_col = selected_number_col
            doc_number = str(row.get(source_col) or '').strip()
            doc_number_lower = doc_number.lower() if doc_number else ''
            
            if doc_number:
                matched = uploaded_files_noext.get(doc_number_lower)
                if matched:
                    original_name = matched.filename
                    file_extension = os.path.splitext(original_name)[1].lstrip('.').lower()
                    file_bytes = await matched.read()

            if not file_bytes:
                errors.append(f"Файл не найден по номеру документа ({source_col}): {doc_number}")
                continue

            # Проверка типа файла (по расширению)
            if file_extension and settings.ALLOWED_FILE_TYPES:
                # settings.ALLOWED_FILE_TYPES хранится строкой с запятыми
                allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
                if file_extension not in allowed:
                    errors.append(f"Неподдерживаемый тип файла: .{file_extension} ({original_name})")
                    continue

            # Определяем путь для файла
            unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
            dst_path = os.path.join(upload_dir, unique_filename)
            
            # Карта метаданных (определяем функции заранее)
            def get_str(name: str, default: str = None):
                val = row.get(name)
                return str(val).strip() if val is not None else default

            def get_int(name: str):
                val = row.get(name)
                try:
                    return int(val) if val is not None else None
                except (ValueError, TypeError):
                    return None

            def get_date(name: str):
                val = row.get(name)
                if val is None:
                    return None
                try:
                    if isinstance(val, str):
                        # Пробуем разные форматы дат
                        for fmt in ['%Y-%m-%d', '%d.%m.%Y', '%m/%d/%Y']:
                            try:
                                return datetime.strptime(val, fmt).date()
                            except ValueError:
                                continue
                    return None
                except (ValueError, TypeError):
                    return None
            
            # Сохраняем файл (локально или в MinIO)
            if settings.USE_MINIO:
                try:
                    # Генерируем ключ для MinIO
                    minio_key = generate_minio_key(
                        project_code=project.project_code,
                        document_number=get_str('number', 'UNKNOWN'),
                        revision_code="A",  # По умолчанию
                        revision_number="01",
                        revision_description_id=1,  # По умолчанию
                        revision_id=0,  # Временно, будет обновлен после создания ревизии
                        filename=unique_filename
                    )
                    
                    # Загружаем файл в MinIO
                    file_content = file_bytes
                    # Определяем content_type по расширению файла
                    content_type = 'application/octet-stream'  # По умолчанию
                    if file_extension:
                        content_type_map = {
                            'pdf': 'application/pdf',
                            'dwg': 'application/dwg',
                            'doc': 'application/msword',
                            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'xls': 'application/vnd.ms-excel',
                            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'gif': 'image/gif',
                            'tiff': 'image/tiff',
                            'txt': 'text/plain',
                            'rtf': 'application/rtf'
                        }
                        content_type = content_type_map.get(file_extension.lower(), 'application/octet-stream')

                    success = await minio_service.upload_file(
                        file_content=file_content,
                        file_key=minio_key,
                        content_type=content_type
                    )
                    
                    if not success:
                        # Переключаемся на локальное хранение
                        try:
                            with open(dst_path, 'wb') as out_f:
                                out_f.write(file_bytes)
                        except Exception as copy_err:
                            errors.append(f"Ошибка сохранения локально: {copy_err}")
                            continue
                    else:
                        # MinIO успешно загружен, используем ключ MinIO как путь
                        dst_path = minio_key
                    
                except Exception as minio_err:
                    # Переключаемся на локальное хранение (dst_path уже установлен как локальный путь)
                    try:
                        with open(dst_path, 'wb') as out_f:
                            out_f.write(file_bytes)
                    except Exception as copy_err:
                        errors.append(f"Ошибка сохранения локально: {copy_err}")
                        continue
            else:
                # Локальное сохранение
                try:
                    with open(dst_path, 'wb') as out_f:
                        out_f.write(file_bytes)
                except Exception as copy_err:
                    errors.append(f"Ошибка сохранения локально: {copy_err}")
                    continue

            # Карта метаданных
            def get_str(name: str, default: str = None):
                val = row.get(name)
                # return str(val).strip() if pd.notna(val) else default  # Temporarily disabled
                return str(val).strip() if val is not None else default

            def get_int(name: str):
                val = row.get(name)
                try:
                    # return int(val) if pd.notna(val) else None  # Temporarily disabled
                    return int(val) if val is not None else None
                except Exception:
                    return None

            def get_date(name: str):
                val = row.get(name)
                try:
                    # return pd.to_datetime(val).date() if pd.notna(val) else None  # Temporarily disabled
                    # TODO: Implement proper date parsing without pandas
                    return None
                except Exception:
                    return None

            discipline_id = None
            document_type_id = None

            discipline_code = get_str('discipline')  # Исправлено: было 'discipline_code'
            if discipline_code:
                discipline_id = disciplines.get(discipline_code)
                if not discipline_id:
                    errors.append(f"Дисциплина '{discipline_code}' не прикреплена к проекту '{project.project_code}' (файл {original_name})")
                    # не прерываем — можно продолжить без дисциплины

            document_type_code = get_str('document_type')  # Исправлено: было 'document_type_code'
            if document_type_code:
                document_type_id = document_types.get(document_type_code)
                if not document_type_id:
                    errors.append(f"Тип документа '{document_type_code}' не прикреплен к проекту '{project.project_code}' (файл {original_name})")

            title = get_str('title', original_name)
            description = get_str('description')

            # Получаем language_id по коду языка
            language_id = None
            language_code = get_str('content_language')  # Исправлено: было 'language_code'
            if language_code:
                language = db.query(Language).filter(Language.code == language_code).first()
                if language:
                    language_id = language.id
                else:
                    errors.append(f"Язык не найден по коду: {language_code} (файл {original_name})")
            

            db_document = Document(
                title=title,
                title_native=get_str('secondary_title'),  # Используем secondary_title для title_native
                remarks=None,  # Примечания (можно добавить в будущем)
                number=get_str('number'),
                project_id=project_id,
                discipline_id=discipline_id,
                document_type_id=document_type_id,
                language_id=language_id,
                # document_code=get_str('document_code'),  # Это поле number
                # author=get_str('author'),  # Это поле created_by
                creation_date=get_date('creation_date'),
                # revision=get_str('revision'),  # Поле отсутствует в модели Document
                sheet_number=get_str('sheet_number'),
                total_sheets=get_int('total_sheets'),
                scale=get_str('scale'),
                format=get_str('format'),
                confidentiality=get_str('confidentiality', 'internal'),
                # drs=None,  # Поле отсутствует в модели Document
                created_by=current_user.id  # author это created_by
            )

            db.add(db_document)
            db.commit()
            db.refresh(db_document)
            
            # Получаем ID статуса "Active" для первой ревизии (как в одиночном создании)
            from app.models.references import RevisionStatus
            active_status = db.query(RevisionStatus).filter(RevisionStatus.id == 1).first()
            active_status_id = active_status.id if active_status else None
            
            # Получаем ID статуса "Draft" из workflow_statuses
            draft_workflow_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Draft").first()
            
            # Получаем первую ревизию из workflow preset проекта
            first_revision_description_id = None
            first_revision_step_id = None
            
            if project.workflow_preset_id:
                from app.models.project import WorkflowPresetSequence
                first_sequence = db.query(WorkflowPresetSequence).filter(
                    WorkflowPresetSequence.preset_id == project.workflow_preset_id
                ).order_by(WorkflowPresetSequence.sequence_order).first()
                
                if first_sequence:
                    first_revision_description_id = first_sequence.revision_description_id
                    first_revision_step_id = first_sequence.revision_step_id
            
            # Создаем первую ревизию документа (точно как в одиночном создании)
            revision_row = DocumentRevision(
                document_id=db_document.id,
                number="01",  # Первая ревизия всегда "01"
                file_path=dst_path,
                file_name=original_name,
                file_size=(len(file_bytes) if file_bytes is not None else 0),
                file_type=file_extension,
                change_description="Импорт по пути",
                uploaded_by=current_user.id,
                revision_status_id=active_status_id,  # Добавляем как в одиночном создании
                revision_description_id=first_revision_description_id,  # Первая ревизия из workflow preset
                revision_step_id=first_revision_step_id,  # Первая ревизия из workflow preset
                workflow_status_id=draft_workflow_status.id if draft_workflow_status else None,
            )
            
            db.add(revision_row)
            db.commit()
            db.refresh(revision_row)
            
            # Создаем запись в истории workflow для первой ревизии (как в одиночном создании)
            if draft_workflow_status:
                workflow_history = DocumentWorkflowHistory(
                    revision_id=revision_row.id,
                    from_status_id=None,  # Первая ревизия, нет предыдущего статуса
                    to_status_id=draft_workflow_status.id,
                    user_id=current_user.id,
                    action_type="initial_upload",
                    comments="Импорт по пути"
                )
                db.add(workflow_history)
                db.commit()
            
            # Добавляем документ в список только после успешного сохранения в БД
            imported_documents.append({
                "id": db_document.id,
                "title": db_document.title,
                "number": db_document.number,
                "file_name": revision_row.file_name,
                "file_size": revision_row.file_size,
                "is_deleted": db_document.is_deleted,
                "drs": None,  # DRS moved to project_discipline_document_types
                "discipline_id": db_document.discipline_id,
                "document_type_id": db_document.document_type_id,
                "language_id": db_document.language_id,
                "document_code": db_document.number,  # document_code это number
                "author": db_document.created_by,  # author это created_by (ID текущего пользователя)
                "revision": "01",  # Заглушка, так как поле revision больше не существует
                "confidentiality": db_document.confidentiality
            })

        except Exception as e:
            errors.append(f"Строка {idx}: {str(e)}")

    return {
        "imported_documents": imported_documents,
        "total_imported": len(imported_documents),
        "total_rows": total_rows,
        "processed_rows": len(imported_documents) + len(errors),
        "progress": 100,  # Завершено
        "errors": errors
    }


@router.post("/revisions/{revision_id}/release", response_model=dict)
async def release_revision(
    revision_id: int,
    request: ReleaseRevisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Выпустить ревизию документа (изменить статус с Draft на In Review)
    """
    # Получаем ревизию
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Получаем документ
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    if not current_user.is_admin and document.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    # Проверяем, что ревизия в статусе Draft
    draft_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Draft").first()
    if not draft_status:
        raise HTTPException(status_code=500, detail="Статус 'Draft' не найден в системе")
    
    if revision.workflow_status_id != draft_status.id:
        raise HTTPException(status_code=400, detail="Ревизия не в статусе Draft")
    
    # Проверяем, что ревизия активная (не удаленная)
    if revision.is_deleted == 1:
        raise HTTPException(status_code=400, detail="Нельзя выпускать удаленную ревизию")
    
    # Проверяем, что это последняя активная ревизия документа
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == revision.document_id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_revision or latest_revision.id != revision.id:
        raise HTTPException(status_code=400, detail="Можно выпускать только последнюю активную ревизию документа")
    
    # Получаем статус "In Review"
    in_review_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "In Review").first()
    if not in_review_status:
        raise HTTPException(status_code=500, detail="Статус 'In Review' не найден в системе")
    
    # Валидируем переход статусов
    from app.utils.workflow_status_validator import WorkflowStatusValidator
    if not WorkflowStatusValidator.validate_transition(db, revision.workflow_status_id, in_review_status.id):
        from_status_name = revision.workflow_status.name if revision.workflow_status else "Draft"
        error_msg = WorkflowStatusValidator.get_transition_error_message(from_status_name, "In Review")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Обновляем статус ревизии
    revision.workflow_status_id = in_review_status.id
    db.commit()
    
    # Создаем запись в истории workflow
    workflow_history = DocumentWorkflowHistory(
        revision_id=revision.id,
        from_status_id=draft_status.id,
        to_status_id=in_review_status.id,
        user_id=current_user.id,
        action_type="release",
        comments=request.comment or "Ревизия выпущена для утверждения"
    )
    db.add(workflow_history)
    db.commit()
    
    return {"message": "Ревизия успешно выпущена для внутреннего утверждения"}


@router.get("/{document_id}/revisions", response_model=List[dict])
async def list_document_revisions(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # Получаем ревизии с комментариями из workflow history
    # Берем комментарий где to_status_id соответствует текущему workflow_status_id ревизии
    from sqlalchemy import and_
    
    # Сначала проверим все ревизии документа (включая удаленные)
    all_revisions = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).order_by(DocumentRevision.created_at.desc()).all()
    
    
    versions = (
        db.query(DocumentRevision, DocumentWorkflowHistory.comments)
        .outerjoin(DocumentWorkflowHistory, 
                   and_(
                       DocumentWorkflowHistory.revision_id == DocumentRevision.id,
                       DocumentWorkflowHistory.to_status_id == DocumentRevision.workflow_status_id
                   ))
        .filter(DocumentRevision.document_id == document_id)
        .filter(DocumentRevision.is_deleted == 0)  # Показываем только неудаленные ревизии
        .order_by(DocumentRevision.created_at.desc())
        .all()
    )
    
    return [
        {
            "id": v[0].id,
            "document_id": v[0].document_id,
            "number": v[0].number,  # Переименовано с revision на number
            "file_name": v[0].file_name,
            "file_size": v[0].file_size,
            "file_type": v[0].file_type,
            "change_description": v[1] if v[1] else "",  # Показываем только комментарий из workflow history, если его нет - пустая строка
            "uploaded_by": v[0].uploaded_by,
            "is_deleted": v[0].is_deleted,
            "created_at": v[0].created_at,
            # Добавляем поля для связи со справочниками
            "revision_status_id": v[0].revision_status_id,
            "revision_description_id": v[0].revision_description_id,
            "revision_step_id": v[0].revision_step_id,
            "workflow_status_id": v[0].workflow_status_id,
        }
        for v in versions
    ]


@router.post("/{document_id}/revisions", response_model=dict)
async def create_document_revision(
    document_id: int,
    file: UploadFile = File(...),
    change_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Загрузить новый файл как новую версию документа."""
    from app.models.references import RevisionDescription
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # Проверка типа
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_extension and settings.ALLOWED_FILE_TYPES:
        # settings.ALLOWED_FILE_TYPES хранится строкой с запятыми
        allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
        if file_extension not in allowed:
            raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")

    # Читаем содержимое файла один раз
    content = await file.read()
    
    # Временно сохраняем файл локально для определения пути
    upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{document.project_id}")
    os.makedirs(upload_dir, exist_ok=True)
    unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
    temp_file_path = os.path.join(upload_dir, unique_filename)
    with open(temp_file_path, "wb") as buffer:
        buffer.write(content)

    # Получаем ID статуса "Cancelled"
    from app.models.references import RevisionStatus
    cancelled_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Cancelled").first()
    
    # Получаем текущую ревизию из последней НЕ отмененной ревизии
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0,  # Только не удаленные ревизии
        DocumentRevision.revision_status_id != cancelled_status.id if cancelled_status else True  # Исключаем отмененные ревизии
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    # Проверяем, можно ли загружать новую ревизию
    if latest_revision:
        print(f"DEBUG: create_document_revision - latest_revision: {latest_revision.number}, revision_status_id: {latest_revision.revision_status_id}, workflow_status_id: {latest_revision.workflow_status_id}")
        
        # Получаем статусы для проверки
        draft_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Draft").first()
        in_review_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "In Review").first()
        
        # Проверяем статус последней ревизии
        if latest_revision.workflow_status_id in [draft_status.id if draft_status else None, in_review_status.id if in_review_status else None]:
            # Получаем название статуса
            status_name = 'Unknown'
            if latest_revision.workflow_status_id == draft_status.id if draft_status else None:
                status_name = 'Draft'
            elif latest_revision.workflow_status_id == in_review_status.id if in_review_status else None:
                status_name = 'In Review'
            
            # Формируем полный код ревизии (код описания + номер)
            full_revision_code = latest_revision.number
            if latest_revision.revision_description_id:
                revision_description = db.query(RevisionDescription).filter(
                    RevisionDescription.id == latest_revision.revision_description_id
                ).first()
                if revision_description:
                    full_revision_code = f"{revision_description.code}{latest_revision.number}"
            
            raise HTTPException(
                status_code=400, 
                detail={
                    "error_type": "revision_status_error",
                    "revision": full_revision_code,
                    "status": status_name
                }
            )
    
    # Определяем следующую редакцию
    if latest_revision:
        # Если есть отмененная ревизия с тем же номером, используем тот же номер
        if cancelled_status:
            cancelled_revision = db.query(DocumentRevision).filter(
                DocumentRevision.document_id == document_id,
                DocumentRevision.number == latest_revision.number,
                DocumentRevision.revision_status_id == cancelled_status.id  # Отмененная ревизия
            ).first()
            
            if cancelled_revision:
                # Если есть отмененная ревизия, проверяем статус последней НЕ отмененной ревизии
                
                # Проверяем, утверждена ли последняя ревизия
                approved_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Approved").first()
                if approved_status and latest_revision.workflow_status_id == approved_status.id:
                    # Если последняя ревизия утверждена, переходим к следующей последовательности
                    new_revision_description_id, new_revision_step_id, new_revision = _get_next_revision_from_sequence(
                        document_id, 
                        latest_revision.revision_description_id, 
                        latest_revision.revision_step_id,
                        db
                    )
                else:
                    # Если не утверждена, используем тот же номер
                    new_revision = latest_revision.number
                    new_revision_description_id = latest_revision.revision_description_id
                    new_revision_step_id = latest_revision.revision_step_id
            else:
                # Определяем следующую редакцию на основе статуса и последовательности
                new_revision_description_id, new_revision_step_id, new_revision = _get_next_revision_from_sequence(
                    document_id, 
                    latest_revision.revision_description_id, 
                    latest_revision.revision_step_id,
                    db
                )
        else:
            # Определяем следующую редакцию на основе статуса и последовательности
            new_revision_description_id, new_revision_step_id, new_revision = _get_next_revision_from_sequence(
                document_id, 
                latest_revision.revision_description_id, 
                latest_revision.revision_step_id,
                db
            )
    else:
        # Если нет ревизий, начинаем с "01"
        new_revision = "01"
        new_revision_description_id = None
        new_revision_step_id = None

    # Получаем ID статусов из справочника
    from app.models.references import RevisionStatus
    active_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Active").first()
    superseded_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Superseded").first()
    
    # Получаем ID статуса "Draft" из workflow_statuses
    draft_workflow_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "Draft").first()
    
    # Если есть предыдущие ревизии, помечаем их как Superseded
    if latest_revision and active_status and superseded_status:
        # Обновляем все предыдущие активные ревизии на Superseded (кроме отмененных)
        db.query(DocumentRevision).filter(
            DocumentRevision.document_id == document_id,
            DocumentRevision.revision_status_id == active_status.id,
            DocumentRevision.is_deleted == 0
        ).update({"revision_status_id": superseded_status.id})

    # Создаем запись ревизии с активным статусом
    # Создаем новую ревизию с определенными значениями редакции
    revision_row = DocumentRevision(
        document_id=document.id,
        number=new_revision,
        file_path=temp_file_path,  # Временно используем локальный путь
        file_name=file.filename,
        file_size=len(content),
        file_type=file.content_type or file_extension,
        change_description=change_description,
        uploaded_by=current_user.id,
        revision_status_id=active_status.id if active_status else None,
        revision_step_id=new_revision_step_id,
        revision_description_id=new_revision_description_id,
        workflow_status_id=draft_workflow_status.id if draft_workflow_status else None,
    )
    db.add(revision_row)
    db.commit()
    db.refresh(revision_row)
    
    # Определяем способ хранения файла
    if settings.USE_MINIO:
        # Используем MinIO для хранения
        try:
            # Получаем информацию о проекте
            project = db.query(Project).filter(Project.id == document.project_id).first()
            if not project:
                raise HTTPException(status_code=404, detail="Проект не найден")
            
            # Генерируем ключ для MinIO
            document_number = document.number or f"DOC-{document.id:04d}"
            revision_key_prefix = f"{project.project_code}/{document_number}/{revision_row.number}_{new_revision_description_id or 1}_{revision_row.id}"
            file_key = f"{revision_key_prefix}/{file.filename}"
            
            # Загружаем файл в MinIO напрямую
            import aiobotocore.session
            session = aiobotocore.session.get_session()
            async with session.create_client(
                's3',
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY
            ) as client:
                await client.put_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=file_key,
                    Body=content
                )
            
            # Обновляем путь к файлу в базе данных
            revision_row.file_path = file_key
            db.commit()
            
            # Удаляем временный локальный файл
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
        except Exception as e:
            # Если MinIO недоступен, оставляем локальный файл
            pass
    else:
        # Используем локальное хранение (файл уже сохранен)
        pass
    
    # Создаем запись в document_workflow_history для новой ревизии
    from app.models.document_workflow_history import DocumentWorkflowHistory
    if draft_workflow_status:
        workflow_history = DocumentWorkflowHistory(
            revision_id=revision_row.id,
            from_status_id=None,  # Новая ревизия, нет предыдущего статуса
            to_status_id=draft_workflow_status.id,
            user_id=current_user.id,
            action_type="new_revision",
            comments=change_description or "Новая ревизия документа"
        )
        db.add(workflow_history)
        db.commit()
    
    db.refresh(document)

    return {
        "message": "Новая ревизия создана",
        "document_id": document.id,
        "revision": revision_row.number,
        "file_name": revision_row.file_name,
        "file_size": revision_row.file_size,
        "created_at": revision_row.created_at,
    }


@router.get("/{document_id}/revisions/compare", response_model=dict)
async def compare_document_revisions(
    document_id: int,
    r1: str,
    r2: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Сравнение двух ревизий: базовые метрики (размер, md5)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    def get_revision(revision: str) -> DocumentRevision:
        row = (
            db.query(DocumentRevision)
            .filter(DocumentRevision.document_id == document_id, DocumentRevision.number == revision)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail=f"Ревизия {revision} не найдена")
        return row

    a = get_revision(r1)
    b = get_revision(r2)

    a_md5 = _compute_md5(a.file_path) if a.file_path else None
    b_md5 = _compute_md5(b.file_path) if b.file_path else None

    return {
        "document_id": document_id,
        "from": {
            "revision": a.number,
            "file_name": a.file_name,
            "file_size": a.file_size,
            "md5": a_md5,
        },
        "to": {
            "revision": b.number,
            "file_name": b.file_name,
            "file_size": b.file_size,
            "md5": b_md5,
        },
        "equal": a_md5 is not None and a_md5 == b_md5,
        "size_diff": (b.file_size or 0) - (a.file_size or 0),
    }


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Скачать документ"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем последнюю версию документа
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    # Проверяем права доступа
    if not current_user.is_admin and (not latest_revision or latest_revision.uploaded_by != current_user.id):
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    if not latest_revision or not latest_revision.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Определяем способ получения файла
    if settings.USE_MINIO:
        # Получаем файл из MinIO
        try:
            # Получаем файл напрямую из MinIO через S3 клиент
            import mimetypes
            import aiobotocore.session
            
            session = aiobotocore.session.get_session()
            async with session.create_client(
                's3',
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY
            ) as client:
                response = await client.get_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=latest_revision.file_path
                )
                
                # Читаем весь контент в память для правильной передачи
                content_bytes = await response['Body'].read()
                
                # Определяем MIME тип
                mime_type, _ = mimetypes.guess_type(latest_revision.file_name)
                media_type = mime_type or 'application/octet-stream'
                
                # Правильно кодируем имя файла для HTTP заголовков
                import urllib.parse
                encoded_filename = urllib.parse.quote(latest_revision.file_name.encode('utf-8'))
                
                # Используем Response вместо StreamingResponse для стабильности
                from fastapi.responses import Response
                return Response(
                    content=content_bytes,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                        "Content-Type": media_type,
                        "Content-Length": str(len(content_bytes))
                    }
                )
        except Exception as e:
            # Проверяем, является ли ошибка "файл не найден"
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ["nosuchkey", "404", "not found", "no such key"]):
                raise HTTPException(status_code=404, detail="Файл не найден в хранилище")
            elif "access denied" in error_str or "forbidden" in error_str:
                raise HTTPException(status_code=403, detail="Нет доступа к файлу в хранилище")
            else:
                raise HTTPException(status_code=500, detail=f"Ошибка получения файла из MinIO: {str(e)}")
    else:
        # Используем локальное хранение
        if not os.path.exists(latest_revision.file_path):
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        return FileResponse(
            path=latest_revision.file_path,
            filename=latest_revision.file_name,
            media_type='application/octet-stream'
        )


@router.get("/{document_id}/revisions/{revision_id}/download")
async def download_document_revision(
    document_id: int,
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Скачать конкретную ревизию документа"""
    # Проверяем существование документа
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем существование ревизии
    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id
    ).first()
    
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа (пользователь должен быть участником проекта)
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == document.project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    
    if not current_user.is_admin and not project_member:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    if not revision.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Определяем способ получения файла
    if settings.USE_MINIO:
        # Получаем файл из MinIO
        try:
            # Получаем файл напрямую из MinIO через S3 клиент
            import mimetypes
            import aiobotocore.session
            
            session = aiobotocore.session.get_session()
            async with session.create_client(
                's3',
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY
            ) as client:
                response = await client.get_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=revision.file_path
                )
                
                # Читаем весь контент в память для правильной передачи
                content_bytes = await response['Body'].read()
                
                # Определяем MIME тип
                mime_type, _ = mimetypes.guess_type(revision.file_name)
                media_type = mime_type or 'application/octet-stream'
                
                # Правильно кодируем имя файла для HTTP заголовков
                import urllib.parse
                encoded_filename = urllib.parse.quote(revision.file_name.encode('utf-8'))
                
                # Используем Response вместо StreamingResponse для стабильности
                from fastapi.responses import Response
                return Response(
                    content=content_bytes,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                        "Content-Type": media_type,
                        "Content-Length": str(len(content_bytes))
                    }
                )
        except Exception as e:
            # Проверяем, является ли ошибка "файл не найден"
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ["nosuchkey", "404", "not found", "no such key"]):
                raise HTTPException(status_code=404, detail="Файл не найден в хранилище")
            elif "access denied" in error_str or "forbidden" in error_str:
                raise HTTPException(status_code=403, detail="Нет доступа к файлу в хранилище")
            else:
                raise HTTPException(status_code=500, detail=f"Ошибка получения файла из MinIO: {str(e)}")
    else:
        # Используем локальное хранение
        if not os.path.exists(revision.file_path):
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        return FileResponse(
            path=revision.file_path,
            filename=revision.file_name,
            media_type='application/octet-stream'
        )


@router.patch("/{document_id}/soft-delete")
async def soft_delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Мягкое удаление документа (установка флага is_deleted)"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    can_delete = False
    
    # 1. Администраторы могут удалять любые документы
    if current_user.is_admin:
        can_delete = True
    # 2. Создатель проекта может удалять все документы в своих проектах
    elif document.project_id and document.project.created_by == current_user.id:
        can_delete = True
    # 3. Участник проекта может удалять только свои документы в проекте
    elif document.created_by == current_user.id:
        # Проверяем, что пользователь является участником проекта (не читателем)
        from app.models.project import ProjectMember
        from app.models.project_role import ProjectRole
        project_member = db.query(ProjectMember).join(ProjectRole).filter(
            ProjectMember.project_id == document.project_id,
            ProjectMember.user_id == current_user.id,
            ProjectRole.code != 'viewer'  # Исключаем читателей
        ).first()
        
        if project_member:
            can_delete = True
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="Нет прав для удаления документа")
    
    document.is_deleted = 1
    
    # Помечаем все ревизии документа как удаленные
    db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).update({"is_deleted": 1})
    
    db.commit()
    
    return {"message": "Документ и все его ревизии помечены как удаленные", "document_id": document_id}


@router.patch("/{document_id}/restore")
async def restore_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Восстановление документа (снятие флага is_deleted)"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Нет прав для восстановления документа")
    
    document.is_deleted = 0
    
    # Восстанавливаем все ревизии документа
    db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).update({"is_deleted": 0})
    
    db.commit()
    
    return {"message": "Документ и все его ревизии восстановлены", "document_id": document_id}


@router.delete("/revisions/{revision_id}")
async def soft_delete_document_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Мягкое удаление ревизии документа (установка флага is_deleted)"""
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа - только владелец документа или администратор
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права: владелец документа, администратор проекта или суперадмин
    if (document.created_by != current_user.id and 
        current_user.role_id != 1):  # 1 = Administrator
        raise HTTPException(status_code=403, detail="Нет прав для удаления ревизии")
    
    revision.is_deleted = 1
    db.commit()
    
    return {"message": "Ревизия удалена", "revision_id": revision_id}


@router.post("/revisions/{revision_id}/restore")
async def restore_document_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Восстановление ревизии документа (снятие флага is_deleted)"""
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа - только владелец документа или администратор
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права: владелец документа, администратор проекта или суперадмин
    if (document.created_by != current_user.id and 
        current_user.role_id != 1):  # 1 = Administrator
        raise HTTPException(status_code=403, detail="Нет прав для восстановления ревизии")
    
    revision.is_deleted = 0
    db.commit()
    
    return {"message": "Ревизия восстановлена", "revision_id": revision_id}


@router.post("/revisions/{revision_id}/cancel")
async def cancel_document_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Отменить ревизию документа"""
    
    # Получаем ревизию
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Получаем документ
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    # 1. Администратор может отменять любые ревизии
    # 2. Создатель документа может отменять свои ревизии
    # 3. Участник проекта (не читатель) может отменять ревизии документов в проекте
    if not current_user.is_admin and document.created_by != current_user.id:
        # Проверяем, является ли пользователь участником проекта с правами (не читателем)
        from app.models.project import ProjectMember
        project_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == document.project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role != 'viewer'  # Исключаем читателей
        ).first()
        
        if not project_member:
            raise HTTPException(status_code=403, detail="Нет прав для отмены этой ревизии")
    
    # Получаем ID статуса "Cancelled"
    from app.models.references import RevisionStatus
    cancelled_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Cancelled").first()
    if not cancelled_status:
        raise HTTPException(status_code=500, detail="Статус 'Cancelled' не найден в справочнике")
    
    # Проверяем, что ревизия не уже отменена
    if revision.revision_status_id == cancelled_status.id:
        raise HTTPException(status_code=400, detail="Ревизия уже отменена")
    
    # Получаем ID статуса "Active"
    active_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Active").first()
    if not active_status:
        raise HTTPException(status_code=500, detail="Статус 'Active' не найден в справочнике")
    
    # Проверяем, что отменяемая ревизия является последней активной ревизией
    latest_active_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document.id,
        DocumentRevision.revision_status_id == active_status.id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_active_revision:
        raise HTTPException(status_code=400, detail="Нет активных ревизий для отмены")
    
    if latest_active_revision.id != revision_id:
        raise HTTPException(status_code=400, detail="Можно отменять только последнюю активную ревизию")
    
    # Отменяем ревизию - меняем статус на "Cancelled"
    revision.revision_status_id = cancelled_status.id
    
    db.commit()
    
    return {"message": "Ревизия отменена", "revision_id": revision_id}


@router.put("/{document_id}")
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновить документ"""
    
    # Получаем документ
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    # 1. Администратор может редактировать любые документы
    # 2. Создатель документа может редактировать свои документы
    # 3. Создатель проекта может редактировать все документы в своем проекте
    # 4. Участник проекта может редактировать только свои документы
    if not current_user.is_admin and document.created_by != current_user.id:
        # Проверяем, является ли пользователь создателем проекта
        project = db.query(Project).filter(Project.id == document.project_id).first()
        if not project or project.created_by != current_user.id:
            # Если пользователь не создатель проекта, проверяем права участника
            # Участники проекта могут редактировать только свои документы
            # (это уже проверено выше - created_by != current_user.id)
            raise HTTPException(status_code=403, detail="Нет прав для редактирования этого документа")
    
    # Обновляем поля документа
    update_data = document_data.dict(exclude_unset=True)
    
    # Проверяем, что DRS не редактируется (если передано)
    if 'drs' in update_data:
        del update_data['drs']
    
    # Обновляем документ
    for field, value in update_data.items():
        if hasattr(document, field):
            setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    
    return {"message": "Документ обновлен", "document_id": document_id}


@router.get("/search-by-number/{document_number}")
async def search_document_by_number(
    document_number: str,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Поиск документа по номеру и получение последней ревизии"""
    
    # Ищем документ по номеру в рамках проекта
    document = db.query(Document).filter(
        Document.number == document_number,
        Document.project_id == project_id,
        Document.is_deleted == 0
    ).first()
    
    if not document:
        return {"found": False, "message": f"Документ с номером '{document_number}' не найден в проекте"}
    
    # Получаем последнюю ревизию документа
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document.id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_revision:
        return {"found": False, "message": f"У документа '{document_number}' нет ревизий"}
    
    return {
        "found": True,
        "document": {
            "id": document.id,
            "title": document.title,
            "number": document.number
        },
        "latest_revision": {
            "id": latest_revision.id,
            "number": latest_revision.number,
            "file_name": latest_revision.file_name,
            "created_at": latest_revision.created_at
        }
    }