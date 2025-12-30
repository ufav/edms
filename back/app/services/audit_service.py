"""
Audit logging service for EDMS
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request, BackgroundTasks
from app.core.database import get_db

from app.models.notification import AuditLog


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
) -> AuditLog:
    """
    Логирование действия пользователя
    
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
        AuditLog: Созданная запись лога
    """
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


def add_log_task(
    background_tasks: BackgroundTasks,
    request: Request,
    action: str,
    entity_type: str,
    entity_id: int,
    user_id: int,
    details: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
):
    """
    Добавляет задачу логирования в BackgroundTasks для асинхронного выполнения
    
    Args:
        background_tasks: FastAPI BackgroundTasks объект
        request: FastAPI Request объект для получения IP и User-Agent
        action: Тип действия (create, update, delete, etc.)
        entity_type: Тип сущности (user, document, project, etc.)
        entity_id: ID сущности
        user_id: ID пользователя, выполнившего действие
        details: Дополнительные детали действия
        old_values: Старые значения (для update)
        new_values: Новые значения (для create/update)
    """
    background_tasks.add_task(
        log_action_background,
        request,
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        old_values,
        new_values,
    )


def log_action_background(
    request: Request,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    details: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
):
    """
    Фоновая функция для логирования действия
    
    Args:
        request: FastAPI Request объект
        user_id: ID пользователя
        action: Тип действия
        entity_type: Тип сущности
        entity_id: ID сущности
        details: Дополнительные детали
        old_values: Старые значения
        new_values: Новые значения
    """
    try:
        # Создаем новую сессию БД для фоновой задачи
        db = next(get_db())
        
        # Формируем new_values с details, если они есть
        final_new_values = new_values or {}
        if details:
            final_new_values['details'] = details
        
        log_action(
            db=db,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=final_new_values if final_new_values else None,
            request=request,
        )
    except Exception as e:
        # Логируем ошибку, но не прерываем выполнение
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in background audit logging: {str(e)}")

