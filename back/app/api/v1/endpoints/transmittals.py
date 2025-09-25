"""
Transmittals endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.transmittal import Transmittal
from app.services.auth import get_current_active_user

router = APIRouter()

class TransmittalCreate(BaseModel):
    title: str
    description: str = None
    project_id: int
    recipient_id: int

class TransmittalUpdate(BaseModel):
    title: str = None
    description: str = None
    status: str = None

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
    
    # Генерируем номер трансмиттала
    transmittal_count = db.query(Transmittal).count() + 1
    transmittal_number = f"TR-{transmittal_count:06d}"
    
    db_transmittal = Transmittal(
        transmittal_number=transmittal_number,
        title=transmittal_data.title,
        description=transmittal_data.description,
        project_id=transmittal_data.project_id,
        sender_id=current_user.id,
        recipient_id=transmittal_data.recipient_id
    )
    
    db.add(db_transmittal)
    db.commit()
    db.refresh(db_transmittal)
    
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
    """Получение трансмиттала по ID"""
    transmittal = db.query(Transmittal).filter(Transmittal.id == transmittal_id).first()
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    return {
        "id": transmittal.id,
        "transmittal_number": transmittal.transmittal_number,
        "title": transmittal.title,
        "description": transmittal.description,
        "project_id": transmittal.project_id,
        "status": transmittal.status,
        "sent_date": transmittal.sent_date,
        "created_at": transmittal.created_at
    }
