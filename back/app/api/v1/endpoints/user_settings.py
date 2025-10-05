"""
User settings endpoints
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user_settings import UserSettings
from app.services.auth import get_current_active_user
from app.models.user import User
import json

router = APIRouter()

@router.get("/settings/{page}")
async def get_user_settings(
    page: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Получить настройки пользователя для конкретной страницы"""
    settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id,
        UserSettings.page == page
    ).all()
    
    result = {}
    for setting in settings:
        try:
            result[setting.settings_key] = json.loads(setting.settings_value) if setting.settings_value else None
        except json.JSONDecodeError:
            result[setting.settings_key] = setting.settings_value
    
    return result

@router.post("/settings/{page}")
async def save_user_settings(
    page: str,
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Сохранить настройки пользователя для конкретной страницы"""
    
    for key, value in settings_data.items():
        # Ищем существующую настройку
        existing_setting = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id,
            UserSettings.page == page,
            UserSettings.settings_key == key
        ).first()
        
        if existing_setting:
            # Обновляем существующую настройку
            existing_setting.settings_value = json.dumps(value) if value is not None else None
        else:
            # Создаем новую настройку
            new_setting = UserSettings(
                user_id=current_user.id,
                page=page,
                settings_key=key,
                settings_value=json.dumps(value) if value is not None else None
            )
            db.add(new_setting)
    
    db.commit()
    return {"message": "Settings saved successfully"}

@router.delete("/settings/{page}")
async def clear_user_settings(
    page: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Очистить все настройки пользователя для конкретной страницы"""
    db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id,
        UserSettings.page == page
    ).delete()
    
    db.commit()
    return {"message": "Settings cleared successfully"}
