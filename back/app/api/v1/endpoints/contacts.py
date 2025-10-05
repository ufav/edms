"""
Contacts endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.contact import Contact
from app.models.references import Company
from app.services.auth import get_current_active_user
from app.models.user import User

router = APIRouter()

class ContactCreate(BaseModel):
    company_id: int
    full_name: str
    position: str = None
    email: str = None
    phone: str = None
    is_primary: bool = False
    notes: str = None

class ContactUpdate(BaseModel):
    full_name: str = None
    position: str = None
    email: str = None
    phone: str = None
    is_primary: bool = None
    notes: str = None

class ContactResponse(BaseModel):
    id: int
    company_id: int
    company_name: str
    full_name: str
    position: str = None
    email: str = None
    phone: str = None
    is_primary: bool
    notes: str = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

@router.get("/companies/{company_id}/contacts", response_model=List[ContactResponse])
async def get_company_contacts(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение контактов компании"""
    # Проверяем, что компания существует
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    contacts = db.query(Contact).filter(Contact.company_id == company_id).all()
    
    return [
        ContactResponse(
            id=contact.id,
            company_id=contact.company_id,
            company_name=company.name,
            full_name=contact.full_name,
            position=contact.position,
            email=contact.email,
            phone=contact.phone,
            is_primary=contact.is_primary,
            notes=contact.notes,
            created_at=contact.created_at.isoformat(),
            updated_at=contact.updated_at.isoformat()
        )
        for contact in contacts
    ]

@router.post("/companies/{company_id}/contacts", response_model=ContactResponse)
async def create_contact(
    company_id: int,
    contact_data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание контакта для компании"""
    # Проверяем, что компания существует
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    # Если новый контакт помечен как основной, снимаем флаг с других
    if contact_data.is_primary:
        db.query(Contact).filter(
            Contact.company_id == company_id,
            Contact.is_primary == True
        ).update({"is_primary": False})
        db.commit()
    
    contact = Contact(
        company_id=company_id,
        full_name=contact_data.full_name,
        position=contact_data.position,
        email=contact_data.email,
        phone=contact_data.phone,
        is_primary=contact_data.is_primary,
        notes=contact_data.notes
    )
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    return ContactResponse(
        id=contact.id,
        company_id=contact.company_id,
        company_name=company.name,
        full_name=contact.full_name,
        position=contact.position,
        email=contact.email,
        phone=contact.phone,
        is_primary=contact.is_primary,
        notes=contact.notes,
        created_at=contact.created_at.isoformat(),
        updated_at=contact.updated_at.isoformat()
    )

@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: int,
    contact_data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление контакта"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Контакт не найден")
    
    # Если обновляемый контакт помечен как основной, снимаем флаг с других
    if contact_data.is_primary is True:
        db.query(Contact).filter(
            Contact.company_id == contact.company_id,
            Contact.id != contact_id,
            Contact.is_primary == True
        ).update({"is_primary": False})
        db.commit()
    
    for field, value in contact_data.dict(exclude_unset=True).items():
        setattr(contact, field, value)
    
    db.commit()
    db.refresh(contact)
    
    company = db.query(Company).filter(Company.id == contact.company_id).first()
    return ContactResponse(
        id=contact.id,
        company_id=contact.company_id,
        company_name=company.name if company else "Неизвестная компания",
        full_name=contact.full_name,
        position=contact.position,
        email=contact.email,
        phone=contact.phone,
        is_primary=contact.is_primary,
        notes=contact.notes,
        created_at=contact.created_at.isoformat(),
        updated_at=contact.updated_at.isoformat()
    )

@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление контакта"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Контакт не найден")
    
    db.delete(contact)
    db.commit()
    
    return {"message": "Контакт удален"}
