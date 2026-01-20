"""
Transmittals endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.transmittal import Transmittal, TransmittalRevision
from app.models.document import Document, DocumentRevision
from app.models.document import File as FileModel
from app.models.references import RevisionStatus
from app.services.auth import get_current_active_user
from app.services.audit_service import log_action

router = APIRouter()

class TransmittalCreate(BaseModel):
    transmittal_number: str
    title: str
    project_id: int
    # New unified fields
    direction: str | None = None  # 'out' | 'in'
    counterparty_id: int | None = None
    revision_ids: List[int] = []  # Список ID ревизий для добавления в трансмиттал

class TransmittalUpdate(BaseModel):
    transmittal_number: str = None
    title: str = None
    counterparty_id: int = None

class TransmittalRevisionAdd(BaseModel):
    revision_ids: List[int]

class TransmittalRevisionRemove(BaseModel):
    revision_id: int
@router.delete("/{transmittal_id}", response_model=dict)
async def delete_transmittal(
    transmittal_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Мягкое удаление трансмиттала (is_deleted=1)"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal or transmittal.is_deleted == 1:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")

    # Сохраняем старые значения для лога
    old_values = {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "project_id": transmittal.project_id,
        "direction": transmittal.direction,
        "counterparty_id": transmittal.counterparty_id,
        "is_deleted": transmittal.is_deleted,
    }

    transmittal.is_deleted = 1
    db.commit()

    # Логирование действия
    log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="transmittal",
        entity_id=transmittal_id,
        old_values=old_values,
        new_values={"is_deleted": 1},
        request=request,
    )

    return {"message": "Трансмиттал удален", "id": transmittal_id}

@router.get("/", response_model=List[dict])
async def get_transmittals(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка трансмитталов"""
    from sqlalchemy.orm import joinedload
    
    query = db.query(Transmittal).options(joinedload(Transmittal.status)).filter(Transmittal.is_deleted == 0)
    
    if project_id:
        query = query.filter(Transmittal.project_id == project_id)
    
    transmittals = query.order_by(Transmittal.updated_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": transmittal.id,
            "transmittal_number": transmittal.transmittal_number,
            "title": transmittal.title,
            "description": transmittal.description,
            "project_id": transmittal.project_id,
            "sender_id": transmittal.sender_id,
            # New unified fields
            "direction": transmittal.direction,
            "counterparty_id": transmittal.counterparty_id,
            "transmittal_date": transmittal.transmittal_date,
            "created_by": transmittal.created_by,
            "status": transmittal.status.name if transmittal.status else "draft",
            "status_id": transmittal.status_id,
            "created_at": transmittal.created_at,
            "updated_at": transmittal.updated_at
        }
        for transmittal in transmittals
    ]

