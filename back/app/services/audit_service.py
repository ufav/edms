"""
Audit logging service for EDMS
"""

import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request, BackgroundTasks

from app.models.notification import AuditLog
from app.core.database import get_db

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> Optional[str]:
    """Получение IP адреса клиента из запроса"""
    if request.client:
        return request.client.host
    # Проверяем заголовки прокси
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return None


def get_user_agent(request: Request) -> Optional[str]:
    """Получение User-Agent из запроса"""
    return request.headers.get("User-Agent")


def log_action(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> Optional[AuditLog]:
    """
    Логирование действия пользователя (синхронная версия с обработкой ошибок)
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя, выполнившего действие
        action: Тип действия (create, update, delete, etc.)
        entity_type: Тип сущности (user, document, project, etc.)
        entity_id: ID сущности
        old_values: Старые значения (для update)
        new_values: Новые значения (для create/update)
        request: FastAPI Request объект для получения IP и User-Agent
    
    Returns:
        AuditLog: Созданная запись лога или None при ошибке
    """
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
        )
        
        if request:
            audit_log.ip_address = get_client_ip(request)
            audit_log.user_agent = get_user_agent(request)
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    except Exception as e:
        logger.error(f"Failed to save audit log: {e}", exc_info=True)
        db.rollback()
        return None


async def log_action_background(
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """
    Фоновая задача для логирования действия пользователя
    
    Args:
        user_id: ID пользователя, выполнившего действие
        action: Тип действия (create, update, delete, etc.)
        entity_type: Тип сущности (user, document, project, etc.)
        entity_id: ID сущности
        old_values: Старые значения (для update)
        new_values: Новые значения (для create/update)
        ip_address: IP адрес клиента
        user_agent: User-Agent клиента
    """
    db = next(get_db())
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save audit log in background task: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


def add_log_task(
    background_tasks: BackgroundTasks,
    request: Request,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
):
    """
    Добавляет задачу логирования в BackgroundTasks
    
    Args:
        background_tasks: FastAPI BackgroundTasks объект
        request: FastAPI Request объект для получения IP и User-Agent
        user_id: ID пользователя, выполнившего действие
        action: Тип действия (create, update, delete, etc.)
        entity_type: Тип сущности (user, document, project, etc.)
        entity_id: ID сущности
        old_values: Старые значения (для update)
        new_values: Новые значения (для create/update)
    """
    ip_address = get_client_ip(request) if request else None
    user_agent = get_user_agent(request) if request else None
    
    background_tasks.add_task(
        log_action_background,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
    )

