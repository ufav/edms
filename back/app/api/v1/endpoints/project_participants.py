"""
Project Participants endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.project_participant import ProjectParticipant
from app.models.references import Company
from app.models.contact import Contact
from app.models.company_role import CompanyRole
from app.models.project import Project
from app.services.auth import get_current_active_user
from app.models.user import User

router = APIRouter()

class ProjectParticipantCreate(BaseModel):
    company_id: int
    contact_id: int
    company_role_id: int
    is_primary: bool = False
    notes: str | None = None

class ProjectParticipantUpdate(BaseModel):
    contact_id: int = None
    company_role_id: int = None
    is_primary: bool = None
    notes: str | None = None

class ProjectParticipantResponse(BaseModel):
    id: int
    project_id: int
    company_id: int
    company_name: str
    contact_id: int | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    company_role_id: int | None = None
    company_role_name: str | None = None
    is_primary: bool
    notes: str | None = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

@router.get("/projects/{project_id}/participants", response_model=List[ProjectParticipantResponse])
async def get_project_participants(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка участников проекта"""
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    participants = db.query(ProjectParticipant).filter(
        ProjectParticipant.project_id == project_id
    ).all()
    
    result = []
    for participant in participants:
        company = db.query(Company).filter(Company.id == participant.company_id).first()
        contact = db.query(Contact).filter(Contact.id == participant.contact_id).first()
        role = db.query(CompanyRole).filter(CompanyRole.id == participant.company_role_id).first()
        
        result.append(ProjectParticipantResponse(
            id=participant.id,
            project_id=participant.project_id,
            company_id=participant.company_id,
            company_name=company.name if company else "Неизвестная компания",
            contact_id=participant.contact_id,
        contact_name=contact.full_name if contact else None,
        contact_email=contact.email if contact else None,
        contact_phone=contact.phone if contact else None,
        company_role_id=participant.company_role_id,
        company_role_name=role.name if role else None,
            is_primary=participant.is_primary,
            notes=participant.notes,
            created_at=participant.created_at.isoformat() if participant.created_at else "",
            updated_at=participant.updated_at.isoformat() if participant.updated_at else ""
        ))
    
    return result

@router.post("/projects/{project_id}/participants", response_model=ProjectParticipantResponse)
async def create_project_participant(
    project_id: int,
    participant_data: ProjectParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавление участника к проекту"""
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Проверяем, что компания существует
    company = db.query(Company).filter(Company.id == participant_data.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    # Проверяем, что роль существует
    role = db.query(CompanyRole).filter(CompanyRole.id == participant_data.company_role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Роль компании не найдена")
    
    # Проверяем, что контакт существует
    contact = db.query(Contact).filter(Contact.id == participant_data.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Контакт не найден")
    if contact.company_id != participant_data.company_id:
        raise HTTPException(status_code=400, detail="Контакт не принадлежит указанной компании")
    
    # Если это основной участник, снимаем флаг с других
    if participant_data.is_primary:
        db.query(ProjectParticipant).filter(
            ProjectParticipant.project_id == project_id,
            ProjectParticipant.is_primary == True
        ).update({"is_primary": False})
    
    
    participant = ProjectParticipant(
        project_id=project_id,
        company_id=participant_data.company_id,
        contact_id=participant_data.contact_id,
        company_role_id=participant_data.company_role_id,
        is_primary=participant_data.is_primary,
        notes=participant_data.notes
    )
    
    db.add(participant)
    db.commit()
    db.refresh(participant)
    
    # Получаем данные контакта и роли для ответа
    contact = db.query(Contact).filter(Contact.id == participant.contact_id).first()
    role = db.query(CompanyRole).filter(CompanyRole.id == participant.company_role_id).first()
    
    
    response = ProjectParticipantResponse(
        id=participant.id,
        project_id=participant.project_id,
        company_id=participant.company_id,
        company_name=company.name,
        contact_id=participant.contact_id,
        contact_name=contact.full_name,
        contact_email=contact.email,
        contact_phone=contact.phone,
        company_role_id=participant.company_role_id,
        company_role_name=role.name,
        is_primary=participant.is_primary,
        notes=participant.notes,
        created_at=participant.created_at.isoformat() if participant.created_at else "",
        updated_at=participant.updated_at.isoformat() if participant.updated_at else ""
    )
    
    return response

@router.put("/projects/{project_id}/participants/{participant_id}", response_model=ProjectParticipantResponse)
async def update_project_participant(
    project_id: int,
    participant_id: int,
    participant_data: ProjectParticipantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление участника проекта"""
    participant = db.query(ProjectParticipant).filter(
        ProjectParticipant.id == participant_id,
        ProjectParticipant.project_id == project_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Участник проекта не найден")
    
    # Если это основной участник, снимаем флаг с других
    if participant_data.is_primary:
        db.query(ProjectParticipant).filter(
            ProjectParticipant.project_id == project_id,
            ProjectParticipant.id != participant_id,
            ProjectParticipant.is_primary == True
        ).update({"is_primary": False})
    
    # Обновляем поля
    update_data = participant_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(participant, field, value)
    
    db.commit()
    db.refresh(participant)
    
    company = db.query(Company).filter(Company.id == participant.company_id).first()
    
    return ProjectParticipantResponse(
        id=participant.id,
        project_id=participant.project_id,
        company_id=participant.company_id,
        company_name=company.name if company else "Неизвестная компания",
        contact_person=participant.contact_person,
        email=participant.email,
        phone=participant.phone,
        role=participant.role,
        is_primary=participant.is_primary,
        notes=participant.notes,
        created_at=participant.created_at.isoformat() if participant.created_at else "",
        updated_at=participant.updated_at.isoformat() if participant.updated_at else ""
    )

@router.delete("/projects/{project_id}/participants/{participant_id}")
async def delete_project_participant(
    project_id: int,
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление участника проекта"""
    participant = db.query(ProjectParticipant).filter(
        ProjectParticipant.id == participant_id,
        ProjectParticipant.project_id == project_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Участник проекта не найден")
    
    db.delete(participant)
    db.commit()
    
    return {"message": "Участник проекта удален"}

@router.get("/companies", response_model=List[dict])
async def get_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка компаний"""
    companies = db.query(Company).filter(Company.is_active == True).all()
    return [
        {
            "id": company.id,
            "name": company.name
        }
        for company in companies
    ]

