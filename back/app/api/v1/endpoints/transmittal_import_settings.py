"""
Transmittal import settings endpoints
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from app.core.database import get_db
from app.models.user import User
from app.models.transmittal_import_settings import TransmittalImportSettings
from app.models.project_participant import ProjectParticipant
from app.services.auth import get_current_active_user

router = APIRouter()

class TransmittalImportSettingsCreate(BaseModel):
    project_id: int
    company_id: int
    settings_key: str
    settings_value: Dict[str, Any]

class TransmittalImportSettingsUpdate(BaseModel):
    settings_value: Dict[str, Any]

class TransmittalImportSettingsResponse(BaseModel):
    id: int
    project_id: int
    company_id: int
    company_name: str
    settings_key: str
    settings_value: Dict[str, Any]
    created_at: str
    updated_at: str

@router.get("/project/{project_id}", response_model=List[TransmittalImportSettingsResponse])
async def get_transmittal_import_settings(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить настройки импорта трансмитталов для проекта"""
    
    # Получаем настройки для текущего пользователя
    settings = db.query(TransmittalImportSettings).filter(
        TransmittalImportSettings.project_id == project_id,
        TransmittalImportSettings.user_id == current_user.id
    ).all()
    
    # Получаем список участников проекта
    participants = db.query(ProjectParticipant).filter(
        ProjectParticipant.project_id == project_id
    ).all()
    
    result = []
    
    # Создаем записи для всех участников проекта
    for participant in participants:
        # Ищем существующие настройки для этой компании
        existing_setting = next(
            (s for s in settings if s.company_id == participant.company_id and s.settings_key == 'field_mapping'), 
            None
        )
        
        if existing_setting:
            try:
                settings_value = json.loads(existing_setting.settings_value) if existing_setting.settings_value else {}
            except json.JSONDecodeError:
                settings_value = {}
            
            result.append(TransmittalImportSettingsResponse(
                id=existing_setting.id,
                project_id=existing_setting.project_id,
                company_id=existing_setting.company_id,
                company_name=participant.company.name if participant.company else "Неизвестная компания",
                settings_key=existing_setting.settings_key,
                settings_value=settings_value,
                created_at=existing_setting.created_at.isoformat(),
                updated_at=existing_setting.updated_at.isoformat()
            ))
        else:
            # Создаем пустые настройки
            default_settings = {
                "sheet_name": "",
                "metadata_fields": {
                    "transmittal_number": {
                        "type": "label_search",
                        "label": "",
                        "position": "right"
                    }
                },
                "table_fields": {
                    "document_number_label": "",
                    "status_label": ""
                }
            }
            
            result.append(TransmittalImportSettingsResponse(
                id=0,  # Временный ID для новых записей
                project_id=project_id,
                company_id=participant.company_id,
                company_name=participant.company.name if participant.company else "Неизвестная компания",
                settings_key="field_mapping",
                settings_value=default_settings,
                created_at="",
                updated_at=""
            ))
    
    return result

@router.post("/", response_model=TransmittalImportSettingsResponse)
async def create_or_update_transmittal_import_settings(
    settings_data: TransmittalImportSettingsCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать или обновить настройки импорта трансмитталов"""
    
    # Ищем существующие настройки
    existing_setting = db.query(TransmittalImportSettings).filter(
        TransmittalImportSettings.project_id == settings_data.project_id,
        TransmittalImportSettings.company_id == settings_data.company_id,
        TransmittalImportSettings.user_id == current_user.id,
        TransmittalImportSettings.settings_key == settings_data.settings_key
    ).first()
    
    if existing_setting:
        # Обновляем существующие настройки
        existing_setting.settings_value = json.dumps(settings_data.settings_value)
        db.commit()
        db.refresh(existing_setting)
        
        # Получаем название компании
        participant = db.query(ProjectParticipant).filter(
            ProjectParticipant.project_id == settings_data.project_id,
            ProjectParticipant.company_id == settings_data.company_id
        ).first()
        
        return TransmittalImportSettingsResponse(
            id=existing_setting.id,
            project_id=existing_setting.project_id,
            company_id=existing_setting.company_id,
            company_name=participant.company.name if participant and participant.company else "Неизвестная компания",
            settings_key=existing_setting.settings_key,
            settings_value=settings_data.settings_value,
            created_at=existing_setting.created_at.isoformat(),
            updated_at=existing_setting.updated_at.isoformat()
        )
    else:
        # Создаем новые настройки
        new_setting = TransmittalImportSettings(
            project_id=settings_data.project_id,
            company_id=settings_data.company_id,
            user_id=current_user.id,
            settings_key=settings_data.settings_key,
            settings_value=json.dumps(settings_data.settings_value)
        )
        db.add(new_setting)
        db.commit()
        db.refresh(new_setting)
        
        # Получаем название компании
        participant = db.query(ProjectParticipant).filter(
            ProjectParticipant.project_id == settings_data.project_id,
            ProjectParticipant.company_id == settings_data.company_id
        ).first()
        
        return TransmittalImportSettingsResponse(
            id=new_setting.id,
            project_id=new_setting.project_id,
            company_id=new_setting.company_id,
            company_name=participant.company.name if participant and participant.company else "Неизвестная компания",
            settings_key=new_setting.settings_key,
            settings_value=settings_data.settings_value,
            created_at=new_setting.created_at.isoformat(),
            updated_at=new_setting.updated_at.isoformat()
        )

@router.put("/{setting_id}", response_model=TransmittalImportSettingsResponse)
async def update_transmittal_import_settings(
    setting_id: int,
    settings_data: TransmittalImportSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить настройки импорта трансмитталов"""
    
    setting = db.query(TransmittalImportSettings).filter(
        TransmittalImportSettings.id == setting_id,
        TransmittalImportSettings.user_id == current_user.id
    ).first()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    
    # Обновляем настройки
    setting.settings_value = json.dumps(settings_data.settings_value)
    db.commit()
    db.refresh(setting)
    
    # Получаем название компании
    participant = db.query(ProjectParticipant).filter(
        ProjectParticipant.project_id == setting.project_id,
        ProjectParticipant.company_id == setting.company_id
    ).first()
    
    return TransmittalImportSettingsResponse(
        id=setting.id,
        project_id=setting.project_id,
        company_id=setting.company_id,
        company_name=participant.company.name if participant and participant.company else "Неизвестная компания",
        settings_key=setting.settings_key,
        settings_value=settings_data.settings_value,
        created_at=setting.created_at.isoformat(),
        updated_at=setting.updated_at.isoformat()
    )

@router.delete("/{setting_id}")
async def delete_transmittal_import_settings(
    setting_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить настройки импорта трансмитталов"""
    
    setting = db.query(TransmittalImportSettings).filter(
        TransmittalImportSettings.id == setting_id,
        TransmittalImportSettings.user_id == current_user.id
    ).first()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    
    db.delete(setting)
    db.commit()
    
    return {"message": "Настройки удалены"}
