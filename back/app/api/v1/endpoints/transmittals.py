"""
Transmittals endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.transmittal import Transmittal, TransmittalRevision
from app.models.document import Document, DocumentRevision
from app.models.references import RevisionStatus
from app.services.auth import get_current_active_user

router = APIRouter()

class TransmittalCreate(BaseModel):
    transmittal_number: str
    title: str
    project_id: int
    recipient_company_id: int
    revision_ids: List[int] = []  # Список ID ревизий для добавления в трансмиттал

class TransmittalUpdate(BaseModel):
    title: str = None
    description: str = None
    status: str = None

class TransmittalRevisionAdd(BaseModel):
    revision_ids: List[int]

class TransmittalRevisionRemove(BaseModel):
    revision_id: int

@router.get("/", response_model=List[dict])
async def get_transmittals(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка трансмитталов"""
    query = db.query(Transmittal)
    
    if project_id:
        query = query.filter(Transmittal.project_id == project_id)
    
    transmittals = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": transmittal.id,
            "transmittal_number": transmittal.transmittal_number,
            "title": transmittal.title,
            "description": transmittal.description,
            "project_id": transmittal.project_id,
            "status": transmittal.status,
            "sent_date": transmittal.sent_date,
            "created_at": transmittal.created_at
        }
        for transmittal in transmittals
    ]

@router.post("/", response_model=dict)
async def create_transmittal(
    transmittal_data: TransmittalCreate,
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
        sender_id=current_user.id,
        recipient_id=None,  # Пока не используем recipient_id
        status="draft"  # Статус draft по умолчанию
    )
    
    db.add(db_transmittal)
    db.commit()
    db.refresh(db_transmittal)
    
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
    
    return {
        "id": db_transmittal.id,
        "transmittal_number": db_transmittal.transmittal_number,
        "title": db_transmittal.title,
        "description": db_transmittal.description,
        "project_id": db_transmittal.project_id,
        "status": db_transmittal.status,
        "created_at": db_transmittal.created_at
    }

@router.get("/{transmittal_id}", response_model=dict)
async def get_transmittal(
    transmittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение трансмиттала по ID с ревизиями"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Получаем ревизии трансмиттала
    transmittal_revisions = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    revisions_data = []
    for tr in transmittal_revisions:
        revision = db.query(DocumentRevision).filter(DocumentRevision.id == tr.revision_id).first()
        if revision:
            # Получаем документ
            document = db.query(Document).filter(Document.id == revision.document_id).first()
            if document:
                revisions_data.append({
                    "id": revision.id,
                    "document_id": document.id,
                    "document_title": document.title,
                    "document_number": document.number,
                    "revision_number": revision.number,
                    "file_name": revision.file_name,
                    "file_size": revision.file_size,
                    "created_at": revision.created_at
                })
    
    return {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "description": transmittal.description,
        "project_id": transmittal.project_id,
        "sender_id": transmittal.sender_id,
        "recipient_id": transmittal.recipient_id,
        "status": transmittal.status,
        "sent_date": transmittal.sent_date,
        "received_date": transmittal.received_date,
        "created_at": transmittal.created_at,
        "revisions": revisions_data
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
    
    transmittal_revisions = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    revisions_data = []
    for tr in transmittal_revisions:
        revision = db.query(DocumentRevision).filter(DocumentRevision.id == tr.revision_id).first()
        if revision:
            document = db.query(Document).filter(Document.id == revision.document_id).first()
            if document:
                revisions_data.append({
                    "id": revision.id,
                    "document_id": document.id,
                    "document_title": document.title,
                    "document_number": document.number,
                    "revision_number": revision.number,
                    "file_name": revision.file_name,
                    "file_size": revision.file_size,
                    "created_at": revision.created_at
                })
    
    return revisions_data

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

@router.get("/documents/active-revisions", response_model=List[dict])
async def get_active_revisions(
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение активных ревизий документов для выбора в трансмиттал"""
    # Получаем статус "Active" (используем name вместо code)
    active_status = db.query(RevisionStatus).filter(
        RevisionStatus.name == "Active"
    ).first()
    
    if not active_status:
        # Если нет статуса "active", используем первый доступный статус
        active_status = db.query(RevisionStatus).first()
    
    if not active_status:
        return []
    
    # Запрос для получения последних ревизий документов со статусом "active"
    query = db.query(DocumentRevision).filter(
        DocumentRevision.revision_status_id == active_status.id,
        DocumentRevision.is_deleted == 0
    )
    
    if project_id:
        # Фильтруем по проекту через документы
        query = query.join(Document).filter(Document.project_id == project_id)
    
    # Получаем последние ревизии для каждого документа
    revisions = query.order_by(DocumentRevision.document_id, DocumentRevision.created_at.desc()).all()
    
    # Группируем по document_id и берем только последнюю ревизию для каждого документа
    latest_revisions = {}
    for revision in revisions:
        if revision.document_id not in latest_revisions:
            latest_revisions[revision.document_id] = revision
    
    revisions_data = []
    for revision in latest_revisions.values():
        document = db.query(Document).filter(Document.id == revision.document_id).first()
        if document:
            # Получаем код описания ревизии
            revision_description_code = None
            if revision.revision_description_id:
                from app.models.references import RevisionDescription
                revision_description = db.query(RevisionDescription).filter(
                    RevisionDescription.id == revision.revision_description_id
                ).first()
                if revision_description:
                    revision_description_code = revision_description.code
            
            revisions_data.append({
                "id": revision.id,
                "document_id": document.id,
                "document_title": document.title,
                "document_number": document.number,
                "revision_number": revision.number,
                "revision_description_code": revision_description_code,
                "file_name": revision.file_name,
                "file_type": revision.file_type,
                "file_size": revision.file_size,
                "created_at": revision.created_at,
                "project_id": document.project_id
            })
    
    return revisions_data