@router.post("/", response_model=dict)
async def create_transmittal(
    transmittal_data: TransmittalCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание нового трансмиттала"""
    
    # Используем переданный номер трансмиттала
    db_transmittal = Transmittal(
        transmittal_number=transmittal_data.transmittal_number,
        title=transmittal_data.title,
        description=None,  # Убираем description
        project_id=transmittal_data.project_id,
        sender_id=None,  # sender_id заполняется только при отправке
        # Новые поля
        direction=transmittal_data.direction,
        counterparty_id=transmittal_data.counterparty_id,
        transmittal_date=None,
        created_by=current_user.id,  # Кто создал трансмиттал
        status_id=1  # Статус draft (ID=1) по умолчанию
    )
    
    db.add(db_transmittal)
    try:
        db.commit()
        db.refresh(db_transmittal)
    except IntegrityError as e:
        db.rollback()
        if "ix_transmittals_transmittal_number" in str(e.orig):
            # Извлекаем номер трансмиттала из ошибки
            import re
            match = re.search(r'\(transmittal_number\)=\(([^)]+)\)', str(e.orig))
            transmittal_number = match.group(1) if match else transmittal_data.transmittal_number
            raise HTTPException(
                status_code=400, 
                detail=f"Трансмиттал с номером '{transmittal_number}' уже существует"
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail="Ошибка при создании трансмиттала"
            )
    
    # Добавляем ревизии в трансмиттал
    for revision_id in transmittal_data.revision_ids:
        # Проверяем, что ревизия существует
        revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
        if not revision:
            raise HTTPException(status_code=400, detail=f"Ревизия с ID {revision_id} не найдена")
        
        transmittal_revision = TransmittalRevision(
            transmittal_id=db_transmittal.id,
            revision_id=revision_id
        )
        db.add(transmittal_revision)
    
    db.commit()
    
    # Логирование действия
    new_values = {
        "id": db_transmittal.id,
        "transmittal_number": db_transmittal.transmittal_number,
        "title": db_transmittal.title,
        "project_id": db_transmittal.project_id,
        "direction": db_transmittal.direction,
        "counterparty_id": db_transmittal.counterparty_id,
        "created_by": db_transmittal.created_by,
        "is_deleted": db_transmittal.is_deleted,
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="create",
        entity_type="transmittal",
        entity_id=db_transmittal.id,
        old_values=None,
        new_values=new_values,
        request=request,
    )
    
    return {
        "id": db_transmittal.id,
        "transmittal_number": db_transmittal.transmittal_number,
        "title": db_transmittal.title,
        "description": db_transmittal.description,
        "project_id": db_transmittal.project_id,
        "sender_id": db_transmittal.sender_id,
        "direction": db_transmittal.direction,
        "counterparty_id": db_transmittal.counterparty_id,
        "transmittal_date": db_transmittal.transmittal_date,
        "created_by": db_transmittal.created_by,
        "status": "draft",  # имя статуса, так как только что создано со status_id=1
        "status_id": db_transmittal.status_id,
        "created_at": db_transmittal.created_at
    }

@router.put("/{transmittal_id}", response_model=dict)
async def update_transmittal(
    transmittal_id: int,
    transmittal_data: TransmittalUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление трансмиттала"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id, Transmittal.is_deleted == 0).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "counterparty_id": transmittal.counterparty_id,
    }
    
    # Обновляем только переданные поля
    if transmittal_data.transmittal_number is not None:
        transmittal.transmittal_number = transmittal_data.transmittal_number
    if transmittal_data.title is not None:
        transmittal.title = transmittal_data.title
    if transmittal_data.counterparty_id is not None:
        transmittal.counterparty_id = transmittal_data.counterparty_id
    
    try:
        db.commit()
        db.refresh(transmittal)
    except IntegrityError as e:
        db.rollback()
        if "ix_transmittals_transmittal_number" in str(e.orig):
            # Извлекаем номер трансмиттала из ошибки
            import re
            match = re.search(r'\(transmittal_number\)=\(([^)]+)\)', str(e.orig))
            transmittal_number = match.group(1) if match else transmittal_data.transmittal_number
            raise HTTPException(
                status_code=400, 
                detail=f"Трансмиттал с номером '{transmittal_number}' уже существует"
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail="Ошибка при обновлении трансмиттала"
            )
    
    # Логирование действия
    new_values = {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "counterparty_id": transmittal.counterparty_id,
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="transmittal",
        entity_id=transmittal_id,
        old_values=old_values,
        new_values=new_values,
        request=request,
    )
    
    return {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "counterparty_id": transmittal.counterparty_id,
        "message": "Трансмиттал успешно обновлен"
    }

@router.get("/{transmittal_id}", response_model=dict)
async def get_transmittal(
    transmittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение трансмиттала по ID с ревизиями"""
    from sqlalchemy.orm import joinedload
    
    transmittal = db.query(Transmittal).options(joinedload(Transmittal.status)).filter(Transmittal.id == transmittal_id, Transmittal.is_deleted == 0).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Получаем ревизии трансмиттала
    # Используем JOIN'ы вместо N+1 запросов
    from app.models.references import RevisionDescription, WorkflowStatus
    revisions_data = db.query(
        DocumentRevision,
        Document,
        TransmittalRevision,
        RevisionDescription,
        WorkflowStatus
    ).join(
        TransmittalRevision,
        TransmittalRevision.revision_id == DocumentRevision.id
    ).join(
        Document,
        Document.id == DocumentRevision.document_id
    ).outerjoin(
        RevisionDescription,
        RevisionDescription.id == DocumentRevision.revision_description_id
    ).outerjoin(
        WorkflowStatus,
        WorkflowStatus.id == DocumentRevision.workflow_status_id
    ).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    # Пакетно загружаем файлы для всех ревизий (устранение N+1)
    from collections import defaultdict
    revision_ids = [r[0].id for r in revisions_data]
    files_by_revision_id = defaultdict(list)
    if revision_ids:
        all_files = db.query(FileModel).filter(
            FileModel.revision_id.in_(revision_ids),
            FileModel.is_deleted == 0
        ).all()
        for f in all_files:
            files_by_revision_id[f.revision_id].append(f)
    
    result = []
    for revision, document, tr, rev_descr, workflow_status in revisions_data:
        files_info = files_by_revision_id.get(revision.id, [])
        
        result.append({
            "id": revision.id,
            "transmittal_revision_id": tr.id,  # ID связи transmittal_revision для обновления ccs_status
            "document_id": document.id,
            "document_title": document.title,
            "document_number": document.number,
            "revision_number": revision.number,
            "revision_description_code": rev_descr.code if rev_descr else None,
            "ccs_status": tr.ccs_status.value if tr.ccs_status else None,  # CCS статус (только для incoming)
            "workflow_status": workflow_status.name if workflow_status else None,
            "files": [
                {
                    "id": f.id,
                    "file_name": f.file_name,
                    "file_size": f.file_size,
                    "file_type": f.file_type,
                }
                for f in files_info
            ],
            # Обратная совместимость - берем первый файл для старых полей
            "file_name": files_info[0].file_name if files_info and len(files_info) > 0 else None,
            "file_size": files_info[0].file_size if files_info and len(files_info) > 0 else None,
            "file_type": files_info[0].file_type if files_info and len(files_info) > 0 else None,
            "created_at": revision.created_at
        })
    
    return {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "description": transmittal.description,
        "project_id": transmittal.project_id,
        "sender_id": transmittal.sender_id,
        "direction": transmittal.direction,
        "counterparty_id": transmittal.counterparty_id,
        "transmittal_date": transmittal.transmittal_date,
        "created_by": transmittal.created_by,
        "status": transmittal.status.name if transmittal.status else "draft",
        "status_id": transmittal.status_id,
        "created_at": transmittal.created_at,
        "revisions": result
    }

@router.get("/{transmittal_id}/revisions", response_model=List[dict])
async def get_transmittal_revisions(
    transmittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение ревизий трансмиттала"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Используем JOIN'ы вместо N+1 запросов
    from app.models.references import RevisionDescription, WorkflowStatus
    revisions_data = db.query(
        DocumentRevision,
        Document,
        TransmittalRevision,
        RevisionDescription,
        WorkflowStatus
    ).join(
        TransmittalRevision,
        TransmittalRevision.revision_id == DocumentRevision.id
    ).join(
        Document,
        Document.id == DocumentRevision.document_id
    ).outerjoin(
        RevisionDescription,
        RevisionDescription.id == DocumentRevision.revision_description_id
    ).outerjoin(
        WorkflowStatus,
        WorkflowStatus.id == DocumentRevision.workflow_status_id
    ).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    # Пакетно загружаем файлы для всех ревизий (устранение N+1)
    from collections import defaultdict
    revision_ids = [r[0].id for r in revisions_data]
    files_by_revision_id = defaultdict(list)
    if revision_ids:
        all_files = db.query(FileModel).filter(
            FileModel.revision_id.in_(revision_ids),
            FileModel.is_deleted == 0
        ).all()
        for f in all_files:
            files_by_revision_id[f.revision_id].append(f)
    
    result = []
    for revision, document, tr, rev_descr, workflow_status in revisions_data:
        files_info = files_by_revision_id.get(revision.id, [])
        
        result.append({
            "id": revision.id,
            "transmittal_revision_id": tr.id,  # ID связи transmittal_revision для обновления ccs_status
            "document_id": document.id,
            "document_title": document.title,
            "document_number": document.number,
            "revision_number": revision.number,
            "revision_description_code": rev_descr.code if rev_descr else None,
            "ccs_status": tr.ccs_status.value if tr.ccs_status else None,  # CCS статус (только для incoming)
            "workflow_status": workflow_status.name if workflow_status else None,
            "files": [
                {
                    "id": f.id,
                    "file_name": f.file_name,
                    "file_size": f.file_size,
                    "file_type": f.file_type,
                }
                for f in files_info
            ],
            # Обратная совместимость - берем первый файл для старых полей
            "file_name": files_info[0].file_name if files_info and len(files_info) > 0 else None,
            "file_size": files_info[0].file_size if files_info and len(files_info) > 0 else None,
            "file_type": files_info[0].file_type if files_info and len(files_info) > 0 else None,
            "created_at": revision.created_at
        })
    
    return result

@router.post("/{transmittal_id}/revisions", response_model=dict)
async def add_revisions_to_transmittal(
    transmittal_id: int,
    revision_data: TransmittalRevisionAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавление ревизий в трансмиттал"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    added_revisions = []
    for revision_id in revision_data.revision_ids:
        # Проверяем, что ревизия существует
        revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
        if not revision:
            raise HTTPException(status_code=400, detail=f"Ревизия с ID {revision_id} не найдена")
        
        # Проверяем, что ревизия еще не добавлена в этот трансмиттал
        existing = db.query(TransmittalRevision).filter(
            TransmittalRevision.transmittal_id == transmittal_id,
            TransmittalRevision.revision_id == revision_id
        ).first()
        
        if not existing:
            transmittal_revision = TransmittalRevision(
                transmittal_id=transmittal_id,
                revision_id=revision_id
            )
            db.add(transmittal_revision)
            added_revisions.append(revision_id)
    
    db.commit()
    
    return {
        "message": f"Добавлено {len(added_revisions)} ревизий в трансмиттал",
        "added_revision_ids": added_revisions
    }

@router.delete("/{transmittal_id}/revisions/{revision_id}", response_model=dict)
async def remove_revision_from_transmittal(
    transmittal_id: int,
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление ревизии из трансмиттала"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    transmittal_revision = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == transmittal_id,
        TransmittalRevision.revision_id == revision_id
    ).first()
    
    if not transmittal_revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена в трансмиттале")
    
    db.delete(transmittal_revision)
    db.commit()
    
    return {"message": "Ревизия удалена из трансмиттала"}


class CCSStatusUpdate(BaseModel):
    ccs_status: str  # 'open' | 'closed'


@router.put("/{transmittal_id}/revisions/{revision_id}/ccs-status", response_model=dict)
async def update_revision_ccs_status(
    transmittal_id: int,
    revision_id: int,
    status_data: CCSStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление CCS статуса ревизии в трансмиттале (только для incoming)"""
    from app.models.transmittal import CCSStatus
    
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id, Transmittal.is_deleted == 0).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Проверяем, что трансмиттал incoming
    if transmittal.direction != 'in':
        raise HTTPException(status_code=400, detail="CCS статус доступен только для входящих трансмитталов")
    
    transmittal_revision = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == transmittal_id,
        TransmittalRevision.revision_id == revision_id
    ).first()
    
    if not transmittal_revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена в трансмиттале")
    
    # Валидируем значение статуса
    try:
        new_status = CCSStatus(status_data.ccs_status.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Неверное значение статуса. Допустимые: 'open', 'closed'")
    
    # Сохраняем старое значение для лога
    old_status = transmittal_revision.ccs_status.value if transmittal_revision.ccs_status else None
    
    # Обновляем статус
    transmittal_revision.ccs_status = new_status
    db.commit()
    
    # Логирование действия
    log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="transmittal_revision",
        entity_id=transmittal_revision.id,
        old_values={"ccs_status": old_status},
        new_values={"ccs_status": new_status.value},
        request=request,
    )
    
    return {
        "message": "CCS статус обновлен",
        "transmittal_revision_id": transmittal_revision.id,
        "ccs_status": new_status.value
    }


@router.get("/documents/active-revisions", response_model=List[dict])
async def get_active_revisions(
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение ревизий документов со статусом 'Draft' и requires_transmittal = true для выбора в трансмиттал"""
    from sqlalchemy import func, and_
    from app.models.references import RevisionDescription, WorkflowStatus
    from app.models.transmittal import TransmittalRevision
    
    # Получаем статус "Draft" из workflow_statuses
    draft_status = db.query(WorkflowStatus).filter(
        WorkflowStatus.name == "Draft"
    ).first()
    
    if not draft_status:
        return []
    
    # Получаем ID ревизий, которые уже находятся в трансмитталах
    used_revision_ids = db.query(TransmittalRevision.revision_id).subquery()
    
    # Основной запрос для получения последних активных ревизий со статусом "Draft" и requires_transmittal = true
    from app.models.project import WorkflowPresetSequence, Project
    from sqlalchemy import func
    
    # Сначала находим последние ревизии для каждого документа
    latest_revisions_subquery = db.query(
        DocumentRevision.document_id,
        func.max(DocumentRevision.id).label('latest_revision_id')
    ).filter(
        DocumentRevision.is_deleted == 0
    ).group_by(DocumentRevision.document_id).subquery()
    
    # Основной запрос для получения последних ревизий со статусом "Draft" и requires_transmittal = true
    query = db.query(
        DocumentRevision,
        Document,
        RevisionDescription,
        WorkflowPresetSequence
    ).join(
        latest_revisions_subquery,
        DocumentRevision.id == latest_revisions_subquery.c.latest_revision_id
    ).join(
        Document,
        Document.id == DocumentRevision.document_id
    ).join(
        Project,
        Project.id == Document.project_id
    ).outerjoin(
        RevisionDescription,
        RevisionDescription.id == DocumentRevision.revision_description_id
    ).join(
        WorkflowPresetSequence,
        and_(
            WorkflowPresetSequence.preset_id == Project.workflow_preset_id,
            WorkflowPresetSequence.revision_description_id == DocumentRevision.revision_description_id,
            WorkflowPresetSequence.revision_step_id == DocumentRevision.revision_step_id
        )
    ).filter(
        DocumentRevision.workflow_status_id == draft_status.id,
        DocumentRevision.is_deleted == 0,
        WorkflowPresetSequence.requires_transmittal == True,  # Только те, которые требуют трансмиттал
        ~DocumentRevision.id.in_(used_revision_ids)  # Исключаем ревизии, уже используемые в трансмитталах
    )
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    # Выполняем запрос
    results = query.all()
    
    # Пакетно загружаем файлы для всех ревизий (устранение N+1)
    from collections import defaultdict
    revision_ids = [r[0].id for r in results]
    files_by_revision_id = defaultdict(list)
    if revision_ids:
        all_files = db.query(FileModel).filter(
            FileModel.revision_id.in_(revision_ids),
            FileModel.is_deleted == 0
        ).all()
        for f in all_files:
            files_by_revision_id[f.revision_id].append(f)
    
    # Формируем результат
    revisions_data = []
    for revision, document, revision_description, workflow_sequence in results:
        files_info = files_by_revision_id.get(revision.id, [])
        
        revision_data = {
            "id": revision.id,
            "document_id": document.id,
            "document_title": document.title,
            "document_number": document.number,
            "revision_number": revision.number,
            "revision_description_code": revision_description.code if revision_description else None,
            "files": [
                {
                    "id": f.id,
                    "file_name": f.file_name,
                    "file_size": f.file_size,
                    "file_type": f.file_type,
                }
                for f in files_info
            ],
            # Обратная совместимость - берем первый файл для старых полей
            "file_name": files_info[0].file_name if files_info and len(files_info) > 0 else None,
            "file_size": files_info[0].file_size if files_info and len(files_info) > 0 else None,
            "file_type": files_info[0].file_type if files_info and len(files_info) > 0 else None,
            "created_at": revision.created_at,
            "project_id": document.project_id
        }
        revisions_data.append(revision_data)
    
    return revisions_data


@router.put("/{transmittal_id}/send")
async def send_transmittal(
    transmittal_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Отправка исходящего трансмиттала"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Проверяем права доступа
    if transmittal.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Нет прав для отправки трансмиттала")
    
    # Импорты
    from datetime import datetime
    from app.models.references import TransmittalStatus
    from app.models.document import DocumentRevision, Document
    from app.models.references import WorkflowStatus
    from app.models.document_workflow_history import DocumentWorkflowHistory
    from app.models.project import WorkflowPresetSequence, Project
    from app.models.transmittal import TransmittalRevision
    from app.models.project_participant import ProjectParticipant
    from app.models.contact import Contact
    from app.models.download_link import DownloadLink
    from app.services.email_service import email_service
    
    # === ШАГ 1: Подготовка данных (без изменения БД) ===
    
    # Получаем статусы
    sent_status = db.query(TransmittalStatus).filter(TransmittalStatus.name == "Sent").first()
    if not sent_status:
        raise HTTPException(status_code=500, detail="Статус 'sent' не найден")
    
    in_review_status = db.query(WorkflowStatus).filter(WorkflowStatus.name == "In Review").first()
    if not in_review_status:
        raise HTTPException(status_code=500, detail="Статус 'In Review' не найден")
    
    # Получаем все ревизии документов в этом трансмиттале
    transmittal_revisions_data = db.query(
        TransmittalRevision,
        DocumentRevision
    ).join(
        DocumentRevision,
        DocumentRevision.id == TransmittalRevision.revision_id
    ).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    if not transmittal_revisions_data:
        raise HTTPException(status_code=400, detail="В трансмиттале нет документов")
    
    # Валидируем переходы статусов (до любых изменений)
    from app.utils.workflow_status_validator import WorkflowStatusValidator
    for transmittal_revision, revision in transmittal_revisions_data:
        if revision:
            old_status_id = revision.workflow_status_id
            if not WorkflowStatusValidator.validate_transition(db, old_status_id, in_review_status.id):
                from_status = db.query(WorkflowStatus).filter(WorkflowStatus.id == old_status_id).first() if old_status_id else None
                from_status_name = from_status.name if from_status else "Draft"
                error_msg = WorkflowStatusValidator.get_transition_error_message(from_status_name, "In Review")
                raise HTTPException(status_code=400, detail=error_msg)
    
    # === ШАГ 2: Проверяем возможность отправки email ===
    
    # Находим участника проекта (контрагента) с контактом
    participant = db.query(ProjectParticipant).filter(
        ProjectParticipant.project_id == transmittal.project_id,
        ProjectParticipant.company_id == transmittal.counterparty_id
    ).first()
    
    if not participant or not participant.contact_id:
        raise HTTPException(status_code=400, detail="У контрагента не указано контактное лицо")
    
    contact = db.query(Contact).filter(Contact.id == participant.contact_id).first()
    if not contact or not contact.email:
        raise HTTPException(status_code=400, detail="У контактного лица не указан email")
    
    if not email_service.is_configured():
        raise HTTPException(status_code=500, detail="Email сервис не настроен")
    
    # === ШАГ 3: Создаем ссылку для скачивания ===
    
    download_link = DownloadLink.create_link(
        transmittal_id=transmittal.id,
        user_id=current_user.id,
        expires_in_days=7,
        max_downloads=10
    )
    db.add(download_link)
    db.flush()  # Получаем ID без коммита
    
    base_url = str(request.base_url).rstrip('/')
    download_link_url = f"{base_url}/{download_link.token}"
    
    # Получаем список документов в трансмиттале
    documents = []
    for tr, revision in transmittal_revisions_data:
        if revision:
            doc = db.query(Document).filter(Document.id == revision.document_id).first()
            if doc:
                documents.append({
                    "number": doc.number,
                    "title": doc.title or doc.number
                })
    
    # Получаем информацию об отправителе
    sender_name = current_user.full_name or current_user.username
    sender_company = "EDMS"
    project = db.query(Project).filter(Project.id == transmittal.project_id).first()
    project_name = project.name if project else "Проект"
    
    # === ШАГ 4: Отправляем email ===
    
    try:
        email_sent = email_service.send_transmittal_notification(
            to_emails=[contact.email],
            transmittal_number=transmittal.transmittal_number,
            transmittal_title=transmittal.title or f"Трансмиттал {transmittal.transmittal_number}",
            project_name=project_name,
            sender_name=sender_name,
            sender_company=sender_company,
            documents=documents,
            download_link=download_link_url,
            expires_in_days=7
        )
    except Exception as e:
        db.rollback()
        import logging
        logging.error(f"Failed to send email for transmittal {transmittal_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка отправки email: {str(e)}")
    
    if not email_sent:
        db.rollback()
        raise HTTPException(status_code=500, detail="Не удалось отправить email")
    
    # === ШАГ 5: Email успешно отправлен — теперь меняем статусы ===
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": transmittal.id,
        "status_id": transmittal.status_id,
        "direction": transmittal.direction,
        "transmittal_date": transmittal.transmittal_date.isoformat() if transmittal.transmittal_date else None,
        "sender_id": transmittal.sender_id,
    }
    
    # Обновляем трансмиттал
    transmittal.status_id = sent_status.id
    transmittal.direction = "out"
    transmittal.transmittal_date = datetime.utcnow()
    transmittal.sender_id = current_user.id
    
    # Обновляем workflow_status_id для каждой ревизии и создаем записи в истории
    for transmittal_revision, revision in transmittal_revisions_data:
        if revision:
            old_status_id = revision.workflow_status_id
            revision.workflow_status_id = in_review_status.id
            
            # Проверяем, требует ли эта ревизия трансмиттал
            workflow_sequence = db.query(WorkflowPresetSequence).join(
                Project, Project.workflow_preset_id == WorkflowPresetSequence.preset_id
            ).join(
                Document, Document.project_id == Project.id
            ).filter(
                Document.id == revision.document_id,
                WorkflowPresetSequence.revision_description_id == revision.revision_description_id,
                WorkflowPresetSequence.revision_step_id == revision.revision_step_id
            ).first()
            
            if workflow_sequence and workflow_sequence.requires_transmittal:
                workflow_history = DocumentWorkflowHistory(
                    revision_id=revision.id,
                    from_status_id=old_status_id,
                    to_status_id=in_review_status.id,
                    user_id=current_user.id,
                    action_type="transmittal_sent",
                    comments=f"Документ отправлен в трансмиттале #{transmittal.transmittal_number}"
                )
                db.add(workflow_history)
    
    db.commit()
    db.refresh(transmittal)
    
    # Логирование действия
    new_values = {
        "id": transmittal.id,
        "status_id": sent_status.id,
        "direction": "out",
        "transmittal_date": transmittal.transmittal_date.isoformat() if transmittal.transmittal_date else None,
        "sender_id": current_user.id,
        "action": "send",
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="transmittal",
        entity_id=transmittal_id,
        old_values=old_values,
        new_values=new_values,
        request=request,
    )
    
    return {
        "message": "Трансмиттал успешно отправлен", 
        "transmittal_id": transmittal.id,
        "email_sent": True,
        "email_recipient": contact.email,
        "download_link": download_link_url
    }


@router.put("/{transmittal_id}/receive")
async def receive_transmittal(
    transmittal_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение входящего трансмиттала"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": transmittal.id,
        "status_id": transmittal.status_id,
        "direction": transmittal.direction,
        "transmittal_date": transmittal.transmittal_date.isoformat() if transmittal.transmittal_date else None,
    }
    
    # Обновляем трансмиттал
    from datetime import datetime
    from app.models.references import TransmittalStatus
    
    # Получаем статус "received"
    received_status = db.query(TransmittalStatus).filter(TransmittalStatus.name == "received").first()
    if not received_status:
        raise HTTPException(status_code=500, detail="Статус 'received' не найден")
    
    transmittal.status_id = received_status.id
    # Новая модель дат/направления
    transmittal.direction = "in"
    transmittal.transmittal_date = datetime.utcnow()
    
    db.commit()
    db.refresh(transmittal)
    
    # Логирование действия
    from app.models.references import TransmittalStatus
    received_status = db.query(TransmittalStatus).filter(TransmittalStatus.name == "received").first()
    new_values = {
        "id": transmittal.id,
        "status_id": received_status.id if received_status else transmittal.status_id,
        "direction": "in",
        "transmittal_date": transmittal.transmittal_date.isoformat() if transmittal.transmittal_date else None,
        "action": "receive",
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="transmittal",
        entity_id=transmittal_id,
        old_values=old_values,
        new_values=new_values,
        request=request,
    )
    
    return {"message": "Трансмиттал успешно получен", "transmittal_id": transmittal.id}


@router.get("/statuses/")
async def get_transmittal_statuses(db: Session = Depends(get_db)):
    """Получить все статусы трансмитталов"""
    from app.models.references import TransmittalStatus
    
    statuses = db.query(TransmittalStatus).all()
    return [
        {
            "id": status.id,
            "name": status.name,
            "description": status.description
        }
        for status in statuses
    ]
