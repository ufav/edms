"""
Notification service for sending and managing notifications
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.models.notification import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    """Сервис для работы с уведомлениями"""
    
    async def create_notification(
        self,
        user_id: int,
        type: str,
        title: str,
        message: str,
        document_id: Optional[int] = None,
        priority: str = 'medium',
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> Notification:
        """Создает новое уведомление"""
        db = next(get_db())
        try:
            # Не устанавливаем created_at явно - позволим PostgreSQL установить его через server_default
            # Это гарантирует правильную работу с timezone базы данных
            notification = Notification(
                user_id=user_id,
                type=type,
                title=title,
                message=message,
                document_id=document_id,
                priority=priority,
                is_read=False,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id
                # created_at будет установлен автоматически через server_default=func.now()
            )
            
            db.add(notification)
            db.commit()
            db.refresh(notification)
            
            logger.info(f"Created notification {notification.id} for user {user_id}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    async def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> list[Notification]:
        """Получает уведомления пользователя"""
        db = next(get_db())
        try:
            query = db.query(Notification).filter(Notification.user_id == user_id)
            
            if unread_only:
                query = query.filter(Notification.is_read == False)
            
            notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
            return notifications
            
        except Exception as e:
            logger.error(f"Error getting notifications for user {user_id}: {e}")
            return []
        finally:
            db.close()
    
    async def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Отмечает уведомление как прочитанное"""
        db = next(get_db())
        try:
            notification = db.query(Notification).filter(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            ).first()
            
            if notification:
                notification.is_read = True
                # Используем SQL для установки времени в UTC
                from sqlalchemy import text
                db.execute(
                    text("UPDATE notifications SET read_at = timezone('UTC', now()) WHERE id = :id"),
                    {"id": notification_id}
                )
                db.commit()
                db.refresh(notification)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error marking notification {notification_id} as read: {e}")
            db.rollback()
            return False
        finally:
            db.close()
    
    async def mark_all_as_read(self, user_id: int) -> int:
        """Отмечает все уведомления пользователя как прочитанные"""
        db = next(get_db())
        try:
            # Сначала обновляем is_read
            updated_count = db.query(Notification).filter(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            ).update({
                'is_read': True
            })
            # Затем устанавливаем read_at через SQL для правильной работы с timezone
            from sqlalchemy import text
            db.execute(
                text("UPDATE notifications SET read_at = timezone('UTC', now()) WHERE user_id = :user_id AND is_read = true AND read_at IS NULL"),
                {"user_id": user_id}
            )
            
            db.commit()
            logger.info(f"Marked {updated_count} notifications as read for user {user_id}")
            return updated_count
            
        except Exception as e:
            logger.error(f"Error marking all notifications as read for user {user_id}: {e}")
            db.rollback()
            return 0
        finally:
            db.close()
    
    async def get_unread_count(self, user_id: int) -> int:
        """Получает количество непрочитанных уведомлений"""
        db = next(get_db())
        try:
            count = db.query(Notification).filter(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            ).count()
            
            return count
            
        except Exception as e:
            logger.error(f"Error getting unread count for user {user_id}: {e}")
            return 0
        finally:
            db.close()
    
    async def send_escalation_notification(
        self,
        user_id: int,
        document_id: int,
        document_title: str,
        step_name: str
    ):
        """Отправляет уведомление об эскалации"""
        await self.create_notification(
            user_id=user_id,
            type='escalation',
            title='Эскалированное согласование',
            message=f'Документ "{document_title}" эскалирован на шаге "{step_name}"',
            document_id=document_id,
            priority='high'
        )
    
    async def send_admin_escalation_notification(
        self,
        document_id: int,
        document_title: str,
        step_name: str,
        required_role: str
    ):
        """Отправляет уведомление администратору об эскалации"""
        db = next(get_db())
        try:
            # Находим администраторов
            admins = db.query(User).filter(User.is_admin == True).all()
            
            for admin in admins:
                await self.create_notification(
                    user_id=admin.id,
                    type='escalation',
                    title='Эскалация требует внимания',
                    message=f'Документ "{document_title}" эскалирован на шаге "{step_name}", но нет пользователя с ролью "{required_role}"',
                    document_id=document_id,
                    priority='urgent'
                )
                
        except Exception as e:
            logger.error(f"Error sending admin escalation notification: {e}")
        finally:
            db.close()
