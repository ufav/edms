"""
API endpoints for disciplines and document types
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.discipline import Discipline, DocumentType
from app.models.user import User
from app.services.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_disciplines(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get list of disciplines"""
    disciplines = db.query(Discipline).filter(Discipline.is_active == True).offset(skip).limit(limit).all()
    
    return [
        {
            "id": discipline.id,
            "code": discipline.code,
            "name": discipline.name,
            "name_en": discipline.name_en,
            "description": discipline.description,
            "description_en": discipline.description_en,
            "is_active": discipline.is_active,
            "created_at": discipline.created_at.isoformat() if discipline.created_at else None,
            "updated_at": discipline.updated_at.isoformat() if discipline.updated_at else None
        }
        for discipline in disciplines
    ]

@router.get("/document-types", response_model=List[dict])
async def get_document_types(
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """Get list of document types"""
    try:
        # Загружаем все активные типы документов
        document_types = db.query(DocumentType).filter(DocumentType.is_active == True).offset(skip).limit(limit).all()
        
        return [
            {
                "id": doc_type.id,
                "code": doc_type.code,
                "name": doc_type.name,
                "name_en": doc_type.name_en,
                "description": doc_type.description,
                "description_en": doc_type.description_en,
                "discipline_id": None,  # Поле отсутствует в модели
                "is_active": doc_type.is_active,
                "created_at": doc_type.created_at.isoformat() if doc_type.created_at else None,
                "updated_at": doc_type.updated_at.isoformat() if doc_type.updated_at else None
            }
            for doc_type in document_types
        ]
    except Exception as e:
        print(f"Error in get_document_types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/disciplines/{discipline_id}/document-types", response_model=List[dict])
async def get_document_types_by_discipline(
    discipline_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get document types for specific discipline"""
    # Временно возвращаем все типы документов, так как поле discipline_id отсутствует
    document_types = db.query(DocumentType).filter(
        DocumentType.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc_type.id,
            "code": doc_type.code,
            "name": doc_type.name,
            "name_en": doc_type.name_en,
            "description": doc_type.description,
            "description_en": doc_type.description_en,
            "discipline_id": None,  # Поле отсутствует в модели
            "is_active": doc_type.is_active,
            "created_at": doc_type.created_at.isoformat() if doc_type.created_at else None,
            "updated_at": doc_type.updated_at.isoformat() if doc_type.updated_at else None
        }
        for doc_type in document_types
    ]

@router.get("/disciplines/{discipline_id}/document-types/search", response_model=List[dict])
async def search_document_types_by_code(
    discipline_id: int,
    code: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Search document types by code within discipline"""
    # Временно ищем по всем типам документов, так как поле discipline_id отсутствует
    document_types = db.query(DocumentType).filter(
        DocumentType.code.ilike(f"%{code}%"),
        DocumentType.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc_type.id,
            "code": doc_type.code,
            "name": doc_type.name,
            "name_en": doc_type.name_en,
            "description": doc_type.description,
            "description_en": doc_type.description_en,
            "discipline_id": None,  # Поле отсутствует в модели
            "is_active": doc_type.is_active,
            "created_at": doc_type.created_at.isoformat() if doc_type.created_at else None,
            "updated_at": doc_type.updated_at.isoformat() if doc_type.updated_at else None
        }
        for doc_type in document_types
    ]

@router.post("/disciplines", response_model=dict)
async def create_discipline(
    discipline_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new discipline"""
    discipline = Discipline(**discipline_data)
    db.add(discipline)
    db.commit()
    db.refresh(discipline)
    
    return {
        "id": discipline.id,
        "code": discipline.code,
        "name": discipline.name,
        "name_en": discipline.name_en,
        "description": discipline.description,
        "description_en": discipline.description_en,
        "is_active": discipline.is_active,
        "created_at": discipline.created_at.isoformat() if discipline.created_at else None,
        "updated_at": discipline.updated_at.isoformat() if discipline.updated_at else None
    }

@router.put("/disciplines/{discipline_id}", response_model=dict)
async def update_discipline(
    discipline_id: int,
    discipline_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update discipline"""
    discipline = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not discipline:
        raise HTTPException(status_code=404, detail="Discipline not found")
    
    for key, value in discipline_data.items():
        setattr(discipline, key, value)
    
    db.commit()
    db.refresh(discipline)
    
    return {
        "id": discipline.id,
        "code": discipline.code,
        "name": discipline.name,
        "name_en": discipline.name_en,
        "description": discipline.description,
        "description_en": discipline.description_en,
        "is_active": discipline.is_active,
        "created_at": discipline.created_at.isoformat() if discipline.created_at else None,
        "updated_at": discipline.updated_at.isoformat() if discipline.updated_at else None
    }

@router.delete("/disciplines/{discipline_id}")
async def delete_discipline(
    discipline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete discipline"""
    discipline = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not discipline:
        raise HTTPException(status_code=404, detail="Discipline not found")
    
    db.delete(discipline)
    db.commit()
    
    return {"message": "Discipline deleted successfully"}