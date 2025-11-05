"""
Audit logging service for EDMS
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request

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

