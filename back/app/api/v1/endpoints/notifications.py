"""
Notification endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.services.auth import get_current_active_user
from app.services.notification_service import NotificationService

router = APIRouter()


# Pydantic models
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    priority: str
    is_read: bool
    read_at: Optional[str]
    document_id: Optional[int]
    document_title: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    priority: str = "medium"
    document_id: Optional[int] = None


# Notification endpoints
@router.get("/notifications/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить уведомления пользователя"""
    notification_service = NotificationService()
    notifications = await notification_service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )
    
    # Преобразуем в response format
    result = []
    for notification in notifications:
        document_title = None
        if notification.document:
            document_title = notification.document.title
        
        result.append(NotificationResponse(
            id=notification.id,
            title=notification.title,
            message=notification.message,
            type=notification.type,
            priority=notification.priority,
            is_read=notification.is_read,
            read_at=notification.read_at.isoformat() if notification.read_at else None,
            document_id=notification.document_id,
            document_title=document_title,
            created_at=notification.created_at.isoformat()
        ))
    
    return result


@router.get("/notifications/unread-count/")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить количество непрочитанных уведомлений"""
    notification_service = NotificationService()
    count = await notification_service.get_unread_count(current_user.id)
    return {"count": count}


@router.post("/notifications/{notification_id}/mark-read/")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Отметить уведомление как прочитанное"""
    notification_service = NotificationService()
    success = await notification_service.mark_as_read(notification_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    return {"message": "Уведомление отмечено как прочитанное"}


@router.post("/notifications/mark-all-read/")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Отметить все уведомления как прочитанные"""
    notification_service = NotificationService()
    count = await notification_service.mark_all_as_read(current_user.id)
    
    return {"message": f"Отмечено как прочитанные {count} уведомлений"}


@router.post("/notifications/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создать уведомление (только для администраторов)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут создавать уведомления")
    
    notification_service = NotificationService()
    notification = await notification_service.create_notification(
        user_id=current_user.id,
        type=notification_data.type,
        title=notification_data.title,
        message=notification_data.message,
        document_id=notification_data.document_id,
        priority=notification_data.priority
    )
    
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        priority=notification.priority,
        is_read=notification.is_read,
        read_at=notification.read_at.isoformat() if notification.read_at else None,
        document_id=notification.document_id,
        document_title=notification.document.title if notification.document else None,
        created_at=notification.created_at.isoformat()
    )
