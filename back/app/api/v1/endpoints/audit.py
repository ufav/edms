"""
Audit logs endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.notification import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.services.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=dict)
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка логов аудита
    
    Только администраторы могут просматривать логи
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
    
    query = db.query(AuditLog)
    
    # Фильтры
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)
    
    # Сортировка по дате создания (новые сначала)
    query = query.order_by(desc(AuditLog.created_at))
    
    # Получаем общее количество записей
    total_count = query.count()
    
    # Пагинация
    audit_logs = query.offset(skip).limit(limit).all()
    
    # Формируем ответ с информацией о пользователе
    result = []
    for log in audit_logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "platform": log.platform,
            "created_at": log.created_at,
            "user_username": None,
            "user_full_name": None,
        }
        
        if log.user:
            log_dict["user_username"] = log.user.username
            log_dict["user_full_name"] = log.user.full_name
        
        result.append(log_dict)
    
    return {
        "items": result,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение конкретного лога аудита по ID
    
    Только администраторы могут просматривать логи
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
    
    audit_log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not audit_log:
        raise HTTPException(status_code=404, detail="Лог не найден")
    
    log_dict = {
        "id": audit_log.id,
        "user_id": audit_log.user_id,
        "action": audit_log.action,
        "entity_type": audit_log.entity_type,
        "entity_id": audit_log.entity_id,
        "old_values": audit_log.old_values,
        "new_values": audit_log.new_values,
        "ip_address": audit_log.ip_address,
        "platform": audit_log.platform,
        "created_at": audit_log.created_at,
        "user_username": audit_log.user.username if audit_log.user else None,
        "user_full_name": audit_log.user.full_name if audit_log.user else None,
    }
    
    return log_dict

