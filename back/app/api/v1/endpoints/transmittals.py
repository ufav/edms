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
    recipient_id: int
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
    from sqlalchemy.orm import joinedload
    
    query = db.query(Transmittal).options(joinedload(Transmittal.status))
    
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
            "sender_id": transmittal.sender_id,
            "recipient_id": transmittal.recipient_id,
            "created_by": transmittal.created_by,
            "status": transmittal.status.name if transmittal.status else "draft",
            "status_id": transmittal.status_id,
            "sent_date": transmittal.sent_date,
            "received_date": transmittal.received_date,
            "created_at": transmittal.created_at,
            "updated_at": transmittal.updated_at
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
        sender_id=None,  # sender_id заполняется только при отправке
        recipient_id=transmittal_data.recipient_id,  # Используем переданный recipient_id
        created_by=current_user.id,  # Кто создал трансмиттал
        status_id=1  # Статус draft (ID=1) по умолчанию
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
        "sender_id": db_transmittal.sender_id,
        "recipient_id": db_transmittal.recipient_id,
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
    from sqlalchemy.orm import joinedload
    
    transmittal = db.query(Transmittal).options(joinedload(Transmittal.status)).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Получаем ревизии трансмиттала
    # Используем JOIN'ы вместо N+1 запросов
    revisions_data = db.query(
        DocumentRevision,
        Document,
        TransmittalRevision
    ).join(
        TransmittalRevision,
        TransmittalRevision.revision_id == DocumentRevision.id
    ).join(
        Document,
        Document.id == DocumentRevision.document_id
    ).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    result = []
    for revision, document, tr in revisions_data:
        result.append({
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
        "status": transmittal.status.name if transmittal.status else "draft",
        "status_id": transmittal.status_id,
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
    
    # Используем JOIN'ы вместо N+1 запросов
    revisions_data = db.query(
        DocumentRevision,
        Document,
        TransmittalRevision
    ).join(
        TransmittalRevision,
        TransmittalRevision.revision_id == DocumentRevision.id
    ).join(
        Document,
        Document.id == DocumentRevision.document_id
    ).filter(
        TransmittalRevision.transmittal_id == transmittal_id
    ).all()
    
    result = []
    for revision, document, tr in revisions_data:
        result.append({
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
    from sqlalchemy import func, and_
    from app.models.references import RevisionDescription
    
    # Получаем статус "Active" (используем name вместо code)
    active_status = db.query(RevisionStatus).filter(
        RevisionStatus.name == "Active"
    ).first()
    
    if not active_status:
        # Если нет статуса "active", используем первый доступный статус
        active_status = db.query(RevisionStatus).first()
    
    if not active_status:
        return []
    
    # Создаем подзапрос для получения последней ревизии каждого документа со статусом "active"
    latest_revision_subquery = db.query(
        DocumentRevision.document_id,
        func.max(DocumentRevision.created_at).label('max_created_at')
    ).filter(
        DocumentRevision.revision_status_id == active_status.id,
        DocumentRevision.is_deleted == 0
    ).group_by(DocumentRevision.document_id).subquery()
    
    # Основной запрос с JOIN'ами для получения всех данных за один раз
    query = db.query(
        DocumentRevision,
        Document,
        RevisionDescription
    ).join(
        latest_revision_subquery,
        and_(
            DocumentRevision.document_id == latest_revision_subquery.c.document_id,
            DocumentRevision.created_at == latest_revision_subquery.c.max_created_at
        )
    ).join(
        Document,
        Document.id == DocumentRevision.document_id
    ).outerjoin(
        RevisionDescription,
        RevisionDescription.id == DocumentRevision.revision_description_id
    ).filter(
        DocumentRevision.revision_status_id == active_status.id,
        DocumentRevision.is_deleted == 0
    )
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    # Выполняем запрос
    results = query.all()
    
    # Формируем результат
    revisions_data = []
    for revision, document, revision_description in results:
        revisions_data.append({
            "id": revision.id,
            "document_id": document.id,
            "document_title": document.title,
            "document_number": document.number,
            "revision_number": revision.number,
            "revision_description_code": revision_description.code if revision_description else None,
            "file_name": revision.file_name,
            "file_type": revision.file_type,
            "file_size": revision.file_size,
            "created_at": revision.created_at,
            "project_id": document.project_id
        })
    
    return revisions_data


@router.put("/{transmittal_id}/send")
async def send_transmittal(
    transmittal_id: int,
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
    
    # Обновляем трансмиттал
    from datetime import datetime
    from app.models.references import TransmittalStatus
    
    # Получаем статус "sent"
    sent_status = db.query(TransmittalStatus).filter(TransmittalStatus.name == "sent").first()
    if not sent_status:
        raise HTTPException(status_code=500, detail="Статус 'sent' не найден")
    
    transmittal.status_id = sent_status.id
    transmittal.sent_date = datetime.utcnow()
    transmittal.sender_id = current_user.id  # Кто отправил
    # received_date остается пустой для исходящих трансмитталов
    
    db.commit()
    db.refresh(transmittal)
    
    return {"message": "Трансмиттал успешно отправлен", "transmittal_id": transmittal.id}


@router.put("/{transmittal_id}/receive")
async def receive_transmittal(
    transmittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение входящего трансмиттала"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Обновляем трансмиттал
    from datetime import datetime
    from app.models.references import TransmittalStatus
    
    # Получаем статус "received"
    received_status = db.query(TransmittalStatus).filter(TransmittalStatus.name == "received").first()
    if not received_status:
        raise HTTPException(status_code=500, detail="Статус 'received' не найден")
    
    transmittal.status_id = received_status.id
    transmittal.received_date = datetime.utcnow()
    # sent_date остается пустой для входящих трансмитталов
    
    db.commit()
    db.refresh(transmittal)
    
    return {"message": "Трансмиттал успешно получен", "transmittal_id": transmittal.id}
